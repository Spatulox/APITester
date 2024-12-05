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

























// // Exemple de données simulées (remplacez ceci par vos données réelles)
// const folderFiles = {
//     "Folder1": ["file1.json", "file2.json"],
//     "Folder2": ["file3.json", "file4.json"],
//     "root": ["File.json"]
// };

// // Fonction pour créer la liste des fichiers et dossiers
// function createFileList(folderFiles) {
//     const fileListContainer = document.getElementById('file-list');

//     for (const [folderName, files] of Object.entries(folderFiles)) {

//         const folderDiv = document.createElement('div');
//         folderDiv.className = 'folder';

//         // Créer un élément pour le nom du dossier
//         const folderText = document.createElement('span');
//         folderText.innerText = folderName;
//         folderText.style.cursor = 'pointer'; // Changer le curseur pour indiquer que c'est cliquable

//         // Événement de clic pour modifier le nom du dossier
//         folderText.onclick = function() {
//             const input = document.createElement('input');
//             input.type = 'text';
//             input.value = folderText.innerText; // Remplir l'input avec le nom actuel du dossier
            
//             input.onblur = function() { // Lorsque l'utilisateur quitte l'input
//                 const newFolderName = input.value.trim(); // Récupérer le nouveau nom et enlever les espaces
//                 if (newFolderName && newFolderName !== folderText.innerText) { // Vérifier que le nouveau nom n'est pas vide et différent de l'ancien
//                     if (folderFiles[newFolderName]) { // Vérifier si le nom existe déjà
//                         alert(`Le dossier "${newFolderName}" existe déjà.`); // Alerte si le nom existe déjà
//                     } else {
//                         folderFiles[newFolderName] = files; // Ajouter le dossier avec ses fichiers
//                         delete folderFiles[folderName]; // Supprimer l'ancien dossier
//                         folderText.innerText = newFolderName; // Mettre à jour le texte du dossier
//                         alert(`Le nom du dossier a été changé en : ${newFolderName}`); // Alerte avec le nouveau nom
//                     }
//                 } else if (newFolderName === '') {
//                     alert("Le nom du dossier ne peut pas être vide."); // Alerte si le nom est vide
//                 }
//                 folderDiv.replaceChild(folderText, input); // Remplacer l'input par le texte
//             };

//             folderDiv.replaceChild(input, folderText); // Remplacer le texte par l'input
//             input.focus(); // Mettre le focus sur l'input pour que l'utilisateur puisse taper
//         };

//         folderDiv.appendChild(folderText); // Ajouter le texte du dossier/fichier au div principal

//         // Vérifier si l'élément est un dossier (c'est-à-dire qu'il a des fichiers associés)
//         if (Array.isArray(files) && files.length > 0) {
//             // Créer un élément pour la flèche
//             const arrow = document.createElement('span');
//             arrow.className = 'arrow';
//             arrow.innerHTML = '>'; // Icône flèche vers la droite

//             // Événement de clic sur le dossier
//             folderDiv.onclick = function(event) {
//                 if (event.target !== arrow) { // Ne pas déclencher l'événement si on clique sur la flèche
//                     const fileList = this.nextElementSibling; // Récupérer la liste des fichiers associée
//                     if (fileList) { // Vérifier si fileList existe
//                         if (fileList.style.display === 'none' || fileList.style.display === '') {
//                             fileList.style.display = 'block'; // Afficher les fichiers
//                             arrow.innerHTML = '▼'; // Changer l'icône en flèche vers le bas
//                         } else {
//                             fileList.style.display = 'none'; // Masquer les fichiers
//                             arrow.innerHTML = '>'; // Changer l'icône en flèche vers la droite
//                         }
//                     }
//                 }
//             };

//             folderDiv.appendChild(arrow); // Ajouter la flèche au dossier
//         }

//         fileListContainer.appendChild(folderDiv); // Ajouter le div principal au conteneur

//         // Créer une liste pour les fichiers dans le dossier, seulement si c'est un dossier
//         if (Array.isArray(files) && files.length > 0) {
//             const fileListDiv = document.createElement('div');
//             fileListDiv.style.display = 'none'; // Masquer par défaut
//             fileListDiv.className = 'file-list';

//             for (const file of files) {
//                 const fileDiv = document.createElement('div');
//                 fileDiv.className = 'file';

//                 const fileText = document.createElement('span');
//                 fileText.innerText = file;
//                 fileText.style.cursor = 'pointer'; // Changer le curseur pour indiquer que c'est cliquable

//                 // Événement de clic pour modifier le nom du fichier
//                 fileText.onclick = function() {
//                     const inputFile = document.createElement('input');
//                     inputFile.type = 'text';
//                     inputFile.value = fileText.innerText; // Remplir l'input avec le nom actuel du fichier
                    
