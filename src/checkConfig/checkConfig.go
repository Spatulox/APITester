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

func ExecuteConfig(config Config, fillExpectedOutput bool) ([]RequestResult, error) {
	apiApiKey := NewApi(config.BasicURL)
	apiApiKey.AddApiKey(config.Authentication.APIKey.KeyName, config.Authentication.APIKey.ApiKey)

	// Gonna store all the result of each endpoint
	var configTestResult []RequestResult

	var mu sync.Mutex // Pour protéger l'accès à configTestResults
	var wg sync.WaitGroup

	// Semaphore pour contrôler le nombre de goroutines actives
	semaphore := make(chan struct{}, maxConcurrentChecks)

	for i, endpoint := range config.Endpoint {
		endpoint := endpoint
		i := i
		for i2, inputData := range endpoint.Tests {
			wg.Add(1)
			semaphore <- struct{}{}

			inputData := inputData
			i2 := i2
			go func() {
				defer wg.Done() // Décrémenter le compteur de goroutines
				defer func() { <-semaphore }()
				result, _ := checkEndpoint(endpoint, inputData, *apiApiKey, i, i2)
				mu.Lock()
				configTestResult = append(configTestResult, result)
				mu.Unlock()

				if fillExpectedOutput /*&& expectedOutput != nil*/ {
					Log.Infos("Remplissage (fake) du ExpectedOutput")
					//Ouvrir le fichier correspondant, trouver l'endpoint et rajouter le ExpectedOutput

					// Adapter les code d'erreurs (si possible)
					// - WarningDeprecatedField (peut être)
					// - Le Warning qui touche au fait d'y avoir un ActualOutput alors que rien n'est attendu (peut être celui au dessus) => WarningUnknownExpectedOutput
				}

			}()
		}
	}
	wg.Wait()
	return configTestResult, nil
}

