import {CheckEndpoint, PrintJsonFile} from "../../../wailsjs/go/main/App";
import {printResult} from "../print-test-result";
import loadingImage from "../../assets/images/circle-loading.gif"
import { alert, confirm } from "../popup";
import { runConfig } from "./check-config";
import { saveCurrentConfig, htmlToJson } from "./save-config";
import { state, setDirty, groupLabel, isRoot, pathOf } from "../explorer/state";
import { showWorkspaceTab } from "../workspace";
import { renderAuthProfiles, createProfileSelect, createProfileBadge, updateTestBadge } from "./auth-profiles";

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

// Le nom du fichier n'est plus éditable ici : il est affiché (lecture seule) dans la barre de l'éditeur.
// Renommer / déplacer se fait uniquement depuis l'explorateur.
export function jsonToHtml(jsonData) {
    const config = jsonData;

    // Conteneur principal
    const container = document.createElement("div");

    // En-tête
    const header = document.createElement("div");
    header.className = "config-header";

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

    // Profils d'authentification (édités en mémoire, cf. auth-profiles.js)
    container.appendChild(renderAuthProfiles(config));

    // Endpoints
    const endpointsDiv = createEndpointSection("▶", "▶")

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
        isAlreadyAskedSpan.textContent = endpoint.isAlreadyAskedToFillExpectedOutput;
        endpointHeader.appendChild(isAlreadyAskedSpan);
    
        // Ajout des contrôles (boutons)
        const controlsSpan = document.createElement("span");
        controlsSpan.className = "endpoints-controls";
    
        const playButton = createPlayButton()
        playButton.className = "play-endpoint play-button";

        playButton.addEventListener("click", async function () {
            setTimeout(() => {
                const nextSibling = this.closest('.endpoint-header').nextElementSibling;
                if (nextSibling) {
                    nextSibling.style.display = 'none';
                }
            }, 0);
            playButton.innerHTML = `<img src="${loadingImage}" alt="Loading"/>`;

            if (window.runningConf) {
                alert("Already running conf");
                playButton.textContent = '▶';
                return;
            }
            window.runningConf = true;
        
            try {
                await playEndpoint(playButton);
            } catch (e) {
                console.error(e);
            }
            window.runningConf = false;
            playButton.textContent = '▶';
        });


        controlsSpan.appendChild(playButton);
    
        const deleteButton = createDeleteButton()
        deleteButton.className = "delete-endpoint delete-button";
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
            addProfileControls(methodHeader, methodContentDiv, test.authProfile || "");
    
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



// Section "Auth profile" d'un test + badge dans son en-tête
function addProfileControls(methodHeader, methodContentDiv, value = "") {
    const badge = createProfileBadge();
    methodHeader.insertBefore(badge, methodHeader.querySelector('.delete-button'));

    const section = document.createElement("div");
    section.className = "auth-profile-section";
    const title = document.createElement("h5");
    title.textContent = "Auth profile:";
    section.appendChild(title);
    const select = createProfileSelect(value);
    section.appendChild(select);
    methodContentDiv.appendChild(section);
    updateTestBadge(select);
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

            if (editableSpan.dataset.type === 'json' && /_@(empty|nothing)/i.test(editInput.value)) {
                // Marqueur "réponse sans corps" : pas du JSON, gardé tel quel (voir parseJsonSafely)
                displayValue.textContent = editInput.value.trim();
                editableSpan.classList.remove('invalid');
            } else if (editableSpan.dataset.type === 'json') {
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
}

export function clickButton(){
    const elementWhereAppend = document.getElementById("endpoint");
    if (elementWhereAppend) {
        elementWhereAppend.appendChild(createMethodElement())
    } else {
        console.error("L'élément 'endpoint' n'a pas été trouvé.");
    }
}

function adjustInputSize(input) {
    if (input.tagName.toLowerCase() === 'input') {
        input.style.width = 'auto';
    } else if (input.tagName.toLowerCase() === 'textarea') {
        input.style.height = 'auto';
    }
}

// ------------------------------------------------------------ //

function createEndpointSection(playInner = "▶", deleteInner = "🗑️") {
    const endpointDiv = document.createElement('div');
    endpointDiv.id = 'endpoint';
    endpointDiv.classList.add('endpoints');

    const h2 = document.createElement('h2');
    h2.style.display = "flex"
    h2.style.justifyContent ="space-between"
    h2.textContent = 'Endpoints';

    // Création du span contenant les boutons
    const span = document.createElement('span');
    span.classList.add("endpoints-controls")
    span.style.marginRight = "15px"

    // Bouton play
    const playButton = createPlayButton(playInner)
    playButton.title = "Save and run this config"
    playButton.addEventListener("click", () => runCurrentConfig(false, playButton))
    span.appendChild(playButton);

    const deleteButton = createDeleteButton(deleteInner)
    deleteButton.title = "Save, run and update the expected outputs"
    deleteButton.addEventListener("click", async () => {
        const forcedUpdate = await confirm("Do you want to run the conf file and update the expected outputs ?")
        await runCurrentConfig(forcedUpdate, deleteButton)
    })
    span.appendChild(deleteButton);

    // Ajout du span au titre (h2)
    h2.appendChild(span);

    endpointDiv.appendChild(h2);

    return endpointDiv;
}

function createPlayButton(playInner = "▶"){
    const playButton = document.createElement('button');
    playButton.className = "play-button";
    playButton.textContent = playInner;
    return playButton
}
function createDeleteButton(deleteInner = "🗑️"){
    const deleteButton = document.createElement('button');
    deleteButton.className = "delete-button";
    deleteButton.textContent = deleteInner;
    return deleteButton
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
    const playButton = createPlayButton()
    playButton.classList.add('play-endpoint', 'play-button');
    endpointsControls.appendChild(playButton);

    playButton.addEventListener("click", async function () {
        setTimeout(() => {
            const nextSibling = this.closest('.endpoint-header').nextElementSibling;
            if (nextSibling) {
                nextSibling.style.display = 'none';
            }
        }, 0);
        playButton.innerHTML = `<img src="${loadingImage}" alt="Loading"/>`;

        if (window.runningConf) {
            alert("Already running conf");
            playButton.textContent = '▶';
            return;
        }
        window.runningConf = true;
        try {
            await playEndpoint(playButton);
        } catch (e) {
            console.error(e);
        }
        window.runningConf = false;
        playButton.textContent = '▶';
    });

    // Bouton "Delete"
    const deleteButton = createDeleteButton()
    deleteButton.classList.add('delete-endpoint', 'delete-button');
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
    const deleteButton = createDeleteButton()
    deleteButton.classList.add('delete-method', 'delete-button');
    deleteButton.addEventListener('click', function () {
        removeElement(this); // Appelle la fonction pour supprimer l'élément
    });
    methodHeader.appendChild(deleteButton);

    // Crée le conteneur pour le contenu de la méthode
    const methodContentDiv = document.createElement('div');
    methodContentDiv.classList.add('method-content');
    addProfileControls(methodHeader, methodContentDiv);

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

// Sauvegarde puis lance la config ouverte dans l'éditeur
async function runCurrentConfig(forcedUpdate, button) {
    if (!state.current) return
    if (window.runningConf) {
        alert("Already running conf")
        return
    }
    try {
        await saveCurrentConfig()
    } catch (e) {
        alert("Save failed: " + e)
        return
    }
    await runConfig({ ...state.current }, forcedUpdate, button)
}

let editableFieldsReady = false

// Ouvre group/file dans l'éditeur (le nom affiché est en lecture seule)
export async function openConfigInEditor(group, file) {
    const conf = await PrintJsonFile(pathOf(group, file));
    const output = document.getElementById('output')
    output.innerHTML = ""
    output.appendChild(jsonToHtml(conf));
    if (!editableFieldsReady) {
        enableEditableField();
        editableFieldsReady = true
    }

    state.current = { group, file }
    setDirty(false)
    updateEditorTitle()
    document.getElementById("editor-empty").hidden = true
    document.getElementById("editor-content").hidden = false
    showWorkspaceTab("editor")
}

export function closeEditor() {
    state.current = null
    setDirty(false)
    clearEditConfig()
    document.getElementById("editor-empty").hidden = false
    document.getElementById("editor-content").hidden = true
}

export function updateEditorTitle() {
    if (!state.current) return
    const { group, file } = state.current
    document.getElementById("editor-file-name").textContent = file
    const badge = document.getElementById("editor-group-badge")
    badge.textContent = groupLabel(group)
    badge.classList.toggle("root", isRoot(group))
}

// Recharge l'éditeur si la config ouverte a été réécrite par un run (sauf modifications non sauvegardées)
export async function reloadCurrentIfAffected({ group, file = null }) {
    if (!state.current || state.dirty) return
    const affected = file
        ? state.current.group === group && state.current.file === file
        : state.current.group === group
    if (!affected) return
    try {
        const { group: g, file: f } = state.current
        state.current = null // force le rechargement
        await openConfigInEditor(g, f)
    } catch (e) {
        closeEditor()
        alert("Impossible to display the file")
        console.log(e)
    }
}

export async function playEndpoint(button) {
    const endpointElement = button.closest('.endpoint');
    const index = [...document.querySelectorAll('#output .endpoint')].indexOf(endpointElement);
    const config = htmlToJson();
    config.endpoints = index >= 0 ? [config.endpoints[index]] : [];

    try{
        const res = await CheckEndpoint(config)
        printResult("welp", res)
    } catch (e) {
        console.log(e)
        alert("Error: " + e)
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