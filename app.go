package main

import (
	. "ApiTester/src/checkConfig"
	. "ApiTester/src/import"
	. "ApiTester/src/json"
	. "ApiTester/src/log"
	. "ApiTester/src/struct"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) ListJsonFile(folderName *string) (map[string]interface{}, error) {

	if folderName != nil {
		return ListJsonFile(folderName)
	} else {
		return ListJsonFile(nil)
	}

}

func (a *App) OpenFileExplorer() error {
	appDataPath, err := os.UserConfigDir()
	if err != nil {
		return fmt.Errorf("error obtaining AppData/conf folder: %v", err)
	}

	pathDir := filepath.Join(appDataPath, "ApiTester")

	// Ouvrir l'explorateur de fichiers en fonction du système d'exploitation
	if runtime.GOOS == "windows" {
		// Commande pour Windows
		cmd := exec.Command("explorer", pathDir)
		return cmd.Start()
	} else if runtime.GOOS == "linux" {
		// Commande pour Linux
		cmd := exec.Command("xdg-open", pathDir) // Utiliser xdg-open pour ouvrir le gestionnaire de fichiers
		return cmd.Start()
	} else {
		return fmt.Errorf("unsupported operating system: %s", runtime.GOOS)
	}
}

func (a *App) CheckSoloConfig(filename string, fillExpectedOutput bool, forcedUpdate bool) ([]RequestResult, error) {

	res, err := CheckConfig(filename, fillExpectedOutput, forcedUpdate)
	if err != nil {
		Log.Error(fmt.Sprintf("Error when checking config : %v", err))
		return nil, err
	}

	return res, nil
}

func (a *App) CheckGroupConfig(pathFilename string, fillExpectedOutput bool, forcedUpdate bool) ([]RequestResult, error) {
	res, err := CheckFolderConfig(pathFilename, fillExpectedOutput, forcedUpdate)
	if err != nil {
		Log.Error(fmt.Sprintf("Error when checking config : %v", err))
		return nil, err
	}

	return res, nil
}

func (a *App) DetectIfOneOreMoreConfFileHaveEmptyExpectedOutputInAConfDir(folderPath string) (bool, error) {
	files, err := ListGroupConfigFiles(folderPath)
	if err != nil {
		Log.Error("impossible to acces to the folder")
		return false, err
	}

	for _, filePath := range files {
		var config Config
		if err := ReadJsonFile(filePath, &config); err != nil {
			Log.Error(fmt.Sprintf("Error reading JSON file %s: %v", filePath, err))
			continue
		}
		if config.GlobalAskedToFillExpectedOutPut == "false" {
			return true, nil
		}
	}
	return false, nil
}

// Only Front call
func (a *App) CheckEndpoint(config Config) ([]RequestResult, error) {
	return ExecuteConfig(&config, false, false)
}

func (a *App) ParseExtractionJsonToGoFunction(data map[string]interface{}, path string, filename string) error {
	var config Config
	var err error

	// Try to parse the data as Postman export
	config, err = ParsePostmanExport(data)
	if err != nil {
		// If error

		// If parsing Postman export is successful, try parsing Insomnia export
		config, err = ParseInsomniaExport(data)
		if err != nil {
			return fmt.Errorf("error parsing Insomnia export: %v", err)
		}

		//return fmt.Errorf("error parsing Postman export: %v", err)
	}

	if path == "root" {
		path = ""
	}

	// If both parsing attempts are successful, save the config
	if err := SaveConfigToJson(config, path, filename); err != nil {
		return fmt.Errorf("error saving config to JSON: %v", err)
	}

	return nil
}

// -------------------------------------------- //
// Gestion des fichiers de config (arborescence, renommage, déplacement, création, suppression)
// Toutes les méthodes prennent (group, file) séparément ; group == "root" (ou "") désigne la racine.

// ListConfigTree renvoie les groupes (y compris vides) et leurs fichiers ; "root" est toujours le dernier.
func (a *App) ListConfigTree() ([]ConfigGroup, error) {
	return ListConfigTree()
}

// RenameConfig renomme un fichier de config sans changer de groupe. Renvoie le nom final.
func (a *App) RenameConfig(group string, oldName string, newName string) (string, error) {
	newName = EnsureJsonExt(newName)
	oldPath, err := ResolveConfigPath(group, oldName)
	if err != nil {
		return "", err
	}
	newPath, err := ResolveConfigPath(group, newName)
	if err != nil {
		return "", err
	}
	if !PathExists(oldPath) {
		return "", fmt.Errorf("the file %s does not exist", oldName)
	}
	if oldName == newName {
		return newName, nil
	}
	// Sur un FS insensible à la casse, "a.json" -> "A.json" pointe vers le même fichier
	if PathExists(newPath) && !strings.EqualFold(oldName, newName) {
		return "", fmt.Errorf("a config named %s already exists in this group", newName)
	}
	if err := os.Rename(oldPath, newPath); err != nil {
		return "", fmt.Errorf("error renaming: %v", err)
	}
	return newName, nil
}

