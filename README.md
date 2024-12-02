# APITester

> Software to easily test an API with predefined configurations 

APITester is a powerful tool designed to simplify and automate API testing. With a user-friendly interface and flexible configuration options, it allows developers and QA teams to efficiently test API endpoints and validate responses.
Build with GO and Wails

# Presentation (when finished)
- [see current implementation](#current-implementation)

## Features
### Test Execution

	Test Selection Menu: Choose which tests to run from multiple configuration files, allowing for organized and grouped testing scenarios.

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
> - Nothing at all, only the README.md file...