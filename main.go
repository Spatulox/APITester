package main

import (
	. "ApiTester/src/checkConfig"
	. "ApiTester/src/import"
	. "ApiTester/src/json"
	. "ApiTester/src/struct"
	"embed"
	"fmt"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func initJsonFiles() {
	var conf Config
	OldReadJsonFile("./useradmin.json", &conf)

	SaveConfigToJson(conf, "test", "test.json")
	SaveConfigToJson(conf, "test", "test1.json")

	_, err := CheckFolderConfig("test", false)
	if err != nil {
		return
	}

	//INSOMNIA
	var json map[string]interface{}
	OldReadJsonFile("./Insomnia_Extract.json", &json)

	config, err := ParseInsomniaExport(json)
	if err != nil {
		fmt.Printf("%v", err)
		return
	}
	SaveConfigToJson(config, "", "test11.json")
	fmt.Printf("+v\n", config)

	//POSTMAN
	OldReadJsonFile("./Postman_Extract.json", &json)

	config, err = ParsePostmanExport(json)
	if err != nil {
		fmt.Printf("%v", err)
		return
	}

	SaveConfigToJson(config, "", "test12.json")
	fmt.Printf("+v\n", config)
}

func main() {

	//initJsonFiles()
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "ApiTester",
		Width:  1400,
		Height: 800,
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
}
