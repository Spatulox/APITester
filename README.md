# APITester

> Software to easily test an API with predefined configurations 

- APITester is a powerful tool designed to simplify and automate WEB API testing. With a user-friendly interface and flexible configuration options, it allows developers and QA teams to efficiently test API endpoints and validate responses.
- This tool is used to test all API endpoints under different access levels, such as "user" or "admin", to verify whether each role has the appropriate permissions. It helps detect potential data leaks by identifying unprotected or incorrectly secured endpoints.

Build with GO and Wails

# Presentation (when finished)
- [see current implementation](#current-implementation)

## Features
### Test Execution

	- Choose which config (or a group of config) to run from multiple configuration files, allowing for organized and grouped testing scenarios.
    - Execute config file and test endpoint in multicore/multithread (up to 4 at the same time)
    - Execute only one endpoint in the config to test it
    - Stop an execution when you want
You can run multiple configuration at the same time, juste beware of API spamming (cause of multicore/multithread)

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
    Named authentication profiles (one per role), chosen per test.
    Auth types: noauth, bearer, apikey (header / query / cookie), basicAuth,
    oauth2 (client credentials), login (call a login endpoint and reuse its token).
    Extra headers can be added to any profile.

    ```json
    {
	  "basicUrl": "https://api.example.com",
	  "defaultAuthProfile": "admin",
	  "authProfiles": [
	    { "name": "anon", "type": "noauth" },
	    { "name": "admin", "type": "bearer", "bearer": { "token": "eyJ..." } },
	    { "name": "user", "type": "login",
	      "login": {
	        "url": "/auth/login",
	        "body": { "email": "user@example.com", "password": "..." },
	        "extractFrom": "json", "extractPath": "data.access_token",
	        "injectAs": "bearer"
	      } }
	  ],
	  "endpoints": [
	    {
	      "path": "/users",
	      "tests": [
	        { "method": "GET", "expectedHttpState": "200", "expectedOutput": [{"id": 1}] },
	        { "method": "GET", "authProfile": "user", "expectedHttpState": "403" },
	        { "method": "GET", "authProfile": "anon", "expectedHttpState": "401" }
	      ]
	    }
	  ]
	}
	```

    Older files with a single `"authentication"` block still work: it is used as a
    profile named `default` until the config is saved from the editor.

## License
[MIT LICENSE](./LICENSE)



# <a id="current-implementation"></a>Current implementation
> - Import Insomnia / Postman extraction
> - Rename/Delete/Read a config
> - Execute a folder of config / execute a config (with multithread/multicore)
> - Execute only one enpoint
> - See the result of the execution

# Actual bug
> - Can add an endpoint, but can't add a method (lol)

# Futur adding
> - Adding yaml support for API return ?
> - Stop a config execution
> - Add a tab system per timestamp to run multiple config at the same time
> - Ingore some warning/error


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
