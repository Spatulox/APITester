function htmlToJson() {
    let config = {
        basicUrl: document.querySelector('.config-header p strong + span').textContent,
        authentication: {
            type: document.getElementById('authType').textContent,
            apikey: document.querySelector('#apikey p strong + span').textContent,
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
            path: endpointElement.querySelector('.endpoint-header').textContent,
            tests: []
        };

        // Récupérer tous les tests pour cet endpoint
        endpointElement.querySelectorAll('.test-method').forEach(testElement => {
            let test = {
                method: testElement.querySelector('.method-header').textContent,
                input: JSON.parse(testElement.querySelector('.input-section pre').textContent || '{}'),
                expectedOutput: JSON.parse(testElement.querySelector('.output-section pre').textContent || '{}'),
                expectedHttpState: testElement.querySelector('.http-state-section span').textContent
            };

            endpoint.tests.push(test);
        });

        config.endpoints.push(endpoint);
    });

    return config;
}