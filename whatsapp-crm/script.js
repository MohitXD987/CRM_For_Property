// WhatsApp CRM JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const messageTypeSelect = document.getElementById('messageType');
    const textMessageForm = document.getElementById('textMessageForm');
    const templateMessageForm = document.getElementById('templateMessageForm');
    const templateNameSelect = document.getElementById('templateName');
    const templateVariables = document.getElementById('templateVariables');
    const variablesInputs = document.getElementById('variablesInputs');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const activityLog = document.getElementById('activityLog');
    const clearLogBtn = document.getElementById('clearLogBtn');
    const templatesList = document.getElementById('templatesList');
    
    // Metrics elements
    const messagesSentEl = document.getElementById('messagesSent');
    const messagesDeliveredEl = document.getElementById('messagesDelivered');
    const messagesFailedEl = document.getElementById('messagesFailed');
    
    // Counters
    let messagesSent = 0;
    let messagesDelivered = 0;
    let messagesFailed = 0;
    
    // WhatsApp Cloud API Configuration - UPDATE THESE WITH YOUR ACTUAL VALUES
    const WHATSAPP_TOKEN = 'EAAMl282UAZCgBQkB8nvuSFf3GTemEJVEla0No5qiQmyEzdGGhR5ZB3HYhrXgeE1rZBBZB2nabsmEXiZBMxLV2H6w2A66NAfLCW3bjSaokIxmZBqwQ3SlVZCD0RnJ3tHa1fS356EuhiQIJ6XjQh01EzgR8H4ZCFquRINOxYU2Q2FTf1TcM4QN8ofoe6Niv0UEYLwoiwZDZD';
    const PHONE_NUMBER_ID = '1002392779614958';
    const WABA_ID = '1463396578516155';
    const API_VERSION = 'v19.0';
    const WHATSAPP_API_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
    
    let availableTemplates = [];
    
    // Load templates from WhatsApp API
    async function loadTemplates() {
        templatesList.innerHTML = '<div class="loading-templates">Loading templates...</div>';
        
        try {
            const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates`, {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_TOKEN}`
                }
            });
            
            const result = await response.json();
            console.log('Templates API response:', result);
            
            if (response.ok && result.data) {
                availableTemplates = result.data.filter(t => t.status === 'APPROVED');
                console.log('Approved templates:', availableTemplates);
                populateTemplateDropdown();
                displayTemplatesInSidebar();
                addLogEntry('success', `Loaded ${availableTemplates.length} templates`);
            } else {
                throw new Error(result.error?.message || `API Error: ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading templates:', error);
            templatesList.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            addLogEntry('error', `Failed to load templates: ${error.message}`);
        }
    }
    
    // Populate template dropdown
    function populateTemplateDropdown() {
        templateNameSelect.innerHTML = '<option value="">Select Template</option>';
        availableTemplates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.name;
            option.textContent = template.name;
            templateNameSelect.appendChild(option);
        });
    }
    
    // Display templates in sidebar
    function displayTemplatesInSidebar() {
        if (availableTemplates.length === 0) {
            templatesList.innerHTML = '<div class="no-templates">No approved templates found</div>';
            return;
        }
        
        templatesList.innerHTML = availableTemplates.map(template => {
            const variableCount = getVariableCount(template);
            const bodyText = template.components && template.components[0] && template.components[0].text 
                ? template.components[0].text.substring(0, 50) + '...' 
                : 'No body text';
            return `
                <div class="template-item" onclick="selectTemplate('${template.name}')">
                    <h4>${template.name}</h4>
                    <p>${bodyText}</p>
                    <span class="template-variables">${variableCount} variables</span>
                </div>
            `;
        }).join('');
    }
    
    // Get variable count from template
    function getVariableCount(template) {
        if (!template.components || !template.components[0]) {
            return 0;
        }
        
        let totalVariables = 0;
        template.components.forEach(component => {
            if (component.text) {
                const matches = component.text.match(/\{\{\d+\}\}/g);
                if (matches) {
                    totalVariables += matches.length;
                }
            }
        });
        
        return totalVariables;
    }
    
    // Select template from sidebar
    function selectTemplate(templateName) {
        messageTypeSelect.value = 'template';
        textMessageForm.style.display = 'none';
        templateMessageForm.style.display = 'block';
        
        templateNameSelect.value = templateName;
        const selectedTemplate = availableTemplates.find(t => t.name === templateName);
        if (selectedTemplate) {
            showTemplateVariables(selectedTemplate);
        }
        
        addLogEntry('success', `Template "${templateName}" selected`);
    }
    
    // Show template variables
    function showTemplateVariables(template) {
        if (!template.components || !template.components[0]) {
            templateVariables.style.display = 'none';
            return;
        }
        
        // Get all variables from all components
        let allVariables = [];
        template.components.forEach(component => {
            if (component.text) {
                const matches = component.text.match(/\{\{\d+\}\}/g);
                if (matches) {
                    allVariables = allVariables.concat(matches);
                }
            }
        });
        
        // Remove duplicates and sort
        const uniqueVariables = [...new Set(allVariables)].sort();
        
        if (uniqueVariables.length > 0) {
            templateVariables.style.display = 'block';
            variablesInputs.innerHTML = uniqueVariables.map((variable, index) => `
                <div class="variable-input">
                    <label>${variable}:</label>
                    <input type="text" id="var${index + 1}" placeholder="Enter value for ${variable}">
                </div>
            `).join('');
        } else {
            templateVariables.style.display = 'none';
        }
    }
    
    // Make selectTemplate global for onclick
    window.selectTemplate = selectTemplate;
    
    // Load templates on page load
    loadTemplates();
    
    // Toggle message type forms
    messageTypeSelect.addEventListener('change', function() {
        if (this.value === 'text') {
            textMessageForm.style.display = 'block';
            templateMessageForm.style.display = 'none';
        } else {
            textMessageForm.style.display = 'none';
            templateMessageForm.style.display = 'block';
        }
    });
    
    // Template selection change
    templateNameSelect.addEventListener('change', function() {
        const selectedTemplate = availableTemplates.find(t => t.name === this.value);
        if (selectedTemplate) {
            showTemplateVariables(selectedTemplate);
        } else {
            templateVariables.style.display = 'none';
        }
    });
    
    // Send message button click
    sendMessageBtn.addEventListener('click', async function() {
        const messageType = messageTypeSelect.value;
        const phoneNumber = document.getElementById('phoneNumber').value.trim();
        
        if (!phoneNumber) {
            addLogEntry('error', 'Phone number is required');
            return;
        }
        
        if (!phoneNumber.startsWith('+')) {
            addLogEntry('error', 'Phone number must start with country code (+)');
            return;
        }
        
        sendMessageBtn.disabled = true;
        sendMessageBtn.textContent = 'Sending...';
        
        try {
            if (messageType === 'text') {
                await sendTextMessage(phoneNumber);
            } else {
                await sendTemplateMessage(phoneNumber);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            addLogEntry('error', `Failed to send message: ${error.message}`);
            messagesFailed++;
            updateMetrics();
        } finally {
            sendMessageBtn.disabled = false;
            sendMessageBtn.textContent = 'Send Message';
        }
    });
    
    // Send text message
    async function sendTextMessage(phoneNumber) {
        const messageText = document.getElementById('messageText').value.trim();
        
        if (!messageText) {
            addLogEntry('error', 'Message text is required');
            return;
        }
        
        const payload = {
            messaging_product: "whatsapp",
            to: phoneNumber.replace('+', ''),
            type: "text",
            text: {
                body: messageText
            }
        };
        
        const response = await fetch(WHATSAPP_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (response.ok && result.messages) {
            addLogEntry('success', `Text message sent to ${phoneNumber}: "${messageText}"`);
            messagesSent++;
            messagesDelivered++;
            document.getElementById('messageText').value = '';
        } else {
            throw new Error(result.error?.message || 'Failed to send message');
        }
        
        updateMetrics();
    }
    
    // Send template message
    async function sendTemplateMessage(phoneNumber) {
        const templateName = templateNameSelect.value;
        const templateLanguage = document.getElementById('templateLanguage').value;
        
        if (!templateName) {
            addLogEntry('error', 'Template name is required');
            return;
        }
        
        const parameters = [];
        const variableInputs = document.querySelectorAll('#variablesInputs input');
        variableInputs.forEach(input => {
            if (input.value.trim()) {
                parameters.push(input.value.trim());
            }
        });
        
        const payload = {
            messaging_product: "whatsapp",
            to: phoneNumber.replace('+', ''),
            type: "template",
            template: {
                name: templateName,
                language: {
                    code: templateLanguage
                }
            }
        };
        
        if (parameters.length > 0) {
            payload.template.components = [{
                type: "body",
                parameters: parameters.map(param => ({
                    type: "text",
                    text: param
                }))
            }];
        }
        
        const response = await fetch(WHATSAPP_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (response.ok && result.messages) {
            const paramText = parameters.length > 0 ? ` with parameters: ${parameters.join(', ')}` : '';
            addLogEntry('success', `Template "${templateName}" sent to ${phoneNumber}${paramText}`);
            messagesSent++;
            messagesDelivered++;
            
            variableInputs.forEach(input => input.value = '');
        } else {
            throw new Error(result.error?.message || 'Failed to send template');
        }
        
        updateMetrics();
    }
    
    // Add log entry
    function addLogEntry(type, message) {
        const logItem = document.createElement('div');
        logItem.className = `log-item ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logItem.innerHTML = `
            <div class="log-time">${timestamp}</div>
            <div class="log-message">${message}</div>
        `;
        
        const emptyMessage = activityLog.querySelector('.log-empty');
        if (emptyMessage) {
            emptyMessage.remove();
        }
        
        activityLog.insertBefore(logItem, activityLog.firstChild);
        
        const logItems = activityLog.querySelectorAll('.log-item');
        if (logItems.length > 50) {
            logItems[logItems.length - 1].remove();
        }
    }
    
    // Update metrics display
    function updateMetrics() {
        messagesSentEl.textContent = messagesSent;
        messagesDeliveredEl.textContent = messagesDelivered;
        messagesFailedEl.textContent = messagesFailed;
    }
    
    // Clear log
    clearLogBtn.addEventListener('click', function() {
        activityLog.innerHTML = '<p class="log-empty">No activity yet. Send your first message!</p>';
    });
    
    // Test WhatsApp API connection
    async function testWhatsAppConnection() {
        try {
            const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`, {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_TOKEN}`
                }
            });
            
            if (response.ok) {
                addLogEntry('success', 'WhatsApp Cloud API connected successfully');
            } else {
                addLogEntry('error', 'WhatsApp API connection failed - check your token and Phone Number ID');
            }
        } catch (error) {
            addLogEntry('error', 'Cannot connect to WhatsApp Cloud API - check your internet connection');
        }
    }
    
    testWhatsAppConnection();
    
    // Phone number formatting
    document.getElementById('phoneNumber').addEventListener('input', function(e) {
        let value = e.target.value;
        value = value.replace(/[^\d+]/g, '');
        if (value && !value.startsWith('+')) {
            value = '+' + value;
        }
        e.target.value = value;
    });
});