// MoveConfig déplace un fichier de config vers un autre groupe (le nom est conservé).
func (a *App) MoveConfig(fromGroup string, fileName string, toGroup string) error {
	if IsRootGroup(fromGroup) && IsRootGroup(toGroup) || fromGroup == toGroup {
		return nil
	}
	oldPath, err := ResolveConfigPath(fromGroup, fileName)
	if err != nil {
		return err
	}
	groupDir, err := ResolveConfigPath(toGroup, "")
	if err != nil {
		return err
	}
	if !PathExists(groupDir) {
		return fmt.Errorf("the group %s does not exist", toGroup)
	}
	newPath, err := ResolveConfigPath(toGroup, fileName)
	if err != nil {
		return err
	}
	if !PathExists(oldPath) {
		return fmt.Errorf("the file %s does not exist", fileName)
	}
	if PathExists(newPath) {
		return fmt.Errorf("a config named %s already exists in the destination group", fileName)
	}
	if err := os.Rename(oldPath, newPath); err != nil {
		return fmt.Errorf("error moving: %v", err)
	}
	return nil
}

// CreateConfig crée une config vide dans un groupe. Si le nom existe déjà, ajoute " (n)". Renvoie le nom final.
func (a *App) CreateConfig(group string, name string) (string, error) {
	name = EnsureJsonExt(name)
	if _, err := ResolveConfigPath(group, name); err != nil {
		return "", err
	}
	base := strings.TrimSuffix(name, ".json")
	finalName := name
	for i := 1; ; i++ {
		p, err := ResolveConfigPath(group, finalName)
		if err != nil {
			return "", err
		}
		if !PathExists(p) {
			break
		}
		finalName = fmt.Sprintf("%s (%d).json", base, i)
	}

	conf := Config{
		Authentication:                  Authentication{Type: "noauth"},
		Endpoint:                        []Endpoint{},
		GlobalAskedToFillExpectedOutPut: "false",
	}
	dir := ""
	if !IsRootGroup(group) {
		dir = group
	}
	if err := SaveConfigToJson(conf, dir, finalName); err != nil {
		return "", err
	}
	return finalName, nil
}

// SaveConfig écrase une config existante (jamais de création/déplacement implicite).
func (a *App) SaveConfig(group string, file string, jsonData interface{}) error {
	path, err := ResolveConfigPath(group, file)
	if err != nil {
		return err
	}
	if !PathExists(path) {
		return fmt.Errorf("the file %s does not exist anymore", file)
	}
	jsonBytes, err := json.MarshalIndent(jsonData, "", "  ")
	if err != nil {
		return fmt.Errorf("error marshaling JSON: %v", err)
	}
	if err := os.WriteFile(path, jsonBytes, 0644); err != nil {
		return fmt.Errorf("error writing to file: %v", err)
	}
	return nil
}

// DeleteConfig supprime un fichier de config.
func (a *App) DeleteConfig(group string, file string) error {
	if file == "" {
		return fmt.Errorf("file name is empty")
	}
	path, err := ResolveConfigPath(group, file)
	if err != nil {
		return err
	}
	info, err := os.Stat(path)
	if err != nil {
		return err
	}
	if info.IsDir() {
		return fmt.Errorf("%s is not a config file", file)
	}
	return os.Remove(path)
}

// CreateGroup crée un groupe (dossier) vide.
func (a *App) CreateGroup(name string) error {
	name = strings.TrimSpace(name)
	if IsRootGroup(name) {
		return fmt.Errorf("invalid group name %q", name)
	}
	path, err := ResolveConfigPath(name, "")
	if err != nil {
		return err
	}
	if PathExists(path) {
		return fmt.Errorf("a group named %s already exists", name)
	}
	return os.Mkdir(path, os.ModePerm)
}

// RenameGroup renomme un groupe.
func (a *App) RenameGroup(oldName string, newName string) error {
	newName = strings.TrimSpace(newName)
	if IsRootGroup(oldName) || IsRootGroup(newName) {
		return fmt.Errorf("the root group cannot be renamed")
	}
	if oldName == newName {
		return nil
	}
	oldPath, err := ResolveConfigPath(oldName, "")
	if err != nil {
		return err
	}
	newPath, err := ResolveConfigPath(newName, "")
	if err != nil {
		return err
	}
	if !PathExists(oldPath) {
		return fmt.Errorf("the group %s does not exist", oldName)
	}
	if PathExists(newPath) && !strings.EqualFold(oldName, newName) {
		return fmt.Errorf("a group named %s already exists", newName)
	}
	if err := os.Rename(oldPath, newPath); err != nil {
		return fmt.Errorf("error renaming: %v", err)
	}
	return nil
}

// DeleteGroup supprime un groupe et toutes ses configs.
func (a *App) DeleteGroup(name string) error {
	if IsRootGroup(name) {
		return fmt.Errorf("the root group cannot be deleted")
	}
	path, err := ResolveConfigPath(name, "")
	if err != nil {
		return err
	}
	if !PathExists(path) {
		return fmt.Errorf("the group %s does not exist", name)
	}
	return os.RemoveAll(path)
}

func (a *App) PrintJsonFile(path string) (Config, error) {
	var conf Config
	err := ReadJsonFile(path, &conf)
	if err != nil {
		return Config{}, err
	}
	return conf, nil
}

// TestAuthProfile exécute uniquement l'authentification d'un profil (login, récupération du token...)
// et renvoie un aperçu masqué de ce qui sera ajouté aux requêtes. Utilisé par "Test connection".
func (a *App) TestAuthProfile(config Config, profileName string) (string, error) {
	api, err := BuildProfileApi(&config, profileName)
	if err != nil {
		return "", err
	}
	return api.Authenticate()
}
