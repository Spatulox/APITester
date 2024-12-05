import { createFileList } from "./JS/create-DOM-element"

// Exemple de données simulées (remplacez ceci par vos données réelles)
window.folderFiles = {
    "Folder1": ["file1.json", "file2.json"],
    "Folder2": ["file3.json", "file4.json"],
    "root": ["File.json"]
};

// Appel de la fonction pour créer la liste
createFileList(window.folderFiles);

