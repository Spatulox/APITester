import { editName, toggleFileListVisibility } from "./rename-element"

export function createFileList(folderFiles) {
    const fileListContainer = document.getElementById('file-list');

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
            files.forEach(fileName => {
                console.log(files)
                // const fileElement = fileListDiv.querySelector(`[data-filename="${fileName}"]`);
                // if (fileElement) {
                //     addPlayButton(fileElement, fileName);
                // }
            });
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
    
    const arrowSpan = document.createElement('span');
    arrowSpan.className = 'arrow';
    arrowSpan.innerHTML = '<';
    
    const playButton = document.createElement('button');
    playButton.className = 'play-button';
    playButton.innerHTML = '▶';
    playButton.onclick = function(event) {
        event.stopPropagation();
        alert(`Play ${name}`);
    };
    
    controlsDiv.appendChild(playButton);
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
    const playButton = document.createElement('button');
    playButton.className = 'play-button';
    playButton.innerHTML = '▶';
    playButton.onclick = function(event) {
        event.stopPropagation();
        alert(`Play ${name}`);
    };
    element.appendChild(playButton);
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
    addPlayButton(fileDiv, file);

    return fileDiv;
}

// Fonction utilitaire pour créer un élément <span> avec le texte mis à jour
export function createSpanElement(text) {
    const span = document.createElement('span');
    span.innerText = text;
    span.style.cursor = 'pointer';

    return span;
}