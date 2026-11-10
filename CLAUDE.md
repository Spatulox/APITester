# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

APITester is a desktop app (Go + [Wails v2](https://wails.io), vanilla JS/Vite frontend). It runs predefined JSON test configs against a web API, so you can check that each role (e.g. "user" vs "admin") gets the expected status codes and payloads and spot endpoints that leak data. Results are sorted into OK / WARNING / ERROR tabs.

## Commands

- `wails dev`: live development with hot reload. It also serves a browser dev server at http://localhost:34115, where Go methods can be called from devtools.
- `wails build`: production build, output in `build/bin/`.
- `go build ./...` / `go vet ./...`: backend-only compile check. `main.go` embeds `frontend/dist` (`//go:embed all:frontend/dist`), so the frontend has to be built (`cd frontend && npm run build`) before a plain `go build` of the main package works.
- There are no tests (no `*_test.go` files) and no lint config.

`frontend/wailsjs/` (the generated JS bindings for Go methods) is gitignored. Wails regenerates it on `wails dev` / `wails build`, or you can run `wails generate module`. Regenerate it after you add or change any exported method on `App`.

## Architecture

**Go ↔ JS bridge.** Every exported method on `App` (`app.go`, plus the native dialog wrappers in `popups.go`) becomes a JS function. Frontend code imports it from `wailsjs/go/main/App`. To expose new backend functionality, add a method on `*App`. Go packages under `src/` are not bound directly.

**Config storage.** All test configs live under `os.UserConfigDir()/ApiTester/` (e.g. `~/.config/ApiTester` on Linux), not in the repo. One level of subfolders acts as "config groups"; files at the top level belong to the group `"root"` (shown as "Sans groupe"). File management goes through `App.ListConfigTree` (returns `[]ConfigGroup{name, files}`, empty groups included, `root` last) and the `(group, file)`-based methods `RenameConfig`, `MoveConfig`, `CreateConfig`, `SaveConfig` (overwrites an existing file only), `DeleteConfig`, `CreateGroup`, `RenameGroup`, `DeleteGroup`. They all resolve paths with `ResolveConfigPath` (`src/json/json.go`), which rejects path separators / `..`. The run methods (`PrintJsonFile`, `CheckSoloConfig`, `CheckGroupConfig`) still take a relative path (`file` or `group/file`, `group/` or `root/` for a whole group). `ReadJsonFile`, `SaveConfigToJson` and `ListJsonFile` resolve it with `ConfigPath`, which also refuses paths escaping the config dir; group runs use `ListGroupConfigFiles` (non-recursive, never creates folders). `CheckConfig` only rewrites a file when the run actually changed it. `ListJsonFile` (`map[folderName][]fileName`) is only used internally. `OldReadJsonFile` is the only reader that takes a real filesystem path. The JSON files in the repo root (`config.json`, `useradmin.json`, `*_Extract*.json`, `testfile/`) are only sample or import fixtures.

**Go packages** (`src/`). They are dot-imported everywhere (`. "ApiTester/src/..."`), so identifiers are used without a package prefix.
- `struct` (package `_struct`): `Config` → `Endpoint` → `Test` schema, `RequestResult`, and the `ResultError` / `ResultWarning` int enums. Error values 400–511 match HTTP status codes.
- `request` (package `requestapigo`): HTTP client `Api` with apikey, bearer, basic, JWT and OAuth2 (client-credentials with token refresh) auth. Each method returns `(status, body, err)`, and any non-200 status comes back as an error.
- `checkConfig`: the core engine. `CheckFolderConfig` → `CheckConfig` (reads the file, runs it, writes it back) → `ExecuteConfig` → `checkEndpoint` per test. Both levels run in goroutines limited by a semaphore (`maxConcurrentChecks`). Comparison rules: an HTTP status in a different hundreds range is an ERROR, the same range with a different code is a WARNING. For JSON, a missing expected key is an ERROR; extra keys, differing values and type mismatches are WARNINGs. With `fillExpectedOutput` / `forcedUpdate`, the actual response is written back into the config as the new `expectedOutput`, and the file is saved.
- `import`: converts Postman and Insomnia export JSON into `Config`. `App.ParseExtractionJsonToGoFunction` tries Postman first, then falls back to Insomnia.
- `log`: `Log.Infos` / `Log.Error` / `Log.Debug` print colored, timestamped console output.

**Frontend** (`frontend/src/`). Plain ES modules with no framework. Layout: an explorer sidebar (`#explorer`) on the left and a workspace with Editor / Results tabs (`JS/workspace.js`) on the right. `JS/explorer/` owns the config tree: `state.js` is the single source of truth (`tree`, `current {group, file}`, collapsed groups, `dirty`); `tree.js` renders it with `data-group` / `data-file` on every row and uses event delegation; `actions.js` wraps the Go file methods; `menu.js` (context menu), `inline-edit.js` (rename in place), `dnd.js` (drag a file onto a group to move it). `main.js` polls `ListConfigTree` every 3s and skips re-rendering while a rename or drag is in progress. In the editor (`JS/config/edit-config.js`) the file name is read-only; renaming/moving only happens from the tree, and `saveCurrentConfig()` (`save-config.js`) always writes to `state.current`. `check-config.js` `runConfig(target, forcedUpdate, button)` runs a file or group under the `window.runningConf` lock. `print-test-result.js` renders the result tabs. `JS/config/auth-profiles.js` edits the auth profiles in memory (never read back from the DOM, so secrets are saved as-is). **`JS/enum.js` mirrors the Go `ResultError` / `ResultWarning` enums by numeric value. Update both sides together.**

## Gotchas

- Auth uses named profiles: `authProfiles[]` (`name`, `type`, `headers`, plus one of `apikey` / `basicAuth` / `bearer` / `oauth2` / `login`), `defaultAuthProfile`, and an optional `authProfile` per test. `type` values are `noauth`, `apikey`, `basicAuth`, `bearer`, `oauth2` and `login`. The legacy single `authentication` block (where `apikey` is an object `{ "keyname", "apikeyvalue" }`) is still read through `Config.Profiles()` as a profile named `default`; the editor writes only `authProfiles`. In Go, `request.NewAuthenticator` builds one `Authenticator` per profile; `ExecuteConfig` shares one `*Api` per profile across goroutines, so login / OAuth2 tokens are fetched once per run (a failed login is not retried, and there is no automatic re-login on 401 because a 401 can be the expected result). Auth failures are `ErrorAuthFailed` (15) and never fill `expectedOutput`.
- Boolean-like flags (`globalAskedToFillExpectedOutPut`, `IsAlreadyAskedToFillExpectedOutPut`) are stored as the strings `"true"` / `"false"`. The json tag on `Endpoint.IsAlreadyAskedToFillExpectedOutPut` is malformed (no quotes), so it serializes under the Go field name.
- `expectedOutput` strings containing `_@empty` / `_@nothing` match an empty response body.
- Code comments and some messages mix French and English.
