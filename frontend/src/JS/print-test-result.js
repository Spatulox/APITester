import {showSection} from "./event-listener";
import {getErrorCode, getErrorName, getWarningName} from "./enum";
import { makeEditablePre } from "./config/edit-config";

export function printResult(event, result) {
    if (result == null) {
        return;
    }

    // Récupérer les compteurs et sections HTML
    const okCount = document.getElementById("ok-count");
    const warningCount = document.getElementById("warning-count");
    const errorCount = document.getElementById("error-count");

    const okSection = document.getElementById("ok");
    const warningSection = document.getElementById("warning");
    const errorSection = document.getElementById("error");

    // Réinitialiser les sections et compteurs
    okSection.innerHTML = "";
    warningSection.innerHTML = "";
    errorSection.innerHTML = "";
    okCount.innerText = "0";
    warningCount.innerText = "0";
    errorCount.innerText = "0";

    let okTests = 0;
    let warningTests = 0;
    let errorTests = 0;

    // Regrouper les résultats par type et endpoint
    const groupedResults = {
        ok: {},
        warning: {},
        error: {}
    };

    result.forEach(item => {
        const { Path, Error, Warning, OriginalData, ActualIsArray } = item;

        // Créer un conteneur pour le résultat
        const resultDiv = document.createElement("div");
        resultDiv.classList.add("result-item");

        // Ajouter la méthode au résultat
        const methodHeader = document.createElement("h4");
        methodHeader.textContent = `Method: ${OriginalData.method}`;
        resultDiv.appendChild(methodHeader);

        // Gérer les erreurs et avertissements
        if (Error > 0) {
            errorTests++;
            errorCount.textContent = errorTests; // Mettre à jour le compteur d'erreurs

            // Ajouter le type d'erreur au résultat
            const errorParagraph = document.createElement("p");
            const errorStrong = document.createElement("strong");
            errorStrong.textContent = "Error:";
            errorParagraph.appendChild(errorStrong);
            errorParagraph.appendChild(document.createTextNode(` ${getErrorName(Error)}`));
            resultDiv.appendChild(errorParagraph);

            if (!groupedResults.error[Path]) {
                groupedResults.error[Path] = [];
            }
            groupedResults.error[Path].push(resultDiv);
        } else if (Warning.length > 0) {
            warningTests++;
            warningCount.textContent = warningTests; // Mettre à jour le compteur d'avertissements

            // Ajouter tous les avertissements au résultat
            const warningParagraph = document.createElement("p");
            const warningStrong = document.createElement("strong");
            warningStrong.textContent = "Warnings:";
            warningParagraph.appendChild(warningStrong);
            warningParagraph.appendChild(document.createTextNode(` ${Warning.map(w => getWarningName(w)).join(', ')}`));
            resultDiv.appendChild(warningParagraph);

            if (!groupedResults.warning[Path]) {
                groupedResults.warning[Path] = [];
            }
            groupedResults.warning[Path].push(resultDiv);
        } else {
            okTests++;
            okCount.textContent = okTests; // Mettre à jour le compteur de tests réussis

            if (!groupedResults.ok[Path]) {
                groupedResults.ok[Path] = [];
            }
            groupedResults.ok[Path].push(resultDiv);
        }

        // Gestion de ActualOutput et ExpectedOutput
        let ActualOutput = item.ActualOutput;
        if (ActualOutput && ActualOutput.length === 1 && ActualIsArray === false) {
            ActualOutput = ActualOutput[0];
        }

        if (Error === getErrorCode("ErrorInvalidAPIJSON")) {
            ActualOutput = item.ActualOutputString;
        }

        const ExpectedOutput = OriginalData.expectedOutput;

        // Ajouter les informations HTTP et outputs
        const expectedHttpStateParagraph = document.createElement("p");
        expectedHttpStateParagraph.innerHTML =
            `<strong>Expected HTTP State:</strong> ${OriginalData.expectedHttpState}`;
        resultDiv.appendChild(expectedHttpStateParagraph);

        const actualHttpStateParagraph = document.createElement("p");
        actualHttpStateParagraph.innerHTML =
            `<strong>Actual HTTP State:</strong> ${item.ActualHttpState}`;
        resultDiv.appendChild(actualHttpStateParagraph);

        const expectedOutputParagraph = document.createElement("p");
        expectedOutputParagraph.innerHTML =
            `<strong>Expected Output:</strong>`;
        resultDiv.appendChild(expectedOutputParagraph);

        const expectedOutputPre = document.createElement("pre");
        expectedOutputPre.className = "json-output";
        expectedOutputPre.textContent =
            JSON.stringify(ExpectedOutput, null, 2);
        resultDiv.appendChild(expectedOutputPre);

        // Ajouter Actual Output avec makeEditablePre
        const actualOutputParagraph = document.createElement("p");
        actualOutputParagraph.innerHTML =
            `<strong>Actual Output:</strong>`;
        resultDiv.appendChild(actualOutputParagraph);

        if (Error === getErrorCode("ErrorInvalidAPIJSON")) {
            const actualOutputPreRaw = document.createElement("pre");
            actualOutputPreRaw.className = "json-output";
            actualOutputPreRaw.textContent =
                ActualOutput;
            resultDiv.appendChild(actualOutputPreRaw);
        } else {
            const editableActualOutput =
                makeEditablePre(ActualOutput !== null ?
                    JSON.stringify(ActualOutput, null, 2) : "null", 'json');
            
            resultDiv.appendChild(editableActualOutput);
        }
    });

    // Afficher les résultats groupés par type et endpoint
    for (const type of ['error', 'warning', 'ok']) {
        for (const path in groupedResults[type]) {
            const containerDiv = document.createElement("div");
            containerDiv.classList.add("endpoint-container");

            // Créer un en-tête cliquable pour l'endpoint
            const headerDiv = document.createElement("div");
            headerDiv.classList.add("endpoint-header");

            const headerTitle = document.createElement('h3');
            headerTitle.textContent = path;
            
            headerDiv.appendChild(headerTitle);

            headerDiv.addEventListener("click", () => {
                const contentDiv =
                    headerDiv.nextElementSibling;
                contentDiv.style.display =
                    contentDiv.style.display === "none" ? "block" : "none";
            });

            // Créer une section pour afficher les résultats de cet endpoint
            const contentDiv = document.createElement("div");
            contentDiv.classList.add("endpoint-content");
            contentDiv.style.display = "none"; // Masquer par défaut

            // Ajouter tous les résultats associés à cet endpoint
            groupedResults[type][path].forEach(resultItem => {
                contentDiv.appendChild(resultItem);
            });

            // Ajouter l'en-tête et le contenu au conteneur principal
            containerDiv.appendChild(headerDiv);
            containerDiv.appendChild(contentDiv);

            // Ajouter le conteneur à la section appropriée
            if (type === 'error') {
                errorSection.appendChild(containerDiv);
            } else if (type === 'warning') {
                warningSection.appendChild(containerDiv);
            } else if (type === 'ok') {
                okSection.appendChild(containerDiv);
            }
        }
    }

    // Ajouter des messages si aucune donnée n'est disponible
    if (okTests === 0) {
        const noOkMessage = document.createElement("p");
        noOkMessage.textContent = "Aucun test réussi pour le moment.";
        okSection.appendChild(noOkMessage);
    }
    if (warningTests === 0) {
        const noWarningMessage = document.createElement("p");
        noWarningMessage.textContent = "Aucun avertissement pour le moment.";
        warningSection.appendChild(noWarningMessage);
    }
    if (errorTests === 0) {
        const noErrorMessage = document.createElement("p");
        noErrorMessage.textContent = "Aucune erreur pour le moment.";
        errorSection.appendChild(noErrorMessage);
    }

    // Afficher la section des résultats
    showSection(null, 'results-dashboard');
}
            
