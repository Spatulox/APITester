package main

import (
	. "ApiTester/src/checkConfig"
	. "ApiTester/src/import"
	. "ApiTester/src/json"
	. "ApiTester/src/log"
	. "ApiTester/src/struct"
	"context"
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

func (a *App) CheckSoloConfig(filename string) ([]RequestResult, error) {
	res, err := CheckConfig(filename)
	if err != nil {
		Log.Error(fmt.Sprintf("Error when checking config : %v", err))
		return nil, err
	}

	return res, nil
}

func (a *App) CheckGroupConfig(pathFilename string) ([]RequestResult, error) {
	res, err := CheckFolderConfig(pathFilename)
	if err != nil {
		Log.Error(fmt.Sprintf("Error when checking config : %v", err))
		return nil, err
	}

	return res, nil
}

func (a *App) SendJsonToGoFunction(data map[string]interface{}, path string, filename string) error {
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

	Log.Infos(pathDir)
	fullPath := filepath.Clean(pathDir)

	fileInfo, err := os.Stat(fullPath)
	if err != nil {
		return err
	}
	Log.Infos(fullPath)
	if fileInfo.IsDir() {
		return os.RemoveAll(fullPath)
	} else {
		return os.Remove(fullPath)
	}
}

func (a *App) PrintJsonFile(path string) (Config, error) {
	/*	appDataPath, err := os.UserConfigDir()
		if err != nil {
			return Config{}, fmt.Errorf("error obtaining AppData/conf folder: %v", err)
		}

		pathDir := filepath.Join(appDataPath, "ApiTester")
		pathDir = filepath.Join(pathDir, path)*/

	var conf Config
	err := ReadJsonFile(path, &conf)
	if err != nil {
		return Config{}, err
	}
	return conf, nil
}
