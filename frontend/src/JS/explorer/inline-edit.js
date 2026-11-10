import { state } from "./state";

// Remplace `target` par un champ texte. onCommit(value) est attendu (async) ;
// s'il lève une erreur, on la remonte via onError et on restaure l'affichage.
// Entrée = valider, Échap = annuler, perte de focus = valider.
export function startInlineEdit(target, { value, selectUntil = null, onCommit, onCancel, onError }) {
    state.editing = true;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "inline-edit";
    input.value = value;
    input.spellcheck = false;

    let finished = false;
    const restore = () => {
        if (input.isConnected) input.replaceWith(target);
        state.editing = false;
    };

    const finish = async (commit) => {
        if (finished) return;
        finished = true;
        const newValue = input.value.trim();
        if (!commit || newValue === "" || newValue === value) {
            restore();
            onCancel?.();
            return;
        }
        input.disabled = true;
        try {
            await onCommit(newValue);
            restore();
        } catch (e) {
            restore();
            onError?.(e);
        }
    };

    input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") { e.preventDefault(); finish(true); }
        else if (e.key === "Escape") { e.preventDefault(); finish(false); }
    });
    input.addEventListener("blur", () => finish(true));
    // Ne pas déclencher les clics de la ligne parente
    input.addEventListener("click", (e) => e.stopPropagation());
    input.addEventListener("dblclick", (e) => e.stopPropagation());
    input.addEventListener("mousedown", (e) => e.stopPropagation());
    input.draggable = false;

    target.replaceWith(input);
    input.focus();
    if (selectUntil != null) input.setSelectionRange(0, selectUntil);
    else input.select();
    return input;
}
