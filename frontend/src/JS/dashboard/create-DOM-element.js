import {editName, toggleFileListVisibility} from "./rename-element"
import {checkConfig} from "./check-config"
import {DeleteConfig} from "../../../wailsjs/go/main/App";
import {showSection} from "../event-listener";
import {printJsonToEditTab} from "../edit-config/edit-config";

export function createFileList(folderFiles) {
    const fileListContainer = document.getElementById('file-list');
    fileListContainer.innerHTML = ""

    for (const [folderName, files] of Object.entries(folderFiles)) {
        if (folderName === "root") {
            const hr = document.createElement("hr");
            fileListContainer.appendChild(hr);
            if (Array.isArray(files) && files.length > 0) {
                files.forEach(fileName => {
                    const fileElement = createFileElement(fileName);
                    fileListContainer.appendChild(fileElement);
                });
            }
        }
        else if (Array.isArray(files) && files.length > 0) {
            const folderDiv = createFolderElement(folderName);
            fileListContainer.appendChild(folderDiv);
            const fileListDiv = createFileListElement(files);
            fileListContainer.appendChild(fileListDiv);
            folderDiv.onclick = function(event) {
                if (!folderDiv.querySelector('.folder-controls').contains(event.target)) {
                    toggleFileListVisibility(fileListDiv, folderDiv.querySelector('.arrow'));
                }
            };
        }
    }
}

function createFolderElement(folderName) {
    const folderDiv = document.createElement('div');
    folderDiv.className = 'folder';

    const folderText = createFolderTextElement(folderName);
    folderDiv.appendChild(folderText);

    const controlsDiv = createControlsDiv(folderName);
    folderDiv.appendChild(controlsDiv);

    return folderDiv;
}

function createControlsDiv(name) {
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'folder-controls';
    
    const playButton = document.createElement('button');
    playButton.className = 'play-button';
    playButton.innerHTML = '▶';
    playButton.onclick = async function(event) {
        event.stopPropagation();
        await checkConfig(`${name}/`)
    };
    
    const editButton = document.createElement('button');
    editButton.className = 'edit-button';
    editButton.style.visibility = "hidden"
    //editButton.style.onclick = null
    editButton.innerHTML = '🔧';

    const deleteButton = document.createElement('button'); // Create the delete button
    deleteButton.className = 'delete-button';
    deleteButton.innerHTML = '🗑️';
    deleteButton.onclick = async function(event) {
        event.stopPropagation();
        const confirmDelete = confirm(`Are you sure you want to delete ${name}?`);
        if (confirmDelete) {
            try{
                await DeleteConfig(`${name}`)
                controlsDiv.remove();
            } catch (e) {
                alert(e.toString())
            }
        }
    };
    
    const arrowSpan = document.createElement('span');
    arrowSpan.className = 'arrow';
    arrowSpan.innerHTML = '<';
    
    controlsDiv.appendChild(playButton);
    controlsDiv.appendChild(editButton);
    controlsDiv.appendChild(deleteButton);
    controlsDiv.appendChild(arrowSpan);
    return controlsDiv;
}

function createFolderTextElement(folderName) {
    const folderText = document.createElement('span');
    folderText.innerText = folderName;
    folderText.style.cursor = 'pointer';

    folderText.onclick = function(event) {
        event.stopPropagation();
        editName(folderText, true);
    };

    return folderText;
}

function addPlayButton(element, name) {
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'file-controls';

    const playButton = document.createElement('button');
    playButton.className = 'play-button';
    playButton.innerHTML = '▶';

    const editButton = document.createElement('button');
    editButton.className = 'edit-button';
    editButton.innerHTML = '🔧';

    const deleteButton = document.createElement('button'); // Create the delete button
    deleteButton.className = 'delete-button';
    deleteButton.innerHTML = '🗑️';

    controlsDiv.appendChild(playButton);
    controlsDiv.appendChild(editButton);
    controlsDiv.appendChild(deleteButton);
    element.appendChild(controlsDiv);

    // Détectez le dossier parent après avoir ajouté les contrôles
    let parentFolder = detectCurrentFolder(element);

    playButton.onclick = async function(event) {
        event.stopPropagation();
        alert(`Play ${parentFolder}/${name}`);
        await checkConfig(`${parentFolder}/${name}`)
    };

    editButton.onclick = async function(event){
        try{
            event.stopPropagation();
            await printJsonToEditTab(`${parentFolder}/${name}`)
            showConfiguration(event)
        } catch (e) {
            console.log(e)
        }
    }

    deleteButton.onclick = async function(event) {
        event.stopPropagation();
        const confirmDelete = confirm(`Are you sure you want to delete ${name}?`);
        if (confirmDelete) {
            try{
                console.log(`Deleting ${parentFolder}/${name}`)
                await DeleteConfig(`${parentFolder}/${name}`)
                element.remove();
            } catch (e) {
                alert(e.toString())
            }
        }
    };
}


// Fonction pour créer la liste des fichiers dans un dossier
function createFileListElement(files) {
    const fileListDiv = document.createElement('div');
    fileListDiv.style.display = 'none'; // Masquer par défaut
    fileListDiv.className = 'file-list';

    for (const file of files) {
        const fileDiv = createFileElement(file);
        fileListDiv.appendChild(fileDiv);
    }

    return fileListDiv;
}

// Fonction pour créer un élément de fichier
function createFileElement(file) {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'file';

    const fileText = document.createElement('span');
    fileText.innerText = file;
    fileText.style.cursor = 'pointer';

    // Événement de clic pour modifier le nom du fichier
    fileText.onclick = function (event) {
        event.stopPropagation(); // Empêche le clic d'être propagé au dossier
        editName(fileText)
    };

    fileDiv.appendChild(fileText);
    // yerk JS priorities, need to do it like that to work :vomiting:
    setTimeout(() => addPlayButton(fileDiv, file), 0);

    return fileDiv;
}

// Fonction utilitaire pour créer un élément <span> avec le texte mis à jour
export function createSpanElement(text) {
    const span = document.createElement('span');
    span.innerText = text;
    span.style.cursor = 'pointer';

    return span;
}

function detectCurrentFolder(element) {
    let current = element;

    while (current && !current.classList.contains('folder') && current.id !== 'file-list') {
        if (current.classList.contains('file-list')) {
            let folderElement = current.previousElementSibling;
            if (folderElement && folderElement.classList.contains('folder')) {
                return folderElement.querySelector('span').innerText.trim();
            }
        }
        current = current.parentElement;
    }

    return 'root';
}


function showConfiguration(event){
    showSection(event, 'configuration-management')
}