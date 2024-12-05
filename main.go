package main

import (
	. "ApiTester/src/checkConfig"
	"embed"
	"fmt"

	//. "ApiTester/src/import"
	. "ApiTester/src/json"
	. "ApiTester/src/struct"
)

func main() {
	_, err := CheckConfig("./useradmin.json")
	if err != nil {
		return
	}
	var conf Config
	ReadJsonFile("./useradmin.json", &conf)

	SaveConfigToJson(conf, "test", "test.json")
	SaveConfigToJson(conf, "", "test.json")
	res, _ := ListJsonFile()
	fmt.Printf("%+v", res)

	// INSOMNIA
	// var json map[string]interface{}
	// ReadJsonFile("./Insomnia.json", &json)

	// config, err := ParseInsomniaExport(json)
	// if err != nil {
	// 	fmt.Printf("%v", err)
	// 	return
	// }

	// fmt.Printf("+v\n", config)

	// POSTMAN
	// var json map[string]interface{}
	// ReadJsonFile("./Postman.json", &json)

	// config, err := ParsePostmanExport(json)
	// if err != nil {
	// 	fmt.Printf("%v", err)
	// 	return
	// }

	// fmt.Printf("+v\n", config)
}

//go:embed all:frontend/dist
var assets embed.FS

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
