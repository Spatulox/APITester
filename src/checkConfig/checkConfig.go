package checkConfig

import (
	. "ApiTester/src/json"
	. "ApiTester/src/log"
	. "ApiTester/src/request"
	. "ApiTester/src/struct"
	"encoding/json"
	"fmt"
	"reflect"
	"strconv"
	"strings"
)

func CheckConfig(filepath string) ([]RequestResult, error) {
	var config Config
	err := ReadJsonFile(filepath, &config)
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
		Log.Infos(fmt.Sprintf("Méthode non reconnue pour l'endpoint %d, test %d : %s", i, i2, inputData.Method))
		break
	}

	if err != nil {
		Log.Error(fmt.Sprintf("Impossible to retrieve the %s! %v", endpoint.Path, err))
		returnResult.Error = ErrorTimeout
		return returnResult, fmt.Errorf("Impossible to retrieve the %s! %v", endpoint.Path, err)
	}

	var jsonRes map[string]interface{}
	errJson := json.Unmarshal([]byte(result), &jsonRes)
	if errJson != nil {
		Log.Error(fmt.Sprintf("Impossible to cast the answer into a json : %v", errJson))
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

func saveResult(resultError ResultError, resultWarning ResultWarning, returnResult *RequestResult) bool {
	if resultError != 0 {
		returnResult.Error = resultError
		return false
	}
	if resultWarning != 0 {
		returnResult.Warning = append(returnResult.Warning)
	}
	return true
}

// ----------------------------------------------------------- //

func compareHttpStatus(expectedStatus string, actualStatus int) (ResultError, ResultWarning) {
	expectedStatusInt, err := strconv.Atoi(expectedStatus)
	if err != nil {
		return ErrorInvalidJSON, 0
	}

	// Check if the status codes are in the same range (first digit)
	if expectedStatusInt/100 != actualStatus/100 {
		Log.Debug(fmt.Sprintf("%d / %d", expectedStatusInt, actualStatus))
		Log.Infos("Wrong Status Range")
		return ErrorWrongHttpStatusRange, 0
	}

	// Check if the status codes are exactly the same
	if expectedStatusInt != actualStatus {
		Log.Infos("Status Not Same")
		return 0, WarningHttpStatusNotSame
	}

	// Status codes match exactly
	return 0, 0
}

// ----------------------------------------------------------- //

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
