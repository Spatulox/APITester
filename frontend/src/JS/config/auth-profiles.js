// Éditeur des profils d'authentification d'une config.
// Les profils sont gardés en mémoire (pas relus depuis le DOM) : les secrets ne sont donc
// jamais remplacés par un masque à la sauvegarde.
import { TestAuthProfile } from "../../../wailsjs/go/main/App";
import { setDirty } from "../explorer/state";
import { htmlToJson } from "./save-config";

const TYPES = [
    ["noauth", "No auth"],
    ["bearer", "Bearer token"],
    ["apikey", "API key"],
    ["basicAuth", "Basic auth"],
    ["oauth2", "OAuth2 (client credentials)"],
    ["login", "Login request"],
];

let profiles = [];
let defaultName = "";
let activeIndex = 0;
let root = null;

// ------------------------------------------------------------ //
// API du module

export function getAuthProfiles() {
    return profiles.map(cleanProfile);
}

export function getDefaultProfile() {
    return profiles.some(p => p.name === defaultName) ? defaultName : (profiles[0]?.name || "");
}

export function getProfileNames() {
    return profiles.map(p => p.name);
}

// Construit la section "Authentication" à partir de la config (convertit l'ancien format).
export function renderAuthProfiles(config) {
    profiles = loadProfiles(config).map(p => structuredClone(p));
    defaultName = config.defaultAuthProfile || profiles[0]?.name || "";
    activeIndex = Math.max(0, profiles.findIndex(p => p.name === defaultName));

    root = document.createElement("div");
    root.className = "auth-section";
    render();
    return root;
}

// <select> du profil d'un test ; "" = profil par défaut
export function createProfileSelect(value = "") {
    const select = document.createElement("select");
    select.className = "test-auth-profile";
    fillSelect(select, value);
    select.addEventListener("change", () => {
        setDirty(true);
        updateTestBadge(select);
    });
    return select;
}

export function createProfileBadge() {
    const badge = document.createElement("span");
    badge.className = "profile-badge";
    return badge;
}

// Met à jour le badge du test qui contient ce select
export function updateTestBadge(select) {
    const badge = select.closest(".test-method")?.querySelector(".profile-badge");
    if (!badge) return;
    badge.textContent = select.value ? `🔑 ${select.value}` : "";
    badge.hidden = !select.value;
}

// ------------------------------------------------------------ //
// Données

function loadProfiles(config) {
    if (Array.isArray(config.authProfiles) && config.authProfiles.length) {
        return config.authProfiles;
    }
    const a = config.authentication || {};
    const type = ["apikey", "basicAuth", "oauth2"].includes(a.type) ? a.type : "noauth";
    const p = { name: "default", type };
    if (type === "apikey") p.apikey = { ...a.apikey };
    if (type === "basicAuth") p.basicAuth = { ...a.basicAuth };
    if (type === "oauth2") p.oauth2 = { ...a.oauth2 };
    return [p];
}

// Ne garde que les champs utiles au type choisi
function cleanProfile(p) {
    const out = { name: p.name, type: p.type };
    const key = { apikey: "apikey", basicAuth: "basicAuth", bearer: "bearer", oauth2: "oauth2", login: "login" }[p.type];
    if (key && p[key]) out[key] = structuredClone(p[key]);
    const headers = Object.fromEntries(Object.entries(p.headers || {}).filter(([k]) => k.trim() !== ""));
    if (Object.keys(headers).length) out.headers = headers;
    return out;
}

function changed() {
    setDirty(true);
}

function uniqueName(base) {
    let name = base;
    for (let i = 2; profiles.some(p => p.name === name); i++) name = `${base}${i}`;
    return name;
}

// ------------------------------------------------------------ //
// Synchronisation avec les sélecteurs de profil des tests

