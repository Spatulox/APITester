import { createFileList } from "./JS/create-DOM-element"
import {ListJsonFile} from "../wailsjs/go/main/App";



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

    // Trier les clés et déplacer "root" à la fin
    let sortedFolderFiles;
    if (folderFiles.root) {
        const { root, ...rest } = folderFiles;
        sortedFolderFiles = { ...sortObjectKeys(rest), root };
    } else {
        sortedFolderFiles = sortObjectKeys(folderFiles);
    }

    return sortedFolderFiles;
}

async function startup(){
    window.folderFiles = await getSortedFolderFiles()
    createFileList(window.folderFiles);
}

startup()
