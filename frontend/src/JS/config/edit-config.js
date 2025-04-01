import {CheckEndpoint, PrintJsonFile} from "../../../wailsjs/go/main/App";
import {printResult} from "../print-test-result";
import loadingImage from "../../assets/images/circle-loading.gif"
import { alert, confirm } from "../popup";

function makeEditableOld(value, type = 'text') {
    return `<span class="editable" data-type="${type}"><span class="display-value">${value}</span><input type="text" class="edit-input" style="display:none;" value="${value}" onblur="updateEditableContent(this)"></span>`;
}

export function makeEditable(value, type = 'text') {

    if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1); // Retire les premiers et derniers caractères (les guillemets)
    }

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


function makeEditablePreOld(value, type = 'json') {
    return `<pre class="editable" data-type="${type}"><span class="display-value">${JSON.stringify(value, null, 2)}</span><textarea class="edit-input" style="display:none;" onblur="updateEditableContent(this)">${JSON.stringify(value, null, 2)}</textarea></pre>`;
}

export function makeEditablePre(value, type = 'json') {
    if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1); // Retire les premiers et derniers caractères (les guillemets)
    }

    const preElement = document.createElement('pre');
    preElement.className = 'editable';
    preElement.dataset.type = type;

    const displayValueSpan = document.createElement('span');
    displayValueSpan.className = 'display-value';
    if (typeof value === 'string') {
        displayValueSpan.textContent = value;
    } else {
        displayValueSpan.textContent = JSON.stringify(value, null, 2);
    }
    preElement.appendChild(displayValueSpan);

    const editInputTextarea = document.createElement('textarea');
    editInputTextarea.className = 'edit-input';
    editInputTextarea.style.display = 'none';
    editInputTextarea.onblur = function () {
        updateEditableContent(this);
    };
    if (typeof value === 'string') {
        editInputTextarea.textContent = value;
    } else {
        editInputTextarea.textContent = JSON.stringify(value, null, 2);
    }
    preElement.appendChild(editInputTextarea);

    return preElement;
}

function updateEditableContent(input) {
    const editable = input.closest('.editable');
    const displayValue = editable.querySelector('.display-value');
    //displayValue.textContent = input.value ? input.value : "";
    const type = editable.dataset.type;
    if (type === 'json') {
        try {
            const parsedValue = JSON.parse(input.value); // Tente de parser en JSON
            displayValue.textContent = JSON.stringify(parsedValue, null, 2); // Reformate proprement
        } catch (error) {
            console.error("Invalid JSON:", error);
            displayValue.textContent = input.value; // Affiche tel quel en cas d'erreur
        }
    } else {
        displayValue.textContent = input.value || "_@empty"; // Sinon, affiche simplement la valeur
    }
    displayValue.style.display = '';
    input.style.display = 'none';
}

export function clearEditConfig(){
    document.getElementById("output").innerHTML = ""
}

