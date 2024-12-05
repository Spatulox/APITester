// Fonction pour ouvrir un onglet
function openTab(evt, tabName) {
    var tabcontent = document.getElementsByClassName("tabcontent");
    for (var i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";  
    }

    var tablinks = document.getElementsByClassName("tablink");
    for (var i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    document.getElementById(tabName).style.display = "block";  
    evt.currentTarget.className += " active";
}

// Fonction pour afficher la section principale
function showSection(evt, sectionId) {
    // Masquer toutes les sections
    var sections = document.querySelectorAll('main > section');
    sections.forEach(function(section) {
        section.style.display = 'none';
    });

    // Afficher la section sélectionnée
    document.getElementById(sectionId).style.display = 'block';

    // Supprimer l'état actif des liens de navigation
    var navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(function(link) {
        link.classList.remove('active');
    });
    
    // Ajouter une classe active au lien sélectionné
    evt.currentTarget.classList.add('active');
}

// Initialiser l'onglet par défaut au chargement de la page
document.addEventListener("DOMContentLoaded", function() {
   // Ouvrir la section par défaut
   showSection({currentTarget: {classList: {add: function() {}}}}, 'test-execution'); // Simuler l'événement pour afficher la section par défaut
   document.querySelector('.tablink').click(); // Ouvrir le premier onglet par défaut dans le tableau de bord
});




// Exemple de données simulées (remplacez ceci par vos données réelles)
const folderFiles = {
    "Folder1": ["file1.json", "file2.json"],
    "Folder2": ["file3.json", "file4.json"],
    "root": ["File.json"]
};

// Fonction principale pour créer la liste des fichiers et dossiers
function createFileList(folderFiles) {
    const fileListContainer = document.getElementById('file-list');

    for (const [folderName, files] of Object.entries(folderFiles)) {
        const folderDiv = createFolderElement(folderName);
        fileListContainer.appendChild(folderDiv);

        if (Array.isArray(files) && files.length > 0) {
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
    fileText.onclick = function(event) {
        event.stopPropagation(); // Empêche le clic d'être propagé au dossier
        editName(fileText)
    };

    fileDiv.appendChild(fileText);

    return fileDiv;
}

// Fonction pour afficher/masquer la liste des fichiers
function toggleFileListVisibility(fileListDiv, arrow) {
    if (fileListDiv.style.display === 'none' || fileListDiv.style.display === '') {
        fileListDiv.style.display = 'block'; // Afficher les fichiers
        arrow.innerHTML = '▼'; // Flèche vers le bas
    } else {
        fileListDiv.style.display = 'none'; // Masquer les fichiers
        arrow.innerHTML = '>'; // Flèche vers la droite
    }
}

function editName(element, isFolder = false) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = element.innerText;

    const oldName = element.innerText; // Utilisez innerText au lieu de innerHTML

    input.onblur = function() {
        const newName = input.value.trim();
        let success;
        let finalName;

        if (isFolder) {
            success = handleFolderNameChange(newName, element);
            finalName = success ? newName : oldName;
        } else {
            currentFolder = input.parentNode.parentNode.previousSibling.children[0].innerText
            success = handleFileNameChange(newName, element, currentFolder);
            finalName = success ? (newName.endsWith('.json') ? newName : newName + '.json') : oldName;
        }

        const updatedElement = createSpanElement(finalName);
        updatedElement.onclick = function(event) {
            event.stopPropagation();
            editName(updatedElement)
        };
        input.parentNode.replaceChild(updatedElement, input);
    };

    element.parentNode.replaceChild(input, element);
    input.focus();
}

// Gérer le changement de nom du dossier
function handleFolderNameChange(newFolderName, folderText) {
    if (newFolderName && newFolderName !== folderText.innerText) { 
        if (folderFiles[newFolderName]) { 
            alert(`Le dossier "${newFolderName}" existe déjà.`);
            return false
        } else {
            const oldFolderName = folderText.innerText;
            folderFiles[newFolderName] = folderFiles[oldFolderName]; 
            delete folderFiles[oldFolderName]; 
            alert(`Le nom du dossier a été changé en : ${newFolderName}`);
            return true
        }
    } else if (newFolderName === '') {
        alert("Le nom du dossier ne peut pas être vide.");
        return false
    }
}

// Gérer le changement de nom du fichier
function handleFileNameChange(newFileName, fileText, currentFolder) {
    if (newFileName === '') {
        alert("Le nom du fichier ne peut pas être vide.");
        return false;
    }

    if (!newFileName.endsWith('.json')) {
        newFileName += ".json";
    }

    // Vérifier uniquement dans le dossier courant
    const currentFolderFiles = folderFiles[currentFolder];
    if (currentFolderFiles.includes(newFileName) && newFileName !== fileText.innerText) {
        alert(`Le fichier "${newFileName}" existe déjà dans ce dossier.`);
        return false;
    } else {
        const oldFileIndex = currentFolderFiles.indexOf(fileText.innerText);
        if (oldFileIndex !== -1) {
            currentFolderFiles[oldFileIndex] = newFileName;
            alert(`Le nom du fichier a été changé en : ${newFileName}`);
            return true;
        } else {
            alert("Erreur : Le fichier original n'a pas été trouvé dans le dossier.");
            return false;
        }
    }
    return true
}

// Fonction utilitaire pour créer un élément <span> avec le texte mis à jour
function createSpanElement(text) {
    const span = document.createElement('span');
    span.innerText = text;
    span.style.cursor = 'pointer';
    
    return span;
}

// Appel de la fonction pour créer la liste
createFileList(folderFiles);

