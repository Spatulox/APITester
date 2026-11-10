import { SaveConfig } from "../../../wailsjs/go/main/App";
import { state, setDirty } from "../explorer/state";
import { getAuthProfiles, getDefaultProfile } from "./auth-profiles";

// Sauvegarde la config ouverte dans l'éditeur, toujours sur son fichier d'origine.
export async function saveCurrentConfig() {
    if (!state.current) {
        throw new Error("No config opened");
    }
    const { group, file } = state.current;
    await SaveConfig(group, file, htmlToJson());
    setDirty(false);
}

export function htmlToJson() {
    let config = {
        basicUrl: document.querySelector('.config-header p strong + span').textContent,
        globalAskedToFillExpectedOutPut: document.querySelector('.config-header .globalAskedToFillExpectedOutPut').textContent || "false",
        // Les profils remplacent l'ancien champ "authentication" (toujours lu par le backend
        // pour les fichiers qui n'ont pas encore de profils)
        authProfiles: getAuthProfiles(),
        defaultAuthProfile: getDefaultProfile(),
        endpoints: []
    };

    // Récupérer tous les endpoints
    document.querySelectorAll('.endpoint').forEach(endpointElement => {
        let endpoint = {
            isAlreadyAskedToFillExpectedOutput: endpointElement.querySelector('.endpoint-header .isAlreadyAskedToFillExpectedOutput').textContent.trim() || "true",
            path: endpointElement.querySelector('.endpoint-header .display-value').textContent.trim() || '', // Ignore le chemin
            tests: []
        };


        endpointElement.querySelectorAll('.test-method').forEach(testElement => {
            let test = {
                method: testElement.querySelector('.method-header .editable .display-value').textContent.trim() || '', // Ignore le bouton
                input: parseJsonSafely(testElement.querySelector('.input-section pre')),
                expectedOutput: parseJsonSafely(testElement.querySelector('.output-section pre')),
                expectedHttpState: testElement.querySelector('.http-state-section span')?.textContent.trim() || ''
            };
            const profile = testElement.querySelector('select.test-auth-profile')?.value;
            if (profile) test.authProfile = profile;

            endpoint.tests.push(test);
        });

        config.endpoints.push(endpoint);
    });


    return config;
}

function parseJsonSafely(element) {
    if (!element) return {};

    let jsonString = '';
    const span = element.querySelector('.display-value');
    const textarea = element.querySelector('.edit-input');

    // Vérifier si le span est visible et prendre son contenu
    if (span && getComputedStyle(span).display !== 'none') {
        jsonString = span.textContent;
    } else if (textarea) { // Sinon, prendre le contenu du textarea
        jsonString = textarea.value;
    }

    jsonString = jsonString.trim();

    // Si la chaîne est vide ou égale à '{}', retourner un objet vide
    if (!jsonString || jsonString === '{}') {
        return {};
    }

    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error('Error parsing JSON:', e);
        console.log('Problematic JSON string:', jsonString);
        return {};
    }
}