export function jsonToHtml(jsonData, filename) {
    console.log(filename);
    const config = jsonData;

    // Conteneur principal
    const container = document.createElement("div");

    // En-tête
    const header = document.createElement("div");
    header.className = "config-header";

    // Création du titre principal
    const title = document.createElement('h2');
    title.textContent = 'Configuration : ';

    // Création du span avec l'ID "fileNameConfiguration"
    const fileNameSpan = document.createElement('span');
    fileNameSpan.id = 'fileNameConfiguration';

    // Ajout du contenu éditable dans le span
    fileNameSpan.appendChild(makeEditable(filename));

    // Ajout du span au titre
    title.appendChild(fileNameSpan);

    header.appendChild(title);

    // Création de l'élément <p> pour Basic URL
    const basicUrl = document.createElement('p');

    // Création de l'élément <strong> pour le texte "Basic URL:"
    const strong = document.createElement('strong');
    strong.textContent = 'Basic URL:';

    // Ajout du texte fort au paragraphe
    basicUrl.appendChild(strong);

    // Ajout du contenu éditable (généré par makeEditable) au paragraphe
    basicUrl.appendChild(makeEditable(config.basicUrl));

    header.appendChild(basicUrl);

    const globalSpan = document.createElement("span");
    globalSpan.className = "globalAskedToFillExpectedOutPut";
    globalSpan.textContent = config.globalAskedToFillExpectedOutPut;
    header.appendChild(globalSpan);

    container.appendChild(header);

    // Section d'authentification
    const authSection = document.createElement("div");
    authSection.className = "auth-section";

    const authTitle = document.createElement("h3");
    authTitle.textContent = "Authentication";
    authSection.appendChild(authTitle);

    const authType = document.createElement("p");
    authType.innerHTML = `<strong>Type:</strong> <span id="authType">${config.authentication.type}</span>`;
    authSection.appendChild(authType);

    // Système d'onglets pour l'authentification
    const authTabs = document.createElement("div");
    authTabs.className = "auth-tabs";

    const tabList = document.createElement("ul");
    tabList.className = "tab-list";

    ["apikey", "oauth2", "basicAuth", "noauth"].forEach((tab) => {
        const tabItem = document.createElement("li");
        tabItem.className = `tab-item ${config.authentication.type === tab ? "active" : ""}`;
        tabItem.dataset.tab = tab;
        tabItem.textContent = tab.charAt(0).toUpperCase() + tab.slice(1); // Capitalize first letter
        tabList.appendChild(tabItem);
    });

    authTabs.appendChild(tabList);

    // Contenu des onglets
    const tabContent = document.createElement("div");
    tabContent.className = "tab-content";

    // API Key
    const apiKeyPane = document.createElement("div");
    apiKeyPane.className = `tab-pane ${config.authentication.type === "apikey" ? "active" : ""}`;
    apiKeyPane.id = "apikey";

    const keyNameParagraph = document.createElement("p");
    keyNameParagraph.innerHTML = `<strong>Key Name: </strong>`;
    keyNameParagraph.appendChild(makeEditable(config.authentication.apikey.keyname || 'Not provided'));
    apiKeyPane.appendChild(keyNameParagraph);

    const apiKeyParagraph = document.createElement("p");
    apiKeyParagraph.innerHTML = `<strong>API Key: </strong>`;
    apiKeyParagraph.appendChild(makeEditable(config.authentication.apikey.apikeyvalue || 'Not provided'));
    apiKeyPane.appendChild(apiKeyParagraph);

    tabContent.appendChild(apiKeyPane);
    
    // OAuth2
    const oauth2Pane = document.createElement("div");
    oauth2Pane.className = `tab-pane ${config.authentication.type === "oauth2" ? "active" : ""}`;
    oauth2Pane.id = "oauth2";

    const clientIdParagraph = document.createElement("p");
    clientIdParagraph.innerHTML = `<strong>Client ID: </strong>`;
    clientIdParagraph.appendChild(makeEditable(config.authentication.oauth2.clientId || 'Not provided'));
    oauth2Pane.appendChild(clientIdParagraph);

    const clientSecretParagraph = document.createElement("p");
    clientSecretParagraph.innerHTML = `<strong>Client Secret: </strong>`;
    clientSecretParagraph.appendChild(makeEditable(config.authentication.oauth2.clientSecret ? '********' : 'Not provided'));
    oauth2Pane.appendChild(clientSecretParagraph);

    const tokenUrlParagraph = document.createElement("p");
    tokenUrlParagraph.innerHTML = `<strong>Token URL: </strong>`;
    tokenUrlParagraph.appendChild(makeEditable(config.authentication.oauth2.tokenUrl || 'Not provided'));
    oauth2Pane.appendChild(tokenUrlParagraph);

    tabContent.appendChild(oauth2Pane);
    
    // Basic Auth
    const basicAuthPane = document.createElement("div");
    basicAuthPane.className = `tab-pane ${config.authentication.type === "basicAuth" ? "active" : ""}`;
    basicAuthPane.id = "basicAuth";

    const usernameParagraph = document.createElement("p");
    usernameParagraph.innerHTML = `<strong>Username: </strong>`;
    usernameParagraph.appendChild(makeEditable(config.authentication.basicAuth.username || 'Not provided'));
    basicAuthPane.appendChild(usernameParagraph);

    const passwordParagraph = document.createElement("p");
    passwordParagraph.innerHTML = `<strong>Password: </strong>`;
    passwordParagraph.appendChild(makeEditable(config.authentication.basicAuth.password ? '********' : 'Not provided'));
    basicAuthPane.appendChild(passwordParagraph);

    tabContent.appendChild(basicAuthPane);
    

    authTabs.appendChild(tabContent);
    authSection.appendChild(authTabs);
    container.appendChild(authSection);

    // Endpoints
    const endpointsDiv = document.createElement("div");
    endpointsDiv.id = "endpoint";
    endpointsDiv.className = "endpoints";

    const endpointsTitle = document.createElement("h2");
    endpointsTitle.textContent = "Endpoints";
    endpointsDiv.appendChild(endpointsTitle);

    config.endpoints.forEach((endpoint) => {
        const endpointDiv = document.createElement("div");
        endpointDiv.className = "endpoint";
    
        // En-tête de l'endpoint
        const endpointHeader = document.createElement("h3");
        endpointHeader.className = "endpoint-header";
    
        // Utilisation du nouveau makeEditable pour le chemin de l'endpoint
        const editablePath = makeEditable(endpoint.path);
        endpointHeader.appendChild(editablePath);
    
        // Ajout du span pour IsAlreadyAskedToFillExpectedOutPut
        const isAlreadyAskedSpan = document.createElement("span");
        isAlreadyAskedSpan.className = "isAlreadyAskedToFillExpectedOutput";
        isAlreadyAskedSpan.textContent = endpoint.IsAlreadyAskedToFillExpectedOutPut;
        endpointHeader.appendChild(isAlreadyAskedSpan);
    
        // Ajout des contrôles (boutons)
        const controlsSpan = document.createElement("span");
        controlsSpan.className = "endpoints-controls";
    
        const playButton = document.createElement("button");
        playButton.className = "play-endpoint play-button";
        playButton.textContent = "▶";

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


        controlsSpan.appendChild(playButton);
    
        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-endpoint delete-button";
        deleteButton.textContent = "🗑️";
        deleteButton.addEventListener("click", function () {
            removeElement(this);
        });
        controlsSpan.appendChild(deleteButton);
    
        endpointHeader.appendChild(controlsSpan);
    
        // Contenu de l'endpoint
        const endpointContentDiv = document.createElement("div");
        endpointContentDiv.className = "endpoint-content";
    
        endpoint.tests.forEach((test) => {
            const testMethodDiv = document.createElement("div");
            testMethodDiv.className = "test-method";
    
            // En-tête de la méthode
            const methodHeader = document.createElement("h4");
            methodHeader.className = "method-header";
    
            // Utilisation du nouveau makeEditable pour la méthode
            const editableMethod = makeEditable(test.method);
            methodHeader.appendChild(editableMethod);
    
            const deleteMethodButton = document.createElement("button");
            deleteMethodButton.className = "delete-method delete-button";
            deleteMethodButton.textContent = "🗑️";
            deleteMethodButton.addEventListener("click", function () {
                removeElement(this);
            });
            methodHeader.appendChild(deleteMethodButton);
    
            // Contenu de la méthode
            const methodContentDiv = document.createElement("div");
            methodContentDiv.className = "method-content";
    
            // Section Input
            const inputSectionDiv = document.createElement("div");
            inputSectionDiv.className = "input-section";
            const inputTitle = document.createElement("h5");
            inputTitle.textContent = "Input:";
            inputSectionDiv.appendChild(inputTitle);
            inputSectionDiv.appendChild(test.input ? makeEditablePre(test.input) : makeEditablePre({}));
            methodContentDiv.appendChild(inputSectionDiv);
    
            // Section Expected Output
            const outputSectionDiv = document.createElement("div");
            outputSectionDiv.className = "output-section";
            const outputTitle = document.createElement("h5");
            outputTitle.textContent = "Expected Output:";
            outputSectionDiv.appendChild(outputTitle);
            outputSectionDiv.appendChild(makeEditablePre(test.expectedOutput));
            methodContentDiv.appendChild(outputSectionDiv);
    
            // Section HTTP State
            const httpStateSectionDiv = document.createElement("div");
            httpStateSectionDiv.className = "http-state-section";
            const httpStateTitle = document.createElement("h5");
            httpStateTitle.textContent = "Expected HTTP State:";
            httpStateSectionDiv.appendChild(httpStateTitle);
            httpStateSectionDiv.appendChild(makeEditablePre(test.expectedHttpState || "Not Provided"));
            methodContentDiv.appendChild(httpStateSectionDiv);
            
            methodContentDiv.style.display = "none"
            methodHeader.addEventListener('click', function(event) {
                openMethod(event, methodContentDiv)
            });

            testMethodDiv.appendChild(methodHeader);
            testMethodDiv.appendChild(methodContentDiv);
            endpointContentDiv.appendChild(testMethodDiv);
            endpointContentDiv.appendChild(createAddMethodButton())
        });


        endpointContentDiv.style.display = "none"
        endpointHeader.addEventListener("click", function(event){
            openMethod(event, endpointContentDiv)
        })

        endpointDiv.appendChild(endpointHeader);
        endpointDiv.appendChild(endpointContentDiv);
        endpointsDiv.appendChild(endpointDiv);
    });
    container.appendChild(endpointsDiv);
    return container;
}


