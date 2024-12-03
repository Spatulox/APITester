package requestapigo

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// Api struct
type Api struct {
	baseApi     string
	apiKey      string
	bearerToken string
	username    string
	password    string
}

// ------------------------------------------------------------------------- //

// NewApi new api instance
func NewApi(baseApi string) *Api {
	return &Api{baseApi: baseApi}
}

// ------------------------------------------------------------------------- //
/* AUTHENTIFICATION */
// ------------------------------------------------------------------------- //

func (api *Api) AddApiKey(apiKey string) {
	api.apiKey = apiKey
}

// ------------------------------------------------------------------------- //

func (api *Api) AddBearerToken(token string) {
	api.bearerToken = token
}

// ------------------------------------------------------------------------- //

func (api *Api) AddBasicAuth(username, password string) {
	api.username = username
	api.password = password
}

// ------------------------------------------------------------------------- //

func (api *Api) addAuth(req *http.Request) {
	if api.apiKey != "" {
		req.Header.Add("Authorization", "ApiKey "+api.apiKey)
	} else if api.bearerToken != "" {
		req.Header.Add("Authorization", "Bearer "+api.bearerToken)
	} else if api.username != "" && api.password != "" {
		req.SetBasicAuth(api.username, api.password)
	}
}

// ------------------------------------------------------------------------- //
/* REQUESTS */
// ------------------------------------------------------------------------- //

// GET function to request an API
func (api *Api) GET(endpoint string, data *interface{}) (string, error) {
	if data == nil {
		return api.genericRequest("GET", endpoint, nil)
	}
	return api.genericRequest("GET", endpoint, *data)
}

// POST function to request an API
func (api *Api) POST(endpoint string, data interface{}) (string, error) {
	return api.genericRequest("POST", endpoint, data)
}

// PUT function to request an API
func (api *Api) PUT(endpoint string, data interface{}) (string, error) {
	return api.genericRequest("PUT", endpoint, data)
}

// PATCH function to request an API
func (api *Api) PATCH(endpoint string, data interface{}) (string, error) {
	return api.genericRequest("PATCH", endpoint, data)
}

// DELETE function to request an API
func (api *Api) DELETE(endpoint string) (string, error) {
	return api.genericRequest("DELETE", endpoint, nil)
}

// ------------------------------------------------------------------------- //

func (api *Api) genericRequest(method, endpoint string, data interface{}) (string, error) {
	var body *bytes.Buffer
	if data != nil {
		jsonData, err := json.Marshal(data)
		if err != nil {
			return "", err
		}
		body = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, api.baseApi+endpoint, body)
	if err != nil {
		return "", err
	}

	if data != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	api.addAuth(req)

	return api.request(req)
}

// ------------------------------------------------------------------------- //

func (api *Api) request(req *http.Request) (string, error) {
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return string(body), fmt.Errorf("status code error: %d %s", resp.StatusCode, resp.Status)
	}

	return string(body), nil
}
