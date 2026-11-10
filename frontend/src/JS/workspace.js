// Onglets du panneau de droite : "editor" | "results"
export function showWorkspaceTab(tab) {
    document.querySelectorAll(".ws-tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    document.querySelectorAll(".ws-pane").forEach(p => p.classList.toggle("active", p.id === `${tab}-pane`));
}