func CheckConfig(filepath string, fillExpectedOutput bool) ([]RequestResult, error) {
	Log.Debug("--------CheckConfig------")

	var config Config
	err := ReadJsonFile(filepath, &config)
	Log.Debug(fmt.Sprintf("Reading %s", filepath))
	if err != nil {
		Log.Error(fmt.Sprintf("Impossible to read the json file : %v", err))
		return []RequestResult{}, fmt.Errorf("Impossible to read the json file")
	}
	return ExecuteConfig(config, fillExpectedOutput)
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
func CheckFolderConfig(folderPath string, fillExpectedOutput ...bool) ([]RequestResult, error) {

	Log.Debug("--------CheckFolder------")

	shouldFill := false
	if len(fillExpectedOutput) > 0 {
		shouldFill = fillExpectedOutput[0]
	}

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

					results, err := CheckConfig(filePath, shouldFill)
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
func checkEndpoint(endpoint Endpoint, inputData Test, apiApiKey Api, i int, i2 int, fillExpectedOutput ...bool) (RequestResult, error) {
	var status int
	var result string
	var requestErr error

	var input interface{} = inputData.Input

	returnResult := RequestResult{
		Path:         endpoint.Path,
		Error:        0,
		Warning:      []ResultWarning{},
		OriginalData: inputData,
	}

	Log.Infos(fmt.Sprintf("Processing endpoint %s : %s", inputData.Method, endpoint.Path))
	switch strings.ToUpper(inputData.Method) {
	case "GET":
		status, result, requestErr = apiApiKey.GET(endpoint.Path, &input)
	case "POST":
		status, result, requestErr = apiApiKey.POST(endpoint.Path, input)
	case "PATCH":
		status, result, requestErr = apiApiKey.PATCH(endpoint.Path, input)
	case "PUT":
		status, result, requestErr = apiApiKey.PUT(endpoint.Path, input)
	case "DELETE":
		status, result, requestErr = apiApiKey.DELETE(endpoint.Path)
	default:
		Log.Infos(fmt.Sprintf("Unknown method for endpoint %d, test %d : %s", i, i2, inputData.Method))
		return returnResult, fmt.Errorf("Unknown method for endpoint %d, test %d : %s", i, i2, inputData.Method)
	}

	returnResult.ActualHttpState = status
	if requestErr != nil && (status == ErrorTimeout || status == 0) {
		Log.Error(fmt.Sprintf("Impossible to retrieve the %s! %v", endpoint.Path, requestErr))
		returnResult.Error = ErrorTimeout
		returnResult.ActualHttpState = ErrorTimeout
		return returnResult, fmt.Errorf("Impossible to retrieve the %s! %v", endpoint.Path, requestErr)
	}

	returnResult.ActualOuputString = result

	if result == "" {
		if inputData.ExpectedOutput == nil || reflect.DeepEqual(inputData.ExpectedOutput, struct{}{}) {
			return returnResult, nil
		}

		Log.Infos("Error no content")
		returnResult.Error = ErrorNoContent
		return returnResult, fmt.Errorf("Error no content")
	}

	ActualRes, err, isArray := parseActualResult(result, endpoint)
	if err != ErrorNoError {
		returnResult.Error = err
		return returnResult, fmt.Errorf("Error when parsing actual result : %v", err)
	}

	returnResult.ActualIsArray = isArray
	returnResult.ActualOutput = ActualRes

	// Compare http code result
	if inputData.ExpectedHttpState == "" {
		returnResult.Warning = append(returnResult.Warning, WarningUnknownHttpStatusExpected)
		Log.Error(fmt.Sprintf("No expected http state for this endpoint : %s", endpoint.Path))
		//return returnResult, fmt.Errorf("No expected http state for this endpoint : %s", endpoint.Path)
	}

	resultError, resultWarning := compareHttpStatus(inputData.ExpectedHttpState, status)
	if !saveResult(resultError, resultWarning, &returnResult) {
		Log.Error(fmt.Sprintf("Not the same HTTP Status for this request : %s", endpoint.Path))

		if status > 400 {
			// If not the same actual status and expected status
			if requestErr != nil {
				Log.Error(fmt.Sprintf("Impossible to retrieve the %s! %v", endpoint.Path, requestErr))
				returnResult.Error = ResultError(status)
				return returnResult, fmt.Errorf("Impossible to retrieve the %s! %v", endpoint.Path, requestErr)
			}
		}
		return returnResult, fmt.Errorf("Not the same HTTP Status for this request : %s", endpoint.Path)
	}

	if inputData.ExpectedOutput == nil {
		returnResult.Warning = append(returnResult.Warning, WarningUnknownExpectedOutput)
		Log.Infos(fmt.Sprintf("No expected output for this endpoint : %s", endpoint.Path))
		//return returnResult, fmt.Errorf("No expected output for this endpoint : %s", endpoint.Path)
	}

	// Compare the Json answer
	resultError, resultWarning = compareResults(inputData.ExpectedOutput, result, returnResult.ActualIsArray)
	if !saveResult(resultError, resultWarning, &returnResult) {
		Log.Error(fmt.Sprintf("Error in compareResult for this request : %s", endpoint.Path))
		return returnResult, fmt.Errorf("Error in compareResults for this request : %s", endpoint.Path)
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
	if expectedStatus == "Not Provided" {
		return 0, WarningUnknownHttpStatusExpected
	}
	expectedStatusInt, err := strconv.Atoi(expectedStatus)
	if err != nil {
		return Error, 0
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
func compareResults(expectedOutput interface{}, actualResult string, isNormalActualOutputIsArray bool) (ResultError, ResultWarning) {
	expectedOutputBytes, err := json.Marshal(expectedOutput)
	if err != nil {
		Log.Error(fmt.Sprintf("Error marshalling expected output: %v", err))
		return ErrorInvalidExpectedJSON, 0
	}
	expectedOutputString := string(expectedOutputBytes)
	if expectedOutputString == "" || expectedOutputString == "{}" || expectedOutput == nil || reflect.DeepEqual(expectedOutput, struct{}{}) {
		return 0, WarningUnknownExpectedOutput
	}

	// Vérifier si les résultats attendus et réels sont identiques
	if actualResult == expectedOutputString {
		return 0, 0 // Les résultats sont identiques
	}

	if actualResult == "" {
		expectedLower := strings.ToLower(expectedOutputString)
		if strings.Contains(expectedLower, "_@empty") || strings.Contains(expectedLower, "_@nothing") {
			return 0, 0
		}
		return 0, WarningNoResponse
	}

	var expectedArray []interface{}
	var actualArray []interface{}
	var expectedMap map[string]interface{}
	var actualMap map[string]interface{}

	// Essayer de unmarshall les résultats attendus en tant que tableaux
	err = json.Unmarshal(expectedOutputBytes, &expectedArray)
	if err != nil {
		// Si expected output n'est pas un tableau, essayer de unmarshall en tant qu'objet
		err = json.Unmarshal(expectedOutputBytes, &expectedMap)
		if err != nil {
			Log.Error(fmt.Sprintf("Error unmarshalling expected output as array AND map: %v", err))
			return ErrorInvalidExpectedJSON, 0
		}

		//Unmarshall actualResult en tant que tableau d'objet
		err = json.Unmarshal([]byte(actualResult), &actualArray)
		if err != nil {
			err = json.Unmarshal([]byte(actualResult), &actualMap)
			if err != nil {
				Log.Error(fmt.Sprintf("Error unmarshalling actual result as array AND json (expected ouput just json): %v", err))
				return ErrorInvalidAPIJSON, 0
			}
			return compareObjects(expectedMap, actualMap)
		}
		// if Actual_output is an array BUT expected_output is not, so need to cast it into a map[string]interface{}
		if !isNormalActualOutputIsArray {
			err = json.Unmarshal([]byte(actualResult), &actualMap)
			if err != nil {
				Log.Error(fmt.Sprintf("Error unmarshalling actual result as array AND json (expected ouput just json): %v", err))
				return ErrorNoContent, 0 // A changer
			}
			return compareObjects(expectedMap, actualMap)
		}
		return compareArrays(expectedArray, actualArray)

	} else {
		// Si expected output est un tableau
		if isNormalActualOutputIsArray {
			err = json.Unmarshal([]byte(actualResult), &actualArray)
			if err != nil {
				Log.Error(fmt.Sprintf("Error unmarshalling actual result as array: %v", err))
				return ErrorInvalidAPIJSON, 0
			}
			return compareArrays(expectedArray, actualArray)
		}
		return ErrorExpectedOrActualOuputNotMatch, 0
	}
}

func compareObjects(expectedMap, actualMap map[string]interface{}) (ResultError, ResultWarning) {
	missingKeys := []string{}
	extraKeys := []string{}
	inconsistentTypes := false
	differentValues := false

	// Vérifier les clés manquantes, les types incohérents et les valeurs différentes
	for key, expectedValue := range expectedMap {
		actualValue, exists := actualMap[key]

		if !exists {
			missingKeys = append(missingKeys, key)
		} else {
			expectedType := reflect.TypeOf(expectedValue)
			actualType := reflect.TypeOf(actualValue)

			if expectedType != actualType {
				inconsistentTypes = true
				Log.Infos(fmt.Sprintf("Inconsistent type for key %s: expected %v, got %v", key, expectedType, actualType))
			} else if !reflect.DeepEqual(expectedValue, actualValue) {
				differentValues = true
				Log.Infos(fmt.Sprintf("Different value for key %s: expected %v, got %v", key, expectedValue, actualValue))
			}
		}
	}

	// Vérifier les clés supplémentaires
	// Verify Extra keys
	for key := range actualMap {
		if _, exists := expectedMap[key]; !exists {
			extraKeys = append(extraKeys, key)
		}
	}

	// Return result
	if len(missingKeys) > 0 {
		return ErrorMissingKeyValue, 0
	}

	if len(extraKeys) > 0 {
		return 0, WarningExtraKeyValue
	}

	if inconsistentTypes {
		return 0, WarningInconsistentDataTypes
	}

	if differentValues {
		return 0, WarningNotSameValue
	}

	return 0, 0
}

func compareArrays(expectedArray, actualArray []interface{}) (ResultError, ResultWarning) {
	if len(expectedArray) != len(actualArray) {
		Log.Error("Different number of elements in arrays")
		return ErrorExpectedOrActualOuputNotMatch, 0
	}

	for i := range expectedArray {
		expectedMap, ok1 := expectedArray[i].(map[string]interface{})
		actualMap, ok2 := actualArray[i].(map[string]interface{})

		if !ok1 {
			Log.Error("Expected output isn't map")
			return ErrorInvalidExpectedJSON, 0
		}

		if !ok2 {
			Log.Error("Actual output isn't map")
			return ErrorInvalidAPIJSON, 0
		}

		err, warn := compareObjects(expectedMap, actualMap)
		if err != 0 || warn != 0 {
			return err, warn
		}
	}

	return 0, 0 // Tout est conforme pour les tableaux
}

func parseActualResult(result string, endpoint Endpoint) ([]interface{}, ResultError, bool) {
	var arrJsonRes []interface{}

	// Essayer de unmarshall en tant que tableau
	err := json.Unmarshal([]byte(result), &arrJsonRes)
	if err != nil {
		Log.Infos(fmt.Sprintf("Error unmarshalling actual output as array: %v", err))

		// Essayer de unmarshall en tant qu'objet unique
		var jsonRes map[string]interface{}
		err := json.Unmarshal([]byte(result), &jsonRes)
		if err != nil {
			Log.Error(fmt.Sprintf("Error unmarshalling actual output as array AND map: %v", err))
			return nil, ErrorInvalidAPIJSON, false
		}

		// Si ce n'est pas un tableau, traiter comme un objet unique
		return []interface{}{jsonRes}, 0, false // Retourner un tableau contenant l'objet unique et une erreur nulle (0)
	}

	// Vérifier si le résultat est un tableau
	return arrJsonRes, 0, true // Retourner le tableau et une erreur nulle (0)
}
