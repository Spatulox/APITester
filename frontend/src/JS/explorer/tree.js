import { state, isRoot, isCurrent, groupLabel, toggleCollapsed } from "./state";
import { openMenu } from "./menu";
import {
    openConfig, renameConfig, moveConfig, deleteConfig, newConfig,
    renameGroup, deleteGroup, runTarget,
} from "./actions";
import { initDragAndDrop } from "./dnd";

function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
}

function actionButton(className, text, title, action) {
    const b = el("button", `tree-action ${className}`, text);
    b.type = "button";
    b.title = title;
    b.dataset.action = action;
    return b;
}

export function findFileRow(group, file) {
    return [...document.querySelectorAll("#config-tree .tree-file")]
        .find(r => r.dataset.group === group && r.dataset.file === file);
}

export function findGroupRow(group) {
    return [...document.querySelectorAll("#config-tree .tree-group-header")]
        .find(r => r.dataset.group === group);
}

function matches(name) {
    return name.toLowerCase().includes(state.filter.toLowerCase());
}

export function renderTree() {
    const container = document.getElementById("config-tree");
    container.innerHTML = "";

    const total = state.tree.reduce((n, g) => n + g.files.length, 0);
    const groupCount = state.tree.filter(g => !isRoot(g.name)).length;
    if (total === 0 && groupCount === 0) {
        container.appendChild(el("p", "tree-empty",
            "No config yet. Create one with “+ Config” or import a Postman / Insomnia export."));
        return;
    }

    let shown = 0;
    for (const group of state.tree) {
        const root = isRoot(group.name);
        const files = state.filter
            ? group.files.filter(f => matches(f) || (!root && matches(group.name)))
            : group.files;
        if (state.filter && files.length === 0) continue;
        shown++;

        const groupEl = el("div", "tree-group");
        groupEl.dataset.group = group.name;
        if (root) groupEl.classList.add("tree-group-root");

        const collapsed = !state.filter && state.collapsed.has(group.name);

        // En-tête du groupe
        const header = el("div", "tree-row tree-group-header");
        header.dataset.group = group.name;
        header.appendChild(el("span", "tree-arrow", collapsed ? "▸" : "▾"));
        header.appendChild(el("span", "tree-icon", root ? "🗂️" : "📁"));
        header.appendChild(el("span", "tree-name", groupLabel(group.name)));
        header.appendChild(el("span", "tree-count", String(group.files.length)));
        const gActions = el("span", "tree-actions");
        if (!root && group.files.length > 0) {
            gActions.appendChild(actionButton("play-button", "▶", "Run every config of this group", "run"));
        }
        gActions.appendChild(actionButton("more-button", "⋯", "More actions", "menu"));
        header.appendChild(gActions);
        groupEl.appendChild(header);

        // Fichiers
        const list = el("div", "tree-files");
        list.hidden = collapsed;
        for (const file of files) {
            const row = el("div", "tree-row tree-file");
            row.dataset.group = group.name;
            row.dataset.file = file;
            row.draggable = true;
            row.title = file;
            if (isCurrent(group.name, file)) row.classList.add("active");
            row.appendChild(el("span", "tree-icon", "📄"));
            row.appendChild(el("span", "tree-name", file.replace(/\.json$/i, "")));
            const fActions = el("span", "tree-actions");
            fActions.appendChild(actionButton("play-button", "▶", "Run this config", "run"));
            fActions.appendChild(actionButton("more-button", "⋯", "More actions", "menu"));
            row.appendChild(fActions);
            list.appendChild(row);
        }
        if (files.length === 0) {
            list.appendChild(el("div", "tree-files-empty",
                root ? "Drop a config here to take it out of its group" : "Empty group: drop a config here"));
        }
        groupEl.appendChild(list);
        container.appendChild(groupEl);
    }

    if (shown === 0) {
        container.appendChild(el("p", "tree-empty", state.filter ? "No config matches the filter." : "No config yet."));
    }
}

// ------------------------------------------------------------ //
// Menus