function fillSelect(select, value) {
    select.innerHTML = "";
    const def = getDefaultProfile();
    select.appendChild(new Option(`(default${def ? `: ${def}` : ""})`, ""));
    for (const name of getProfileNames()) select.appendChild(new Option(name, name));
    if (value && !getProfileNames().includes(value)) {
        select.appendChild(new Option(`${value} (missing)`, value));
    }
    select.value = value;
}

function refreshTestSelects(renamed = null) {
    document.querySelectorAll("select.test-auth-profile").forEach(select => {
        let value = select.value;
        if (renamed && value === renamed.from) value = renamed.to;
        if (renamed && renamed.to === null && value === renamed.from) value = "";
        fillSelect(select, value);
        updateTestBadge(select);
    });
}

// ------------------------------------------------------------ //
// Rendu

function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
}

function render() {
    root.innerHTML = "";
    root.appendChild(el("h3", null, "Authentication profiles"));
    root.appendChild(el("p", "auth-hint",
        "Each test runs with the default profile unless it picks another one. Use one profile per role (admin, user, anonymous…)."));

    const tabs = el("ul", "tab-list");
    profiles.forEach((p, i) => {
        const tab = el("li", `tab-item ${i === activeIndex ? "active" : ""}`, p.name || "(unnamed)");
        if (p.name === getDefaultProfile()) tab.textContent += " ★";
        tab.addEventListener("click", () => { activeIndex = i; render(); });
        tabs.appendChild(tab);
    });
    const add = el("li", "tab-item tab-add", "+");
    add.title = "Add a profile";
    add.addEventListener("click", () => {
        profiles.push({ name: uniqueName("profile"), type: "noauth" });
        activeIndex = profiles.length - 1;
        changed();
        refreshTestSelects();
        render();
    });
    tabs.appendChild(add);
    root.appendChild(tabs);

    const pane = el("div", "tab-content auth-profile-pane");
    const p = profiles[activeIndex];
    if (p) renderProfile(pane, p);
    root.appendChild(pane);
}

function field(label, input) {
    const row = el("label", "auth-field");
    row.appendChild(el("span", "auth-label", label));
    row.appendChild(input);
    return row;
}

function textInput(obj, key, { placeholder = "", secret = false, type = "text" } = {}) {
    const wrap = el("span", "auth-input-wrap");
    const input = document.createElement("input");
    input.type = secret ? "password" : type;
    input.className = "auth-input";
    input.placeholder = placeholder;
    input.value = obj[key] ?? "";
    input.spellcheck = false;
    input.addEventListener("input", () => {
        obj[key] = type === "number" ? (parseInt(input.value, 10) || 0) : input.value;
        changed();
    });
    wrap.appendChild(input);
    if (secret) {
        const eye = el("button", "auth-eye", "👁");
        eye.type = "button";
        eye.title = "Show / hide";
        eye.addEventListener("click", (e) => {
            e.preventDefault();
            input.type = input.type === "password" ? "text" : "password";
        });
        wrap.appendChild(eye);
    }
    return wrap;
}

function selectInput(obj, key, options, fallback, onChange) {
    const select = document.createElement("select");
    select.className = "auth-input";
    for (const [value, label] of options) select.appendChild(new Option(label, value));
    select.value = obj[key] || fallback;
    select.addEventListener("change", () => {
        obj[key] = select.value;
        changed();
        onChange?.();
    });
    return select;
}

