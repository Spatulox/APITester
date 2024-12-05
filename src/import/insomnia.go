package insomnia

import (
	. "ApiTester/src/struct"
	"fmt"
	"strings"
)

// ----------------------------------------------------------- //

// ParseInsomniaExport parses an Insomnia export file represented as a map and
// extracts configuration details such as endpoints and their associated tests.
// It collects all request URLs to determine the base URL and constructs a
// Config object containing the endpoints and their test cases.
//
// Parameters:
//   - @export: A map representing the Insomnia export data, which should contain
//     a "resources" key with an array of request resources.
//
// Returns:
//   - @A Config object populated with endpoints and tests extracted from the export.
//   - @An error if the "resources" key is missing or not an array, or if any other
//     error occurs during parsing.
func ParseInsomniaExport(export map[string]interface{}) (Config, error) {
	config := Config{}
	var urls []string

	resources, ok := export["resources"].([]interface{})
	if !ok {
		return config, fmt.Errorf("resources not found or not an array")
	}

	// Première passe : collecter toutes les URLs
	for _, resource := range resources {
		res, ok := resource.(map[string]interface{})
		if !ok {
			continue
		}

		if res["_type"] == "request" {
			if url, ok := res["url"].(string); ok {
				urls = append(urls, url)
			}
		}
	}

	// Détecter la baseUrl
	config.BasicURL = detectBaseURL(urls)

	for _, resource := range resources {
		res, ok := resource.(map[string]interface{})
		if !ok {
			continue
		}

		if res["_type"] == "request" {
			url, _ := res["url"].(string)
			method, _ := res["method"].(string)

			// Utiliser la baseUrl détectée pour extraire le chemin
			path := strings.TrimPrefix(url, config.BasicURL)

			// auth, _ := res["authentication"].(map[string]interface{})
			// config.Authentication = parseAuthentication(auth)

			body, _ := res["body"].(map[string]interface{})
			params, _ := body["params"].([]interface{})

			input := make(map[string]interface{})
			for _, param := range params {
				p, _ := param.(map[string]interface{})
				name, _ := p["name"].(string)
				value, _ := p["value"].(string)
				input[name] = value
			}

			test := Test{
				Method:            method,
				Input:             input,
				ExpectedOutput:    make(map[string]interface{}),
				ExpectedHttpState: "",
			}

			endpoint := Endpoint{
				Path:  path,
				Tests: []Test{test},
			}

			config.Endpoint = append(config.Endpoint, endpoint)
		}
	}

	return config, nil
}

// ----------------------------------------------------------- //

// parseAuthentication extracts authentication details from a given authentication
// map and returns an Authentication object populated with the relevant credentials.
//
// Parameters:
//   - @auth: A map containing authentication details, including type and associated
//     credentials (API key, OAuth2 details, or basic authentication).
//
// Returns:
// - @An Authentication object containing the parsed authentication information.
func parseAuthentication(auth map[string]interface{}) Authentication {
	authType, _ := auth["type"].(string)
	authentication := Authentication{
		Type: authType,
	}

	switch authType {
	case "apikey":
		authentication.APIKey, _ = auth["value"].(string)
	case "oauth2":
		oauth2 := OAuth2{}
		oauth2.ClientID, _ = auth["clientId"].(string)
		oauth2.ClientSecret, _ = auth["clientSecret"].(string)
		oauth2.TokenURL, _ = auth["accessTokenUrl"].(string)
		authentication.OAuth2 = oauth2
	case "basic":
		basicAuth := BasicAuth{}
		basicAuth.Username, _ = auth["username"].(string)
		basicAuth.Password, _ = auth["password"].(string)
		authentication.BasicAuth = basicAuth
	}

	return authentication
}

// ----------------------------------------------------------- //

// detectBaseURL determines the common base URL from a slice of URLs. It compares
// each URL to find the longest common path prefix that serves as the base URL.
//
// Parameters:
// - @urls: A slice of strings representing URLs from which to extract the base URL.
//
// Returns:
//   - @A string representing the detected base URL. If no URLs are provided, an empty
//     string is returned.
func detectBaseURL(urls []string) string {
	if len(urls) == 0 {
		return ""
	}
	if len(urls) == 1 {
		return extractBaseURL(urls[0])
	}

	// Diviser la première URL en parties
	parts := strings.Split(urls[0], "/")
	commonParts := make([]string, 0)

	// Comparer chaque partie avec toutes les autres URLs
	for i, part := range parts {
		isCommon := true
		for _, url := range urls[1:] {
			urlParts := strings.Split(url, "/")
			if i >= len(urlParts) || urlParts[i] != part {
				isCommon = false
				break
			}
		}
		if isCommon {
			commonParts = append(commonParts, part)
		} else {
			break
		}
	}

	return strings.Join(commonParts, "/")
}

// ----------------------------------------------------------- //

// extractBaseURL extracts the base URL from a given URL string by removing
// the last segment (path) of the URL. This is useful for obtaining the base
// endpoint for API requests.
//
// Parameters:
// - @url: A string representing a full URL from which to extract the base URL.
//
// Returns:
//   - @A string representing the base URL. If the URL has three or fewer parts,
//     it returns the original URL.
func extractBaseURL(url string) string {
	parts := strings.Split(url, "/")
	if len(parts) > 3 {
		return strings.Join(parts[:len(parts)-1], "/")
	}
	return url
}
