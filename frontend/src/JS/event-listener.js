import { ParseExtractionJsonToGoFunction, OpenFileExplorer } from "../../wailsjs/go/main/App";
import { clickButton } from "./config/edit-config";
import { saveCurrentConfig } from "./config/save-config";
import { alert } from "./popup";
import { showWorkspaceTab } from "./workspace";
import { state, setDirty, groupLabel, ROOT, expand } from "./explorer/state";
import { refreshTree, newConfig, newGroup } from "./explorer/actions";

// ------------------------------------------------------------ //
// Onglets OK / WARNING / ERROR du panneau Résultats

function openResultTab(tabName) {
    document.querySelectorAll("#results-pane .tabcontent").forEach(c => c.style.display = "none");
    document.querySelectorAll("#results-pane .tablink").forEach(b => b.classList.remove("active"));
    document.getElementById(tabName).style.display = "block";
    document.getElementById(`${tabName}-tab`).classList.add("active");
}
["ok", "warning", "error"].forEach(name => {
    document.getElementById(`${name}-tab`).addEventListener("click", () => openResultTab(name));
});
openResultTab("ok");

// ------------------------------------------------------------ //
// Onglets du workspace (Éditeur / Résultats)

document.querySelectorAll(".ws-tab").forEach(b => {
    b.addEventListener("click", () => showWorkspaceTab(b.dataset.tab));
});

// ------------------------------------------------------------ //
// Explorateur : boutons du pied

document.getElementById("new-config").addEventListener("click", () => newConfig());
document.getElementById("new-group").addEventListener("click", () => newGroup());
document.getElementById("open-folder").addEventListener("click", async () => {
    try {
        await OpenFileExplorer();
    } catch (error) {
        console.error("Erreur lors de l'ouverture de l'explorateur de fichiers:", error);
        alert("Erreur: " + error.toString());
    }
});

// ------------------------------------------------------------ //
// Éditeur

async function save() {
    if (!state.current) return;
    try {
        await saveCurrentConfig();
    } catch (e) {
        alert("Save failed: " + e);
    }
}

document.getElementById("save-config").addEventListener("click", save);
document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
    }
});

document.getElementById("addEndpointBtn").addEventListener("click", () => {
    clickButton();
    setDirty(true);
});

// Indicateur "modifié" : toute saisie ou action structurelle dans l'éditeur
const output = document.getElementById("output");
output.addEventListener("input", () => setDirty(true));
output.addEventListener("click", (e) => {
    if (e.target.closest(".tab-item, #add-method, .delete-button")) setDirty(true);
});

// ------------------------------------------------------------ //
// Import Insomnia / Postman

const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    fileInput.value = ""; // permettre de ré-importer le même fichier
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const jsonData = JSON.parse(e.target.result);
            showGroupSelectionModal(jsonData, file.name);
        } catch (error) {
            console.error("Invalid JSON:", error);
            alert("Error : " + error.toString());
        }
    };
    reader.onerror = () => {
        console.error("Error reading file:", reader.error);
        alert("Error reading file.");
    };
    reader.readAsText(file);
});

function uniqueFileName(group, fileName) {
    const existing = state.tree.find(g => g.name === group)?.files || [];
    const dot = fileName.lastIndexOf(".");
    const base = dot > 0 ? fileName.slice(0, dot) : fileName;
    const ext = dot > 0 ? fileName.slice(dot) : ".json";
    let candidate = fileName;
    for (let i = 1; existing.includes(candidate); i++) {
        candidate = `${base} (${i})${ext}`;
    }
    return candidate;
}

function showGroupSelectionModal(jsonData, fileName) {
    const modal = document.getElementById("groupSelectionModal");
    const groupList = document.getElementById("groupList");
    groupList.innerHTML = "";

    const groups = state.tree.length ? state.tree : [{ name: ROOT, files: [] }];
    for (const { name } of groups) {
        const li = document.createElement("li");
        li.textContent = groupLabel(name);
        if (state.current?.group === name) li.classList.add("suggested");
        li.onclick = async () => {
            const newFileName = uniqueFileName(name, fileName);
            try {
                await ParseExtractionJsonToGoFunction(jsonData, name, newFileName);
                expand(name);
            } catch (e) {
                alert("Import failed: " + e);
            }
            modal.style.display = "none";
            await refreshTree(true);
        };
        groupList.appendChild(li);
    }
    modal.style.display = "block";
}

document.getElementById("closeModal").onclick = () => {
    document.getElementById("groupSelectionModal").style.display = "none";
};
