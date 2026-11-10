// Menu contextuel minimal (bouton ⋯ ou clic droit).
// items: [{label, action, danger?, disabled?, children?: items}]

let menuEl = null;

export function closeMenu() {
    if (menuEl) {
        menuEl.remove();
        menuEl = null;
    }
}

function buildItems(container, items) {
    for (const item of items) {
        if (item.separator) {
            const sep = document.createElement("div");
            sep.className = "context-menu-separator";
            container.appendChild(sep);
            continue;
        }
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "context-menu-item";
        if (item.danger) btn.classList.add("danger");
        btn.textContent = item.label;
        btn.disabled = !!item.disabled;

        if (item.children) {
            btn.textContent = `${item.label} ▸`;
            const sub = document.createElement("div");
            sub.className = "context-submenu";
            sub.hidden = true;
            buildItems(sub, item.children);
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                sub.hidden = !sub.hidden;
                btn.textContent = `${item.label} ${sub.hidden ? "▸" : "▾"}`;
            });
            container.appendChild(btn);
            container.appendChild(sub);
        } else {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                closeMenu();
                item.action?.();
            });
            container.appendChild(btn);
        }
    }
}

export function openMenu(x, y, items) {
    closeMenu();
    menuEl = document.createElement("div");
    menuEl.className = "context-menu";
    buildItems(menuEl, items);
    document.body.appendChild(menuEl);

    // Garder le menu dans la fenêtre
    const rect = menuEl.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - rect.width - 8);
    const top = Math.min(y, window.innerHeight - rect.height - 8);
    menuEl.style.left = `${Math.max(8, left)}px`;
    menuEl.style.top = `${Math.max(8, top)}px`;
}

document.addEventListener("mousedown", (e) => {
    if (menuEl && !menuEl.contains(e.target)) closeMenu();
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
});
window.addEventListener("blur", closeMenu);
window.addEventListener("resize", closeMenu);
