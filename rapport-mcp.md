# Ajouter un serveur MCP à APITester

Analyse faite le 10/11/2026 sur la branche `feature/explorer-and-auth-profiles` (commit `42d36e0`). Les numéros de ligne renvoient à ce commit.

## TL;DR

- **Recommandation** : un **binaire séparé `cmd/apitester-mcp` en stdio**, qui s'appuie sur un nouveau package `src/service` partagé avec `app.go`. Il n'embarque ni Wails, ni GTK, ni `frontend/dist`. Un transport Streamable HTTP intégré à l'app pourra venir plus tard, en réutilisant le même `src/service`.
- **SDK** : le SDK officiel **`github.com/modelcontextprotocol/go-sdk`** (v1.8.0, publiée le 14/09/2026). Il **impose Go ≥ 1.25**, alors que le repo est en `go 1.22.0` / `toolchain go1.24.1` (`go.mod:3-5`). Il faut donc monter de version Go, ou se limiter à go-sdk v1.4.x.
- **Prérequis bloquant** : `Log.Infos` / `Log.Error` / `Log.Debug` écrivent sur **stdout** (`src/log/logs.go:24,35,46`), tout comme `src/import/postman.go:116`. En stdio, cette sortie corromprait le flux JSON-RPC. Il faut la passer sur stderr.
- **17 tools** proposés (6 en lecture seule ou sans écriture locale, 6 qui écrivent, 5 destructifs), plus 5 resources et 3 prompts. Je conseille de livrer d'abord une phase 1 de 8 tools qui n'écrivent rien sur disque.
- Effort estimé : **9 à 11 jours-personne**, tests compris.

---

## 1. Objectif et cas d'usage

APITester sait déjà faire le plus dur : exécuter des requêtes avec plusieurs profils d'auth (`src/request/auth.go`), puis comparer statuts et payloads (`src/checkConfig/checkConfig.go`). Un serveur MCP donnerait ces capacités à un agent (Claude Code, Claude Desktop…), qui pourrait :

| Cas d'usage | Ce que l'agent fait | Gain |
|---|---|---|
| Boucle dev → test | Après avoir modifié une route dans le code d'une API, Claude Code lance `run_config` sur la config correspondante et lit les ERROR/WARNING. | Régression détectée sans quitter le terminal. |
| Audit de fuites entre rôles | `check_role_access` exécute les mêmes endpoints avec `anon`, `user` et `admin`, puis signale les cas où un rôle faible obtient un 2xx, ou le même payload que l'admin. | C'est la raison d'être du produit, en version automatisée. |
| Bootstrap depuis Postman/Insomnia | `import_collection`, puis ajout de profils, puis `run_config`, puis `update_expected_outputs` (avec confirmation). | Une suite de non-régression en quelques minutes. |
| Triage | L'agent lit les résultats triés, explique `ErrorMissingKeyValue` ou `WarningInconsistentDataTypes`, et propose de corriger le test ou le code. | Les sorties actuelles sont des entiers (`src/struct/enum.go`), que l'agent a du mal à interpréter. |
| Écriture de tests | À partir d'une spec OpenAPI ou du code des routes, l'agent écrit des `Test` (méthode, input, statut attendu, profil) avec `add_test`. | Couverture plus large pour moins d'effort. |
| CI locale / scripts | Le même binaire peut tourner sans UI (stdio). | Un premier pas vers un mode CLI. |

---

## 2. Architecture : trois options

### Constat sur le code actuel

- `main.go:3-14` importe Wails et embarque le frontend : `//go:embed all:frontend/dist` (`main.go:16-17`). Le package `main` ne compile donc pas tant que `frontend/dist` n'existe pas.
- `popups.go:6` importe `github.com/wailsapp/wails/v2/pkg/runtime`. **Seuls `main.go` et `popups.go` importent Wails.** Aucun package de `src/` n'en dépend (vérifié avec `grep -rl wailsapp --include=*.go`).
- `App.ctx` (`app.go:20-33`) n'est utilisé que par les dialogues de `popups.go`. La logique métier ne dépend pas de Wails, mais elle est **écrite dans des méthodes de `App`** (voir §4).
- Le front interroge `ListConfigTree` toutes les 3 s (`frontend/src/main.js:9` → `frontend/src/JS/explorer/actions.js:19`). Ce polling ne lit **que l'arborescence**, jamais le contenu d'une config ouverte dans l'éditeur.

### Option A : binaire séparé `cmd/apitester-mcp` (stdio)

```
cmd/apitester-mcp/main.go  ──►  src/service  ──►  src/checkConfig, src/json, src/import, src/request
main.go + app.go (Wails) ──┘
```

| Critère | Évaluation |
|---|---|
| Embed du frontend | Sans objet : le binaire n'importe pas le package `main`. `go build ./cmd/apitester-mcp` fonctionne sans `npm run build`. |
| Dépendances Wails/GTK | Aucune. Binaire Go pur (pas de cgo, sauf choix contraire), qui démarre sur une machine sans webkit2gtk ni écran (CI, SSH). |
| Accès concurrent aux fichiers | Un **processus distinct** de l'UI : un mutex Go ne suffit pas, il faut des écritures atomiques et un contrôle de version optimiste (§6.5). |
| Distribution | Un 2e binaire à livrer. `wails build` ne le produit pas : il faut une étape `go build -o build/bin/apitester-mcp ./cmd/apitester-mcp` (script ou Makefile). `go install` depuis le web est impossible, car le module s'appelle `ApiTester` et non une URL (`go.mod:1`). |
| Cycle de vie | Lancé et arrêté par le client MCP. Fonctionne même quand l'app est fermée. |
| Confirmation humaine | Passe par le client : prompts de permission par tool dans Claude Code et Claude Desktop, éventuellement l'elicitation MCP. Aucun dialogue natif. |

### Option B : mode `--mcp` dans le binaire Wails

