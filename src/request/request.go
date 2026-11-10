package requestapigo

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Api struct {
	url    string
	client *http.Client
	auth   Authenticator
}

// ------------------------------------------------------------------------- //

// NewApi new api instance (sans authentification)
func NewApi(url string) *Api {
	return &Api{
		url: url,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		auth: noAuth{},
	}
}

// Client renvoie le client HTTP partagé (utilisé aussi pour les requêtes de login / token)
func (api *Api) Client() *http.Client {
	return api.client
}

// BaseURL renvoie l'URL de base de l'API
func (api *Api) BaseURL() string {
	return api.url
}

// SetAuthenticator définit la manière de s'authentifier pour toutes les requêtes
func (api *Api) SetAuthenticator(a Authenticator) {
	if a == nil {
		a = noAuth{}
	}
	api.auth = a
}

// Authenticate force l'authentification (login / récupération du token) sans envoyer de requête
// à l'API. Renvoie un aperçu de ce qui serait injecté.
func (api *Api) Authenticate() (string, error) {
	req, err := http.NewRequest("GET", api.url, nil)
	if err != nil {
		return "", err
	}
	if err := api.auth.Apply(req); err != nil {
		return "", err
	}
	return describeRequestAuth(req), nil
}

// ------------------------------------------------------------------------- //
/* AUTHENTIFICATION (raccourcis) */
// ------------------------------------------------------------------------- //

func (api *Api) AddApiKey(key_name string, value string) error {
	if len(key_name) == 0 || len(value) == 0 {
		return fmt.Errorf("key name or value are empty for apikey")
	}
	api.SetAuthenticator(&apiKeyAuth{name: key_name, value: value, addTo: "header"})
	return nil
}

func (api *Api) AddBearerToken(token string) error {
	if len(token) == 0 {
		return fmt.Errorf("bearer Token is empty")
	}
	api.SetAuthenticator(&bearerAuth{token: token})
	return nil
}

func (api *Api) AddBasicAuth(username, password string) error {
	if len(username) == 0 || len(password) == 0 {
		return fmt.Errorf("username or password are empty for basic auth")
	}
	api.SetAuthenticator(&basicAuthenticator{username: username, password: password})
	return nil
}

func (api *Api) AddOAuth2(clientId, clientSecret, tokenUrl string) error {
	a := newOAuth2Auth(clientId, clientSecret, tokenUrl, "", "", api.client)
	api.SetAuthenticator(a)
	_, err := a.token()
	if err != nil {
		return fmt.Errorf("erreur lors de l'obtention du token OAuth2 : %v", err)
	}
	return nil
}

// ------------------------------------------------------------------------- //
/* REQUESTS */
// ------------------------------------------------------------------------- //

// GET function to request an API
func (api *Api) GET(endpoint string, data *interface{}) (int, string, error) {
	if data == nil {
		return api.genericRequest("GET", endpoint, nil)
	}
	return api.genericRequest("GET", endpoint, *data)
}

// POST function to request an API
func (api *Api) POST(endpoint string, data interface{}) (int, string, error) {
	return api.genericRequest("POST", endpoint, data)
}

// PUT function to request an API
func (api *Api) PUT(endpoint string, data interface{}) (int, string, error) {
	return api.genericRequest("PUT", endpoint, data)
}

// PATCH function to request an API
func (api *Api) PATCH(endpoint string, data interface{}) (int, string, error) {
	return api.genericRequest("PATCH", endpoint, data)
}

// DELETE function to request an API
func (api *Api) DELETE(endpoint string) (int, string, error) {
	return api.genericRequest("DELETE", endpoint, nil)
}

// ------------------------------------------------------------------------- //

func (api *Api) genericRequest(method, endpoint string, data interface{}) (int, string, error) {
	var bodyReader io.Reader
	if data != nil {
		jsonData, err := json.Marshal(data)
		if err != nil {
			return 0, "", err
		}
		bodyReader = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, api.url+endpoint, bodyReader)
	if err != nil {
		return 0, "", err
	}

	if data != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	if err := api.auth.Apply(req); err != nil {
		return 0, "", &AuthError{Err: err}
	}

	return api.request(req)
}

// ------------------------------------------------------------------------- //

func (api *Api) request(req *http.Request) (int, string, error) {
	client := api.client
	resp, err := client.Do(req)
	if err != nil {
		return 0, "", err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, "", err
	}

	if resp.StatusCode != http.StatusOK {
		return resp.StatusCode, string(body), fmt.Errorf("status code error: %d %s", resp.StatusCode, resp.Status)
	}

	return resp.StatusCode, string(body), nil
}
