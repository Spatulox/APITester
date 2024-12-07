package _struct

type Config struct {
	BasicURL       string         `json:"basicUrl"`
	Authentication Authentication `json:"authentication"`
	Endpoint       []Endpoint     `json:"endpoints"`
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
}

type OAuth2 struct {
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
	TokenURL     string `json:"tokenUrl"`
}

type BasicAuth struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type Endpoint struct {
	Path  string `json:"path"`
	Tests []Test `json:"tests"`
}

type Test struct {
	Method            string      `json:"method"`
	Input             interface{} `json:"input,omitempty"` // Optional field
	ExpectedOutput    interface{} `json:"expectedOutput"`
	ExpectedHttpState string      `json:"expectedHttpState"`
}

// --------------------------------------------------------- //

type RequestResult struct {
	Path         string
	Error        ResultError
	Warning      []ResultWarning
	OriginalData Test
	ActualOutput interface{}
}
