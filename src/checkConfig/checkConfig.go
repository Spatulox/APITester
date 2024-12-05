package checkConfig

import (
	. "ApiTester/src/json"
	. "ApiTester/src/log"
	. "ApiTester/src/request"
	. "ApiTester/src/struct"
	"encoding/json"
	"fmt"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"
	"sync"
)

const maxConcurrentChecks = 2

// ----------------------------------------------------------- //

// CheckConfig reads a JSON configuration file from the specified filepath (based on the UserConfigFolder),
// validates the configuration by checking each endpoint defined in it,
// and returns the results of these checks.
//
// Parameters:
//   - @filepath: A string representing the path to the JSON configuration file
//     that contains API endpoint definitions and authentication details.
//
// Returns:
//   - @A slice of RequestResult containing the results of checking each endpoint.
//   - @An error if there is an issue reading the JSON file or if any other error occurs
//     during the validation process.
func CheckConfig(filepath string) ([]RequestResult, error) {
	Log.Debug("--------CheckConfig------")
	var config Config
	err := ReadJsonFile(filepath, &config)
	Log.Debug(fmt.Sprintf("Reading %s", filepath))
	if err != nil {
		Log.Error(fmt.Sprintf("Impossible to read the json file : %v", err))
		return []RequestResult{}, fmt.Errorf("Impossible to read the json file")
	}

	apiApiKey := NewApi(config.BasicURL)
	apiApiKey.AddApiKey("apikey", config.Authentication.APIKey)

	// Gonna store all the result of each endpoint
	var configTestResult []RequestResult

	for i, endpoint := range config.Endpoint {
		for i2, inputData := range endpoint.Tests {

			result, _ := checkEndpoint(endpoint, inputData, *apiApiKey, i, i2)
			configTestResult = append(configTestResult, result)
		}
	}
	//fmt.Printf("%+v\n", configTestResult)
	// Send the result to JavaScript
	return configTestResult, nil
}

// ----------------------------------------------------------- //

// CheckFolderConfig scans a specified folder (based on the UserConfigFolder) for JSON configuration files,
// and checks each configuration by calling CheckConfig. It handles multiple
// configurations concurrently while ensuring thread safety.
//
// Parameters:
//   - @folderPath: A string representing the path to the folder containing
//     JSON configuration files to be checked.
//
// Returns:
//   - @A slice of RequestResult containing the aggregated results of checking
//     all configurations found in the folder.
//   - @An error if there is an issue listing the JSON files or if any other error occurs
//     during the validation process.
func CheckFolderConfig(folderPath string) ([]RequestResult, error) {

	Log.Debug("--------CheckFolder------")

	folderFiles, err := ListJsonFile(&folderPath)
	if err != nil {
		return nil, fmt.Errorf("error listing JSON files: %v", err)
	}

	var configTestResults []RequestResult
	var mu sync.Mutex // Pour protéger l'accès à configTestResults
	var wg sync.WaitGroup

	// Semaphore pour contrôler le nombre de goroutines actives
	semaphore := make(chan struct{}, maxConcurrentChecks)

	for _, files := range folderFiles {
		if fileList, ok := files.([]string); ok {
			for _, fileName := range fileList {
				filePath := filepath.Join(folderPath, fileName)

				wg.Add(1)               // Incrémenter le compteur de goroutines
				semaphore <- struct{}{} // Acquérir un slot dans le sémaphore

				go func(filePath string, fileName string) {
					defer wg.Done()                // Décrémenter le compteur de goroutines
					defer func() { <-semaphore }() // Libérer un slot dans le sémaphore

					results, err := CheckConfig(filePath)
					if err != nil {
						Log.Error(fmt.Sprintf("Error checking config for file %s: %v", fileName, err))
						return
					}

					mu.Lock()
					configTestResults = append(configTestResults, results...)
					mu.Unlock()
				}(filePath, fileName)
			}
		}
	}
	wg.Wait()
	return configTestResults, nil
}

// ----------------------------------------------------------- //

