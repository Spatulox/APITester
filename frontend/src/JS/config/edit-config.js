import {CheckEndpoint, PrintJsonFile} from "../../../wailsjs/go/main/App";
import {printResult} from "../print-test-result";
import loadingImage from "../../assets/images/circle-loading.gif"

function makeEditable(value, type = 'text') {
    return `<span class="editable" data-type="${type}"><span class="display-value">${value}</span><input type="text" class="edit-input" style="display:none;" value="${value}" onblur="updateEditableContent(this)"></span>`;
}

function makeEditableNode(value, type = 'text') {
    // Création de l'élément conteneur principal
    const editableSpan = document.createElement('span');
    editableSpan.classList.add('editable');
    editableSpan.setAttribute('data-type', type);

    // Création du sous-élément pour afficher la valeur
    const displayValueSpan = document.createElement('span');
    displayValueSpan.classList.add('display-value');
    displayValueSpan.textContent = value;

    // Création de l'input pour l'édition
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.classList.add('edit-input');
    editInput.style.display = 'none'; // Masqué par défaut
    editInput.value = value;

    // Ajout d'un événement onblur à l'input
    editInput.addEventListener('blur', function () {
        updateEditableContent(this); // Appel de la fonction `updateEditableContent`
    });

    // Ajout des sous-éléments au conteneur principal
    editableSpan.appendChild(displayValueSpan);
    editableSpan.appendChild(editInput);

    return editableSpan;
}


function makeEditablePre(value, type = 'json') {
    return `<pre class="editable" data-type="${type}"><span class="display-value">${JSON.stringify(value, null, 2)}</span><textarea class="edit-input" style="display:none;" onblur="updateEditableContent(this)">${JSON.stringify(value, null, 2)}</textarea></pre>`;
}


export function clearEditConfig(){
    document.getElementById("output").innerHTML = ""
}

export function jsonToHtml(jsonData, filename) {
    console.log(filename)
    const config = jsonData;
    let html = '';

    // En-tête
    html += '<div class="config-header">';
    html += `<h2>Configuration : <span id="fileNameConfiguration">\`${makeEditable(filename)}\`</span></h2>`
    html += `<p><strong>Basic URL:</strong> ${makeEditable(config.basicUrl)}</p>`;
    html += `<span class="globalAskedToFillExpectedOutPut">${config.globalAskedToFillExpectedOutPut}</span>`;

    // Section d'authentification
    html += '<div class="auth-section">';
    html += '<h3>Authentication</h3>';
    html += `<p><strong>Type:</strong> <span id="authType">${config.authentication.type}</span></p>`;

    
    
    
    
    // Système d'onglets pour l'authentification
    html += '<div class="auth-tabs">';
    html += '<ul class="tab-list">';
    html += `<li class="tab-item ${config.authentication.type === "apikey" ? "active"  : ""}" data-tab="apikey">API Key</li>`;
    html += `<li class="tab-item ${config.authentication.type === "oauth2" ? "active"  : ""}" data-tab="oauth2">OAuth2</li>`;
    html += `<li class="tab-item ${config.authentication.type === "basicAuth" ? "active"  : ""}" data-tab="basicAuth">Basic Auth</li>`;
    html += `<li class="tab-item ${config.authentication.type === "noauth" ? "active"  : ""}" data-tab="noauth">No Auth</li>`;
    html += '</ul>';

    // Contenu des onglets
    html += '<div class="tab-content">';

    // API Key
    html += `<div class="tab-pane ${config.authentication.type === "apikey" ? "active"  : ""}" id="apikey">`;
    html += `<p><strong>Key Name:</strong> ${makeEditable(config.authentication.apikey.keyname || 'Not provided')}</p>`;
    html += `<p><strong>API Key:</strong> ${makeEditable(config.authentication.apikey.apikeyvalue || 'Not provided')}</p>`;
    html += '</div>';

    // OAuth2
    html += `<div class="tab-pane ${config.authentication.type === "oauth2" ? "active"  : ""}" id="oauth2">`;
    html += `<p><strong>Client ID:</strong> ${makeEditable(config.authentication.oauth2.clientId || 'Not provided')}</p>`;
    html += `<p><strong>Client Secret:</strong> ${makeEditable(config.authentication.oauth2.clientSecret ? '********' : 'Not provided')}</p>`;
    html += `<p><strong>Token URL:</strong> ${makeEditable(config.authentication.oauth2.tokenUrl || 'Not provided')}</p>`;
    html += '</div>';

    // Basic Auth
    html += `<div class="tab-pane ${config.authentication.type === "basicAuth" ? "active"  : ""}" id="basicAuth">`;
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

    //html += '<button id="addEndpointBtn" class="discord-button">Add an Endpoint</button>';

    config.endpoints.forEach(endpoint => {
        html += `<div class="endpoint">`;
        html += `<h3 class="endpoint-header">
        ${makeEditable(endpoint.path)}
            <span class="isAlreadyAskedToFillExpectedOutput">${endpoint.IsAlreadyAskedToFillExpectedOutPut}</span>
            <span class="endpoints-controls">
                <button class="play-endpoint play-button"">▶</button>
                <button class="delete-endpoint delete-button" onclick="removeElement(this)">🗑️</button>
            </span>
        </h3>`;

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

function openMethod(event, content){
    if (!event.target.closest('.editable')) {
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
    }
}

// Fonction pour ajouter les écouteurs d'événements après la création du HTML
function addEventListeners() {

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
                }
            } else {
                displayValue.textContent = editInput.value;
            }

            displayValue.style.display = 'inline-block';
            editInput.style.display = 'none';
        }
    }, true);

    setupAuthTabs();
}