function openMethod(event, content){
    if (!event.target.closest('.editable')) {
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
    }
}

// Fonction pour ajouter les écouteurs d'événements après la création du HTML
// Used when seeing a config file
function enableEditableField() {

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
    // Création du conteneur principal
    const configHeader = document.createElement('div');
    configHeader.classList.add('config-header');

    // Titre principal
    const h2 = document.createElement('h2');
    h2.innerHTML = 'Configuration : ';
    const fileNameSpan = document.createElement('span');
    fileNameSpan.id = 'fileNameConfiguration';
    fileNameSpan.appendChild(makeEditable('File_name.json'));
    h2.appendChild(fileNameSpan);
    configHeader.appendChild(h2);

    // Basic URL
    const basicUrlP = document.createElement('p');
    basicUrlP.innerHTML = `<strong>Basic URL:</strong> `;
    basicUrlP.appendChild(makeEditable('Not Provided'));
    configHeader.appendChild(basicUrlP);

    // Global asked to fill expected output
    const globalSpan = document.createElement('span');
    globalSpan.classList.add('globalAskedToFillExpectedOutPut');
    globalSpan.textContent = 'false';
    configHeader.appendChild(globalSpan);

    // Auth section
    const authSection = document.createElement('div');
    authSection.classList.add('auth-section');

    const authTitle = document.createElement('h3');
    authTitle.textContent = 'Authentication';
    authSection.appendChild(authTitle);

    const authTypeP = document.createElement('p');
    authTypeP.innerHTML = `<strong>Type:</strong> `;
    const authTypeSpan = document.createElement('span');
    authTypeSpan.id = 'authType';
    authTypeP.appendChild(authTypeSpan);
    authSection.appendChild(authTypeP);

    // Auth tabs
    const authTabs = document.createElement('div');
    authTabs.classList.add('auth-tabs');

    const tabList = document.createElement('ul');
    tabList.classList.add('tab-list');

    const tabs = [
        { text: 'API Key', tab: 'apikey' },
        { text: 'OAuth2', tab: 'oauth2' },
        { text: 'Basic Auth', tab: 'basicAuth' },
        { text: 'No Auth', tab: 'noauth', active: true }
    ];

    tabs.forEach(({ text, tab, active }) => {
        const tabItem = document.createElement('li');
        tabItem.classList.add('tab-item');
        if (active) tabItem.classList.add('active');
        tabItem.setAttribute('data-tab', tab);
        tabItem.textContent = text;
        tabList.appendChild(tabItem);
    });

    authTabs.appendChild(tabList);

    // Tab content
    const tabContent = document.createElement('div');
    tabContent.classList.add('tab-content');

    const panes = [
        {
            id: 'apikey',
            content: [
                { label: 'Key Name:', value: 'Not provided' },
                { label: 'API Key:', value: 'Not provided' }
            ]
        },
        {
            id: 'oauth2',
            content: [
                { label: 'Client ID:', value: 'Not provided' },
                { label: 'Client Secret:', value: 'Not provided' },
                { label: 'Token URL:', value: 'Not provided' }
            ]
        },
        {
            id: 'basicAuth',
            content: [
                { label: 'Username:', value: 'Not provided' },
                { label: 'Password:', value: 'Not provided' }
            ]
        }
    ];

    panes.forEach(({ id, content }) => {
        const tabPane = document.createElement('div');
        tabPane.classList.add('tab-pane');
        tabPane.id = id;

        content.forEach(({ label, value }) => {
            const p = document.createElement('p');
            p.innerHTML = `<strong>${label}</strong> `;
            p.appendChild(makeEditable(value));
            tabPane.appendChild(p);
        });

        tabContent.appendChild(tabPane);
    });

    authTabs.appendChild(tabContent);
    authSection.appendChild(authTabs);
    
    configHeader.appendChild(authSection);

    return configHeader;
}


