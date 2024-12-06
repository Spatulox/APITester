import {createFileList} from "./JS/dashboard/create-DOM-element"
import {ListJsonFile, OpenFileExplorer} from "../wailsjs/go/main/App";


document.getElementById("viewTestFilesButton").onclick = async () => {
    try {
        await OpenFileExplorer();
    } catch (error) {
        console.error("Erreur lors de l'ouverture de l'explorateur de fichiers:", error);
        alert("Erreur: " + error.toString());
    }
};


async function getSortedFolderFiles() {
    // Récupérer les données
    const folderFiles = await ListJsonFile();

    // Fonction pour trier les clés d'un objet
    function sortObjectKeys(obj) {
        return Object.keys(obj).sort().reduce((result, key) => {
            result[key] = obj[key];
            return result;
        }, {});
    }

    // Initialiser root à un tableau vide s'il n'existe pas
    if (!folderFiles.root) {
        folderFiles.root = [];
    }

    // Trier les clés et déplacer "root" à la fin
    const { root, ...rest } = folderFiles;
    return {...sortObjectKeys(rest), root};
}

let oldListFolder = []
export async function refreshFile() {
    window.folderFiles = await getSortedFolderFiles();

    if (JSON.stringify(window.folderFiles) !== JSON.stringify(oldListFolder)) {
        oldListFolder = JSON.parse(JSON.stringify(window.folderFiles));
        createFileList(window.folderFiles);
    }
}

async function startup(){
    await refreshFile()
    setInterval(() => { refreshFile() }, 3000);
}

startup()
