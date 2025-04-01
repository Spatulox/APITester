package main

import (
	"fmt"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) InfosDialog(message string) (string, error) {
	result, err := runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:          runtime.InfoDialog,
		Title:         "Infos",
		Message:       message,
		DefaultButton: "Ok",
		Buttons:       []string{"Ok"},
	})

	return result, err
}

func (a *App) ConfirmDialog(message string) (bool, error) {
	result, err := runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:          runtime.QuestionDialog,
		Title:         "Question",
		Message:       message,
		DefaultButton: "Cancel",
		Buttons:       []string{"Confirm", "Cancel"},
	})

	if err != nil {
		return false, err
	}

	switch result {
	case "Confirm", "Yes", "Ok", "Continue": // Boutons positifs
		return true, nil
	case "Cancel", "No", "Abort", "Ignore": // Boutons négatifs
		return false, nil
	default:
		return false, fmt.Errorf("unexpected button result: %s", result)
	}
}

func (a *App) WarningDialog(message string) (string, error) {
	result, err := runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:          runtime.WarningDialog,
		Title:         "Question",
		Message:       message,
		DefaultButton: "Ok",
		Buttons:       []string{"Ok"},
	})

	return result, err
}

func (a *App) ErrorDialog(message string) (string, error) {
	result, err := runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
		Type:          runtime.ErrorDialog,
		Title:         "Question",
		Message:       message,
		DefaultButton: "Ok",
		Buttons:       []string{"Ok"},
	})

	return result, err
}
