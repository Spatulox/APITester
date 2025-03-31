package requestapigo

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type Api struct {
	url       string
	client    *http.Client
	authType  string
	basicAuth basic_auth
	apiKey    api_key
	oauth2    oauth_2
	bearer    bearer
	jwt       jwt
}

type basic_auth struct {
	username string
	password string
}

type bearer struct {
	token string
}

type api_key struct {
	key_name string
	value    string
}

type oauth_2 struct {
	clientId                string
	clientSecret            string
	tokenUrl                string
	oauthToken              string
	expiresAt               time.Time
	access_token_field_name string
	expires_in_field_name   string
}

type jwt struct {
	token string
}

// ------------------------------------------------------------------------- //

// NewApi new api instance
func NewApi(url string) *Api {
	return &Api{
		url: url,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		oauth2: oauth_2{
			access_token_field_name: "access_token", // Valeur par défaut
			expires_in_field_name:   "expires_in",   // Valeur par défaut
		},
	}
}

// ------------------------------------------------------------------------- //
/* AUTHENTIFICATION */
// ------------------------------------------------------------------------- //

func (api *Api) AddApiKey(key_name string, value string) error {
	if len(key_name) == 0 || len(value) == 0 {
		return fmt.Errorf("key name or value are empty for apikey")
	}
	api.authType = "apikey"
	api.apiKey.key_name = key_name
	api.apiKey.value = value
	return nil
}

// ------------------------------------------------------------------------- //

func (api *Api) AddBearerToken(token string) error {
	if len(token) == 0 {
		return fmt.Errorf("bearer Token is empty")
	}
	api.authType = "bearer"
	api.bearer.token = token
	return nil
}

// ------------------------------------------------------------------------- //

func (api *Api) AddBasicAuth(username, password string) error {
	if len(username) == 0 || len(password) == 0 {
		return fmt.Errorf("key name or value are empty for apikey")
	}
	api.authType = "basic"
	api.basicAuth.username = username
	api.basicAuth.password = password
	return nil
}

// ------------------------------------------------------------------------- //

func (api *Api) AddJWTToken(token string) error {
	if len(token) == 0 {
		return fmt.Errorf("key name or value are empty for apikey")
	}
	api.authType = "jwt"
	api.jwt.token = token
	return nil
}

// ------------------------------------------------------------------------- //

func (api *Api) AddOAuth2(clientId, clientSecret, tokenUrl string) error {
	api.authType = "oauth2"
	api.oauth2.clientId = clientId
	api.oauth2.clientSecret = clientSecret
	api.oauth2.tokenUrl = tokenUrl

	err := api.fetchOAuthToken()
	if err != nil {
		return fmt.Errorf("erreur lors de l'obtention du token OAuth2 : %v", err)
	}

	return nil
}

func (api *Api) SetAccessTokenFieldName(fieldName string) error {
	if len(fieldName) == 0 {
		return fmt.Errorf("field name can't be null")
	}
	api.oauth2.access_token_field_name = fieldName
	return nil
}

func (api *Api) SetExpiresInFieldName(fieldName string) error {
	if len(fieldName) == 0 {
		return fmt.Errorf("field name can't be null")
	}
	api.oauth2.expires_in_field_name = fieldName
	return nil
}

// ------------------------------------------------------------------------- //
// MÉTHODE POUR OBTENIR UN TOKEN OAUTH2
// ------------------------------------------------------------------------- //

func (api *Api) fetchOAuthToken() error {
	// Préparer les données pour la requête POST vers le tokenUrl
	data := url.Values{}
	data.Set("grant_type", "client_credentials")
	data.Set("client_id", api.oauth2.clientId)
	data.Set("client_secret", api.oauth2.clientSecret)

	req, err := http.NewRequest("POST", api.oauth2.tokenUrl, strings.NewReader(data.Encode()))
	if err != nil {
		return fmt.Errorf("erreur lors de la création de la requête : %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := api.client
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("erreur lors de l'envoi de la requête : %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("erreur du serveur OAuth2 : %d - %s", resp.StatusCode, body)
	}

	// Lire et parser la réponse JSON pour extraire le token
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("erreur lors de la lecture de la réponse : %w", err)
	}

	var response map[string]interface{}
	err = json.Unmarshal(body, &response)
	if err != nil {
		return fmt.Errorf("erreur lors du parsing JSON : %w", err)
	}

	tokenRaw, ok := response[api.oauth2.access_token_field_name]
	if !ok {
		return fmt.Errorf("access_token field doesn't exist in the response. Please use SetAccessTokenFieldName('field_name') for a non-standard field name.")
	}

	var token string
	switch v := tokenRaw.(type) {
	case string:
		token = v
	case float64:
		token = fmt.Sprintf("%.0f", v)
	case int:
		token = fmt.Sprintf("%d", v) // Convertir en chaîne
	default:
		return fmt.Errorf("unexpected type for access_token: %T", v)
	}

	expiresInRaw, ok := response[api.oauth2.expires_in_field_name]
	if !ok && api.oauth2.expires_in_field_name != "@empty" {
		return fmt.Errorf("expires_in filed don't exist in the response, pls use SetExpiresInFieldName('field_name') for a non-standard field name\nIf the field don't exist, set it like that : SetExpiresInFieldName('@empty')")
	}

	var expiresIn int
	switch v := expiresInRaw.(type) {
	case float64:
		expiresIn = int(v)
	case int:
		expiresIn = v
	case string:
		expiresInParsed, err := strconv.Atoi(v)
		if err != nil {
			return fmt.Errorf("expires_in filed is invalid : %v", err)
		}
		expiresIn = expiresInParsed
	default:
		return fmt.Errorf("unexpected type for expires_in : %T", v)
	}

	api.oauth2.expiresAt = time.Now().Add(time.Duration(expiresIn) * time.Second)
	api.oauth2.oauthToken = token
	return nil
}

func (api *Api) isOAuthTokenExpired() bool {
	return time.Now().After(api.oauth2.expiresAt)
}

// ------------------------------------------------------------------------- //

func (api *Api) addAuth(req *http.Request) error {

	switch api.authType {
	case "apikey":
		req.Header[api.apiKey.key_name] = []string{api.apiKey.value}
	case "bearer":
		req.Header.Add("Authorization", "Bearer "+api.bearer.token)
	case "basic":
		req.SetBasicAuth(api.basicAuth.username, api.basicAuth.password)
	case "oauth2":

		if api.isOAuthTokenExpired() {
			err := api.fetchOAuthToken()
			if err != nil {
				return fmt.Errorf("impossible to refresh OAuth2 token : %v", err)
			}
		}

		req.Header.Add("Authorization", "Bearer "+api.oauth2.oauthToken)
	case "jwt":
		req.Header.Add("Authorization", "Bearer "+api.jwt.token)
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

	err = api.addAuth(req)
	if err != nil {
		return 0, "", err
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
