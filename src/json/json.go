package json

import (
	. "ApiTester/src/log"
	. "ApiTester/src/struct"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
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