function createEndpointSection() {
    const endpointDiv = document.createElement('div');
    endpointDiv.id = 'endpoint';
    endpointDiv.classList.add('endpoints');

    const h2 = document.createElement('h2');
    h2.textContent = 'Endpoints';
    endpointDiv.appendChild(h2);

    return endpointDiv;
}

export function createMethodElement(method = 'GET') {
    const endpointDiv = document.createElement('div');
    endpointDiv.classList.add('endpoint');

    const header = document.createElement('h3');
    header.classList.add('endpoint-header');

    // Création de l'élément éditable pour "/endpoint"
    const editableEndpoint = makeEditable("/endpoint");
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
    deleteButton.addEventListener("click", function(){
        removeElement(this)
    })
    endpointsControls.appendChild(deleteButton);

    // Ajout des contrôles au header
    header.appendChild(endpointsControls);

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('endpoint-content');

   const testMethodDiv = createTestMethodElement(method)
    
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
    button.id="add-method"
    button.innerText = "Add a method"
    button.addEventListener("click", ()=>{
        const testMethodDiv = createTestMethodElement("GET")
        button.insertAdjacentElement('beforebegin', testMethodDiv)
    })
    return button
}

function createTestMethodElement(method) {
    // Crée le conteneur principal pour la méthode de test
    const testMethodDiv = document.createElement('div');
    testMethodDiv.classList.add('test-method');

    // Crée l'en-tête de la méthode
    const methodHeader = document.createElement('h4');
    methodHeader.classList.add('method-header');

    // Utilise le nouveau makeEditable pour créer l'élément éditable
    const editableMethod = makeEditable(method); // Retourne un élément DOM
    methodHeader.appendChild(editableMethod);

    // Ajoute le bouton de suppression à l'en-tête
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-method', 'delete-button');
    deleteButton.textContent = '🗑️';
    deleteButton.addEventListener('click', function () {
        removeElement(this); // Appelle la fonction pour supprimer l'élément
    });
    methodHeader.appendChild(deleteButton);

    // Crée le conteneur pour le contenu de la méthode
    const methodContentDiv = document.createElement('div');
    methodContentDiv.classList.add('method-content');

    // Section Input
    const inputSectionDiv = document.createElement('div');
    inputSectionDiv.classList.add('input-section');
    const inputTitle = document.createElement('h5');
    inputTitle.textContent = 'Input:';
    inputSectionDiv.appendChild(inputTitle);
    inputSectionDiv.appendChild(makeEditablePre({})); // Utilise le nouveau makeEditablePre

    // Section Expected Output
    const outputSectionDiv = document.createElement('div');
    outputSectionDiv.classList.add('output-section');
    const outputTitle = document.createElement('h5');
    outputTitle.textContent = 'Expected Output:';
    outputSectionDiv.appendChild(outputTitle);
    outputSectionDiv.appendChild(makeEditablePre({})); // Utilise le nouveau makeEditablePre

    // Section HTTP State
    const httpStateSectionDiv = document.createElement('div');
    httpStateSectionDiv.classList.add('http-state-section');
    const httpStateTitle = document.createElement('h5');
    httpStateTitle.textContent = 'Expected HTTP State:';
    httpStateSectionDiv.appendChild(httpStateTitle);
    httpStateSectionDiv.appendChild(makeEditablePre('Not provided')); // Utilise le nouveau makeEditablePre

    // Ajoute les sections au contenu de la méthodeenableEditableField
    methodContentDiv.appendChild(inputSectionDiv);
    methodContentDiv.appendChild(outputSectionDiv);
    methodContentDiv.appendChild(httpStateSectionDiv);

    // Masque le contenu par défaut et ajoute un événement pour l'afficher/masquer
    methodContentDiv.style.display = "none";
    methodHeader.addEventListener("click", function (event) {
        openMethod(event, methodContentDiv);
    });

    // Assemble les éléments dans le conteneur principal
    testMethodDiv.appendChild(methodHeader);
    testMethodDiv.appendChild(methodContentDiv);

    return testMethodDiv;
}


// ------------------------------------------------------------ //

export async function printJsonToEditTab(path){
    if (path.includes("root")) {
        path = path.replace(/^root[/\\]/, "");
    }
    const jsonString = await PrintJsonFile(path); // Votre JSON ici
    document.getElementById('output').innerHTML = ""
    document.getElementById('output').appendChild(jsonToHtml(jsonString, path));
    enableEditableField();
    setupAuthTabs();
}

export function createEmptyConf(){
    const output = document.getElementById("output")
    output.innerHTML = ""
    output.appendChild(createConfigurationSection())
    output.appendChild(createEndpointSection())
    //output.innerHTML = createConfigurationSection()
    //output.innerHTML += createEndpointSection()
    //enableEditableField();
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

async function removeElement(button) {
    if (await confirm("Are you sure ?")) {
        const testMethodDiv = button.closest('.test-method');
        if (testMethodDiv) {
            testMethodDiv.remove();
        } else {
            const endpointDiv = button.closest('.endpoint');
            if (endpointDiv) {
                endpointDiv.remove();
            }
        }
    }
}