function renderProfile(pane, p) {
    // En-tête : nom, défaut, type, actions
    const nameInput = document.createElement("input");
    nameInput.className = "auth-input";
    nameInput.value = p.name;
    nameInput.addEventListener("change", () => {
        const newName = nameInput.value.trim();
        if (!newName || profiles.some(o => o !== p && o.name === newName)) {
            nameInput.value = p.name; // nom vide ou déjà pris : on annule
            return;
        }
        const old = p.name;
        p.name = newName;
        if (defaultName === old) defaultName = newName;
        changed();
        refreshTestSelects({ from: old, to: newName });
        render();
    });
    pane.appendChild(field("Name", nameInput));

    const defaultBox = document.createElement("input");
    defaultBox.type = "checkbox";
    defaultBox.checked = p.name === getDefaultProfile();
    defaultBox.disabled = defaultBox.checked;
    defaultBox.addEventListener("change", () => {
        defaultName = p.name;
        changed();
        refreshTestSelects();
        render();
    });
    pane.appendChild(field("Default profile", defaultBox));

    pane.appendChild(field("Type", selectInput(p, "type", TYPES, "noauth", () => render())));

    const fields = el("div", "auth-type-fields");
    renderTypeFields(fields, p);
    pane.appendChild(fields);

    renderHeaders(pane, p);

    // Actions
    const actions = el("div", "auth-actions");
    const testBtn = el("button", "discord-button", "Test connection");
    testBtn.type = "button";
    const result = el("pre", "auth-test-result");
    result.hidden = true;
    testBtn.addEventListener("click", async () => {
        testBtn.disabled = true;
        result.hidden = false;
        result.className = "auth-test-result";
        result.textContent = "Connecting…";
        try {
            result.textContent = "✔ " + await TestAuthProfile(htmlToJson(), p.name);
            result.classList.add("ok");
        } catch (e) {
            result.textContent = "✖ " + ((e && e.message) || e);
            result.classList.add("ko");
        }
        testBtn.disabled = false;
    });
    actions.appendChild(testBtn);

    const delBtn = el("button", "discord-button danger-button", "Delete profile");
    delBtn.type = "button";
    delBtn.disabled = profiles.length <= 1;
    delBtn.title = delBtn.disabled ? "A config needs at least one profile" : "";
    delBtn.addEventListener("click", () => {
        const idx = profiles.indexOf(p);
        profiles.splice(idx, 1);
        if (defaultName === p.name) defaultName = profiles[0]?.name || "";
        activeIndex = Math.max(0, idx - 1);
        changed();
        refreshTestSelects({ from: p.name, to: null });
        render();
    });
    actions.appendChild(delBtn);
    pane.appendChild(actions);
    pane.appendChild(result);
}

function sub(p, key, defaults = {}) {
    if (!p[key] || typeof p[key] !== "object") p[key] = { ...defaults };
    return p[key];
}

function renderTypeFields(container, p) {
    switch (p.type) {
        case "bearer": {
            const b = sub(p, "bearer");
            container.appendChild(field("Token", textInput(b, "token", { secret: true, placeholder: "eyJhbGciOi…" })));
            break;
        }
        case "apikey": {
            const k = sub(p, "apikey");
            container.appendChild(field("Key name", textInput(k, "keyname", { placeholder: "X-API-Key" })));
            container.appendChild(field("Value", textInput(k, "apikeyvalue", { secret: true })));
            container.appendChild(field("Send in", selectInput(k, "addTo",
                [["header", "Header"], ["query", "Query parameter"], ["cookie", "Cookie"]], "header")));
            break;
        }
        case "basicAuth": {
            const b = sub(p, "basicAuth");
            container.appendChild(field("Username", textInput(b, "username")));
            container.appendChild(field("Password", textInput(b, "password", { secret: true })));
            break;
        }
        case "oauth2": {
            const o = sub(p, "oauth2");
            container.appendChild(field("Client ID", textInput(o, "clientId")));
            container.appendChild(field("Client secret", textInput(o, "clientSecret", { secret: true })));
            container.appendChild(field("Token URL", textInput(o, "tokenUrl", { placeholder: "https://auth.example.com/oauth/token" })));
            container.appendChild(field("Token field", textInput(o, "tokenField", { placeholder: "access_token" })));
            container.appendChild(field("Expires-in field", textInput(o, "expiresInField", { placeholder: "expires_in (or @empty)" })));
            break;
        }
        case "login":
            renderLoginFields(container, sub(p, "login", { method: "POST", contentType: "json", extractFrom: "json", injectAs: "bearer" }));
            break;
        default:
            container.appendChild(el("p", "auth-hint", "Requests are sent without credentials."));
    }
}