`main()` testerait `os.Args` avant `wails.Run(...)` (`main.go:62`).

| Critère | Évaluation |
|---|---|
| Embed du frontend | Le binaire embarque toujours `frontend/dist` (plusieurs Mo inutiles). Il faut construire le front pour pouvoir compiler. |
| Dépendances Wails/GTK | Sous Linux, le binaire Wails est lié dynamiquement à webkit2gtk/gtk via cgo. **Le chargeur exige ces bibliothèques même si `wails.Run` n'est jamais appelé.** Sans elles, le serveur MCP ne démarre pas. |
| stdio | Sous Windows, un binaire `wails build` est un exécutable « GUI subsystem » (`-H windowsgui`). Il faut vérifier que stdin/stdout fonctionnent bien quand un client MCP le lance avec des pipes (**non vérifié**). Sous macOS, il faut viser `ApiTester.app/Contents/MacOS/ApiTester --mcp`. |
| Concurrence | Même problème qu'en A (processus distinct de l'instance UI éventuellement ouverte). |
| Distribution | Un seul binaire, c'est son seul vrai avantage. |

### Option C : serveur Streamable HTTP lancé depuis l'app ouverte

Un `mcp.NewStreamableHTTPHandler(...)` écoute sur `127.0.0.1:<port>`, démarré dans `App.startup` (`app.go:31`).

