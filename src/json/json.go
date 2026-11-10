package json

import (
	. "ApiTester/src/log"
	. "ApiTester/src/struct"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// -------------------------------------------- //

// ReadJsonFile lit un fichier JSON situé dans le répertoire de configuration de l'utilisateur
// (généralement accessible via os.UserConfigDir) et le décode dans la structure fournie.
//
// Paramètres :
//   - @filePath : Le chemin relatif du fichier JSON à lire, situé dans le sous-répertoire "ApiTester"
//     du répertoire de configuration de l'utilisateur.
//   - @structure : Un pointeur vers la structure dans laquelle les données JSON seront décodées.
//
// Retourne :
//   - Une erreur si un problème survient lors de l'accès au répertoire,
//     de l'ouverture du fichier ou du décodage des données. Sinon, retourne nil.
func ReadJsonFile[T any](filePath string, structure *T) error {

	appDataPath, err := os.UserConfigDir()
	if err != nil {
		return fmt.Errorf("error obtaining AppData/conf folder: %v", err)
	}

	pathDir := filepath.Join(appDataPath, "ApiTester")
	pathFile := filepath.Join(pathDir, filePath)

	file, err := os.Open(pathFile)
	if err != nil {
		return err
	}
	defer file.Close()

	decoder := json.NewDecoder(file)
	err = decoder.Decode(structure)
	if err != nil {
		return err
	}

	return nil
}

func OldReadJsonFile[T any](filePath string, structure *T) error {

	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	decoder := json.NewDecoder(file)
	err = decoder.Decode(structure)
	if err != nil {
		return err
	}

	return nil
}

// -------------------------------------------- //

// ListJsonFile parcourt un répertoire spécifié dans le dossier de configuration de l'utilisateur
// (généralement accessible via os.UserConfigDir) et renvoie une carte contenant les fichiers JSON
// organisés par dossier. Les fichiers sont récupérés depuis le sous-répertoire "ApiTester"
// et éventuellement d'un sous-dossier spécifié par folderPath.
//
// Paramètres :
//   - @folderPath : Un pointeur vers une chaîne de caractères représentant le chemin relatif d'un
//     sous-dossier à l'intérieur du répertoire "ApiTester". Si nil, la fonction liste les fichiers
//     à la racine de "ApiTester".
//
// Retourne :
//   - Une carte (map) où les clés sont les noms des dossiers et les valeurs sont des tranches de
//     chaînes contenant les noms des fichiers JSON. En cas d'erreur, retourne nil et l'erreur correspondante.
func ListJsonFile(folderPath *string) (map[string]interface{}, error) {
	appDataPath, err := os.UserConfigDir()
	if err != nil {
		return nil, fmt.Errorf("error obtaining AppData/conf folder: %v", err)
	}

	folderFiles := make(map[string]interface{})

	pathDir := filepath.Join(appDataPath, "ApiTester")
	if folderPath != nil {
		pathDir = filepath.Join(pathDir, *folderPath)
	}

	if err := os.MkdirAll(pathDir, os.ModePerm); err != nil {
		return nil, fmt.Errorf("error creating directory %s: %v", pathDir, err)
	}

	err = filepath.Walk(pathDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}

		// Extract the name of the parent directory
		parentDir := filepath.Dir(path)
		folderName := filepath.Base(parentDir)

		if folderName == "ApiTester" {
			folderName = "root" // Use "root" for files at the root level of ApiTester
		}

		// Check if the folder already exists in the map
		if _, exists := folderFiles[folderName]; !exists {
			folderFiles[folderName] = []string{}
		}

		folderFiles[folderName] = append(folderFiles[folderName].([]string), info.Name())
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("error reading files: %v", err)
	}

	return folderFiles, nil
}

// -------------------------------------------- //

// SaveConfigToJson enregistre une configuration au format JSON dans un fichier spécifié dans le
// répertoire de configuration de l'utilisateur (généralement accessible via os.UserConfigDir).
// Les fichiers sont enregistrés dans le sous-répertoire "ApiTester" et dans un chemin relatif
// spécifié par le paramètre path.
//
// Paramètres :
//   - @config : La configuration à enregistrer, de type Config, qui sera encodée en JSON.
//   - @path : Le chemin relatif vers le sous-dossier où le fichier sera enregistré, à l'intérieur
//     du répertoire "ApiTester".
//   - @filename : Le nom du fichier dans lequel la configuration sera enregistrée. Doit être non vide.
//
// Retourne :
//   - Une erreur si un problème survient lors de l'accès au répertoire, de la création du fichier,
//     ou de l'encodage des données en JSON. Sinon, retourne nil après un enregistrement réussi.
func SaveConfigToJson(config Config, path string, filename string) error {
	appDataPath, err := os.UserConfigDir()
	if err != nil {
		return fmt.Errorf("error obtaining AppData folder: %v", err)
	}

	if filename == "" {
		return fmt.Errorf("error: filename is empty")
	}

	pathDir := filepath.Join(appDataPath, "ApiTester")
	pathDir = filepath.Join(pathDir, path)

	if err := os.MkdirAll(pathDir, os.ModePerm); err != nil {
		return fmt.Errorf("error creating directory %s: %v", pathDir, err)
	}

	if !strings.HasSuffix(filename, ".json") {
		filename += ".json"
	}

	filePath := filepath.Join(pathDir, filename)

	file, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("could not create file: %v", err)
	}
	defer file.Close()

	// JSON Encoder
	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ") // Human-readable format
	if err := encoder.Encode(config); err != nil {
		return fmt.Errorf("could not encode config to JSON: %v", err)
	}
	Log.Infos(fmt.Sprintf("Save successful in %s", pathDir))
	return nil
}

