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

func (a *App) CheckSoloConfig(filename string, fillExpectedOutput ...bool) ([]RequestResult, error) {

	shouldFill := false
	if len(fillExpectedOutput) > 0 {
		shouldFill = fillExpectedOutput[0]
	}

	res, err := CheckConfig(filename, shouldFill)
	if err != nil {
		Log.Error(fmt.Sprintf("Error when checking config : %v", err))
		return nil, err
	}

	return res, nil
}

func (a *App) CheckGroupConfig(pathFilename string, fillExpectedOutput ...bool) ([]RequestResult, error) {

	shouldFill := false
	if len(fillExpectedOutput) > 0 {
		shouldFill = fillExpectedOutput[0]
	}

	res, err := CheckFolderConfig(pathFilename, shouldFill)
	if err != nil {
		Log.Error(fmt.Sprintf("Error when checking config : %v", err))
		return nil, err
	}

	return res, nil
}

// Only Front call
func (a *App) CheckEndpoint(config Config, fillExpectedOutput bool) ([]RequestResult, error) {
	return ExecuteConfig(config, fillExpectedOutput)
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

func (a *App) RenameFolder(oldName string, newName string) error {

	appDataPath, err := os.UserConfigDir()
	if err != nil {
		return fmt.Errorf("error obtaining AppData/conf folder: %v", err)
	}

	pathDir := filepath.Join(appDataPath, "ApiTester")

	oldPath := filepath.Join(pathDir, oldName)
	newPath := filepath.Join(pathDir, newName)

	// Vérifier si l'ancien chemin existe (fichier ou dossier)
	oldInfo, err := os.Stat(oldPath)
	if os.IsNotExist(err) {
		return fmt.Errorf("the path %s does not exist", oldName)
	} else if err != nil {
		return fmt.Errorf("error checking old path: %v", err)
	}

	// Vérifier si le nouveau chemin existe déjà
	if _, err := os.Stat(newPath); !os.IsNotExist(err) {
		return fmt.Errorf("a file or folder with the name %s already exists", newName)
	}

	// Si c'est un dossier, s'assurer que le dossier parent du nouveau chemin existe
	if oldInfo.IsDir() {
		newParentDir := filepath.Dir(newPath)
		if err := os.MkdirAll(newParentDir, os.ModePerm); err != nil {
			return fmt.Errorf("error creating parent directories: %v", err)
		}
	}

	// Renommer le fichier ou le dossier
	err = os.Rename(oldPath, newPath)
	if err != nil {
		return fmt.Errorf("error renaming: %v", err)
	}

	return nil
}

func (a *App) UpdateConfig(jsonData interface{}, filename string) error {
	// Marshal the JSON data
	jsonBytes, err := json.Marshal(jsonData)
	if err != nil {
		return fmt.Errorf("error marshaling JSON: %v", err)
	}

	appDataPath, err := os.UserConfigDir()
	if err != nil {
		return fmt.Errorf("error obtaining AppData/conf folder: %v", err)
	}

	// Create the full path for the file
	pathDir := filepath.Join(appDataPath, "ApiTester", filename)

	// Create the directory if it doesn't exist
	dir := filepath.Dir(pathDir) // Get the directory part of the path
	err = os.MkdirAll(dir, 0755) // Create the directory and all parents if necessary
	if err != nil {
		return fmt.Errorf("error creating directory: %v", err)
	}

	// Write to the specified file
	err = os.WriteFile(pathDir, jsonBytes, 0644) // 0644 sets permissions for the file
	if err != nil {
		return fmt.Errorf("error writing to file: %v", err)
	}

	return nil
}

func (a *App) DeleteConfig(path *string) error {

	if path == nil {
		return fmt.Errorf("le chemin est nul")
	}

	if strings.HasPrefix(*path, "root") {
		*path = strings.TrimPrefix(*path, "root/")
		*path = strings.TrimPrefix(*path, "root\\")
	}

	appDataPath, err := os.UserConfigDir()
	if err != nil {
		return fmt.Errorf("error obtaining AppData/conf folder: %v", err)
	}

	pathDir := filepath.Join(appDataPath, "ApiTester")
	pathDir = filepath.Join(pathDir, *path)

	fullPath := filepath.Clean(pathDir)

	fileInfo, err := os.Stat(fullPath)
	if err != nil {
		return err
	}

	if fileInfo.IsDir() {
		return os.RemoveAll(fullPath)
	} else {
		return os.Remove(fullPath)
	}
}

func (a *App) PrintJsonFile(path string) (Config, error) {
	var conf Config
	err := ReadJsonFile(path, &conf)
	if err != nil {
		return Config{}, err
	}
	return conf, nil
}
