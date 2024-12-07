import { createSpanElement } from "./create-DOM-element"
import { RenameFolder } from "../../../wailsjs/go/main/App";

// Fonction pour afficher/masquer la liste des fichiers
export function toggleFileListVisibility(fileListDiv, arrow) {
    if (fileListDiv.style.display === 'none' || fileListDiv.style.display === '') {
        fileListDiv.style.display = 'block'; // Afficher les fichiers
        arrow.innerHTML = '▼'; // Flèche vers le bas
    } else {
        fileListDiv.style.display = 'none'; // Masquer les fichiers
        arrow.innerHTML = '<'; // Flèche vers la droite
    }
}

export function editName(element, isFolder = false) {
    isFolder = element.closest('.folder') !== null;

    const fileElement = element.closest('.file') || element;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = element.innerText;

    const oldName = element.innerText;

    input.onblur = function() {
        const newName = input.value.trim();
        let success;
        let finalName;

        let currentFolder = detectCurrentFolder(fileElement);

        if (isFolder) {
            success = handleFolderNameChange(newName, element);
            finalName = success ? newName : oldName;
        } else {
            success = handleFileNameChange(newName, element, currentFolder);
            finalName = success ? (newName.endsWith('.json') ? newName : newName + '.json') : oldName;
        }

        const updatedElement = createSpanElement(finalName);
        updatedElement.onclick = function(event) {
            event.stopPropagation();
            editName(updatedElement, isFolder);
        };
        input.parentNode.replaceChild(updatedElement, input);
    };

    element.parentNode.replaceChild(input, element);
    input.focus();
}

function detectCurrentFolder(element) {
    let current = element;
    while (current && current.id !== 'file-list') {
        if (current.classList.contains('file')) {
            let fileListParent = current.closest('.file-list');
            if (fileListParent) {
                let folderElement = fileListParent.previousElementSibling;
                if (folderElement && folderElement.classList.contains('folder')) {
                    let folderName = folderElement.querySelector('span').innerText.trim();
                    return folderName;
                }
            }
        }
        current = current.parentElement;
    }
    return 'root';
}


// Gérer le changement de nom du dossier
async function handleFolderNameChange(newFolderName, folderText) {
    try{
        const oldFolderName = folderText.innerText;

        if (newFolderName && newFolderName !== folderText.innerText) {
            if (window.folderFiles[newFolderName]) {
                console.log(window.folderFiles)
                return false
            } else {
                await RenameFolder(oldFolderName.replace("root/", "").replace("root\\", ""), newFolderName.replace("root/", "").replace("root\\", ""))
                window.folderFiles[newFolderName] = window.folderFiles[oldFolderName];
                delete window.folderFiles[oldFolderName];
                console.log(window.folderFiles)
                return true
            }
        } else if (newFolderName === '') {
            console.log(window.folderFiles)
            return false
        }
    } catch (e) {
        console.log(e)
    }
}

// Gérer le changement de nom du fichier
async function handleFileNameChange(newFileName, fileText, currentFolder) {

    if (newFileName === '') {
        console.log("Le nom du fichier ne peut pas être vide.");
        return false;
    }

    if (!newFileName.endsWith('.json')) {
        newFileName += ".json";
    }

    // Vérifier si le dossier existe
    if (!window.folderFiles.hasOwnProperty(currentFolder)) {
        console.log(`Erreur : Le dossier "${currentFolder}" n'existe pas.`);
        return false;
    }

    const currentFolderFiles = window.folderFiles[currentFolder];

    if (currentFolderFiles.includes(newFileName) && newFileName !== fileText.innerText) {
        console.log(`Le fichier "${newFileName}" existe déjà dans ce dossier.`);
        return false;
    } else {
        const oldFileIndex = currentFolderFiles.indexOf(fileText.innerText);
        if (oldFileIndex !== -1) {
            await RenameFolder(currentFolderFiles[oldFileIndex].replace("root/", "").replace("root\\", ""), newFileName.replace("root/", "").replace("root\\", ""))
            currentFolderFiles[oldFileIndex] = newFileName;
            console.log(`Le nom du fichier a été changé en : ${newFileName}`);
            console.log("Nouvelle structure de folderFiles:", JSON.stringify(window.folderFiles, null, 2));
            return true;
        } else {
            console.error(`Le fichier "${fileText.innerText}" n'a pas été trouvé dans le dossier "${currentFolder}".`);
            console.log("Erreur : Le fichier original n'a pas été trouvé dans le dossier.");
            return false;
        }
    }
}