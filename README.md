# APITester

> Software to easily test an API with predefined configurations 

APITester is a powerful tool designed to simplify and automate WEB API testing. With a user-friendly interface and flexible configuration options, it allows developers and QA teams to efficiently test API endpoints and validate responses.
Build with GO and Wails

# Presentation (when finished)
- [see current implementation](#current-implementation)

## Features
### Test Execution

	Choose which config (or a group of config) to run from multiple configuration files, allowing for organized and grouped testing scenarios.
    Execute only one endpoint en the config to test it

### Configuration Management

    Create/Modify/List Configurations: Easily manage your test configurations through an intuitive menu system.
    Multiple Configuration Support: Store and manage several configuration files for different testing scenarios or API versions.
	Use Insomnia / Postman extraction to have a quick start with your existing API collections. (You still need to fill the expected output field)

### Results Dashboard
The results are presented in a clear, tabbed interface for easy analysis:

    OK Tab:
        Displays all tests that passed successfully.
        Exact match between expected and actual responses.
    WARNING Tab:
        Shows tests with minor discrepancies.
        Actual response contains at least the minimum expected keys from the configuration file, but may have additional or slightly different data.
    ERROR Tab:
        Highlights tests that failed critically.
        Includes incorrect HTTP status codes, missing key-value pairs compared to the expected configuration, or other significant issues.

### Flexible Configuration Format

    Support for various HTTP methods (GET, POST, PUT, PATCH, DELETE).
    Customizable expected outputs and HTTP status codes.
    Multiple authentication methods (API Key, OAuth2, Basic Auth).

    ```json
    {
	  "basicUrl": "https://api.example.com",
	  "authentication": {
	    "type": "apikey",
	    "apikey": "your-api-key"
	  },
	  "endpoints": [
	    {
	      "path": "/users",
	      "tests": [
	        {
	          "method": "GET",
	          "expectedOutput": {"id": 1, "name": "John Doe"},
	          "expectedHttpState": "200"
	        },
	        // More tests...
	      ]
	    },
	    // More endpoints...
	  ]
	}
	```

## License
[MIT LICENSE](./LICENSE)



# <a id="current-implementation"></a>Current implementation
> - Import Insomnia / Postman extraction
> - Rename/Delete/Read a config
> - Execute a config
> - Execute a folder of config (multithread) / execute a config


# README

## About

This is the official Wails Vanilla template.

You can configure the project by editing `wails.json`. More information about the project settings can be found
here: https://wails.io/docs/reference/project-config

## Live Development

To run in live development mode, run `wails dev` in the project directory. This will run a Vite development
server that will provide very fast hot reload of your frontend changes. If you want to develop in a browser
and have access to your Go methods, there is also a dev server that runs on http://localhost:34115. Connect
to this in your browser, and you can call your Go code from devtools.

## Building

To build a redistributable, production mode package, use `wails build`.
