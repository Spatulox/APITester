import { state } from "./state";
import { moveConfig } from "./actions";

// Drag & drop d'un fichier vers un groupe (y compris "Sans groupe").
export function initDragAndDrop(container) {
    let currentTarget = null;

    const clearTarget = () => {
        currentTarget?.classList.remove("drop-target");
        currentTarget = null;
    };

    container.addEventListener("dragstart", (e) => {
        const row = e.target.closest?.(".tree-file");
        if (!row || state.editing) {
            e.preventDefault();
            return;
        }
        state.dragging = { group: row.dataset.group, file: row.dataset.file };
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", row.dataset.file);
    });

    container.addEventListener("dragend", (e) => {
        e.target.closest?.(".tree-file")?.classList.remove("dragging");
        clearTarget();
        state.dragging = null;
    });

    container.addEventListener("dragover", (e) => {
        if (!state.dragging) return;
        const groupEl = e.target.closest(".tree-group");
        if (!groupEl || groupEl.dataset.group === state.dragging.group) {
            clearTarget();
            return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (currentTarget !== groupEl) {
            clearTarget();
            currentTarget = groupEl;
            groupEl.classList.add("drop-target");
        }
    });

    container.addEventListener("dragleave", (e) => {
        if (currentTarget && !currentTarget.contains(e.relatedTarget)) clearTarget();
    });

    container.addEventListener("drop", async (e) => {
        if (!state.dragging) return;
        e.preventDefault();
        const groupEl = e.target.closest(".tree-group");
        const { group, file } = state.dragging;
        clearTarget();
        state.dragging = null;
        if (groupEl && groupEl.dataset.group !== group) {
            await moveConfig(group, file, groupEl.dataset.group);
        }
    });
}