export function clickButton(){
    const elementWhereAppend = document.getElementById("endpoint");
    if (elementWhereAppend) {
        elementWhereAppend.appendChild(createMethodElement())
        addEventListeners();
        setupAuthTabs();
    } else {
        console.error("L'élément 'endpoint' n'a pas été trouvé.");
    }
}

// Mandatory to keep it, because it's to heavy to change (line of x.innerHTML = "[some HTML]")
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
            try{document.getElementById(tabId).classList.add('active')}catch(e){};
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
    html += `<p><strong>Basic URL:</strong> ${makeEditable('Not Provided')}</p>`;
    html += `<span class="globalAskedToFillExpectedOutPut">false</span>`;

    html += '<div class="auth-section">';
    html += '<h3>Authentication</h3>';
    html += `<p><strong>Type:</strong> <span id="authType"></span></p>`;

    html += '<div class="auth-tabs">';
    html += '<ul class="tab-list">';
    html += '<li class="tab-item" data-tab="apikey">API Key</li>';
    html += '<li class="tab-item" data-tab="oauth2">OAuth2</li>';
    html += '<li class="tab-item" data-tab="basicAuth">Basic Auth</li>';
    html += '<li class="tab-item active" data-tab="noauth">No Auth</li>';
    html += '</ul>';

    html += '<div class="tab-content">';

    html += '<div class="tab-pane" id="apikey">';
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

    //html += '<button id="addEndpointBtn" class="discord-button">Add an Endpoint</button>';

    html += '</div>'; // endpoints

    return html;
}

export function createMethodElement(method = 'GET') {
    const endpointDiv = document.createElement('div');
    endpointDiv.classList.add('endpoint');

    const header = document.createElement('h3');
    header.classList.add('endpoint-header');

    header.classList.add('endpoint-header');

    // Création de l'élément éditable pour "/endpoint"
    const editableEndpoint = makeEditableNode("/endpoint");
    header.appendChild(editableEndpoint);

    // Création du span "isAlreadyAskedToFillExpectedOutput"
    const isAlreadyAskedSpan = document.createElement('span');
    isAlreadyAskedSpan.classList.add('isAlreadyAskedToFillExpectedOutput');
    isAlreadyAskedSpan.textContent = 'false';
    header.appendChild(isAlreadyAskedSpan);

    // Création du conteneur des contrôles
    const endpointsControls = document.createElement('span');
    endpointsControls.classList.add('endpoints-controls');

    // Bouton "Play"
    const playButton = document.createElement('button');
    playButton.classList.add('play-endpoint', 'play-button');
    playButton.textContent = '▶';
    endpointsControls.appendChild(playButton);

    playButton.addEventListener("click", async function () {
        // Masquer le contenu suivant après un délai
        setTimeout(() => {
            const nextSibling = this.closest('.endpoint-header').nextElementSibling;
            if (nextSibling) {
                nextSibling.style.display = 'none';
            }
        }, 0);
    
        // Afficher une animation de chargement
        playButton.innerHTML = `<img src="${loadingImage}" alt="Loading"/>`;
    
        // Vérification si une configuration est déjà en cours d'exécution
        if (window.runningConf) {
            alert("Already running conf");
            return;
        }
    
        window.runningConf = true;
    
        try {
            // Appeler la fonction `playEndpoint` avec le bouton comme paramètre
            await playEndpoint(playButton);
        } catch (e) {
            console.error(e);
        }
    
        // Réinitialiser l'état après l'exécution
        window.runningConf = false;
        playButton.textContent = '▶'; // Remettre le texte du bouton à son état initial
    });

    // Bouton "Delete"
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-endpoint', 'delete-button');
    deleteButton.textContent = '🗑️';
    deleteButton.setAttribute('onclick', 'removeElement(this)');
    endpointsControls.appendChild(deleteButton);

    // Ajout des contrôles au header
    header.appendChild(endpointsControls);

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('endpoint-content');

    const testMethodDiv = document.createElement('div');
    testMethodDiv.classList.add('test-method');

    const methodHeader = document.createElement('h4');
    methodHeader.classList.add('method-header');
    
    methodHeader.innerHTML = `
        ${makeEditable(method)}
        <button class="delete-method delete-button" onclick="removeElement(this)">🗑️</button>
    `;

    const methodContentDiv = document.createElement('div');
    methodContentDiv.classList.add('method-content');

    methodContentDiv.innerHTML = `
        <div class="input-section">
            <h5>Input:</h5>
            ${makeEditablePre({})}
        </div>
        <div class="output-section">
            <h5>Expected Output:</h5>
            ${makeEditablePre({})}
        </div>
        <div class="http-state-section">
            <h5>Expected HTTP State:</h5>
            ${makeEditable('Not provided')}
        </div>
    `;

    methodContentDiv.style.display = "none"
    methodHeader.addEventListener("click", function (event) {
        openMethod(event, methodContentDiv)
    });

    testMethodDiv.appendChild(methodHeader);

    testMethodDiv.appendChild(methodContentDiv);
    
    contentDiv.appendChild(testMethodDiv);

    // Ajouter le bouton dynamiquement
    const addMethodButton = createAddMethodButton();
    
    contentDiv.appendChild(addMethodButton);

    contentDiv.style.display = 'none';
    header.addEventListener("click", function(event){
        openMethod(event, contentDiv)
    })

    endpointDiv.appendChild(header);
    endpointDiv.appendChild(contentDiv);

    return endpointDiv; // Retourner l'HTML complet
}

