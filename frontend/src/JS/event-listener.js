import {ParseExtractionJsonToGoFunction, UpdateConfig} from "../../wailsjs/go/main/App";
import { refreshFile } from "../main";
import {createEmptyConf} from "./config/edit-config";
import {htmlToJson} from "./config/save-config";

const element1 = document.getElementById('ok-tab');
const element2 = document.getElementById('warning-tab');
const element3 = document.getElementById('error-tab');

const element4 = document.getElementById('section1');
const element5 = document.getElementById('section2');
const element6 = document.getElementById('section3');

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
element1.addEventListener('mousedown', (evt) => openTab(evt, 'ok'));
element2.addEventListener('mousedown', (evt) => openTab(evt, 'warning'));
element3.addEventListener('mousedown', (evt) => openTab(evt, 'error'));

export function showSection(evt, sectionId) {
    // Masquer toutes les sections
    var sections = document.querySelectorAll('main > section');
    sections.forEach(function(section) {
        section.style.display = 'none'; // Masquer complètement
        section.style.height = '0'; // Réinitialiser la hauteur
        section.style.marginBottom = '0'; // Réinitialiser les marges
        section.classList.remove("active")
    });

    // Afficher la section sélectionnée
    const selectedSection = document.getElementById(sectionId);
    selectedSection.style.display = 'block'; // Afficher avec display
    selectedSection.style.height = 'auto';
    selectedSection.style.marginBottom = '30px';
    selectedSection.classList.add("active")


    // Gérer l'affichage du tableau de résultats
    const resultsDashboard = document.getElementById("results-dashboard-child");
    if (!sectionId.includes("results-dashboard")) {
        resultsDashboard.style.display = 'none';
        resultsDashboard.style.height = '0';
    } else {
        resultsDashboard.style.display = 'block';
        resultsDashboard.style.height = 'auto';
    }


    // Ajouter une classe active au lien sélectionné
    if(evt){
        try {
            evt.currentTarget.classList.add('active');
        } catch (e) {
            console.error("Error adding active class:", e);
        }
    }
}


element4.addEventListener('mousedown', (evt) => showSection(evt, 'test-execution'));
element5.addEventListener('mousedown', (evt) => showSection(evt, 'configuration-management'));
element6.addEventListener('mousedown', (evt) => showSection(evt, 'results-dashboard'));

// Initialiser l'onglet par défaut au chargement de la page
document.addEventListener("DOMContentLoaded", function() {
    // Ouvrir la section par défaut
    showSection({currentTarget: {classList: {add: function() {}}}}, 'test-execution'); // Simuler l'événement pour afficher la section par défaut
    document.querySelector('.tablink').click(); // Ouvrir le premier onglet par défaut dans le tableau de bord
});

const element7 = document.getElementById("add_test_config")
element7.addEventListener('click', (event)=>{
    createEmptyConf()
    showSection(event, 'configuration-management')
})


document.getElementById('closeModal').onclick = function() {
    document.getElementById('groupSelectionModal').style.display = 'none';
};


document.getElementById("save-config").addEventListener("click", async ()=>{
    const fileNameElement = document.getElementById("fileNameConfiguration")
    const displayValue = fileNameElement.querySelector('.editable .display-value').textContent

    const jsonData = htmlToJson()
    await UpdateConfig(jsonData, displayValue)
})




document.getElementById('fileInput').addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    console.log(file)

    const reader = new FileReader();
    
    reader.onload = async function(e) {
        const content = e.target.result;

        // Vérifiez si le contenu est un JSON valide
        try {
            const jsonData = JSON.parse(content);
            showGroupSelectionModal(jsonData, file.name)
            refreshFile()
        } catch (error) {
            console.error("Invalid JSON:", error);
            alert("Error : " + error.toString());
        }
    };

    reader.onerror = function() {
        console.error("Error reading file:", reader.error);
        alert("Error reading file.");
    };

    // Lire le contenu du fichier
    reader.readAsText(file);
});



async function showGroupSelectionModal(jsonData, fileName) {
    const modal = document.getElementById('groupSelectionModal');
    const groupList = document.getElementById('groupList');
    
    // Clear previous groups
    groupList.innerHTML = '';

    // Populate groups from window.folderFiles
    for (let group in window.folderFiles) {
        const listItem = document.createElement('li');
        
        // Display "No Group" for the root group
        if (group === "root") {
            listItem.textContent = "No Group";
        } else {
            listItem.textContent = group;
        }

        listItem.onclick = async () => {
            // Check if the file already exists in the selected group
            const existingFiles = window.folderFiles[group] || [];
            let newFileName = fileName;

            // Rename the file if it already exists
            let counter = 1;
            while (existingFiles.includes(newFileName)) {
                const fileParts = fileName.split('.');
                const baseName = fileParts.slice(0, -1).join('.');
                const extension = fileParts.pop();
                newFileName = `${baseName} (${counter}).${extension}`; // Append counter to the base name
                counter++;
            }

            console.log(`Sending JSON with filename: ${newFileName}`);
            await ParseExtractionJsonToGoFunction(jsonData, group, newFileName); // Send with potentially renamed file name
            modal.style.display = 'none'; // Close the modal
            refreshFile(); // Refresh the file list after saving
        };

        groupList.appendChild(listItem);
    }

    modal.style.display = 'block'; // Show the modal
}


export async function showGroupSelection(jsonData, fileName) {
    const modal = document.getElementById('groupSelectionModal');
    const groupList = document.getElementById('groupList');
    
    // Clear previous groups
    groupList.innerHTML = '';

    // Populate groups from window.folderFiles
    for (let group in window.folderFiles) {
        const listItem = document.createElement('li');
        
        // Display "No Group" for the root group
        if (group === "root") {
            listItem.textContent = "No Group";
        } else {
            listItem.textContent = group;
        }

        listItem.onclick = async () => {
            // Check if the file already exists in the selected group
            const existingFiles = window.folderFiles[group] || [];
            let newFileName = fileName;

            // Rename the file if it already exists
            let counter = 1;
            while (existingFiles.includes(newFileName)) {
                const fileParts = fileName.split('.');
                const baseName = fileParts.slice(0, -1).join('.');
                const extension = fileParts.pop();
                newFileName = `${baseName} (${counter}).${extension}`; // Append counter to the base name
                counter++;
            }

            console.log(`Sending JSON with filename: ${newFileName}`);
            await ParseExtractionJsonToGoFunction(jsonData, group, newFileName); // Send with potentially renamed file name
            modal.style.display = 'none'; // Close the modal
            refreshFile(); // Refresh the file list after saving
        };

        groupList.appendChild(listItem);
    }

    modal.style.display = 'block'; // Show the modal
}