//                     inputFile.onblur = function() { // Lorsque l'utilisateur quitte l'input
//                         let newFileName = inputFile.value.trim(); // Récupérer le nouveau nom et enlever les espaces
                    
//                         if (newFileName === '') {
//                             alert("Le nom du fichier ne peut pas être vide."); // Alerte si le nom est vide
//                             fileDiv.replaceChild(fileText, inputFile); // Remplacer l'input par le texte
//                             return; // Sortir de la fonction
//                         }
                    
//                         // Vérifier si le nom se termine par .json
//                         if (!newFileName.endsWith('.json')) {
//                             newFileName += ".json"; // Ajouter .json si ce n'est pas présent
//                         }
                    
//                         // Vérifier si le nouveau nom existe déjà dans les fichiers du dossier
//                         if (files.includes(newFileName) && newFileName !== fileText.innerText) { 
//                             alert(`Le fichier "${newFileName}" existe déjà dans ce dossier.`); 
//                         } else {
//                             // Mettre à jour la liste des fichiers avec le nouveau nom 
//                             files.splice(files.indexOf(fileText.innerText), 1, newFileName);
//                             fileText.innerText = newFileName; // Mettre à jour le texte du fichier 
//                             alert(`Le nom du fichier a été changé en : ${newFileName}`); 
//                         }
                    
//                         fileDiv.replaceChild(fileText, inputFile); // Remplacer l'input par le texte
//                     };

//                     fileDiv.replaceChild(inputFile, fileText); 
//                     inputFile.focus(); 
//                 };

//                 fileDiv.appendChild(fileText);
//                 fileListDiv.appendChild(fileDiv);
//             }

//             fileListContainer.appendChild(fileListDiv); 
//         }
//     }
// }

// // Appel de la fonction pour créer la liste
// createFileList(folderFiles);


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
        editFolderName(folderText);
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
        editFileName(fileText);
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

// Fonction pour éditer le nom d'un dossier
function editFolderName(folderText) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = folderText.innerText;

    input.onblur = function() { 
        const newFolderName = input.value.trim();
        handleFolderNameChange(newFolderName, folderText);
        // Remplacer l'input par un nouvel élément span
        const updatedFolderText = createSpanElement(newFolderName);
        console.log(folderText)
        folderText.parentNode.replaceChild(updatedFolderText, input);
    };

    folderText.parentNode.replaceChild(input, folderText); // Remplacer le texte par l'input
    input.focus(); 
}

// Gérer le changement de nom du dossier
function handleFolderNameChange(newFolderName, folderText) {
    if (newFolderName && newFolderName !== folderText.innerText) { 
        if (folderFiles[newFolderName]) { 
            alert(`Le dossier "${newFolderName}" existe déjà.`);
        } else {
            const oldFolderName = folderText.innerText;
            folderFiles[newFolderName] = folderFiles[oldFolderName]; 
            delete folderFiles[oldFolderName]; 
            alert(`Le nom du dossier a été changé en : ${newFolderName}`);
        }
    } else if (newFolderName === '') {
        alert("Le nom du dossier ne peut pas être vide.");
    }
}

// Fonction pour éditer le nom d'un fichier
function editFileName(fileText) {
    const inputFile = document.createElement('input');
    inputFile.type = 'text';
    inputFile.value = fileText.innerText;

    inputFile.onblur = function() { 
        const newFileName = inputFile.value.trim();
        handleFileNameChange(newFileName, fileText);
        // Remplacer l'input par un nouvel élément span
        const updatedFileText = createSpanElement(newFileName);
        fileText.parentNode.replaceChild(updatedFileText, inputFile);
    };

    fileText.parentNode.replaceChild(inputFile, fileText); // Remplacer le texte par l'input
    inputFile.focus(); 
}

// Gérer le changement de nom du fichier
function handleFileNameChange(newFileName, fileText) {
   if (newFileName === '') {
       alert("Le nom du fichier ne peut pas être vide.");
       return; 
   }

   if (!newFileName.endsWith('.json')) {
       newFileName += ".json"; 
   }

   const currentFolderFiles = Object.values(folderFiles).flat();
   if (currentFolderFiles.includes(newFileName) && newFileName !== fileText.innerText) { 
       alert(`Le fichier "${newFileName}" existe déjà dans ce dossier.`); 
   } else {
       const oldFileIndex = currentFolderFiles.indexOf(fileText.innerText);
       currentFolderFiles[oldFileIndex] = newFileName; 
       alert(`Le nom du fichier a été changé en : ${newFileName}`); 
   }
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