function renderLoginFields(container, l) {
    container.appendChild(el("h4", null, "1. Login request"));
    container.appendChild(field("Method", selectInput(l, "method",
        [["POST", "POST"], ["GET", "GET"], ["PUT", "PUT"], ["PATCH", "PATCH"]], "POST")));
    container.appendChild(field("URL", textInput(l, "url", { placeholder: "/auth/login (relative to Basic URL) or https://…" })));
    container.appendChild(field("Body format", selectInput(l, "contentType",
        [["json", "JSON"], ["form", "Form (x-www-form-urlencoded)"]], "json")));

    const body = document.createElement("textarea");
    body.className = "auth-input auth-body";
    body.spellcheck = false;
    body.placeholder = '{ "email": "user@example.com", "password": "…" }';
    body.value = l.body == null ? "" : JSON.stringify(l.body, null, 2);
    body.addEventListener("input", () => {
        const text = body.value.trim();
        if (text === "") {
            delete l.body;
            body.classList.remove("invalid");
        } else {
            try {
                l.body = JSON.parse(text);
                body.classList.remove("invalid");
            } catch (e) {
                body.classList.add("invalid"); // la dernière valeur valide est conservée
            }
        }
        changed();
    });
    container.appendChild(field("Body (JSON)", body));

    container.appendChild(el("h4", null, "2. Read the token from the response"));
    const extractPath = textInput(l, "extractPath", { placeholder: "data.access_token" });
    container.appendChild(field("From", selectInput(l, "extractFrom",
        [["json", "JSON body (dotted path)"], ["header", "Response header"], ["cookie", "Response cookie"]], "json")));
    container.appendChild(field("Path / name", extractPath));

    container.appendChild(el("h4", null, "3. Send it with every request"));
    container.appendChild(field("As", selectInput(l, "injectAs",
        [["bearer", "Authorization: Bearer <token>"], ["header", "Custom header"], ["cookie", "Cookie"], ["query", "Query parameter"]], "bearer")));
    container.appendChild(field("Name", textInput(l, "injectName", { placeholder: "X-Auth-Token (not needed for Bearer)" })));
    container.appendChild(field("Prefix", textInput(l, "injectPrefix", { placeholder: "optional, e.g. Token " })));
    container.appendChild(field("Re-login after (s)", textInput(l, "ttlSeconds", { type: "number", placeholder: "0 = once per run" })));
}

function renderHeaders(pane, p) {
    const box = el("div", "auth-headers");
    box.appendChild(el("h4", null, "Extra headers"));
    // Tableau d'édition (on accepte temporairement des clés vides / dupliquées)
    const rows = Object.entries(p.headers || {}).map(([k, v]) => ({ k, v }));
    const sync = () => {
        p.headers = {};
        for (const { k, v } of rows) if (k.trim()) p.headers[k.trim()] = v;
        changed();
    };
    const list = el("div", "auth-headers-list");
    const draw = () => {
        list.innerHTML = "";
        rows.forEach((row, i) => {
            const line = el("div", "auth-header-row");
            const key = document.createElement("input");
            key.className = "auth-input";
            key.placeholder = "Header";
            key.value = row.k;
            key.addEventListener("input", () => { row.k = key.value; sync(); });
            const val = document.createElement("input");
            val.className = "auth-input";
            val.placeholder = "Value";
            val.value = row.v;
            val.addEventListener("input", () => { row.v = val.value; sync(); });
            const del = el("button", "delete-button", "🗑️");
            del.type = "button";
            del.addEventListener("click", () => { rows.splice(i, 1); sync(); draw(); });
            line.append(key, val, del);
            list.appendChild(line);
        });
    };
    draw();
    box.appendChild(list);
    const add = el("button", "discord-button", "+ Header");
    add.type = "button";
    add.addEventListener("click", () => { rows.push({ k: "", v: "" }); draw(); });
    box.appendChild(add);
    pane.appendChild(box);
}
