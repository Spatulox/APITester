package checkConfig

import (
	. "ApiTester/src/json"
	. "ApiTester/src/log"
	. "ApiTester/src/request"
	. "ApiTester/src/struct"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

func CheckConfig(filepath string) (RequestResult, error) {
	var config Config
	err := ReadJsonFile(filepath, &config)
	if err != nil {
		Log.Error(fmt.Sprintf("Impossible to read the json file : %v", err))
		return RequestResult{}, fmt.Errorf("Impossible to read the json file")
	}

	returnResult := RequestResult{
		Error:   0,
		Warning: []ResultWarning{},
		Request: config,
	}

	apiApiKey := NewApi(config.BasicURL)
	apiApiKey.AddApiKey(config.Authentication.APIKey)

	for i, endpoint := range config.Endpoint {
		for i2, test := range endpoint.Tests {
			var input interface{} = test.Input

			var status int
			var result string
			var err error

			switch strings.ToUpper(test.Method) {
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
				Log.Infos(fmt.Sprintf("Méthode non reconnue pour l'endpoint %d, test %d : %s", i, i2, test.Method))
				break
			}

			if err != nil {
				Log.Error(fmt.Sprintf("Impossible to retrieve the %s!", endpoint.Path))
				return returnResult, fmt.Errorf("Impossible to retrieve the %s!", endpoint.Path)
			}

			// Compare http code result
			resultError, resultWarning := compareHttpStatus(test.ExpectedHttpState, status)
			if !saveResult(resultError, resultWarning, &returnResult) {
				Log.Error(fmt.Sprintf("Impossible to fill the warning/error for compareHttpStatus for this request : %d", endpoint.Path))
				return returnResult, fmt.Errorf("Impossible to fill the warning/error for compareHttpStatus for this request : %d", endpoint.Path)
			}

			// Compare the Json answer
			resultError, resultWarning = compareResults(test.ExpectedOutput, result)
			if !saveResult(resultError, resultWarning, &returnResult) {
				Log.Error(fmt.Sprintf("Impossible to fill the warning/error for compareHttpStatus for this request : %d", endpoint.Path))
				return returnResult, fmt.Errorf("Impossible to fill the warning/error for compareResults for this request : %d", endpoint.Path)
			}
		}
	}

	return returnResult, nil
}

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

func compareHttpStatus(expectedStatus string, actualStatus int) (ResultError, ResultWarning) {
	expectedStatusInt, err := strconv.Atoi(expectedStatus)
	if err != nil {
		return ErrorInvalidJSON, 0
	}

	// Check if the status codes are in the same range (first digit)
	if expectedStatusInt%100 != actualStatus%100 {
		return ErrorWrongHttpStatusRange, 0
	}

	// Check if the status codes are exactly the same
	if expectedStatusInt != actualStatus {
		return 0, WarningHttpStatusNotSame
	}

	// Status codes match exactly
	return 0, 0
}

func compareResults(expectedOutput interface{}, actualResult string) (ResultError, ResultWarning) {
	expectedOutputBytes, err := json.Marshal(expectedOutput)
	if err != nil {
		Log.Error(fmt.Sprintf("Error marshalling expected output: %v", err))
		return ErrorInvalidJSON, 0
	}
	expectedOutputString := string(expectedOutputBytes)

	if actualResult == expectedOutputString {
		Log.Infos("Same information")
		return 0, 0
	} else {
		// Compare the keys to know if they exist in the expected output and result
		// This part needs to be implemented based on your specific requirements
		return 0, 0
	}
}
