import {PrintJsonFile} from "../../../wailsjs/go/main/App";

function makeEditable(value, type = 'text') {
    return `<span class="editable" data-type="${type}"><span class="display-value">${value}</span><input type="text" class="edit-input" style="display:none;" value="${value}"></span>`;
}

function makeEditablePre(value, type = 'json') {
    return `<pre class="editable" data-type="${type}"><span class="display-value">${JSON.stringify(value, null, 2)}</span><textarea class="edit-input" style="display:none;">${JSON.stringify(value, null, 2)}</textarea></pre>`;
}

function jsonToHtml(jsonData, filename) {
    const config = jsonData;
    let html = '';

    // En-tête
    html += '<div class="config-header">';
    html += `<h2>Configuration : <span id="fileNameConfiguration">\`${makeEditable(filename)}\`</span></h2>`
    html += `<p><strong>Basic URL:</strong> ${makeEditable(config.basicUrl)}</p>`;

    // Section d'authentification
    html += '<div class="auth-section">';
    html += '<h3>Authentication</h3>';
    html += `<p><strong>Type:</strong> <span id="authType">${config.authentication.type}</span></p>`;

    // Système d'onglets pour l'authentification
    html += '<div class="auth-tabs">';
    html += '<ul class="tab-list">';
    html += '<li class="tab-item active" data-tab="apikey">API Key</li>';
    html += '<li class="tab-item" data-tab="oauth2">OAuth2</li>';
    html += '<li class="tab-item" data-tab="basicAuth">Basic Auth</li>';
    html += '</ul>';

    // Contenu des onglets
    html += '<div class="tab-content">';

    // API Key
    html += '<div class="tab-pane active" id="apikey">';
    html += `<p><strong>Key Name:</strong> ${makeEditable(config.authentication.apikey.keyname || 'Not provided')}</p>`;
    html += `<p><strong>API Key:</strong> ${makeEditable(config.authentication.apikey.apikeyvalue || 'Not provided')}</p>`;
    html += '</div>';

    // OAuth2
    html += '<div class="tab-pane" id="oauth2">';
    html += `<p><strong>Client ID:</strong> ${makeEditable(config.authentication.oauth2.clientId || 'Not provided')}</p>`;
    html += `<p><strong>Client Secret:</strong> ${makeEditable(config.authentication.oauth2.clientSecret ? '********' : 'Not provided')}</p>`;
    html += `<p><strong>Token URL:</strong> ${makeEditable(config.authentication.oauth2.tokenUrl || 'Not provided')}</p>`;
    html += '</div>';

    // Basic Auth
    html += '<div class="tab-pane" id="basicAuth">';
    html += `<p><strong>Username:</strong> ${makeEditable(config.authentication.basicAuth.username || 'Not provided')}</p>`;
    html += `<p><strong>Password:</strong> ${makeEditable(config.authentication.basicAuth.password ? '********' : 'Not provided')}</p>`;
    html += '</div>';

    html += '</div>'; // tab-content
    html += '</div>'; // auth-tabs
    html += '</div>'; // auth-section
    html += '</div>'; // config-header

    // Endpoints
    html += '<div id="endpoint" class="endpoints">';
    html += '<h2>Endpoints</h2>';

    html += '<button id="addEndpointBtn" class="discord-button">Add an Endpoint</button>';

    config.endpoints.forEach(endpoint => {
        html += `<div class="endpoint">`;
        html += `<h3 class="endpoint-header">${makeEditable(endpoint.path)}<button class="delete-endpoint delete-button" onclick="removeElement(this)">🗑️</button></h3>`;

        html += `<div class="endpoint-content">`;

        endpoint.tests.forEach(test => {
            html += `<div class="test-method">`;
            html += `<h4 class="method-header">${makeEditable(test.method)}<button class="delete-method  delete-button" onclick="removeElement(this)">🗑️</button></h4>`;
            html += `<div class="method-content">`;

            html += '<div class="input-section">';
            html += '<h5>Input:</h5>';
            if (test.input) {
                html += makeEditablePre(test.input);
            } else {
                html += makeEditablePre({});
            }
            html += '</div>';

            html += '<div class="output-section">';
            html += '<h5>Expected Output:</h5>';
            html += makeEditablePre(test.expectedOutput);
            html += '</div>';

            html += '<div class="http-state-section">';
            html += '<h5>Expected HTTP State:</h5>';
            html += makeEditable(test.expectedHttpState || "Not Provided");
            html += '</div>';

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
    document.querySelectorAll('#configuration-management .endpoint-header').forEach(header => {
        const content = header.nextElementSibling;
        content.style.display = 'none';
        header.addEventListener('click', function(event) {
            // Vérifiez si le clic n'est pas sur un élément éditable
            if (!event.target.closest('.editable')) {
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
            }
        });
    });

    document.querySelectorAll('#configuration-management .method-header').forEach(header => {
        const content = header.nextElementSibling;
        content.style.display = 'none';
        header.addEventListener('click', function(event) {
            // Vérifiez si le clic n'est pas sur un élément éditable
            if (!event.target.closest('.editable')) {
                content.style.display = content.style.display === 'none' ? 'block' : 'none';
            }
        });
    });

    document.body.addEventListener('click', function(event) {
        if (event.target.classList.contains('display-value')) {
            event.stopPropagation(); // Arrêtez la propagation de l'événement
            const editableSpan = event.target.closest('.editable');
            const displayValue = editableSpan.querySelector('.display-value');
            const editInput = editableSpan.querySelector('.edit-input');

            displayValue.style.display = 'none';
            editInput.style.display = 'inline-block';
            editInput.value = displayValue.textContent.trim();
            adjustInputSize(editInput);
            editInput.focus();
        }
    });

    document.body.addEventListener('input', function(event) {
        if (event.target.classList.contains('edit-input')) {
            adjustInputSize(event.target);
        }
    });

    document.body.addEventListener('blur', function(event) {
        if (event.target.classList.contains('edit-input')) {
            const editableSpan = event.target.closest('.editable');
            const displayValue = editableSpan.querySelector('.display-value');
            const editInput = event.target;

            if (editableSpan.dataset.type === 'json') {
                try {
                    const parsed = JSON.parse(editInput.value);
                    displayValue.textContent = JSON.stringify(parsed, null, 2);
                    editableSpan.classList.remove('invalid');
                } catch (e) {
                    editableSpan.classList.add('invalid');
                    // Optionally, you can show an error message here
                }
            } else {
                displayValue.textContent = editInput.value;
            }

            displayValue.style.display = 'inline-block';
            editInput.style.display = 'none';
        }
    }, true);

    // Ajout d'un écouteur d'événements au bouton "Add Endpoint"
    const addEndpointBtn = document.getElementById("addEndpointBtn");
    if (addEndpointBtn) {
        addEndpointBtn.removeEventListener("click", clickButton)
        addEndpointBtn.addEventListener('click', clickButton);
    }
    setupAuthTabs();
}

function clickButton(){
    const elementWhereAppend = document.getElementById("endpoint");
    if (elementWhereAppend) {
        elementWhereAppend.insertAdjacentHTML('beforeend', createMethodElement());
        addEventListeners(); // Réattache les écouteurs aux nouveaux éléments
        setupAuthTabs();
    } else {
        console.error("L'élément 'endpoint' n'a pas été trouvé.");
    }
}

function setupAuthTabs() {
    const tabItems = document.querySelectorAll('.tab-item');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabItems.forEach(item => {
        item.addEventListener('click', () => {
            // Retirer la classe active de tous les onglets et panneaux
            tabItems.forEach(tab => tab.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            // Ajouter la classe active à l'onglet cliqué et au panneau correspondant
            item.classList.add('active');
            const tabId = item.getAttribute('data-tab');
            const type = document.getElementById("authType")
            type.innerText = tabId
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function adjustInputSize(input) {
    if (input.tagName.toLowerCase() === 'input') {
        input.style.width = 'auto';
    } else if (input.tagName.toLowerCase() === 'textarea') {
        input.style.height = 'auto';
    }
}

// ------------------------------------------------------------ //

function createConfigurationSection() {
    let html = '';

    html += '<div class="config-header">';
    html += `<h2>Configuration : <span id="fileNameConfiguration">\`${makeEditable('File_name.json')}\`</span></h2>`
    html += `<p><strong>Basic URL:</strong> ${makeEditable('')}</p>`;

    html += '<div class="auth-section">';
    html += '<h3>Authentication</h3>';
    html += `<p><strong>Type:</strong> <span id="authType"></span></p>`;

    html += '<div class="auth-tabs">';
    html += '<ul class="tab-list">';
    html += '<li class="tab-item active" data-tab="apikey">API Key</li>';
    html += '<li class="tab-item" data-tab="oauth2">OAuth2</li>';
    html += '<li class="tab-item" data-tab="basicAuth">Basic Auth</li>';
    html += '</ul>';

    html += '<div class="tab-content">';

    html += '<div class="tab-pane active" id="apikey">';
    html += `<p><strong>Key Name:</strong> ${makeEditable('Not provided')}</p>`;
    html += `<p><strong>API Key:</strong> ${makeEditable('Not provided')}</p>`;
    html += '</div>';

    html += '<div class="tab-pane" id="oauth2">';
    html += `<p><strong>Client ID:</strong> ${makeEditable('Not provided')}</p>`;
    html += `<p><strong>Client Secret:</strong> ${makeEditable('Not provided')}</p>`;
    html += `<p><strong>Token URL:</strong> ${makeEditable('Not provided')}</p>`;
    html += '</div>';

    html += '<div class="tab-pane" id="basicAuth">';
    html += `<p><strong>Username:</strong> ${makeEditable('Not provided')}</p>`;
    html += `<p><strong>Password:</strong> ${makeEditable('Not provided')}</p>`;
    html += '</div>';

    html += '</div>'; // tab-content
    html += '</div>'; // auth-tabs
    html += '</div>'; // auth-section
    html += '</div>'; // config-header

    return html;
}

function createEndpointSection() {
    let html = '';

    html += '<div id="endpoint" class="endpoints">';
    html += '<h2>Endpoints</h2>';

    html += '<button id="addEndpointBtn" class="discord-button">Add an Endpoint</button>';

    html += '</div>'; // endpoints

    return html;
}

export function createMethodElement(method = 'GET') {
    let html = '';

    html += `<div class="endpoint">`;
    html += `<h3 class="endpoint-header">${makeEditable("/endpoint")}<button class="delete-endpoint delete-button" onclick="removeElement(this)">🗑️</button></h3>`;
    html += `<div id="endpoint-content" class="endpoint-content">`;

    html += `<div class="test-method">`;
    html += `<h4 class="method-header">${makeEditable(method)}<button class="delete-method  delete-button" onclick="removeElement(this)">🗑️</button></h4>`;
    html += `<div class="method-content">`;

    html += '<div class="input-section">';
    html += '<h5>Input:</h5>';
    html += makeEditablePre({});
    html += '</div>';

    html += '<div class="output-section">';
    html += '<h5>Expected Output:</h5>';
    html += makeEditablePre({});
    html += '</div>';

    html += '<div class="http-state-section">';
    html += '<h5>Expected HTTP State:</h5>';
    html += makeEditable('Not provided');
    html += '</div>';

    html += '</div>'; // method-content
    html += '</div>'; // test-method

    html += '</div>'; // endpoint-content
    html += '</div>'; // endpoint*/

    return html;
}


















// ------------------------------------------------------------ //

export async function printJsonToEditTab(path){
    if (path.includes("root")) {
        path = path.replace(/^root[/\\]/, "");
    }
    try{
        const jsonString = await PrintJsonFile(path); // Votre JSON ici
        document.getElementById('output').innerHTML = jsonToHtml(jsonString, path);
        addEventListeners();
    } catch (e) {
        console.log(e)
    }
}

export function createEmptyConf(){
    const output = document.getElementById("output")
    output.innerHTML = createConfigurationSection()
    output.innerHTML += createEndpointSection()
    addEventListeners();
    setupAuthTabs();
}
