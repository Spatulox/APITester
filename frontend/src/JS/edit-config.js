import { PrintJsonFile } from "../../wailsjs/go/main/App";

function jsonToHtml(jsonData) {
    //const config = JSON.parse(jsonData);
    const config = jsonData
    let html = '';

    // En-tête
    html += '<div class="config-header">';
    html += '<h2>Configuration</h2>';
    html += `<p><strong>Basic URL:</strong> ${config.basicUrl}</p>`;
    html += '<p><strong>Authentication:</strong> ' + config.authentication.type + '</p>';
    html += '</div>';

    // Endpoints
    html += '<div class="endpoints">';
    html += '<h2>Endpoints</h2>';

    config.endpoints.forEach(endpoint => {
        html += `<div class="endpoint">`;
        html += `<h3 class="endpoint-header">${endpoint.path}</h3>`;
        html += `<div class="endpoint-content" style="display: none;">`;

        endpoint.tests.forEach(test => {
            html += `<div class="test-method">`;
            html += `<h4 class="method-header">${test.method}</h4>`;
            html += `<div class="method-content" style="display: none;">`;

            if (test.input) {
                html += '<h5>Input:</h5>';
                html += `<pre>${JSON.stringify(test.input, null, 2)}</pre>`;
            }

            html += '<h5>Expected Output:</h5>';
            html += `<pre>${JSON.stringify(test.expectedOutput, null, 2)}</pre>`;

            html += '<h5>Expected HTTP State:</h5>';
            html += `<p>${test.expectedHttpState}</p>`;

            html += '</div>'; // method-content
            html += '</div>'; // test-method
        });

        html += '</div>'; // endpoint-content
        html += '</div>'; // endpoint
    });

    html += '</div>'; // endpoints

    return html;
}

// Fonction pour ajouter les écouteurs d'événements après la création du HTML
function addEventListeners() {
    document.querySelectorAll('.endpoint-header').forEach(header => {
        header.addEventListener('click', function() {
            this.nextElementSibling.style.display =
                this.nextElementSibling.style.display === 'none' ? 'block' : 'none';
        });
    });

    document.querySelectorAll('.method-header').forEach(header => {
        header.addEventListener('click', function() {
            this.nextElementSibling.style.display =
                this.nextElementSibling.style.display === 'none' ? 'block' : 'none';
        });
    });
}

export async function printJsonToEditTab(path){
    if (path.includes("root")) {
        alert("coucou")
        path = path.replace(/^root[/\\]/, "");
    }
    alert(path.toString())
    const jsonString = await PrintJsonFile(path); // Votre JSON ici
    console.log(jsonString)
    document.getElementById('output').innerHTML = jsonToHtml(jsonString);
    addEventListeners();
}