function fileMenuItems(group, file) {
    const destinations = state.tree
        .filter(g => g.name !== group && !(isRoot(g.name) && isRoot(group)))
        .map(g => ({ label: groupLabel(g.name), action: () => moveConfig(group, file, g.name) }));
    return [
        { label: "Open", action: () => openConfig(group, file) },
        { label: "▶ Run", action: () => runTarget({ group, file }, findFileRow(group, file)?.querySelector(".play-button")) },
        { separator: true },
        { label: "Rename", action: () => renameConfig(group, file) },
        destinations.length
            ? { label: "Move to", children: destinations }
            : { label: "Move to", disabled: true },
        { separator: true },
        { label: "🗑️ Delete", danger: true, action: () => deleteConfig(group, file) },
    ];
}

function groupMenuItems(group) {
    const g = state.tree.find(x => x.name === group);
    const items = [{ label: "+ New config here", action: () => newConfig(group) }];
    if (!isRoot(group)) {
        if (g && g.files.length) {
            items.unshift({ label: "▶ Run group", action: () => runTarget({ group }, findGroupRow(group)?.querySelector(".play-button")) });
        }
        items.push(
            { label: "Rename", action: () => renameGroup(group) },
            { separator: true },
            { label: "🗑️ Delete group", danger: true, action: () => deleteGroup(group) },
        );
    }
    return items;
}

// ------------------------------------------------------------ //
// Événements (délégation : un seul jeu de listeners, survit aux re-render)

export function initTree() {
    const container = document.getElementById("config-tree");

    container.addEventListener("click", (e) => {
        if (state.editing) return;
        const actionBtn = e.target.closest(".tree-action");
        const fileRow = e.target.closest(".tree-file");
        const groupRow = e.target.closest(".tree-group-header");

        if (fileRow) {
            const { group, file } = fileRow.dataset;
            if (actionBtn?.dataset.action === "run") return runTarget({ group, file }, actionBtn);
            if (actionBtn?.dataset.action === "menu") {
                const r = actionBtn.getBoundingClientRect();
                return openMenu(r.left, r.bottom, fileMenuItems(group, file));
            }
            return openConfig(group, file);
        }
        if (groupRow) {
            const { group } = groupRow.dataset;
            if (actionBtn?.dataset.action === "run") return runTarget({ group }, actionBtn);
            if (actionBtn?.dataset.action === "menu") {
                const r = actionBtn.getBoundingClientRect();
                return openMenu(r.left, r.bottom, groupMenuItems(group));
            }
            toggleCollapsed(group);
            renderTree();
        }
    });

    container.addEventListener("dblclick", (e) => {
        if (state.editing || e.target.closest(".tree-action")) return;
        const name = e.target.closest(".tree-name");
        if (!name) return;
        const fileRow = name.closest(".tree-file");
        const groupRow = name.closest(".tree-group-header");
        if (fileRow) renameConfig(fileRow.dataset.group, fileRow.dataset.file);
        else if (groupRow) renameGroup(groupRow.dataset.group);
    });

    container.addEventListener("contextmenu", (e) => {
        const fileRow = e.target.closest(".tree-file");
        const groupRow = e.target.closest(".tree-group-header");
        if (!fileRow && !groupRow) return;
        e.preventDefault();
        if (state.editing) return;
        if (fileRow) openMenu(e.clientX, e.clientY, fileMenuItems(fileRow.dataset.group, fileRow.dataset.file));
        else openMenu(e.clientX, e.clientY, groupMenuItems(groupRow.dataset.group));
    });

    // F2 = renommer le fichier ouvert
    document.addEventListener("keydown", (e) => {
        if (e.key === "F2" && state.current && !state.editing) {
            e.preventDefault();
            renameConfig(state.current.group, state.current.file);
        }
    });

    const filter = document.getElementById("tree-filter");
    filter.addEventListener("input", () => {
        state.filter = filter.value.trim();
        renderTree();
    });

    initDragAndDrop(container);
}
