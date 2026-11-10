import "./JS/event-listener";
import { initTree } from "./JS/explorer/tree";
import { refreshTree } from "./JS/explorer/actions";

async function startup() {
    initTree();
    await refreshTree(true);
    // Les fichiers peuvent changer en dehors de l'app : on resynchronise régulièrement
    setInterval(() => refreshTree(), 3000);
}

startup();
