package json

import (
	"encoding/json"
	"os"
)

func ReadJsonFile[T any](filePath string, structure *T) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	decoder := json.NewDecoder(file)
	err = decoder.Decode(structure)
	if err != nil {
		return err
	}

	return nil
}
