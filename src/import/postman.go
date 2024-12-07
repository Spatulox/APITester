package insomnia

import (
	. "ApiTester/src/struct"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
)

// ----------------------------------------------------------- //

// ParsePostmanExport parses a Postman collection export represented as a map
// and extracts configuration details such as the base URL and endpoints.
// It constructs a Config object containing the base URL and the list of endpoints.
//
// Parameters:
//   - @export: A map representing the Postman export data, which should contain
//     an "item" key with an array of request items.
//
// Returns:
//   - @A Config object populated with the base URL and endpoints extracted from
//     the Postman collection.
//   - @An error if the "item" key is missing or not an array, or if any other
//     error occurs during parsing.
func ParsePostmanExport(export map[string]interface{}) (Config, error) {
	config := Config{}

	items, ok := export["item"].([]interface{})
	if !ok {
		return config, fmt.Errorf("invalid or missing 'item' field in Postman collection")
	}

	// Extraire la baseURL et les endpoints
	config.BasicURL, config.Endpoint = extractEndpoints(items)

	sort.Slice(config.Endpoint, func(i, j int) bool {
		return config.Endpoint[i].Path < config.Endpoint[j].Path
	})

	return config, nil
}

// ----------------------------------------------------------- //

// extractEndpoints extracts the base URL and endpoints from a slice of items
// in a Postman collection. It recursively processes each item to gather all
// requests and their associated details.
//
// Parameters:
//   - @items: A slice of interface{} representing the request items in the Postman
//     collection.
//
// Returns:
// - @A string representing the detected base URL extracted from the first request.
// - @A slice of Endpoint containing all extracted endpoints with their associated tests.
func extractEndpoints(items []interface{}) (string, []Endpoint) {
	var baseURL string
	endpointMap := make(map[string]*Endpoint)
	unknownCount := 0

	var extractItem func(item map[string]interface{})
	extractItem = func(item map[string]interface{}) {
		if request, ok := item["request"].(map[string]interface{}); ok {
			var path string

			// Extraire l'URL
			if url, ok := request["url"].(map[string]interface{}); ok {
				raw, _ := url["raw"].(string)
				if baseURL == "" {
					baseURL = extractBaseURL(raw)
				}
				path = strings.TrimPrefix(raw, baseURL)

				if path != "/" && strings.HasSuffix(path, "/") {
					path = path[:len(path)-1]
				}

				// Si le chemin est vide, attribuer un nom "Unknown"
				if path == "" {
					unknownCount++
					path = fmt.Sprintf("/Unknown%d", unknownCount)
				}
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

			// Ajouter ou mettre à jour l'endpoint
			if endpoint, exists := endpointMap[path]; exists {
				endpoint.Tests = append(endpoint.Tests, test)
			} else {
				endpointMap[path] = &Endpoint{
					Path:  path,
					Tests: []Test{test},
				}
			}
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

	// Convertir la map en slice
	var endpoints []Endpoint
	for _, endpoint := range endpointMap {
		endpoints = append(endpoints, *endpoint)
	}

	return baseURL, endpoints
}
