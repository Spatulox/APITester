package _struct

type Config struct {
	BasicURL string `json:"basicUrl"`
	// Authentication est l'ancien format (une seule auth par fichier). Toujours lu, utilisé
	// uniquement si AuthProfiles est vide.
	Authentication                  Authentication `json:"authentication"`
	AuthProfiles                    []AuthProfile  `json:"authProfiles,omitempty"`
	DefaultAuthProfile              string         `json:"defaultAuthProfile,omitempty"`
	Endpoint                        []Endpoint     `json:"endpoints"`
	GlobalAskedToFillExpectedOutPut string         `json:"globalAskedToFillExpectedOutPut"`
}

// AuthProfile est une manière nommée de s'authentifier (ex: "user", "admin", "anon").
// Type : noauth | apikey | basicAuth | bearer | oauth2 | login
type AuthProfile struct {
	Name      string            `json:"name"`
	Type      string            `json:"type"`
	Headers   map[string]string `json:"headers,omitempty"`
	APIKey    *ApiKey           `json:"apikey,omitempty"`
	BasicAuth *BasicAuth        `json:"basicAuth,omitempty"`
	Bearer    *Bearer           `json:"bearer,omitempty"`
	OAuth2    *OAuth2           `json:"oauth2,omitempty"`
	Login     *LoginAuth        `json:"login,omitempty"`
}

type Bearer struct {
	Token string `json:"token"`
}

// LoginAuth : appelle un endpoint de login, extrait un token de la réponse et l'injecte
// dans les requêtes suivantes.
type LoginAuth struct {
	Method      string      `json:"method,omitempty"`      // défaut POST
	URL         string      `json:"url"`                   // relative à basicUrl ou absolue
	ContentType string      `json:"contentType,omitempty"` // json (défaut) | form
	Body        interface{} `json:"body,omitempty"`
	// Où lire le token : json (chemin pointé, ex: data.access_token) | header | cookie
	ExtractFrom string `json:"extractFrom,omitempty"`
	ExtractPath string `json:"extractPath,omitempty"`
	// Comment l'injecter : bearer (défaut) | header | cookie | query
	InjectAs     string `json:"injectAs,omitempty"`
	InjectName   string `json:"injectName,omitempty"`
	InjectPrefix string `json:"injectPrefix,omitempty"`
	// > 0 : refaire le login après ce délai ; 0 : un seul login par exécution
	TTLSeconds int `json:"ttlSeconds,omitempty"`
}

// LegacyProfileName est le nom du profil créé à partir de l'ancien champ "authentication".
const LegacyProfileName = "default"

// Profiles renvoie les profils d'authentification de la config. Si aucun profil n'est
// défini, l'ancien champ Authentication est converti en un profil "default".
func (c *Config) Profiles() []AuthProfile {
	if len(c.AuthProfiles) > 0 {
		return c.AuthProfiles
	}
	a := c.Authentication
	p := AuthProfile{Name: LegacyProfileName, Type: a.Type}
	switch a.Type {
	case "apikey":
		k := a.APIKey
		p.APIKey = &k
	case "basicAuth":
		b := a.BasicAuth
		p.BasicAuth = &b
	case "oauth2":
		o := a.OAuth2
		p.OAuth2 = &o
	default:
		p.Type = "noauth"
	}
	return []AuthProfile{p}
}

// ResolveProfileName renvoie le nom du profil à utiliser pour un test.
func (c *Config) ResolveProfileName(test Test) string {
	if test.AuthProfile != "" {
		return test.AuthProfile
	}
	if len(c.AuthProfiles) > 0 {
		if c.DefaultAuthProfile != "" {
			return c.DefaultAuthProfile
		}
		return c.AuthProfiles[0].Name
	}
	return LegacyProfileName
}

type Authentication struct {
	Type      string    `json:"type"`
	APIKey    ApiKey    `json:"apikey"`
	OAuth2    OAuth2    `json:"oauth2"`
	BasicAuth BasicAuth `json:"basicAuth"`
}

type ApiKey struct {
	KeyName string `json:"keyname"`
	ApiKey  string `json:"apikeyvalue"`
	AddTo   string `json:"addTo,omitempty"` // header (défaut) | query | cookie
}

type OAuth2 struct {
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
	TokenURL     string `json:"tokenUrl"`
	// Noms de champs non standards dans la réponse du serveur de token.
	// ExpiresInField = "@empty" si le serveur ne renvoie pas de durée de validité.
	TokenField     string `json:"tokenField,omitempty"`
	ExpiresInField string `json:"expiresInField,omitempty"`
}

type BasicAuth struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type Endpoint struct {
	Path                               string `json:"path"`
	IsAlreadyAskedToFillExpectedOutPut string `json:"isAlreadyAskedToFillExpectedOutput"`
	Tests                              []Test `json:"tests"`
}

type Test struct {
	Method            string      `json:"method"`
	Input             interface{} `json:"input,omitempty"` // Optional field
	ExpectedOutput    interface{} `json:"expectedOutput"`
	ExpectedHttpState string      `json:"expectedHttpState"`
	AuthProfile       string      `json:"authProfile,omitempty"` // vide = profil par défaut
}

// --------------------------------------------------------- //

type RequestResult struct {
	Path               string
	AuthProfile        string
	Error              ResultError
	Warning            []ResultWarning
	OriginalData       Test
	ActualOutput       []interface{}
	ActualHttpState    int
	ActualOutputString string
	ActualIsArray      bool
}
