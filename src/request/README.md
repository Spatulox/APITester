## Presentation
This package is named `requestapigo`
All request methods expect an interface. Ensure that the provided interface matches the API's expected format.

```go
// POST function expect an interface
func (api *Api) POST(endpoint string, data interface{}) (string, error) {
    return api.genericRequest("POST", endpoint, data)
}
```

You can use a `map[string]interface{}` (like a JSON object in GO) or a structure with json tag

Structure with json tag :
```go
type Login struct {
    Email  string `json:"name"`             // the "json tag" is for the apipart (make sure it match the dataname expected by the api)
    Password string `json:"email"`          // the "json tag" is for the apipart (make sure it match the dataname expected by the api)
}
```


## Example

### How to instanciate a new API connexion
```go
func main() {
    

    // Without auth
    apiNoAuth := NewApi("https://api.example.com")
    

    // ------ With Basic Auth ------
    apiBasicAuth := NewApi("https://api.example.com")
    apiBasicAuth.AddBasicAuth("username", "password")


    // ------------------------------------------- //


    // Example Data to login
    data := map[string]interface{}{
        "email": "john.doe@example.com",
        "password": "AZERTY",
    }

    // You can use a struct too.
    data := Login{
        Email: "john@example.com",
        Name:  "John Doe",
    }

    // ------ With apiKey ------
    apiApiKey := NewApi("https://api.example.com")
    resultString := apiApiKey.POST("/login", data) // Use the request method expected by the API
    // Parse the resultString, to extract the apikey and put it inside the following function
    apiApiKey.AddApiKey("apikey")
    

    // ------ With Bearer Token ------
    apiBearerToken := NewApi("https://api.example.com")
    resultString := apiBearerToken.POST("/login", data)  // Use the request method expected by the API
    // Parse the resultString, to extract the bearer token and put it inside the following function
    apiBearerToken.AddBearerToken("bearer-token")
    

    // ------------------------------------------- //


    // Using the package
    response, err := api.GET("/endpoint")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println(response)
}

```

### Full example
```go
func main() {

    // Init login data // Like a JSON
    data := map[string]interface{}{
        "email": "john.doe@example.com",
        "password": "qwerty123",
    }

    data := User{
        Name:  "John Doe",
        Email: "john@example.com",
        Age:   30,
    }

    api := NewApi("https://api.example.com")

    apikey := api.POST("/login", data)
    apiApiKey.AddApiKey(apikey)

    data = map[string]interface{}{
        "name": "Doe",
        "firstname": "John",
        "phone":"0000000000"
    }

    // Call any request with any METHOD
    response, err := api.PUT("/users", data)
    if err != nil {
        log.Fatalf("Error when requesting users : %v", err)
    }

    fmt.Println("API response :", response)
}

```

### "Special feature"
```go
// To have a full compatibility with old API, you can pass map[string]interface{} (like a JSON) to a GET request
func main() {
    // Full example

    // Init login data // Like a JSON
    data := map[string]interface{}{
        "email": "john.doe@example.com",
        "password": "qwerty123",
    }

    api := NewApi("https://api.example.com")

    apikey := api.GET("/login", &data)
    if(apikey == ""){
        fmt.Printf("Something went wrong")
        return
    }
    apiApiKey.AddApiKey(apikey)
}

```