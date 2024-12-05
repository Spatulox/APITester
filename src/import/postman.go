package insomnia

import (
	. "ApiTester/src/struct"
	"encoding/json"
	"fmt"
	"strings"
)

func ParsePostmanExport(export map[string]interface{}) (Config, error) {
	config := Config{}

	items, ok := export["item"].([]interface{})
	if !ok {
		return config, fmt.Errorf("invalid or missing 'item' field in Postman collection")
	}

	// Extraire la baseURL et les endpoints
	config.BasicURL, config.Endpoint = extractEndpoints(items)

	return config, nil
}

func extractEndpoints(items []interface{}) (string, []Endpoint) {
	var baseURL string
	var endpoints []Endpoint

	var extractItem func(item map[string]interface{})
	extractItem = func(item map[string]interface{}) {
		if request, ok := item["request"].(map[string]interface{}); ok {
			endpoint := Endpoint{}

			// Extraire l'URL
			if url, ok := request["url"].(map[string]interface{}); ok {
				raw, _ := url["raw"].(string)
				if baseURL == "" {
					baseURL = extractBaseURL(raw)
				}
				endpoint.Path = strings.TrimPrefix(raw, baseURL)
			}

			// Extraire la méthode
			method, _ := request["method"].(string)

			// Extraire le body (inputs)
			input := make(map[string]interface{})
			if body, ok := request["body"].(map[string]interface{}); ok {
				mode, _ := body["mode"].(string)
				if mode == "raw" {
					rawBody, _ := body["raw"].(string)
					// Vérifier les options pour le format JSON
					if options, ok := body["options"].(map[string]interface{}); ok {
						if language, exists := options["raw"].(map[string]interface{})["language"]; exists && language == "json" {
							err := json.Unmarshal([]byte(rawBody), &input) // Parse le JSON brut en map
							if err != nil {
								fmt.Printf("Error parsing body JSON: %v\n", err)
							}
						}
					}
				}
			}

			// Créer le test
			test := Test{
				Method:            method,
				Input:             input,
				ExpectedOutput:    make(map[string]interface{}),
				ExpectedHttpState: "",
			}

			endpoint.Tests = append(endpoint.Tests, test)
			endpoints = append(endpoints, endpoint)
		}

		// Récursivement extraire les items imbriqués
		if subitems, ok := item["item"].([]interface{}); ok {
			for _, subitem := range subitems {
				if subitemMap, ok := subitem.(map[string]interface{}); ok {
					extractItem(subitemMap)
				}
			}
		}
	}

	for _, item := range items {
		if itemMap, ok := item.(map[string]interface{}); ok {
			extractItem(itemMap)
		}
	}

	return baseURL, endpoints
}