function createAddMethodButton(){
    const button = document.createElement("button")
    button.classList.add("discord-button")
    button.innerText = "Add a method"
    button.addEventListener("click", ()=>{
        alert("coucou")
    })
    return button
}

// ------------------------------------------------------------ //

export async function printJsonToEditTab(path){
    if (path.includes("root")) {
        path = path.replace(/^root[/\\]/, "");
    }
    const jsonString = await PrintJsonFile(path); // Votre JSON ici
    document.getElementById('output').innerHTML = jsonToHtml(jsonString, path);
    addEventListeners();
}

export function createEmptyConf(){
    const output = document.getElementById("output")
    output.innerHTML = createConfigurationSection()
    output.innerHTML += createEndpointSection()
    addEventListeners();
    setupAuthTabs();
}



export async function playEndpoint(button) {

    const endpointElement = button.closest('.endpoint');
    const configHeader = document.querySelector('.config-header');

    // Récupérer le basic URL
    let basicUrl
    const basicUrlElement = configHeader.querySelector('p strong');
    if (basicUrlElement && basicUrlElement.textContent.includes('Basic URL:')) {
        basicUrl = basicUrlElement.nextElementSibling.querySelector('.display-value').textContent;
    }

    // Récupérer le type d'authentification
    const authType = document.getElementById('authType').textContent;

    // Préparer la structure de configuration
    let config = {
        basicUrl: basicUrl,
        authentication: {
            type: authType
        },
        endpoints: []
    };

    // Récupérer les informations d'authentification
    switch(authType) {
        case 'apikey':
            config.authentication.apikey = {
                keyname: document.querySelector('#apikey .display-value').textContent,
                apikeyvalue: document.querySelectorAll('#apikey .display-value')[1].textContent
            };
            break;
        case 'oauth2':
            config.authentication.oauth2 = {
                clientId: document.querySelector('#oauth2 .display-value').textContent,
                clientSecret: document.querySelectorAll('#oauth2 .display-value')[1].textContent,
                tokenUrl: document.querySelectorAll('#oauth2 .display-value')[2].textContent
            };
            break;
        case 'basicAuth':
            config.authentication.basicAuth = {
                username: document.querySelector('#basicAuth .display-value').textContent,
                password: document.querySelectorAll('#basicAuth .display-value')[1].textContent
            };
            break;
    }

    // Récupérer le chemin de l'endpoint
    const endpointPath = endpointElement.querySelector('.endpoint-header .display-value').textContent;

    // Préparer l'objet endpoint
    let endpoint = {
        path: endpointPath,
        tests: [],
    };

    // Récupérer toutes les méthodes de test pour cet endpoint
    const testMethods = endpointElement.querySelectorAll('.test-method');

    testMethods.forEach(method => {
        const methodName = method.querySelector('.method-header .display-value').textContent;
        const input = JSON.parse(method.querySelector('.input-section pre .display-value').textContent);
        const expectedOutput = JSON.parse(method.querySelector('.output-section pre .display-value').textContent);

        const expectedHttpState = method.querySelector('.http-state-section .display-value').textContent;

        endpoint.tests.push({
            method: methodName,
            input: input,
            expectedOutput: expectedOutput,
            expectedHttpState: expectedHttpState
        });
    });

    config.endpoints.push(endpoint);

    try{
        const res = await CheckEndpoint(config)
        printResult("welp", res)
    } catch (e) {
        console.log(e)
    }
}