export function htmlToJson() {
    let config = {
        basicUrl: document.querySelector('.config-header p strong + span').textContent,
        globalAskedToFillExpectedOutPut: document.querySelector('.config-header .globalAskedToFillExpectedOutPut').textContent || "false",
        authentication: {
            type: document.getElementById('authType').textContent,
            apikey: {
                keyname: document.querySelector('#apikey p:nth-child(1) strong + span').textContent,
                apikeyvalue: document.querySelector('#apikey p:nth-child(2) strong + span').textContent,
            },
            oauth2: {
                clientId: document.querySelector('#oauth2 p:nth-child(1) strong + span').textContent,
                clientSecret: document.querySelector('#oauth2 p:nth-child(2) strong + span').textContent,
                tokenUrl: document.querySelector('#oauth2 p:nth-child(3) strong + span').textContent
            },
            basicAuth: {
                username: document.querySelector('#basicAuth p:nth-child(1) strong + span').textContent,
                password: document.querySelector('#basicAuth p:nth-child(2) strong + span').textContent
            }
        },
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
                method: testElement.querySelector('.method-header')?.childNodes[0].textContent.trim() || '', // Ignore le bouton
                input: parseJsonSafely(testElement.querySelector('.input-section pre')),
                expectedOutput: parseJsonSafely(testElement.querySelector('.output-section pre')),
                expectedHttpState: testElement.querySelector('.http-state-section span')?.textContent.trim() || ''
            };

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