// -------------------------------------------- //
// Gestion de l'arborescence des configs (groupes = un seul niveau de sous-dossiers)

// RootGroup est le nom utilisé côté front pour les fichiers à la racine de ApiTester.
const RootGroup = "root"

// ConfigGroup représente un groupe (dossier) et ses fichiers de config.
type ConfigGroup struct {
	Name  string   `json:"name"`
	Files []string `json:"files"`
}

// ConfigRoot renvoie le dossier racine des configs (UserConfigDir/ApiTester) et le crée si besoin.
func ConfigRoot() (string, error) {
	appDataPath, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("error obtaining AppData/conf folder: %v", err)
	}
	root := filepath.Join(appDataPath, "ApiTester")
	if err := os.MkdirAll(root, os.ModePerm); err != nil {
		return "", fmt.Errorf("error creating directory %s: %v", root, err)
	}
	return root, nil
}

// ValidateName vérifie qu'un nom de fichier ou de groupe est un simple nom (pas de chemin).
func ValidateName(name string) error {
	if strings.TrimSpace(name) == "" {
		return fmt.Errorf("name cannot be empty")
	}
	if name == "." || name == ".." || strings.ContainsAny(name, `/\`) || strings.ContainsRune(name, 0) {
		return fmt.Errorf("invalid name %q", name)
	}
	return nil
}

// IsRootGroup indique si le groupe désigne la racine.
func IsRootGroup(group string) bool {
	return group == "" || group == RootGroup
}

// ResolveConfigPath renvoie le chemin absolu de group/file (file peut être vide pour le dossier du groupe).
// Refuse tout chemin qui sortirait du dossier racine.
func ResolveConfigPath(group, file string) (string, error) {
	root, err := ConfigRoot()
	if err != nil {
		return "", err
	}
	parts := []string{root}
	if !IsRootGroup(group) {
		if err := ValidateName(group); err != nil {
			return "", fmt.Errorf("group: %v", err)
		}
		parts = append(parts, group)
	}
	if file != "" {
		if err := ValidateName(file); err != nil {
			return "", fmt.Errorf("file: %v", err)
		}
		parts = append(parts, file)
	}
	full := filepath.Clean(filepath.Join(parts...))
	rel, err := filepath.Rel(root, full)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("path outside of config directory")
	}
	return full, nil
}

// EnsureJsonExt ajoute l'extension .json si absente.
func EnsureJsonExt(name string) string {
	name = strings.TrimSpace(name)
	if !strings.HasSuffix(strings.ToLower(name), ".json") {
		name += ".json"
	}
	return name
}

// PathExists indique si un chemin existe.
func PathExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func listJsonIn(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	files := []string{}
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(strings.ToLower(e.Name()), ".json") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)
	return files, nil
}

// ListConfigTree liste les groupes (y compris vides), triés, avec "root" en dernier.
func ListConfigTree() ([]ConfigGroup, error) {
	root, err := ConfigRoot()
	if err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(root)
	if err != nil {
		return nil, fmt.Errorf("error reading %s: %v", root, err)
	}

	groups := []ConfigGroup{}
	for _, e := range entries {
		if !e.IsDir() || strings.HasPrefix(e.Name(), ".") {
			continue
		}
		files, err := listJsonIn(filepath.Join(root, e.Name()))
		if err != nil {
			Log.Error(fmt.Sprintf("error reading group %s: %v", e.Name(), err))
			continue
		}
		groups = append(groups, ConfigGroup{Name: e.Name(), Files: files})
	}
	sort.Slice(groups, func(i, j int) bool {
		return strings.ToLower(groups[i].Name) < strings.ToLower(groups[j].Name)
	})

	rootFiles, err := listJsonIn(root)
	if err != nil {
		return nil, err
	}
	groups = append(groups, ConfigGroup{Name: RootGroup, Files: rootFiles})
	return groups, nil
}
