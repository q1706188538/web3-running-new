document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('web3ConfigForm');
    const loadConfigBtn = document.getElementById('loadConfigBtn');
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    const messageArea = document.getElementById('messageArea');

    const configKeys = {
        GAME: ['START_COST', 'RESTART_COST', 'DEBUG_MODE', 'USE_API', 'API_BASE_URL'],
        NETWORK: ['ID', 'NAME', 'RPC_URL', 'EXPLORER_URL'],
        BRIDGE_CONTRACT: ['ADDRESS', 'OWNER_ADDRESS', 'GAME_SERVER_ADDRESS', 'TAX_WALLET_ADDRESS'],
        TOKEN: ['NAME', 'SYMBOL', 'DECIMALS', 'ADDRESS'],
        EXCHANGE: ['RATE', 'INVERSE_MODE', 'MIN_AMOUNT', 'MAX_AMOUNT', 'TAX_RATE'],
        RECHARGE: ['RATE', 'INVERSE_MODE', 'MIN_AMOUNT', 'MAX_AMOUNT', 'TAX_RATE']
    };

    // Helper function to display messages
    function showMessage(message, type = 'success') {
        messageArea.textContent = message;
        messageArea.className = type; // 'success' or 'error'
        setTimeout(() => {
            messageArea.textContent = '';
            messageArea.className = '';
        }, 5000);
    }

    // Function to populate form with config data
    function populateForm(config) {
        if (!config || typeof config !== 'object') {
            console.warn('PopulateForm: Invalid or empty config received', config);
            return;
        }
        for (const sectionKey in configKeys) {
            if (config[sectionKey]) {
                configKeys[sectionKey].forEach(key => {
                    const inputName = `${sectionKey}.${key}`;
                    const element = form.elements[inputName];
                    if (element) {
                        if (element.type === 'checkbox') {
                            element.checked = !!config[sectionKey][key];
                        } else {
                            element.value = config[sectionKey][key] !== undefined ? config[sectionKey][key] : '';
                        }
                    } else {
                        console.warn(`Element not found for ${inputName}`);
                    }
                });
            }
        }
    }

    // Function to collect data from form
    function getFormData() {
        const formData = {};
        for (const sectionKey in configKeys) {
            formData[sectionKey] = {};
            configKeys[sectionKey].forEach(key => {
                const inputName = `${sectionKey}.${key}`;
                const element = form.elements[inputName];
                if (element) {
                    if (element.type === 'checkbox') {
                        formData[sectionKey][key] = element.checked;
                    } else if (element.type === 'number') {
                        // Convert to number, but allow empty strings for optional fields
                        const value = parseFloat(element.value);
                        formData[sectionKey][key] = isNaN(value) && element.value.trim() === '' ? null : (isNaN(value) ? element.value : value) ;
                         if (formData[sectionKey][key] === null && element.value.trim() !== '') { // if it was not a number but not empty, keep as string
                            formData[sectionKey][key] = element.value;
                        }
                    }
                    else {
                        formData[sectionKey][key] = element.value;
                    }
                }
            });
        }
        return formData;
    }

    // Load current config from server
    async function loadConfig() {
        try {
            const response = await fetch('/api/web3-config');
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
            }
            const config = await response.json();
            if (Object.keys(config).length === 0) {
                showMessage('No existing configuration found on server. Displaying defaults (if any in HTML). You can save a new one.', 'success');
                 // Optionally, load defaults from a JS object if HTML has no values
            } else {
                populateForm(config);
                showMessage('Configuration loaded successfully.', 'success');
            }
            console.log('Loaded config:', config);
        } catch (error) {
            console.error('Error loading config:', error);
            showMessage(`Error loading config: ${error.message}`, 'error');
        }
    }

    // Save config to server
    async function saveConfig(event) {
        event.preventDefault(); // Prevent default form submission
        const configData = getFormData();
        console.log('Saving config:', JSON.stringify(configData, null, 2));

        try {
            const response = await fetch('/api/admin/web3-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(configData),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || `Failed to save config: ${response.status}`);
            }
            showMessage('Configuration saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving config:', error);
            showMessage(`Error saving config: ${error.message}`, 'error');
        }
    }

    // Event Listeners
    loadConfigBtn.addEventListener('click', loadConfig);
    form.addEventListener('submit', saveConfig);

    // Initial load of config when page loads
    loadConfig();
});