// checkEndpoint sends an HTTP request to a specified API endpoint using the given method
// and input data. It processes the response, compares it against expected results,
// and returns the result of the check.
//
// Parameters:
// - @endpoint: An Endpoint struct containing the path and details of the API endpoint to check.
// - @inputData: A Test struct containing input data and expected results for the test.
// - @apiApiKey: An Api instance used to send requests to the API with authentication.
// - @i: An integer representing the index of the endpoint in a list (for logging purposes).
// - @i2: An integer representing the index of the test in a list (for logging purposes).
//
// Returns:
// - @A RequestResult containing the outcome of the endpoint check, including any errors or warnings.
// - @An error if there is an issue during the request or processing of results.
func checkEndpoint(endpoint Endpoint, inputData Test, apiApiKey Api, i int, i2 int) (RequestResult, error) {
	var status int
	var result string
	var err error

	var input interface{} = inputData.Input

	returnResult := RequestResult{
		Path:         endpoint.Path,
		Error:        0,
		Warning:      []ResultWarning{},
		OriginalData: inputData,
	}

	/*Log.Debug(endpoint.Path)
	Log.Infos(fmt.Sprintf("boucle endpoint %d, test %d : %s", i, i2, inputData.Method))*/

	switch strings.ToUpper(inputData.Method) {
	case "GET":
		status, result, err = apiApiKey.GET(endpoint.Path, &input)
	case "POST":
		status, result, err = apiApiKey.POST(endpoint.Path, input)
	case "PATCH":
		status, result, err = apiApiKey.PATCH(endpoint.Path, input)
	case "PUT":
		status, result, err = apiApiKey.PUT(endpoint.Path, input)
	case "DELETE":
		status, result, err = apiApiKey.DELETE(endpoint.Path)
	default:
		Log.Infos(fmt.Sprintf("Unknown method for endpoint %d, test %d : %s", i, i2, inputData.Method))
		return returnResult, fmt.Errorf("Unknown method for endpoint %d, test %d : %s", i, i2, inputData.Method)
	}

	if err != nil {
		Log.Error(fmt.Sprintf("Impossible to retrieve the %s! %v", endpoint.Path, err))
		returnResult.Error = ErrorTimeout
		return returnResult, fmt.Errorf("Impossible to retrieve the %s! %v", endpoint.Path, err)
	}

	var jsonRes map[string]interface{}
	errJson := json.Unmarshal([]byte(result), &jsonRes)
	if errJson != nil {
		Log.Error(fmt.Sprintf("Impossible to cast the answer into a json (%s) : %v", endpoint.Path, errJson))
		return returnResult, errJson
	}

	returnResult.ActualOutput = jsonRes

	// Compare http code result
	resultError, resultWarning := compareHttpStatus(inputData.ExpectedHttpState, status)
	if !saveResult(resultError, resultWarning, &returnResult) {
		Log.Error(fmt.Sprintf("Not the same HTTP Status for this request : %s", endpoint.Path))
		return returnResult, fmt.Errorf("Not the same HTTP Status for this request : %s", endpoint.Path)
	}

	// Compare the Json answer
	resultError, resultWarning = compareResults(inputData.ExpectedOutput, result)
	if !saveResult(resultError, resultWarning, &returnResult) {
		Log.Error(fmt.Sprintf("Impossible to fill the warning/error for compareHttpStatus for this request : %d", endpoint.Path))
		return returnResult, fmt.Errorf("Impossible to fill the warning/error for compareResults for this request : %d", endpoint.Path)
	}
	return returnResult, nil
}

// ----------------------------------------------------------- //

// saveResult updates a RequestResult based on the provided error and warning results.
// It sets the error field if there is an error and appends any warnings to the warning field.
//
// Parameters:
// - @resultError: A ResultError indicating any error that occurred during validation.
// - @resultWarning: A ResultWarning indicating any warnings that occurred during validation.
// - @returnResult: A pointer to a RequestResult that will be updated with the error or warning.
//
// Returns:
// - @A boolean indicating whether the result was saved successfully (true if no error occurred).
func saveResult(resultError ResultError, resultWarning ResultWarning, returnResult *RequestResult) bool {
	if resultError != 0 {
		returnResult.Error = resultError
		return false
	}
	if resultWarning != 0 {
		returnResult.Warning = append(returnResult.Warning, resultWarning)
	}
	return true
}