| Critère | Évaluation |
|---|---|
| Embed / GTK | Sans objet, c'est déjà l'app. |
| Concurrence | **Meilleure option** : même processus que l'UI, donc un `sync.Mutex` par fichier suffit. On peut aussi notifier le front (`runtime.EventsEmit`) pour recharger l'éditeur quand l'agent modifie la config ouverte. |
| Confirmation humaine | Possible via `ConfirmDialog` (`popups.go:23-44`) : vraie validation humaine hors du LLM. |
| Contraintes | Ne fonctionne que **si l'app est ouverte**. Il faut gérer le port, un jeton d'accès (n'importe quel processus local peut appeler `localhost`), la vérification de l'`Origin` (DNS rebinding) et l'arrêt propre. Côté client : `claude mcp add --transport http …` est supporté par Claude Code. Pour Claude Desktop, la configuration locale est orientée stdio : il faudrait un pont du type `mcp-remote` (**non vérifié**). |

### Recommandation

**Option A**, pour quatre raisons :
1. Elle fonctionne sans UI, et l'agent n'a pas besoin que l'app soit ouverte.
2. Elle évite à la fois le problème GTK et celui de l'embed.
3. Le refactor qu'elle impose (`src/service`) est de toute façon nécessaire et améliore l'app.
4. L'option C reste possible plus tard **au-dessus du même `src/service`**, avec quelques dizaines de lignes, si l'intégration avec l'UI (dialogues, rafraîchissement live) devient un besoin.

Variante à étudier : donner à `cmd/apitester-mcp` **son propre `go.mod`** (`replace ApiTester => ../..`). La montée vers Go 1.25 imposée par le SDK resterait alors isolée du build Wails (voir §3 et §8).

---

## 3. Choix du SDK Go MCP

Vérifié le 10/11/2026 via l'API GitHub (`gh api repos/<repo>/releases`, `gh api …/contents/go.mod?ref=<tag>`) et les README des deux dépôts.

| | `modelcontextprotocol/go-sdk` (officiel) | `mark3labs/mcp-go` |
|---|---|---|
| Dernière release | **v1.8.0, le 14/09/2026** (v1.7.0 le 28/07/2026) — vérifié | **v1.5.0, le 30/10/2026** (v1.4.0 le 26/10, v1.3.0 le 14/10) — vérifié |
| Stabilité | v1.0.0 le 30/09/2025, en v1.x depuis — vérifié | v1.x en 2026 (v0.43.0 juste avant) — vérifié |
| Spec MCP | v1.7.0+ : **2026-07-28**, 2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05 (README, tableau « Version Compatibility ») — vérifié | README : « specification version 2025-11-25 », rétrocompatible jusqu'à 2024-11-05 — vérifié (README). Je n'ai pas vérifié si la v1.5.0 gère 2026-07-28. |
| Go minimal | v1.0–v1.2 : `go 1.23.0` ; **v1.4.x : `go 1.24.0`** ; v1.5.0+ : **`go 1.25.0`** — vérifié dans `go.mod` aux tags | v0.43.0 : `go 1.23.0` ; v1.x : **`go 1.25.5`** — vérifié |
| Transports | stdio (`mcp.StdioTransport`), `StreamableHTTPHandler`, SSE ; `NewInMemoryTransports` pour les tests — vérifié (code et `docs/protocol.md`) | stdio, SSE, streamable HTTP (`server.NewStreamableHTTPServer`) — vérifié |
| Annotations de tools | `mcp.ToolAnnotations{ReadOnlyHint, DestructiveHint *bool, IdempotentHint, OpenWorldHint}` (`mcp/protocol.go`) — vérifié | `mcp.WithReadOnlyHintAnnotation`, `WithDestructiveHintAnnotation`… (`mcp/tools.go`) — vérifié |
| Elicitation | `ServerSession.Elicit` (`mcp/server.go`) — vérifié | Non vérifié |
| Schéma d'entrée | Inféré depuis une struct Go typée (`mcp.AddTool(server, &mcp.Tool{…}, func(ctx, req, In) (…, Out, error))`, tags `jsonschema:"…"`) — vérifié (exemple du README) | Builder fluide (`mcp.NewTool(..., mcp.WithString(...))`) — style connu, non revérifié pour la v1.5 |
| Licence | Transition MIT → Apache-2.0 (fichier LICENSE) — vérifié | MIT — vérifié |
| Popularité | ~5,3 k étoiles — vérifié | ~9,2 k étoiles — vérifié |
| Gouvernance | Dépôt de l'organisation `modelcontextprotocol` (officiel). Le README dit « official Go SDK ». | Projet communautaire, historiquement le premier SDK Go |

**Conseil : `modelcontextprotocol/go-sdk` v1.8.x.**
- C'est le SDK officiel. Il suit la spec la plus récente, et les handlers typés produisent automatiquement le `inputSchema`, l'`outputSchema` et le `structuredContent`, ce qui convient bien à des résultats OK/WARNING/ERROR structurés.
- `mcp-go` reste une alternative crédible : il est plus populaire et a des releases fréquentes. Rien de bloquant contre lui, mais rien qui justifie de s'écarter du SDK officiel non plus.

**Contrainte Go à trancher** (cf. §8) :
- **Option 1 (recommandée)** : passer le module en `go 1.25` (toolchain ≥ 1.25) et prendre go-sdk v1.8.x. Il faut vérifier que `wails build` (Wails v2.10.2, `go.mod:9`) fonctionne avec Go 1.25. **Je ne l'ai pas vérifié.** Go 1.24 n'est probablement plus supporté, d'après la politique « deux dernières versions majeures » (non vérifié).
- **Option 2** : pinner go-sdk **v1.4.1**, qui exige `go 1.24.0`, compatible avec le toolchain local `go1.24.1` (sortie de `go version`). On reste alors sur la spec 2025-11-25, ce qui suffit pour ce besoin.
- **Option 3** : un `go.mod` séparé pour `cmd/apitester-mcp` (cf. §2).

Sources :
- https://github.com/modelcontextprotocol/go-sdk (README, `go.mod`, releases, `mcp/protocol.go`, `mcp/server.go`, `docs/protocol.md`)
- https://pkg.go.dev/github.com/modelcontextprotocol/go-sdk/mcp
- https://github.com/mark3labs/mcp-go (README, `go.mod`, releases, `mcp/tools.go`, `server/streamable_http.go`)
- https://code.claude.com/docs/en/mcp (syntaxe `claude mcp add`, `MCP_TOOL_TIMEOUT`, `MAX_MCP_OUTPUT_TOKENS`)

---

## 4. Refactoring nécessaire

### 4.1 Nouveau package `src/service`

Objectif : `App` (Wails) et `cmd/apitester-mcp` deviennent tous deux de **fines couches d'adaptation** au-dessus de `service`. Signatures proposées : toujours `(group, file)` séparés, validés par `ResolveConfigPath`, avec un `context.Context`.

| Fonction actuelle | Emplacement | Problème | Cible dans `src/service` |
|---|---|---|---|
| `RenameConfig` | `app.go:162-186` | Logique métier (collision, casse, `os.Rename`) dans une méthode `App` | `RenameConfig(group, old, new) (string, error)` |
| `MoveConfig` | `app.go:189-218` | Idem | `MoveConfig(from, file, to) error` |
| `CreateConfig` | `app.go:221-252` | Idem (suffixe ` (n)`, config par défaut) | `CreateConfig(group, name) (string, error)` |
| `SaveConfig` | `app.go:255-271` | Prend un `interface{}` brut sans le valider contre `Config`, et utilise `os.WriteFile` non atomique | `SaveConfig(group, file, cfg Config, expectedVersion string) (newVersion string, error)` |
| `DeleteConfig` | `app.go:274-290` | Logique métier | `DeleteConfig(group, file) error` |
| `CreateGroup` / `RenameGroup` / `DeleteGroup` | `app.go:293-350` | Logique métier (`os.RemoveAll` pour `DeleteGroup`) | Mêmes noms |
| `PrintJsonFile` | `app.go:352-359` | Appelle `ReadJsonFile(path)` (`src/json/json.go:27-50`), qui fait un `filepath.Join` **sans validation** : un `../` sort du dossier de configs. Le front lui passe `group/file` (`frontend/src/JS/explorer/state.js:34-36`). | `GetConfig(group, file) (Config, version string, error)` via `ResolveConfigPath` |
| `ParseExtractionJsonToGoFunction` | `app.go:122-150` | Fallback Postman → Insomnia, traitement spécial de `"root"`, puis `SaveConfigToJson(config, path, filename)`, qui ne valide ni `path` ni `filename` (`src/json/json.go:149-186`) : path traversal possible, et **écrasement silencieux** d'un fichier existant (`os.Create`). L'erreur Postman est aussi masquée par celle d'Insomnia. | `ImportCollection(data, group, name) (finalName string, format string, error)` |
| `CheckSoloConfig` / `CheckGroupConfig` | `app.go:68-87` | Prennent des chemins concaténés (`"group/file"`, `"group/"`) au lieu de `(group, file)` | `RunConfig(ctx, group, file, RunOptions)` / `RunGroup(ctx, group, RunOptions)` |
| `DetectIfOneOreMoreConfFileHaveEmptyExpectedOutputInAConfDir` | `app.go:89-115` | Nom trompeur : la fonction teste `GlobalAskedToFillExpectedOutPut == "false"`, pas des `expectedOutput` vides. Elle passe aussi par `ListJsonFile`, qui parcourt récursivement. | `GroupNeedsFirstFill(group) (bool, error)` |
| `CheckEndpoint` | `app.go:118-120` | OK, juste un wrapper | `RunAdhoc(ctx, cfg Config, RunOptions)` |
| `TestAuthProfile` | `app.go:363-369` | OK, juste un wrapper | `TestAuthProfile(ctx, cfg, profile)` |
| `ListJsonFile` (méthode) | `app.go:36-44` | Le front ne l'appelle plus (seul `ListConfigTree` est utilisé, `actions.js:19`). `CLAUDE.md` est donc en retard sur ce point. | À supprimer, ou à laisser en legacy |
| `OpenFileExplorer` | `app.go:46-66` | Purement UI (`xdg-open` / `explorer`) | **Reste dans `App`** |
| `InfosDialog`, `ConfirmDialog`, `WarningDialog`, `ErrorDialog` | `popups.go:8-66` | Dépendent de `a.ctx` Wails et de `runtime.MessageDialog` | **Restent dans `App`**. Le service ne doit jamais demander de confirmation lui-même : c'est l'adaptateur (UI ou MCP) qui décide. |

Les décisions interactives aujourd'hui côté front (« first run → remplir les expectedOutput ? », `frontend/src/JS/config/check-config.js:28-50`) deviennent des **paramètres explicites** de `RunOptions`. L'UI continue de poser la question via `confirm()`, et MCP les reçoit en arguments du tool.

### 4.2 Changements dans le moteur (`src/checkConfig`, `src/request`, `src/json`, `src/log`)

1. **Logs sur stderr** (bloquant pour stdio) : `src/log/logs.go:24,27,35,38,46,49` utilisent `fmt.Printf` / `fmt.Println` vers stdout. Il faut passer à `fmt.Fprintf(os.Stderr, …)`, ou à un `io.Writer` configurable. `src/import/postman.go:116` fait aussi un `fmt.Printf`.
2. **`context.Context`** de bout en bout : `ExecuteConfig` (`checkConfig.go:72`), `checkEndpoint` (`:327`), `genericRequest` (`src/request/request.go:134-156`, qui utilise `http.NewRequest` à la ligne 144), ainsi que les requêtes de token et de login (`src/request/auth.go:214`, `:380`) et `Authenticate` (`request.go:52`). Il faut passer à `http.NewRequestWithContext` pour que l'annulation d'un tool MCP (ou un timeout global) arrête bien le run.
3. **`RunOptions`** à la place des deux booléens : `{FillExpectedOutput, ForcedUpdate, WriteBack bool; AllowedMethods []string; HostPolicy; MaxTests int}`.
4. **`CheckConfig` écrit toujours le fichier** (`checkConfig.go:244`), même sans remplissage, parce que `ExecuteConfig` passe `IsAlreadyAskedToFillExpectedOutPut` à `"true"` (`:195`). Un run « lecture seule » modifie donc quand même la config. Il faut rendre `WriteBack` optionnel et utiliser `ResolveConfigPath` à la place de `ReadJsonFile(filePath)` (`:223`).
5. **`CheckFolderConfig`** (`checkConfig.go:267-309`) s'appuie sur `ListJsonFile`, qui fait un `filepath.Walk` **récursif** et ramasse **tous** les fichiers, pas seulement les `.json` (`src/json/json.go:101-124`). Il faut le réécrire avec `listJsonIn` / `ResolveConfigPath`. Autre point, lu dans le code mais **non testé** : pour le groupe racine, le front appelle `CheckGroupConfig("root/")` (`check-config.js:59`). `ListJsonFile` résout alors `ApiTester/root/` et le **crée** avec `MkdirAll` (`json.go:93-97`) au lieu de lister la racine. Rien ne retire le préfixe `root/` côté backend, contrairement à ce qu'indique `CLAUDE.md`.
6. **Méthode inconnue comptée OK** : `checkEndpoint` renvoie `Error: 0` pour une méthode non gérée (`checkConfig.go:353-356`), et `ExecuteConfig` ignore l'erreur (`:100`). Le test apparaît alors en OK. Il faut lui attribuer `ErrorUnexpectedResponse`, ou un nouveau code (à refléter aussi dans `frontend/src/JS/enum.js`).
7. **Ordre des résultats non déterministe** (les goroutines font des `append`, `:196`) : trier par (fichier, path, méthode, profil) avant de renvoyer.
8. **Écriture atomique** dans `SaveConfigToJson` (`json.go:172`, `os.Create` tronque puis écrit) : fichier temporaire dans le même dossier, puis `os.Rename`. Sinon, l'UI ou l'autre processus peut lire un JSON partiel.
9. **Racine configurable** : `ConfigRoot()` (`json.go:201-211`) dépend de `os.UserConfigDir()`. Ajouter `APITESTER_CONFIG_DIR` (ou une variable de package) pour les tests et pour isoler un « bac à sable » MCP.
10. **Noms d'enums** : ajouter `String()` sur `ResultError` / `ResultWarning` (via `stringer` ou une table). **Ne pas** changer leur sérialisation JSON, car Wails et `frontend/src/JS/enum.js` dépendent des entiers. Le DTO MCP fera la conversion.

---

## 5. Design des tools MCP

### 5.1 Conventions de sortie

Chaque tool renvoie à la fois un **`structuredContent`** (JSON typé, via `outputSchema`) et un **texte court** lisible par le LLM. Les codes deviennent des noms (`ErrorMissingKeyValue`, `WarningExtraKeyValue`), et le statut est calculé comme dans l'UI : `Error > 0` donne ERROR, sinon une liste `Warning` non vide donne WARNING, sinon OK (`frontend/src/JS/print-test-result.js:65,81`).

Forme d'un résultat de run :

```json
{
  "runId": "r-20261110-1532-7f3a",
  "target": {"group": "billing", "file": "invoices.json"},
  "durationMs": 4120,
  "summary": {"ok": 11, "warning": 3, "error": 2, "skipped": 1},
  "results": [
    {
      "status": "ERROR",
      "method": "GET", "path": "/invoices/42", "authProfile": "user",
      "expectedHttp": "403", "actualHttp": 200,
      "error": "ErrorWrongHttpStatusRange",
      "errorHint": "Statut dans une autre centaine que l'attendu",
      "warnings": [],
      "actualBodyPreview": "{\"id\":42,\"amount\":120,\"iban\":\"FR76…\"} (tronqué, 2,3 ko)"
    }
  ],
  "notes": ["Bodies tronqués à 500 caractères ; détail complet : resource apitester://runs/r-20261110-1532-7f3a"]
}
```

- Par défaut, on renvoie **ERROR et WARNING seulement**, et les OK en simple compteur (`include_ok: false`). Cela respecte la limite de Claude Code : `MAX_MCP_OUTPUT_TOKENS`, 25 000 tokens par défaut, avec un avertissement dès 10 000.
- Bodies tronqués (`max_body_chars`, 500 par défaut), avec un renvoi vers une resource `apitester://runs/{runId}`, conservée en mémoire pendant la session.
- Les bodies de réponse sont des **données non fiables** (risque d'injection de prompt depuis l'API testée). Le texte les présente comme tels.

### 5.2 Liste des tools (17)

Légende des annotations : RO = `readOnlyHint`, D = `destructiveHint`, I = `idempotentHint`, OW = `openWorldHint`.

#### Lecture (aucun effet de bord)

| Tool | Description | Entrée (JSON Schema simplifié) | Sortie | Annotations |
|---|---|---|---|---|
| `list_configs` | Liste les groupes et leurs configs (la racine s'appelle `root`). | `{}` | `{groups:[{name, files:[{name, endpoints, tests, profiles:[…]}]}]}` | RO, I, ¬OW |
| `get_config` | Renvoie une config avec les **secrets masqués**, plus une `version` (sha256 du fichier) à repasser à `update_config`. | `{group:string, file:string}` | `{config, version, maskedFields:[…]}` | RO, I, ¬OW |
| `validate_config` | Vérification statique sans réseau : méthodes connues, profils référencés existants, `expectedHttpState` numérique, hôtes contactés et leur autorisation. | `{group, file}` ou `{config:object}` | `{valid:bool, issues:[{level, where, message}], hosts:[{host, allowed}]}` | RO, I, ¬OW |

#### Exécution (requêtes réelles, aucune écriture locale par défaut)

| Tool | Description | Entrée | Sortie | Annotations |
|---|---|---|---|---|
| `run_config` | Exécute une config et renvoie les résultats triés. **N'écrit pas le fichier** (`WriteBack=false`). | `{group, file, profiles?:string[], methods?:string[] (défaut ["GET","HEAD"]), allow_mutating?:bool=false, include_ok?:bool=false, max_body_chars?:int=500}` | Résultat de run (§5.1) | ¬RO, ¬D, ¬I, **OW** |
| `run_group` | Idem, pour tous les fichiers d'un groupe. | `{group, …mêmes options}` | Résultat agrégé, avec `file` par ligne | ¬RO, ¬D, ¬I, OW |
| `run_adhoc_test` | Exécute une config passée inline (équivalent de `CheckEndpoint`, `app.go:118`), sans rien sauvegarder. Elle peut référencer les profils d'une config existante via `auth_from`. | `{config?:object, auth_from?:{group,file}, base_url?, tests:[{path, method, authProfile?, input?, expectedHttpState?, expectedOutput?}]}` | Résultat de run | ¬RO, ¬D, ¬I, OW |
| `check_role_access` | Matrice d'accès : chaque endpoint (GET par défaut) est exécuté avec **chaque** profil. Signale `LEAK_SUSPECTED` quand un profil classé moins privilégié obtient un 2xx avec un body identique ou un sur-ensemble de celui d'un profil plus privilégié. | `{group, file, profiles_order:string[] (du moins au plus privilégié, ex. ["anon","user","admin"]), paths?:string[], methods?:string[]=["GET"]}` | `{matrix:[{method, path, byProfile:{anon:{http, bodyHash, keys}, …}, findings:[…]}], findings:[{severity, path, message}]}` | ¬RO, ¬D, ¬I, OW |
| `test_auth_profile` | Lance uniquement l'authentification d'un profil (login, token) et renvoie l'aperçu **masqué** (`describeRequestAuth` / `mask`, `src/request/auth.go:490-516`). | `{group, file, profile}` | `{ok, preview}` | ¬RO, ¬D, I, OW |

#### Écriture (non destructive, ou au plus un remplacement contrôlé)

| Tool | Description | Entrée | Sortie | Annotations |
|---|---|---|---|---|
| `create_config` | Crée une config vide (`noauth`), avec un suffixe ` (n)` si le nom est déjà pris. | `{group, name, base_url?}` | `{group, file}` | ¬RO, ¬D, ¬I, ¬OW |
| `update_config` | Remplace une config entière. Les champs secrets dont la valeur vaut le placeholder de masquage **conservent la valeur sur disque**. Refusé si `version` ne correspond plus. | `{group, file, version:string, config:object}` | `{version}` | ¬RO, **D** (écrase), ¬I, ¬OW |
| `add_test` | Ajoute un test à un endpoint (et crée l'endpoint s'il n'existe pas). C'est plus sûr pour un LLM que de réécrire tout le JSON. | `{group, file, version, path, test:{method, authProfile?, input?, expectedHttpState, expectedOutput?}}` | `{version, endpointIndex, testIndex}` | ¬RO, ¬D, ¬I, ¬OW |
| `import_collection` | Importe un export Postman ou Insomnia (fallback identique à `app.go:122-150`) dans une **nouvelle** config, sans jamais écraser. | `{group, name, source:{path:string} \| {json:object}}` | `{group, file, format:"postman"\|"insomnia", endpoints, profiles}` | ¬RO, ¬D, ¬I, ¬OW |
| `rename_or_move_config` | Renomme et/ou déplace une config. | `{group, file, new_group?, new_name?}` | `{group, file}` | ¬RO, ¬D, ¬I, ¬OW |
| `create_group` | Crée un groupe. | `{name}` | `{name}` | ¬RO, ¬D, ¬I, ¬OW |

#### Destructifs

| Tool | Description | Entrée | Sortie | Annotations |
|---|---|---|---|---|
| `update_expected_outputs` | Exécute la config puis **réécrit les `expectedOutput`** : `mode:"fill_empty"` correspond à `fillExpectedOutput` (ne remplit que les valeurs vides), `mode:"force"` à `forcedUpdate` (**écrase tous** les `expectedOutput` et `expectedHttpState`, `checkConfig.go:134-151`). Fonctionne en deux temps : `confirm:false` renvoie un **aperçu du diff**, `confirm:true` plus le `preview_token` reçu applique. | `{group, file, mode:"fill_empty"\|"force", confirm:bool=false, preview_token?:string}` | Aperçu : `{diff:[{path, method, profile, before, after}], preview_token}`. Application : résultat de run + `{version}` | ¬RO, **D**, ¬I, OW |
| `delete_config` | Supprime une config. | `{group, file, confirm:true}` | `{deleted:true}` | ¬RO, **D**, I, ¬OW |
| `delete_group` | Supprime un groupe et **toutes** ses configs (`os.RemoveAll`, `app.go:349`). | `{name, confirm:true, expected_file_count:int}` | `{deleted:true, files:int}` | ¬RO, **D**, I, ¬OW |

`rename_group` est volontairement absent (peu utile pour un agent, facile à ajouter). `run_*` est marqué ¬RO parce que les tests peuvent contenir des `POST`/`PUT`/`PATCH`/`DELETE` qui **modifient l'API cible**. Avec les valeurs par défaut (`methods=["GET","HEAD"]`), ils restent en pratique en lecture seule.

### 5.3 Resources

| URI | Contenu |
|---|---|
| `apitester://configs` | Arborescence (comme `list_configs`). |
| `apitester://config/{group}/{file}` (resource template) | Config JSON **masquée**. `{group}` vaut `root` pour la racine. Validation via `ResolveConfigPath`. |
| `apitester://schema/config` | Documentation du schéma `Config` / `Endpoint` / `Test` / `AuthProfile` (`src/struct/struct.go`), avec ses pièges : booléens stockés en chaîne `"true"`/`"false"`, `_@empty` / `_@nothing`, types d'auth, format `apikey`. |
| `apitester://enums` | Table `code → nom → explication` pour `ResultError` / `ResultWarning` (`src/struct/enum.go`), ainsi que la règle ERROR/WARNING (même centaine ou non, clé manquante ou en trop). |
| `apitester://runs/{runId}` | Résultat complet d'un run de la session (bodies non tronqués, mais secrets masqués). En mémoire, avec un TTL. |

### 5.4 Prompts

- `audit_role_leaks(group, file, roles_order)` : guide l'agent à travers `validate_config`, puis `check_role_access`, puis l'analyse des findings, jusqu'à une proposition de tests ERROR attendus (403/401) pour les rôles faibles.
- `bootstrap_from_postman(path, group)` : enchaîne `import_collection`, l'ajout de profils `anon`/`user`/`admin` (sans écrire de secret en clair, voir §6.1), un `run_config`, puis `update_expected_outputs(mode:"fill_empty")` avec aperçu.
- `triage_failures(runId)` : explique chaque ERROR/WARNING à partir de `apitester://enums` et classe le résultat en « bug API », « test obsolète » ou « problème d'auth ».

---

## 6. Sécurité

### 6.1 Secrets

Les secrets se trouvent dans :
- `AuthProfile.Headers` (toutes les valeurs) ;
- `ApiKey.ApiKey` (`apikeyvalue`) ;
- `BasicAuth.Password` ;
- `Bearer.Token` ;
- `OAuth2.ClientSecret` ;
- **`LoginAuth.Body`** (identifiants de login, `struct.go:33-47`) ;
- l'ancien `Authentication` (`struct.go:90-95`) ;
- éventuellement le `input` des tests (un `POST /login` avec un mot de passe).

Mesures proposées :
- Une fonction `service.MaskConfig(Config) (Config, []string)` remplace ces valeurs par un placeholder stable (ex. `"__APITESTER_SECRET__"`). Dans `LoginAuth.Body` et dans les `input`, on masque les clés qui matchent `(?i)pass|secret|token|api[-_]?key|authorization|cookie`. Les `basicAuth.username` et `apikey.keyname` restent visibles, car ils sont utiles et peu sensibles.
- `update_config` / `add_test` : si une valeur reçue est égale au placeholder, on **reprend la valeur sur disque**. Pour mettre un nouveau secret, l'agent doit fournir une valeur réelle. Sur ce point, voir §8 (référence à une variable d'environnement plutôt que secret en clair).
- Messages d'erreur : `authFailedResult` et `AuthError` (`checkConfig.go:56-68`, `auth.go:29`) peuvent contenir un extrait de réponse de login (`truncate`, `auth.go:482`). Il faut les filtrer par la même routine de masquage. `test_auth_profile` réutilise `mask` (`auth.go:508-516`), qui laisse voir 8 caractères : c'est acceptable pour un aperçu, mais on peut passer à 4.
- Les `ActualOutput` peuvent contenir des données personnelles ou des jetons, puisque c'est justement ce qu'on cherche à détecter. Ils sont renvoyés tronqués par défaut, et il faut documenter qu'ils partent chez le fournisseur du modèle.

### 6.2 Chemins

- Tous les tools prennent `(group, file)` et passent par `ResolveConfigPath` (`src/json/json.go:231-255`), avec `ValidateName` (`:214-222`) et `EnsureJsonExt` (`:258-264`). Il ne faut **jamais** exposer `ReadJsonFile` / `SaveConfigToJson` / `ListJsonFile` avec un chemin brut (cf. §4.1, `PrintJsonFile` et import).
- `import_collection` avec `source.path` lit un fichier arbitraire du disque. On le limite à un fichier `.json` régulier, de taille bornée (ex. 20 Mo), et on peut le désactiver avec un flag (`--allow-import-path`). Par défaut, on préfère `source.json`.

### 6.3 Requêtes réelles : garde-fous

- **Liste d'hôtes autorisés** : `--allow-hosts` / `APITESTER_ALLOWED_HOSTS` (ex. `localhost:8080,api.staging.example.com`). Sans liste, seuls `localhost`, `127.0.0.1` et `::1` sont autorisés. Tout le trafic passe par le même `http.Client`, créé dans `NewApi` (`request.go:21-29`) et partagé avec les authenticators (`checkConfig.go:31-32`). Un `http.RoundTripper` qui filtre l'hôte, plus un `CheckRedirect` (les redirections sont aujourd'hui suivies sans contrôle), couvre donc **toutes** les requêtes : `basicUrl`, `oauth2.tokenUrl` et `login.url` absolue (`auth.go:321-324`).
- **Méthodes** : `GET`/`HEAD` par défaut. Les `POST`/`PUT`/`PATCH`/`DELETE` exigent `allow_mutating:true` **et** un flag serveur `--allow-mutating`. Les tests sautés sont comptés en `skipped`.
- **Confirmation** : (1) les annotations `destructiveHint` / `openWorldHint` pour que le client demande l'accord (Claude Code demande par tool, sauf allowlist) ; (2) l'aperçu suivi d'un `confirm` + `preview_token` pour `update_expected_outputs` ; (3) en option, l'elicitation (`ServerSession.Elicit`, disponible dans go-sdk). Je n'ai **pas vérifié** que Claude Code et Claude Desktop gèrent l'elicitation, donc elle ne peut pas être la seule protection.
- **Modes serveur** : `--read-only` n'expose que les tools Lecture et Exécution. `--allow-write` ajoute l'écriture, `--allow-destructive` ajoute les tools destructifs. Par défaut, je propose `--allow-write` sans destructif.
- **Limites** : `max_tests` par appel (ex. 200), concurrence conservée à `maxConcurrentChecks = 2` (`checkConfig.go:18`).

### 6.4 Timeouts

- Il existe déjà un timeout de **10 s par requête** (`request.go:25`), mais aucun timeout global ni aucune annulation. Un groupe de N tests peut prendre jusqu'à environ N×10/2 s.
- Ajouter un `context.WithTimeout` par tool (`timeout_s`, 120 s par défaut, plafonné), propagé jusqu'aux requêtes (§4.2 point 2), et respecter l'annulation envoyée par le client.
- Émettre des **notifications de progression** (`progressToken`) pendant les runs de groupe.
- Côté Claude Code : `MCP_TOOL_TIMEOUT`, ou `timeout` en ms par serveur dans `.mcp.json` (source : doc Claude Code citée plus haut).

### 6.5 Concurrence avec l'UI

Situation actuelle :
- Le polling de l'UI (`main.js:9`) ne relit que l'arbre. Les fichiers créés par MCP apparaissent donc tout seuls en ≤ 3 s, mais **l'éditeur ne recharge pas** une config modifiée ailleurs.
- `SaveConfig` (`frontend/src/JS/config/save-config.js:11` → `app.go:255-271`) écrase tout le fichier : un enregistrement depuis l'UI **efface silencieusement** une modification faite par l'agent.
- `CheckConfig` réécrit le fichier après **chaque** run (`checkConfig.go:244`). Un run UI et un run MCP simultanés sur la même config aboutissent à « dernier écrivain gagnant ».

Mesures :
1. Les runs MCP ne réécrivent pas (`WriteBack=false`), sauf `update_expected_outputs`.
2. Écriture atomique (§4.2 point 8).
3. Verrouillage optimiste : `version` = sha256 du contenu, exigée par `update_config` / `add_test` / `update_expected_outputs`. En cas de conflit, erreur explicite : « relire avec get_config ».
4. Dans le processus MCP : un `sync.Mutex` par chemin, pour sérialiser ses propres écritures.
5. Côté UI (amélioration ultérieure, hors MCP) : mémoriser le `mtime` au chargement dans `edit-config.js` et avertir avant un `SaveConfig` si le fichier a changé. Avec l'option C, `runtime.EventsEmit` suffirait.

---

## 7. Plan d'implémentation

| Étape | Contenu | Effort |
|---|---|---|
| 0. Prérequis | Trancher la version de Go (§3). Logs vers stderr (`src/log/logs.go`, `src/import/postman.go:116`). `APITESTER_CONFIG_DIR`. Écriture atomique dans `SaveConfigToJson`. | 0,5 j |
| 1. `src/service` | Déplacer la logique de `app.go` (§4.1). `App` délègue au service. Corriger `PrintJsonFile` et l'import (validation). Régénérer `frontend/wailsjs` (`wails generate module`) si des signatures changent. Vérifier l'UI à la main. | 1,5–2 j |
| 2. Moteur | `context`, `RunOptions`, `WriteBack` optionnel, `CheckFolderConfig` sans `ListJsonFile`, méthode inconnue ≠ OK, tri, `String()` des enums, RoundTripper hôtes + méthodes. | 1–1,5 j |
| 3. Binaire MCP, phase 1 | `cmd/apitester-mcp/main.go` : `mcp.NewServer`, `StdioTransport`, flags. Tools `list_configs`, `get_config`, `validate_config`, `run_config`, `run_group`, `run_adhoc_test`, `test_auth_profile`, `check_role_access`. Resources `schema` et `enums`. | 1,5–2 j |
| 4. Sécurité | `MaskConfig` et fusion des placeholders, filtrage des erreurs d'auth, troncature, modes `--read-only/--allow-write/--allow-destructive`. | 1–1,5 j |
| 5. Phase 2 | Tools d'écriture et destructifs, aperçu + `preview_token`, `version` optimiste, resources `config/{group}/{file}` et `runs/{id}`, prompts. | 1,5 j |
| 6. Tests et doc | Voir ci-dessous. Section MCP dans `README.md` et `CLAUDE.md`, script de build du 2e binaire. | 1,5–2 j |
| **Total** | | **≈ 9–11 j** |

### Stratégie de test (le repo n'a aucun test aujourd'hui)

- **Moteur** (`src/checkConfig`) : `httptest.NewServer` simule une API à rôles (`/me` renvoie 401 sans token ; `/admin/users` renvoie 403 pour `user` et 200 pour `admin` ; un endpoint « fuyant » renvoie 200 au rôle `user`), plus un endpoint `/login` pour le profil `login`. On vérifie la classification OK/WARNING/ERROR, la règle des centaines (`compareHttpStatus`), `_@empty`, `fillExpectedOutput` et `forcedUpdate`.
- **Service** : `t.Setenv("APITESTER_CONFIG_DIR", t.TempDir())`. Cas de path traversal (`../x`, `a/b`, `..`), collisions de noms, écriture atomique, conflit de `version`.
- **Masquage** : table de tests sur chaque type de profil. On vérifie qu'aucun secret ne sort de `get_config`, des erreurs d'auth ni de `test_auth_profile`, et que la fusion des placeholders conserve la valeur sur disque.
- **Garde-fous réseau** : un hôte hors liste et une redirection vers un hôte hors liste sont tous deux refusés. Un `DELETE` est sauté sans `allow_mutating`.
- **MCP de bout en bout** : `mcp.NewInMemoryTransports()` (go-sdk) relie un client et le serveur en mémoire. On teste `tools/list` (noms, annotations, schémas) et `tools/call` contre le `httptest.Server`.
- **Manuel** : `go build -o build/bin/apitester-mcp ./cmd/apitester-mcp`, puis `npx @modelcontextprotocol/inspector ./build/bin/apitester-mcp --allow-hosts localhost:8080`.
- `go vet ./...` et `go test -race ./...`, car il y a des goroutines partout.

### Configuration client

Claude Code (portée utilisateur, binaire local) :

```bash
claude mcp add --scope user --transport stdio apitester \
  -- /chemin/absolu/ApiTester/build/bin/apitester-mcp \
     --allow-hosts localhost:8080,api.staging.example.com --allow-write
```

Variante partagée via `.mcp.json` dans le projet de l'API testée, avec un timeout par serveur :

```json
{
  "mcpServers": {
    "apitester": {
      "command": "/chemin/absolu/apitester-mcp",
      "args": ["--allow-hosts", "localhost:8080", "--read-only"],
      "timeout": 600000
    }
  }
}
```

Claude Desktop (`claude_desktop_config.json` : `~/Library/Application Support/Claude/` sous macOS, `%APPDATA%\Claude\` sous Windows) :

```json
{
  "mcpServers": {
    "apitester": {
      "command": "C:\\Tools\\apitester-mcp.exe",
      "args": ["--allow-hosts", "localhost:8080", "--allow-write"],
      "env": { "APITESTER_CONFIG_DIR": "C:\\Users\\me\\AppData\\Roaming\\ApiTester" }
    }
  }
}
```

Si l'option C est ajoutée plus tard : `claude mcp add --transport http apitester-ui http://127.0.0.1:<port>/mcp --header "Authorization: Bearer <jeton affiché par l'app>"`.

---

## 8. Risques et questions ouvertes

**Risques**

1. **Montée de version Go** : le SDK v1.5+ exige Go 1.25, et l'impact sur `wails build` (Wails v2.10.2) n'est pas vérifié. Mitigations : go-sdk v1.4.1 ou un `go.mod` séparé.
2. **Régressions UI** pendant le refactor `app.go` → `src/service`, sans aucun test existant. Il faut garder les signatures exportées de `App` à l'identique pendant l'étape 1.
3. **Effets de bord sur les API réelles** : un agent qui lance des `DELETE` contre la prod. D'où les méthodes sûres par défaut, la liste d'hôtes et les annotations.
4. **Fuite de données vers le fournisseur du modèle** : bodies de réponse, PII, tokens présents dans les payloads.
5. **Injection de prompt** depuis les réponses d'API ou le contenu des configs importées.
6. **Écrasement croisé UI ↔ MCP** tant que l'éditeur ne détecte pas les modifications externes (§6.5).
7. **Volume de sortie** : les gros groupes dépassent les limites de tokens. Il faut garder résumé et pagination par défaut.

**Questions pour toi**

1. **Version de Go** : passer tout le module à Go 1.25+ (go-sdk v1.8), ou rester en 1.24 (go-sdk v1.4.1, spec 2025-11-25) ?
2. Un seul binaire (option B, plus simple à distribuer, mais GTK requis sous Linux) ou deux binaires (option A, recommandée) ? Le serveur MCP doit-il fonctionner **sans** l'app ouverte ?
3. **Secrets** : veux-tu introduire des références `${env:VAR}` dans les profils d'auth, pour que ni l'agent ni le fichier JSON ne contiennent de secret en clair ? Ce serait le moment, et cela simplifierait le masquage.
4. Quelle **politique par défaut** : `--read-only`, ou écriture autorisée ? Faut-il autoriser `update_expected_outputs(mode:"force")` via MCP, ou le réserver à l'UI ?
5. **Liste d'hôtes** : localhost par défaut, ou dériver automatiquement les hôtes des `basicUrl` des configs (pratique, mais une config importée pourrait alors pointer n'importe où) ?
6. Faut-il corriger dans la foulée les bugs repérés dans le code existant (indépendants de MCP mais sur le même chemin) ?
   - méthode inconnue comptée OK (`checkConfig.go:353-356`) ;
   - `CheckGroupConfig("root/")` (`check-config.js:59` + `json.go:93-97`) ;
   - `CheckFolderConfig` récursif et non filtré sur `.json` ;
   - `PrintJsonFile` et l'import sans validation de chemin ;
   - réécriture systématique du fichier après un run (`checkConfig.go:244`).
7. Pour `check_role_access` : l'ordre des privilèges (`anon < user < admin`) doit-il être déclaré **dans la config** (nouveau champ `privilegeLevel` sur `AuthProfile`) ou passé en argument à chaque appel ?
8. Faut-il conserver un historique des runs sur disque (ex. `ApiTester/.runs/`), pour que l'agent compare avec le run précédent, ou garder uniquement le cache en mémoire de session ?
