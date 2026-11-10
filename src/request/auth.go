package requestapigo

import (
	. "ApiTester/src/struct"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Authenticator ajoute l'authentification à une requête avant son envoi.
// Les implémentations à token (oauth2, login) sont sûres pour un usage concurrent
// et partagent le token entre toutes les requêtes d'une même exécution.
type Authenticator interface {
	Apply(req *http.Request) error
}

// AuthError distingue un échec d'authentification (login, token) d'une erreur réseau sur l'API.
type AuthError struct {
	Err error
}

func (e *AuthError) Error() string { return "authentication failed: " + e.Err.Error() }
func (e *AuthError) Unwrap() error { return e.Err }

// ------------------------------------------------------------------------- //

// NewAuthenticator construit l'authentificateur d'un profil.
// baseURL sert à résoudre les URLs relatives (login), client est le client HTTP partagé.
func NewAuthenticator(profile AuthProfile, baseURL string, client *http.Client) (Authenticator, error) {
	var inner Authenticator

	switch profile.Type {
	case "", "noauth":
		inner = noAuth{}
	case "apikey":
		k := profile.APIKey
		if k == nil {
			k = &ApiKey{}
		}
		if k.KeyName == "" || k.ApiKey == "" {
			return nil, fmt.Errorf("profile %q: apikey needs a key name and a value", profile.Name)
		}
		addTo := strings.ToLower(k.AddTo)
		if addTo == "" {
			addTo = "header"
		}
		if addTo != "header" && addTo != "query" && addTo != "cookie" {
			return nil, fmt.Errorf("profile %q: apikey addTo must be header, query or cookie", profile.Name)
		}
		inner = &apiKeyAuth{name: k.KeyName, value: k.ApiKey, addTo: addTo}
	case "bearer":
		if profile.Bearer == nil || profile.Bearer.Token == "" {
			return nil, fmt.Errorf("profile %q: bearer token is empty", profile.Name)
		}
		inner = &bearerAuth{token: profile.Bearer.Token}
	case "basicAuth", "basic":
		b := profile.BasicAuth
		if b == nil || b.Username == "" {
			return nil, fmt.Errorf("profile %q: basic auth username is empty", profile.Name)
		}
		inner = &basicAuthenticator{username: b.Username, password: b.Password}
	case "oauth2":
		o := profile.OAuth2
		if o == nil || o.TokenURL == "" || o.ClientID == "" {
			return nil, fmt.Errorf("profile %q: oauth2 needs a client id and a token url", profile.Name)
		}
		inner = newOAuth2Auth(o.ClientID, o.ClientSecret, o.TokenURL, o.TokenField, o.ExpiresInField, client)
	case "login":
		if profile.Login == nil {
			return nil, fmt.Errorf("profile %q: login settings are missing", profile.Name)
		}
		l, err := newLoginAuth(profile.Name, *profile.Login, baseURL, client)
		if err != nil {
			return nil, err
		}
		inner = l
	default:
		return nil, fmt.Errorf("profile %q: unknown auth type %q", profile.Name, profile.Type)
	}

	if len(profile.Headers) > 0 {
		return &headersAuth{inner: inner, headers: profile.Headers}, nil
	}
	return inner, nil
}

// ------------------------------------------------------------------------- //

type noAuth struct{}

func (noAuth) Apply(*http.Request) error { return nil }

type apiKeyAuth struct {
	name, value, addTo string
}

func (a *apiKeyAuth) Apply(req *http.Request) error {
	switch a.addTo {
	case "query":
		q := req.URL.Query()
		q.Set(a.name, a.value)
		req.URL.RawQuery = q.Encode()
	case "cookie":
		req.AddCookie(&http.Cookie{Name: a.name, Value: a.value})
	default:
		// Pas de canonicalisation : certaines API attendent la casse exacte
		req.Header[a.name] = []string{a.value}
	}
	return nil
}

type bearerAuth struct{ token string }

func (a *bearerAuth) Apply(req *http.Request) error {
	req.Header.Set("Authorization", "Bearer "+a.token)
	return nil
}

type basicAuthenticator struct{ username, password string }

func (a *basicAuthenticator) Apply(req *http.Request) error {
	req.SetBasicAuth(a.username, a.password)
	return nil
}

type headersAuth struct {
	inner   Authenticator
	headers map[string]string
}

func (a *headersAuth) Apply(req *http.Request) error {
	for k, v := range a.headers {
		req.Header[k] = []string{v}
	}
	return a.inner.Apply(req)
}

// ------------------------------------------------------------------------- //
// Cache de token partagé (oauth2 et login)

type tokenCache struct {
	mu        sync.Mutex
	value     string
	expiresAt time.Time // zéro = n'expire jamais
	err       error     // échec mémorisé : pas de nouvelle tentative pendant l'exécution
	fetch     func() (string, time.Time, error)
}

func (c *tokenCache) token() (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.err != nil {
		return "", c.err
	}
	if c.value != "" && (c.expiresAt.IsZero() || time.Now().Before(c.expiresAt)) {
		return c.value, nil
	}
	v, exp, err := c.fetch()
	if err != nil {
		c.err = err
		return "", err
	}
	c.value, c.expiresAt = v, exp
	return v, nil
}

// ------------------------------------------------------------------------- //
// OAuth2 client_credentials

type oauth2Auth struct {
	tokenCache
	clientId, clientSecret, tokenUrl string
	tokenField, expiresInField       string
	client                           *http.Client
}

func newOAuth2Auth(clientId, clientSecret, tokenUrl, tokenField, expiresInField string, client *http.Client) *oauth2Auth {
	if tokenField == "" {
		tokenField = "access_token"
	}
	if expiresInField == "" {
		expiresInField = "expires_in"
	}
	a := &oauth2Auth{
		clientId: clientId, clientSecret: clientSecret, tokenUrl: tokenUrl,
		tokenField: tokenField, expiresInField: expiresInField, client: client,
	}
	a.fetch = a.fetchToken
	return a
}

func (a *oauth2Auth) Apply(req *http.Request) error {
	t, err := a.token()
	if err != nil {
		return fmt.Errorf("impossible to get the OAuth2 token : %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+t)
	return nil
}

func (a *oauth2Auth) fetchToken() (string, time.Time, error) {
	data := url.Values{}
	data.Set("grant_type", "client_credentials")
	data.Set("client_id", a.clientId)
	data.Set("client_secret", a.clientSecret)

	req, err := http.NewRequest("POST", a.tokenUrl, strings.NewReader(data.Encode()))
	if err != nil {
		return "", time.Time{}, fmt.Errorf("erreur lors de la création de la requête : %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := a.client.Do(req)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("erreur lors de l'envoi de la requête : %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("erreur lors de la lecture de la réponse : %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return "", time.Time{}, fmt.Errorf("erreur du serveur OAuth2 : %d - %s", resp.StatusCode, body)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(body, &response); err != nil {
		return "", time.Time{}, fmt.Errorf("erreur lors du parsing JSON : %w", err)
	}

	raw, ok := response[a.tokenField]
	if !ok {
		return "", time.Time{}, fmt.Errorf("field %q doesn't exist in the token response (set oauth2.tokenField for a non-standard name)", a.tokenField)
	}
	token, err := scalarToString(raw)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("token field: %v", err)
	}

	if a.expiresInField == "@empty" {
		return token, time.Time{}, nil
	}
	expRaw, ok := response[a.expiresInField]
	if !ok {
		return "", time.Time{}, fmt.Errorf("field %q doesn't exist in the token response (set oauth2.expiresInField, or \"@empty\" if the server sends none)", a.expiresInField)
	}
	expStr, err := scalarToString(expRaw)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("expires_in field: %v", err)
	}
	expiresIn, err := strconv.Atoi(expStr)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("expires_in field is invalid : %v", err)
	}
	// marge de 5 s pour éviter d'envoyer un token qui expire en vol
	return token, time.Now().Add(time.Duration(expiresIn)*time.Second - 5*time.Second), nil
}

// ------------------------------------------------------------------------- //
// Login dynamique : appelle un endpoint de login et réutilise le token obtenu

type loginAuthenticator struct {
	tokenCache
	conf     LoginAuth
	loginURL string
	client   *http.Client
}

func newLoginAuth(profileName string, conf LoginAuth, baseURL string, client *http.Client) (*loginAuthenticator, error) {
	if conf.URL == "" {
		return nil, fmt.Errorf("profile %q: login url is empty", profileName)
	}
	conf.Method = strings.ToUpper(strings.TrimSpace(conf.Method))
	if conf.Method == "" {
		conf.Method = "POST"
	}
	conf.ContentType = strings.ToLower(conf.ContentType)
	if conf.ContentType == "" {
		conf.ContentType = "json"
	}
	if conf.ContentType != "json" && conf.ContentType != "form" {
		return nil, fmt.Errorf("profile %q: login contentType must be json or form", profileName)
	}
	conf.ExtractFrom = strings.ToLower(conf.ExtractFrom)
	if conf.ExtractFrom == "" {
		conf.ExtractFrom = "json"
	}
	switch conf.ExtractFrom {
	case "json":
		if conf.ExtractPath == "" {
			conf.ExtractPath = "access_token"
		}
	case "header", "cookie":
		if conf.ExtractPath == "" {
			return nil, fmt.Errorf("profile %q: extractPath must name the %s to read", profileName, conf.ExtractFrom)
		}
	default:
		return nil, fmt.Errorf("profile %q: login extractFrom must be json, header or cookie", profileName)
	}
	conf.InjectAs = strings.ToLower(conf.InjectAs)
	if conf.InjectAs == "" {
		conf.InjectAs = "bearer"
	}
	switch conf.InjectAs {
	case "bearer":
	case "header", "cookie", "query":
		if conf.InjectName == "" {
			return nil, fmt.Errorf("profile %q: injectName is required when injectAs is %s", profileName, conf.InjectAs)
		}
	default:
		return nil, fmt.Errorf("profile %q: login injectAs must be bearer, header, cookie or query", profileName)
	}

	loginURL := conf.URL
	if !strings.HasPrefix(loginURL, "http://") && !strings.HasPrefix(loginURL, "https://") {
		loginURL = strings.TrimRight(baseURL, "/") + "/" + strings.TrimLeft(loginURL, "/")
	}

	a := &loginAuthenticator{conf: conf, loginURL: loginURL, client: client}
	a.fetch = a.login
	return a, nil
}

func (a *loginAuthenticator) Apply(req *http.Request) error {
	t, err := a.token()
	if err != nil {
		return fmt.Errorf("login failed : %v", err)
	}
	switch a.conf.InjectAs {
	case "bearer":
		req.Header.Set("Authorization", "Bearer "+t)
	case "header":
		req.Header[a.conf.InjectName] = []string{a.conf.InjectPrefix + t}
	case "cookie":
		req.AddCookie(&http.Cookie{Name: a.conf.InjectName, Value: a.conf.InjectPrefix + t})
	case "query":
		q := req.URL.Query()
		q.Set(a.conf.InjectName, a.conf.InjectPrefix+t)
		req.URL.RawQuery = q.Encode()
	}
	return nil
}

func (a *loginAuthenticator) login() (string, time.Time, error) {
	var body io.Reader
	contentType := ""
	if a.conf.Body != nil {
		if a.conf.ContentType == "form" {
			form := url.Values{}
			m, ok := a.conf.Body.(map[string]interface{})
			if !ok {
				return "", time.Time{}, fmt.Errorf("form body must be a JSON object")
			}
			for k, v := range m {
				s, err := scalarToString(v)
				if err != nil {
					return "", time.Time{}, fmt.Errorf("form field %q: %v", k, err)
				}
				form.Set(k, s)
			}
			body = strings.NewReader(form.Encode())
			contentType = "application/x-www-form-urlencoded"
		} else {
			b, err := json.Marshal(a.conf.Body)
			if err != nil {
				return "", time.Time{}, err
			}
			body = bytes.NewReader(b)
			contentType = "application/json"
		}
	}

	req, err := http.NewRequest(a.conf.Method, a.loginURL, body)
	if err != nil {
		return "", time.Time{}, err
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}

	resp, err := a.client.Do(req)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("%s %s: %w", a.conf.Method, a.loginURL, err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return "", time.Time{}, fmt.Errorf("%s %s returned %d: %s", a.conf.Method, a.loginURL, resp.StatusCode, truncate(string(respBody), 300))
	}

	var token string
	switch a.conf.ExtractFrom {
	case "header":
		token = resp.Header.Get(a.conf.ExtractPath)
		if token == "" {
			return "", time.Time{}, fmt.Errorf("header %q not found in the login response", a.conf.ExtractPath)
		}
	case "cookie":
		for _, c := range resp.Cookies() {
			if c.Name == a.conf.ExtractPath {
				token = c.Value
				break
			}
		}
		if token == "" {
			return "", time.Time{}, fmt.Errorf("cookie %q not found in the login response", a.conf.ExtractPath)
		}
	default:
		var data interface{}
		if err := json.Unmarshal(respBody, &data); err != nil {
			return "", time.Time{}, fmt.Errorf("login response is not JSON: %v", err)
		}
		v, err := jsonPath(data, a.conf.ExtractPath)
		if err != nil {
			return "", time.Time{}, err
		}
		token, err = scalarToString(v)
		if err != nil {
			return "", time.Time{}, fmt.Errorf("%s: %v", a.conf.ExtractPath, err)
		}
		if token == "" {
			return "", time.Time{}, fmt.Errorf("%s is empty in the login response", a.conf.ExtractPath)
		}
	}

	var exp time.Time
	if a.conf.TTLSeconds > 0 {
		exp = time.Now().Add(time.Duration(a.conf.TTLSeconds) * time.Second)
	}
	return token, exp, nil
}

// ------------------------------------------------------------------------- //
// Utilitaires

// jsonPath lit une valeur via un chemin pointé : "data.tokens.0.value"
func jsonPath(data interface{}, path string) (interface{}, error) {
	cur := data
	for _, part := range strings.Split(path, ".") {
		switch node := cur.(type) {
		case map[string]interface{}:
			v, ok := node[part]
			if !ok {
				return nil, fmt.Errorf("key %q not found in the login response (path %s)", part, path)
			}
			cur = v
		case []interface{}:
			i, err := strconv.Atoi(part)
			if err != nil || i < 0 || i >= len(node) {
				return nil, fmt.Errorf("invalid index %q in path %s", part, path)
			}
			cur = node[i]
		default:
			return nil, fmt.Errorf("cannot read %q in path %s: not an object or array", part, path)
		}
	}
	return cur, nil
}

func scalarToString(v interface{}) (string, error) {
	switch x := v.(type) {
	case string:
		return x, nil
	case float64:
		return strconv.FormatFloat(x, 'f', -1, 64), nil
	case bool:
		return strconv.FormatBool(x), nil
	case json.Number:
		return x.String(), nil
	default:
		return "", fmt.Errorf("unexpected type %T", v)
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

// describeRequestAuth résume (en masquant) ce que l'authentification a ajouté à une requête.
func describeRequestAuth(req *http.Request) string {
	var parts []string
	for k, v := range req.Header {
		if len(v) > 0 {
			parts = append(parts, fmt.Sprintf("header %s: %s", k, mask(v[0])))
		}
	}
	for k, v := range req.URL.Query() {
		if len(v) > 0 {
			parts = append(parts, fmt.Sprintf("query %s=%s", k, mask(v[0])))
		}
	}
	if len(parts) == 0 {
		return "no authentication added"
	}
	return strings.Join(parts, "\n")
}

func mask(v string) string {
	if strings.HasPrefix(v, "Bearer ") {
		return "Bearer " + mask(strings.TrimPrefix(v, "Bearer "))
	}
	if len(v) <= 8 {
		return strings.Repeat("•", len(v))
	}
	return v[:8] + "…"
}
