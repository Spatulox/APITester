import {showSection} from "./event-listener";
import {getErrorName, getWarningName} from "./enum";


export function printResult(result, evt) {
    if (result == null) {
        return;
    }

    console.log(result);

    const okCount = document.getElementById("ok-count");
    const warningCount = document.getElementById("warning-count");
    const errorCount = document.getElementById("error-count");

    let okTests = 0;
    let warningTests = 0;
    let errorTests = 0;

    const okSection = document.getElementById("ok");
    const warningSection = document.getElementById("warning");
    const errorSection = document.getElementById("error");

    okSection.innerHTML = "";
    warningSection.innerHTML = "";
    errorSection.innerHTML = "";

    // Regrouper les résultats par type et par endpoint
    const groupedResults = {
        ok: {},
        warning: {},
        error: {}
    };

    result.forEach(item => {
        const { Path, Error, Warning, OriginalData } = item;

        // Créer un objet pour stocker le résultat
        const resultDiv = document.createElement("div");
        resultDiv.classList.add("result-item");

        // Afficher les détails du test
        resultDiv.innerHTML = `
            <h4>Method: ${OriginalData.method}</h4>
            <p><strong>Expected HTTP State:</strong> ${OriginalData.expectedHttpState}</p>
            <p><strong>Expected Output:</strong></p>
            <pre class="json-output">${JSON.stringify(OriginalData.expectedOutput, null, 2)}</pre>
            <p><strong>Actual Output:</strong></p>
            <pre class="json-output">${item.ActualOutput !== null ? JSON.stringify(item.ActualOutput, null, 2) : "null"}</pre>
        `;

        // Gérer les erreurs et avertissements
        if (Error > 0) {
            errorTests++;
            errorCount.textContent = errorTests; // Mettre à jour le compteur d'erreurs

            // Ajouter le type d'erreur au résultat
            const errorName = getErrorName(Error);
            resultDiv.innerHTML += `<p><strong>Error:</strong> ${errorName}</p>`;

            if (!groupedResults.error[Path]) {
                groupedResults.error[Path] = [];
            }
            groupedResults.error[Path].push(resultDiv);
        } else if (Warning.length > 0) {
            warningTests++;
            warningCount.textContent = warningTests; // Mettre à jour le compteur d'avertissements

            // Ajouter tous les avertissements au résultat
            const warningNames = Warning.map(w => getWarningName(w)).join(', ');
            resultDiv.innerHTML += `<p><strong>Warnings:</strong> ${warningNames}</p>`;

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
    });

    // Afficher les résultats groupés par type et par endpoint
    for (const type of ['error', 'warning', 'ok']) {
        for (const path in groupedResults[type]) {
            const containerDiv = document.createElement("div");
            containerDiv.classList.add("endpoint-container");

            // Créer un en-tête cliquable pour l'endpoint
            const headerDiv = document.createElement("div");
            headerDiv.classList.add("endpoint-header");
            headerDiv.innerHTML = `<h3>${path}</h3>`;

            // Ajouter un événement pour ouvrir/fermer
            headerDiv.addEventListener("click", () => {
                const contentDiv = headerDiv.nextElementSibling;
                contentDiv.style.display = contentDiv.style.display === "none" ? "block" : "none";
            });

            // Créer une section pour afficher les résultats de cet endpoint
            const contentDiv = document.createElement("div");
            contentDiv.classList.add("endpoint-content");
            contentDiv.style.display = "none"; // Masquer par défaut

            // Ajouter tous les résultats associés à cet endpoint
            groupedResults[type][path].forEach(resultItem => {
                contentDiv.appendChild(resultItem);
            });

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

    if (okTests === 0) {
        okSection.innerHTML += "<p>Aucun test réussi pour le moment.</p>";
    }
    if (warningTests === 0) {
        warningSection.innerHTML += "<p>Aucun avertissement pour le moment.</p>";
    }
    if (errorTests === 0) {
        errorSection.innerHTML += "<p>Aucune erreur pour le moment.</p>";
    }

    // Afficher la section des résultats
    showSection(evt, 'results-dashboard');
}

