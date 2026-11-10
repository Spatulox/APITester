package insomnia

import (
	. "ApiTester/src/struct"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
)

// profileSet déduplique les authentifications rencontrées pendant un import et leur
// attribue un nom de profil stable (default, bearer, apikey, bearer2, ...).
type profileSet struct {
	profiles []AuthProfile
	byKey    map[string]string // contenu sérialisé -> nom du profil
	used     map[string]int    // nombre de tests utilisant chaque profil
}

func newProfileSet() *profileSet {
	return &profileSet{byKey: map[string]string{}, used: map[string]int{}}
}

// add enregistre un profil (nil = rien) et renvoie son nom. preferredName est utilisé s'il est libre.
func (s *profileSet) add(p *AuthProfile, preferredName string) string {
	if p == nil {
		return ""
	}
	p.Name = ""
	raw, _ := json.Marshal(p)
	key := string(raw)
	if name, ok := s.byKey[key]; ok {
		return name
	}
	name := preferredName
	if name == "" || s.taken(name) {
		name = p.Type
		for i := 2; s.taken(name); i++ {
			name = fmt.Sprintf("%s%d", p.Type, i)
		}
	}
	p.Name = name
	s.byKey[key] = name
	s.profiles = append(s.profiles, *p)
	return name
}

func (s *profileSet) taken(name string) bool {
	for _, p := range s.profiles {
		if p.Name == name {
			return true
		}
	}
	return false
}

// apply écrit les profils dans la config. Le profil par défaut est defaultName s'il est donné,
// sinon le plus utilisé ; les tests qui l'utilisent n'ont pas besoin de le préciser.
func (s *profileSet) apply(config *Config, defaultName string) {
	if len(s.profiles) == 0 {
		return
	}
	for _, ep := range config.Endpoint {
		for _, t := range ep.Tests {
			s.used[t.AuthProfile]++
		}
	}
	if defaultName == "" {
		names := make([]string, 0, len(s.profiles))
		for _, p := range s.profiles {
			names = append(names, p.Name)
		}
		sort.SliceStable(names, func(i, j int) bool { return s.used[names[i]] > s.used[names[j]] })
		defaultName = names[0]
	}
	config.AuthProfiles = s.profiles
	config.DefaultAuthProfile = defaultName
	for i := range config.Endpoint {
		for j := range config.Endpoint[i].Tests {
			if config.Endpoint[i].Tests[j].AuthProfile == defaultName {
				config.Endpoint[i].Tests[j].AuthProfile = ""
			}
		}
	}
}

func str(m map[string]interface{}, key string) string {
	v, _ := m[key].(string)
	return v
}

// ----------------------------------------------------------- //
// Insomnia : { "type": "bearer", "token": "...", "prefix": "" }, { "type": "apikey", "key", "value", "addTo" }, ...

func insomniaAuthToProfile(raw interface{}) *AuthProfile {
	auth, ok := raw.(map[string]interface{})
	if !ok || len(auth) == 0 {
		return nil
	}
	if disabled, _ := auth["disabled"].(bool); disabled {
		return &AuthProfile{Type: "noauth"}
	}
	switch str(auth, "type") {
	case "bearer":
		return &AuthProfile{Type: "bearer", Bearer: &Bearer{Token: str(auth, "token")}}
	case "apikey":
		addTo := "header"
		switch str(auth, "addTo") {
		case "queryParams":
			addTo = "query"
		case "cookie":
			addTo = "cookie"
		}
		return &AuthProfile{Type: "apikey", APIKey: &ApiKey{KeyName: str(auth, "key"), ApiKey: str(auth, "value"), AddTo: addTo}}
	case "basic":
		return &AuthProfile{Type: "basicAuth", BasicAuth: &BasicAuth{Username: str(auth, "username"), Password: str(auth, "password")}}
	case "oauth2":
		return &AuthProfile{Type: "oauth2", OAuth2: &OAuth2{
			ClientID: str(auth, "clientId"), ClientSecret: str(auth, "clientSecret"), TokenURL: str(auth, "accessTokenUrl"),
		}}
	case "none":
		return &AuthProfile{Type: "noauth"}
	}
	return nil
}

// ----------------------------------------------------------- //
// Postman : { "type": "bearer", "bearer": [ {"key": "token", "value": "..."} ] }

func postmanAuthToProfile(raw interface{}) *AuthProfile {
	auth, ok := raw.(map[string]interface{})
	if !ok {
		return nil
	}
	typ := str(auth, "type")
	params := map[string]string{}
	if list, ok := auth[typ].([]interface{}); ok {
		for _, item := range list {
			if kv, ok := item.(map[string]interface{}); ok {
				params[str(kv, "key")] = fmt.Sprintf("%v", kv["value"])
			}
		}
	}
	switch typ {
	case "noauth":
		return &AuthProfile{Type: "noauth"}
	case "bearer":
		return &AuthProfile{Type: "bearer", Bearer: &Bearer{Token: params["token"]}}
	case "apikey":
		addTo := "header"
		if strings.EqualFold(params["in"], "query") {
			addTo = "query"
		}
		return &AuthProfile{Type: "apikey", APIKey: &ApiKey{KeyName: params["key"], ApiKey: params["value"], AddTo: addTo}}
	case "basic":
		return &AuthProfile{Type: "basicAuth", BasicAuth: &BasicAuth{Username: params["username"], Password: params["password"]}}
	case "oauth2":
		if params["grant_type"] == "" || params["grant_type"] == "client_credentials" {
			return &AuthProfile{Type: "oauth2", OAuth2: &OAuth2{
				ClientID: params["clientId"], ClientSecret: params["clientSecret"], TokenURL: params["accessTokenUrl"],
			}}
		}
	}
	return nil
}
