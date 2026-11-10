import {
    ListConfigTree, RenameConfig, MoveConfig, CreateConfig, DeleteConfig,
    CreateGroup, RenameGroup, DeleteGroup,
} from "../../../wailsjs/go/main/App";
import { state, ROOT, isRoot, isCurrent, expand, renameCollapsed, groupLabel, findGroup } from "./state";
import { renderTree, findFileRow, findGroupRow } from "./tree";
import { startInlineEdit } from "./inline-edit";
import { alert, confirm } from "../popup";
import { openConfigInEditor, closeEditor, updateEditorTitle } from "../config/edit-config";
import { saveCurrentConfig } from "../config/save-config";
import { runConfig } from "../config/check-config";

let lastTreeJson = "";

// Recharge l'arborescence depuis le disque. Sans `force`, ne re-rend pas pendant un renommage / drag.
export async function refreshTree(force = false) {
    let tree;
    try {
        tree = await ListConfigTree();
    } catch (e) {
        console.error("ListConfigTree failed:", e);
        return;
    }
    tree = (tree || []).map(g => ({ name: g.name, files: g.files || [] }));
    const json = JSON.stringify(tree);
    if (!force && (json === lastTreeJson || state.editing || state.dragging)) return;
    lastTreeJson = json;
    state.tree = tree;
    renderTree();
}

function errorMessage(e) {
    return (e && e.message) || String(e);
}

// ------------------------------------------------------------ //
// Fichiers

export async function openConfig(group, file) {
    if (isCurrent(group, file)) return;
    if (state.dirty) {
        const discard = await confirm(`"${state.current.file}" has unsaved changes.\nDiscard them and open "${file}"?`);
        if (!discard) return;
    }
    try {
        await openConfigInEditor(group, file);
        renderTree();
    } catch (e) {
        console.error(e);
        alert(`Impossible to open ${file}: ${errorMessage(e)}`);
    }
}

export function renameConfig(group, file) {
    const row = findFileRow(group, file);
    const nameEl = row?.querySelector(".tree-name");
    if (!nameEl) return;
    const value = file;
    startInlineEdit(nameEl, {
        value,
        selectUntil: value.toLowerCase().endsWith(".json") ? value.length - 5 : null,
        onCommit: async (newName) => {
            const finalName = await RenameConfig(group, file, newName);
            if (isCurrent(group, file)) {
                state.current.file = finalName;
                updateEditorTitle();
            }
            state.editing = false;
            await refreshTree(true);
        },
        onError: (e) => alert(`Rename failed: ${errorMessage(e)}`),
    });
}

export async function moveConfig(fromGroup, file, toGroup) {
    if (fromGroup === toGroup) return;
    try {
        await MoveConfig(fromGroup, file, toGroup);
        if (isCurrent(fromGroup, file)) {
            state.current.group = toGroup;
            updateEditorTitle();
        }
        expand(toGroup);
        await refreshTree(true);
    } catch (e) {
        alert(`Move failed: ${errorMessage(e)}`);
    }
}

export async function deleteConfig(group, file) {
    if (!await confirm(`Delete the config "${file}" (${groupLabel(group)})?`)) return;
    try {
        await DeleteConfig(group, file);
        if (isCurrent(group, file)) closeEditor();
        await refreshTree(true);
    } catch (e) {
        alert(`Delete failed: ${errorMessage(e)}`);
    }
}

export async function newConfig(group = state.current?.group ?? ROOT) {
    if (state.dirty && !await confirm(`"${state.current.file}" has unsaved changes.\nDiscard them?`)) return;
    try {
        const file = await CreateConfig(group, "new-config.json");
        expand(group);
        await refreshTree(true);
        await openConfigInEditor(group, file);
        renderTree();
        renameConfig(group, file);
    } catch (e) {
        alert(`Creation failed: ${errorMessage(e)}`);
    }
}

// ------------------------------------------------------------ //
// Groupes

export function newGroup() {
    const container = document.getElementById("config-tree");
    const placeholder = document.createElement("span");
    const row = document.createElement("div");
    row.className = "tree-row tree-group-header new-group-row";
    row.innerHTML = `<span class="tree-arrow">▾</span><span class="tree-icon">📁</span>`;
    row.appendChild(placeholder);
    container.prepend(row);
    startInlineEdit(placeholder, {
        value: "",
        onCommit: async (name) => {
            await CreateGroup(name);
            state.editing = false;
            await refreshTree(true);
        },
        onCancel: () => row.remove(),
        onError: (e) => { row.remove(); alert(`Group creation failed: ${errorMessage(e)}`); },
    });
}

export function renameGroup(group) {
    if (isRoot(group)) return;
    const nameEl = findGroupRow(group)?.querySelector(".tree-name");
    if (!nameEl) return;
    startInlineEdit(nameEl, {
        value: group,
        onCommit: async (newName) => {
            await RenameGroup(group, newName);
            renameCollapsed(group, newName);
            if (state.current?.group === group) {
                state.current.group = newName;
                updateEditorTitle();
            }
            state.editing = false;
            await refreshTree(true);
        },
        onError: (e) => alert(`Rename failed: ${errorMessage(e)}`),
    });
}

export async function deleteGroup(group) {
    if (isRoot(group)) return;
    const count = findGroup(group)?.files.length ?? 0;
    const msg = count
        ? `Delete the group "${group}" and its ${count} config file(s)?`
        : `Delete the empty group "${group}"?`;
    if (!await confirm(msg)) return;
    try {
        await DeleteGroup(group);
        if (state.current?.group === group) closeEditor();
        await refreshTree(true);
    } catch (e) {
        alert(`Delete failed: ${errorMessage(e)}`);
    }
}

// ------------------------------------------------------------ //
// Exécution

// target: {group, file} pour un fichier, {group} pour un groupe entier
export async function runTarget(target, button = null) {
    const touchesCurrent = state.current &&
        (target.file ? isCurrent(target.group, target.file) : state.current.group === target.group);

    if (touchesCurrent && state.dirty) {
        if (await confirm(`Save the changes of "${state.current.file}" before running?`)) {
            try {
                await saveCurrentConfig();
            } catch (e) {
                alert(`Save failed: ${errorMessage(e)}`);
                return;
            }
        }
    }
    await runConfig(target, false, button);
}
