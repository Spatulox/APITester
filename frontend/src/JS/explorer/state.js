// État central de l'explorateur de configs.
// Le groupe d'un fichier vient toujours de l'état (data-group), jamais déduit du DOM.

export const ROOT = "root";

const COLLAPSED_KEY = "apitester.collapsedGroups";

function loadCollapsed() {
    try {
        const raw = localStorage.getItem(COLLAPSED_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) {
        return new Set();
    }
}

export const state = {
    /** @type {{name: string, files: string[]}[]} */
    tree: [],
    /** @type {{group: string, file: string} | null} */
    current: null,
    collapsed: loadCollapsed(),
    filter: "",
    dirty: false,
    editing: false,   // renommage inline en cours -> pas de re-render par le polling
    dragging: null,   // {group, file} en cours de drag
};

export function isRoot(group) {
    return !group || group === ROOT;
}

// Chemin relatif attendu par PrintJsonFile / CheckSoloConfig
export function pathOf(group, file) {
    return isRoot(group) ? file : `${group}/${file}`;
}

export function groupLabel(group) {
    return isRoot(group) ? "Sans groupe" : group;
}

export function isCurrent(group, file) {
    return !!state.current && state.current.group === group && state.current.file === file;
}

export function toggleCollapsed(group) {
    if (state.collapsed.has(group)) state.collapsed.delete(group);
    else state.collapsed.add(group);
    saveCollapsed();
}

export function expand(group) {
    if (state.collapsed.delete(group)) saveCollapsed();
}

export function renameCollapsed(oldName, newName) {
    if (state.collapsed.delete(oldName)) {
        state.collapsed.add(newName);
        saveCollapsed();
    }
}

function saveCollapsed() {
    try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...state.collapsed]));
    } catch (e) { /* stockage indisponible : on ignore */ }
}

export function findGroup(name) {
    return state.tree.find(g => g.name === name);
}

export function setDirty(value) {
    state.dirty = value;
    const dot = document.getElementById("dirty-indicator");
    if (dot) dot.hidden = !value;
}
