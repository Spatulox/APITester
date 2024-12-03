package main

import (
	. "ApiTester/src/json"
	. "ApiTester/src/log"
	. "ApiTester/src/request"
	"embed"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	var config Config
	ReadJsonFile("./useradmin.json", &config)

	apiApiKey := NewApi(config.BasicURL)
	apiApiKey.AddApiKey(config.Authentication.APIKey)

	for i, endpoint := range config.Endpoint {
		for i2, test := range endpoint.Tests {
			var input interface{} = test.Input
			switch strings.ToUpper(test.Method) {
			case "GET":
				// Request API
				status, result, err := apiApiKey.GET(endpoint.Path, &input)
				if err != nil {
					Log.Error(fmt.Sprintf("Impossible to retrieve the %s!", endpoint.Path))
					return
				}

				// Compare http code result
				if test.ExpectedHttpState != strconv.Itoa(status) {
					// False http status
					return
				}

				// Compare result
				expectedOutputBytes, err := json.Marshal(test.ExpectedOutput)
				if err != nil {
					fmt.Println("Error marshalling expected output:", err)
					return
				}
				expectedOutputString := string(expectedOutputBytes)

				// Compare the JSON string with the result
				if result == expectedOutputString {
					Log.Infos("Same informations")
				} else {
					// Compare the key to know if they exist in the expected output and result
				}
			case "POST":
			case "PATCH":
			case "PUT":
			case "DELETE":
			default:
				Log.Infos(fmt.Sprintf("Méthode non reconnue pour l'endpoint %d, test %d : %s", i, i2, test.Method))
			}
		}
	}
}

/*func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "ApiTester",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}*/
