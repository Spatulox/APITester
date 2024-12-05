import { editName, toggleFileListVisibility } from "./rename-element"

// Fonction principale pour créer la liste des fichiers et dossiers
export function createFileList(folderFiles) {
    const fileListContainer = document.getElementById('file-list');

    for (const [folderName, files] of Object.entries(folderFiles)) {
        if (folderName === "root") {
            const hr = document.createElement("hr")
            fileListContainer.appendChild(hr);
            // Traitement spécial pour le dossier "root"
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
            fileListContainer.appendChild(fileListDiv); // Ajouter la liste des fichiers en dehors du dossier
            folderDiv.onclick = function(event) {
                if (event.target !== folderDiv.querySelector('.arrow')) {
                    toggleFileListVisibility(fileListDiv, folderDiv.querySelector('.arrow'));
                }
            };
        }
    }
}

// Fonction pour créer un élément de dossier
function createFolderElement(folderName) {
    const folderDiv = document.createElement('div');
    folderDiv.className = 'folder';

    const folderText = createFolderTextElement(folderName);
    folderDiv.appendChild(folderText);

    const arrow = createArrowElement();
    folderDiv.appendChild(arrow);

    return folderDiv;
}

// Fonction pour créer l'élément texte du dossier
function createFolderTextElement(folderName) {
    const folderText = document.createElement('span');
    folderText.innerText = folderName;
    folderText.style.cursor = 'pointer';

    // Événement de clic pour modifier le nom du dossier
    folderText.onclick = function(event) {
        event.stopPropagation(); // Empêche le clic d'être propagé au dossier
        editName(folderText, true)
    };

    return folderText;
}

// Fonction pour créer l'élément flèche
function createArrowElement() {
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.innerHTML = '>'; // Icône flèche vers la droite
    return arrow;
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

    return fileDiv;
}

// Fonction utilitaire pour créer un élément <span> avec le texte mis à jour
export function createSpanElement(text) {
    const span = document.createElement('span');
    span.innerText = text;
    span.style.cursor = 'pointer';

    return span;
}