// ----------------------------------------------------------- //

// compareHttpStatus compares an expected HTTP status code with an actual status code
// returned from an API response. It checks if they are in the same range and whether
// they match exactly.
//
// Parameters:
// - @expectedStatus: A string representing the expected HTTP status code.
// - @actualStatus: An integer representing the actual HTTP status code returned by the API.
//
// Returns:
// - @A ResultError indicating any errors related to HTTP status comparison.
// - @A ResultWarning indicating any warnings related to HTTP status comparison.
func compareHttpStatus(expectedStatus string, actualStatus int) (ResultError, ResultWarning) {
	expectedStatusInt, err := strconv.Atoi(expectedStatus)
	if err != nil {
		return ErrorInvalidJSON, 0
	}

	// Check if the status codes are in the same range (first digit)
	if expectedStatusInt/100 != actualStatus/100 {
		return ErrorWrongHttpStatusRange, 0
	}

	// Check if the status codes are exactly the same
	if expectedStatusInt != actualStatus {
		return 0, WarningHttpStatusNotSame
	}

	// Status codes match exactly
	return 0, 0
}

// ----------------------------------------------------------- //

// compareResults compares the expected output with the actual result returned from an API response.
// It checks for equality, missing keys, and inconsistent data types in the JSON structures.
//
// Parameters:
//   - @expectedOutput: An interface{} representing the expected output structure, which will be
//     marshalled to JSON for comparison.
//   - @actualResult: A string containing the actual result returned from the API response.
//
// Returns:
//   - @A ResultError indicating any errors related to the comparison process, such as invalid JSON or
//     missing keys.
//   - @A ResultWarning indicating any warnings related to the comparison, such as inconsistent data types
//     or extra key-value pairs present in the actual result.
func compareResults(expectedOutput interface{}, actualResult string) (ResultError, ResultWarning) {
	expectedOutputBytes, err := json.Marshal(expectedOutput)
	if err != nil {
		Log.Error(fmt.Sprintf("Error marshalling expected output: %v", err))
		return ErrorInvalidJSON, 0
	}
	expectedOutputString := string(expectedOutputBytes)

	if actualResult == "" {
		expectedLower := strings.ToLower(expectedOutputString)
		if strings.Contains(expectedLower, "_@empty") || strings.Contains(expectedLower, "_@nothing") {
			return 0, 0
		}
		return 0, WarningNoResponse
	} else if actualResult == expectedOutputString {
		return 0, 0
	} else {
		var expectedMap, actualMap map[string]interface{}

		err = json.Unmarshal(expectedOutputBytes, &expectedMap)
		if err != nil {
			Log.Error(fmt.Sprintf("Error unmarshalling expected output: %v", err))
			return ErrorInvalidJSON, 0
		}

		err = json.Unmarshal([]byte(actualResult), &actualMap)
		if err != nil {
			Log.Error(fmt.Sprintf("Error unmarshalling actual result: %v", err))
			return ErrorInvalidJSON, 0
		}

		missingKeys := []string{}
		inconsistentTypes := false

		for key, expectedValue := range expectedMap {
			actualValue, exists := actualMap[key]

			// The ExpectedOutPut
			if !exists {
				missingKeys = append(missingKeys, key)
			} else if reflect.TypeOf(expectedValue) != reflect.TypeOf(actualValue) {
				inconsistentTypes = true
			}
		}

		if len(missingKeys) > 0 {
			Log.Error(fmt.Sprintf("Missing keys: %v", missingKeys))
			return ErrorMissingKeyValue, 0
		}

		if inconsistentTypes {
			Log.Infos("Inconsistent data types detected")
			return 0, WarningInconsistentDataTypes
		}

		// If we reach here, all keys exist but values are different
		Log.Infos("There is some extra key-value")
		return 0, WarningExtraKeyValue
	}
}
