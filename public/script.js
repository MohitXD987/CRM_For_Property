document.addEventListener('DOMContentLoaded', function () {
    // --- UI Context & Modern Features ---
    const themeToggle = document.getElementById('themeToggle');
    const toastContainer = document.getElementById('toastContainer');

    // Theme Management
    const currentTheme = localStorage.getItem('crm_theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    themeToggle.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('crm_theme', theme);
        showToast(`Switched to ${theme} mode`, 'success');
    });

    // Premium Toast System
    window.showToast = function (message, type = 'primary') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    };

    // Lead Export Feature
    window.exportLeadsCSV = function () {
        if (state.leads.length === 0) return showToast('No leads to export', 'error');

        const headers = ['Name', 'Phone', 'Status', 'Last Contact'];
        const csvContent = [
            headers.join(','),
            ...state.leads.map(l => `${l.name},${l.phone},${l.status},${l.lastContact}`)
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        showToast('Leads exported successfully', 'success');
    };

    // --- State Management ---
    let state = {
        metrics: JSON.parse(localStorage.getItem('crm_metrics')) || { sent: 0, delivered: 0, failed: 0 },
        leads: JSON.parse(localStorage.getItem('crm_leads')) || [
            { id: 1, name: 'John Doe', phone: '+1234567890', status: 'Warm', lastContact: '2024-01-20' },
            { id: 2, name: 'Jane Smith', phone: '+9876543210', status: 'New', lastContact: '-' }
        ],
        logs: JSON.parse(localStorage.getItem('crm_logs')) || [],
        templates: [],
        activeTab: 'dashboard'
    };

    // --- Configuration ---
    const CONFIG = {
        WHATSAPP_TOKEN: 'EAAMl282UAZCgBQkB8nvuSFf3GTemEJVEla0No5qiQmyEzdGGhR5ZB3HYhrXgeE1rZBBZB2nabsmEXiZBMxLV2H6w2A66NAfLCW3bjSaokIxmZBqwQ3SlVZCD0RnJ3tHa1fS356EuhiQIJ6XjQh01EzgR8H4ZCFquRINOxYU2Q2FTf1TcM4QN8ofoe6Niv0UEYLwoiwZDZD',
        PHONE_NUMBER_ID: '1002392779614958',
        WABA_ID: '1463396578516155',
        API_VERSION: 'v19.0'
    };
    const API_URL = `https://graph.facebook.com/${CONFIG.API_VERSION}/${CONFIG.PHONE_NUMBER_ID}/messages`;

    // --- DOM Elements ---
    const elements = {
        navItems: document.querySelectorAll('.nav-item'),
        tabs: document.querySelectorAll('.tab-content'),
        pageTitle: document.getElementById('pageTitle'),
        connectionStatus: document.getElementById('connectionStatus'),

        // Metrics
        sentVal: document.getElementById('messagesSent'),
        deliveredVal: document.getElementById('messagesDelivered'),
        totalLeadsVal: document.getElementById('totalLeads'),

        // Forms
        phoneNumber: document.getElementById('phoneNumber'),
        messageType: document.getElementById('messageType'),
        textForm: document.getElementById('textMessageForm'),
        templateForm: document.getElementById('templateMessageForm'),
        messageText: document.getElementById('messageText'),
        templateName: document.getElementById('templateName'),
        templateVars: document.getElementById('templateVariables'),
        varInputs: document.getElementById('variablesInputs'),
        sendBtn: document.getElementById('sendMessageBtn'),

        // Logs
        activityLog: document.getElementById('activityLog'),
        clearLogBtn: document.getElementById('clearLogBtn'),

        // Leads
        leadsTable: document.getElementById('leadsTableBody'),
        addLeadBtn: document.getElementById('addLeadBtn'),
        leadModal: document.getElementById('leadModal'),
        saveLeadBtn: document.getElementById('saveLeadBtn'),
        closeModal: document.getElementById('closeModal'),
        leadSearch: document.getElementById('leadSearch'),
        statusFilter: document.getElementById('statusFilter')
    };

    // --- Core Functions ---

    function saveState() {
        localStorage.setItem('crm_metrics', JSON.stringify(state.metrics));
        localStorage.setItem('crm_leads', JSON.stringify(state.leads));
        localStorage.setItem('crm_logs', JSON.stringify(state.logs));
        updateUI();
    }

    function updateUI() {
        if (elements.sentVal) elements.sentVal.textContent = state.metrics.sent;
        if (elements.deliveredVal) elements.deliveredVal.textContent = state.metrics.delivered;
        if (elements.totalLeadsVal) elements.totalLeadsVal.textContent = state.leads.length;

        renderLeads();
        renderLogs();
    }

    // Tab Switching
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            if (!tabId) return;

            elements.navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            elements.tabs.forEach(tab => {
                tab.classList.toggle('active', tab.id === `${tabId}Section`);
            });

            state.activeTab = tabId;
            const titles = { dashboard: 'Dashboard Overview', leads: 'Lead Management', inbox: 'Conversations', broadcast: 'Bulk Broadcast' };
            elements.pageTitle.textContent = titles[tabId] || 'CRM Workspace';
        });
    });

    // --- Messaging Logic ---

    elements.messageType.addEventListener('change', (e) => {
        const isText = e.target.value === 'text';
        elements.textForm.style.display = isText ? 'block' : 'none';
        elements.templateForm.style.display = isText ? 'none' : 'block';
    });

    async function fetchTemplates() {
        try {
            const res = await fetch(`https://graph.facebook.com/${CONFIG.API_VERSION}/${CONFIG.WABA_ID}/message_templates`, {
                headers: { 'Authorization': `Bearer ${CONFIG.WHATSAPP_TOKEN}` }
            });
            const data = await res.json();
            if (data.data) {
                // Filter for Approved and English versions only
                state.templates = data.data.filter(t =>
                    t.status === 'APPROVED' &&
                    (t.language === 'en' || t.language === 'en_US')
                );
                const tplOptions = '<option value="">Select Template</option>' +
                    state.templates.map(t => `<option value="${t.name}">${t.name}</option>`).join('');

                elements.templateName.innerHTML = tplOptions;
                const broadcastTpl = document.getElementById('broadcastTemplateName');
                if (broadcastTpl) broadcastTpl.innerHTML = tplOptions;

                elements.connectionStatus.textContent = 'API Connected';
                elements.connectionStatus.className = 'status-indicator online';
            }
        } catch (e) {
            console.error('Template Load Failed', e);
            elements.connectionStatus.textContent = 'API Error';
        }
    }

    elements.templateName.addEventListener('change', (e) => {
        const template = state.templates.find(t => t.name === e.target.value);
        if (!template) {
            elements.templateVars.style.display = 'none';
            updatePreview();
            return;
        }

        // Simple variable detection
        let vars = [];
        template.components.forEach(c => {
            if (c.text) {
                const matches = c.text.match(/\{\{\d+\}\}/g);
                if (matches) vars = [...vars, ...matches];
            }
        });

        if (vars.length > 0) {
            elements.templateVars.style.display = 'block';
            elements.varInputs.innerHTML = vars.map((v, i) => `
                <div class="form-group">
                    <label>${v}</label>
                    <input type="text" class="tpl-var" data-index="${i + 1}" placeholder="Value for ${v}" oninput="window.updatePreview()">
                </div>
            `).join('');
        } else {
            elements.templateVars.style.display = 'none';
        }
        updatePreview();
    });

    // --- Preview Logic ---
    const previewText = document.getElementById('previewText');

    window.updatePreview = function () {
        const type = elements.messageType.value;
        if (type === 'text') {
            const val = elements.messageText.value;
            previewText.textContent = val || 'Type a message to see preview...';
            previewText.style.color = val ? '#111b21' : '#667781';
        } else {
            const tplName = elements.templateName.value;
            const template = state.templates.find(t => t.name === tplName);
            if (!template) {
                previewText.textContent = 'Select a template to see preview...';
                previewText.style.color = '#667781';
                return;
            }

            let body = '';
            template.components.forEach(c => {
                if (c.type === 'BODY') body = c.text;
                if (c.type === 'HEADER' && c.format === 'TEXT') body = `*${c.text}*\n\n` + body;
                if (c.type === 'FOOTER') body = body + `\n\n_ ${c.text} _`;
            });

            // Replace variables
            const varInputs = document.querySelectorAll('.tpl-var');
            varInputs.forEach((input, i) => {
                const val = input.value || `{{${i + 1}}}`;
                body = body.replace(`{{${i + 1}}}`, `*${val}*`);
            });

            previewText.innerHTML = body.replace(/\n/g, '<br>');
            previewText.style.color = '#111b21';
        }
    };

    elements.messageText.addEventListener('input', updatePreview);
    elements.messageType.addEventListener('change', updatePreview);

    elements.sendBtn.addEventListener('click', async () => {
        const phone = elements.phoneNumber.value.trim().replace('+', '');
        if (!phone) return addLog('error', 'Phone number required');

        elements.sendBtn.disabled = true;
        elements.sendBtn.textContent = 'Sending...';

        try {
            await sendWhatsAppMessage(phone);
            addLog('success', `Message sent to ${phone}`);
        } catch (e) {
            state.metrics.failed++;
            addLog('error', `Failed: ${e.message}`);
        } finally {
            elements.sendBtn.disabled = false;
            elements.sendBtn.textContent = 'Send WhatsApp Message';
            saveState();
        }
    });

    // --- Lead Management ---

    function renderLeads() {
        const query = elements.leadSearch.value.toLowerCase();
        const filter = elements.statusFilter.value;

        const filteredLeads = state.leads.filter(l => {
            const matchesSearch = l.name.toLowerCase().includes(query) || l.phone.includes(query);
            const matchesFilter = filter === 'all' || l.status === filter;
            return matchesSearch && matchesFilter;
        });

        elements.leadsTable.innerHTML = filteredLeads.map(l => `
            <tr>
                <td><strong>${l.name}</strong></td>
                <td>${l.phone}</td>
                <td><span class="badge ${l.status.toLowerCase()}">${l.status}</span></td>
                <td>${l.lastContact}</td>
                <td>
                    <button class="text-btn" onclick="window.quickMsg('${l.phone}')">Message</button>
                    <button class="text-btn" style="color:var(--red)" onclick="window.deleteLead(${l.id})">Delete</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center">No leads found</td></tr>';
    }

    window.quickMsg = (phone) => {
        elements.phoneNumber.value = phone;
        elements.navItems[0].click(); // Go to dashboard
    };

    window.deleteLead = (id) => {
        if (confirm('Delete this lead?')) {
            state.leads = state.leads.filter(l => l.id !== id);
            saveState();
        }
    };

    function updateLeadLastContact(phone) {
        const lead = state.leads.find(l => l.phone.replace(/[^\d]/g, '') === phone.replace(/[^\d]/g, ''));
        if (lead) {
            lead.lastContact = new Date().toISOString().split('T')[0];
            if (lead.status === 'New') lead.status = 'Contacted';
            saveState();
        }
    }

    elements.addLeadBtn.addEventListener('click', () => elements.leadModal.classList.add('active'));
    elements.closeModal.addEventListener('click', () => elements.leadModal.classList.remove('active'));

    elements.saveLeadBtn.addEventListener('click', () => {
        const name = document.getElementById('newLeadName').value;
        const phone = document.getElementById('newLeadPhone').value;
        const status = document.getElementById('newLeadStatus').value;

        if (!name || !phone) return alert('Name and phone are required');

        state.leads.push({
            id: Date.now(),
            name, phone, status,
            lastContact: '-'
        });

        elements.leadModal.classList.remove('active');
        saveState();

        // Clear form
        document.getElementById('newLeadName').value = '';
        document.getElementById('newLeadPhone').value = '';
    });

    elements.leadSearch.addEventListener('input', renderLeads);
    elements.statusFilter.addEventListener('change', renderLeads);

    // --- Logs Logic ---

    function addLog(type, message) {
        state.logs.unshift({
            time: new Date().toLocaleTimeString(),
            type,
            message
        });
        if (state.logs.length > 20) state.logs.pop();
        saveState();
    }

    function renderLogs() {
        if (state.logs.length === 0) {
            elements.activityLog.innerHTML = '<p class="log-empty">Waiting for activity...</p>';
            return;
        }
        elements.activityLog.innerHTML = state.logs.map(log => `
            <div class="log-item ${log.type}">
                <div class="log-time">${log.time}</div>
                <div class="log-message">${log.message}</div>
            </div>
        `).join('');
    }

    elements.clearLogBtn.addEventListener('click', () => {
        state.logs = [];
        saveState();
    });

    // --- Campaigns Logic ---

    const campaignElements = {
        startBtn: document.getElementById('startCampaignBtn'),
        filter: document.getElementById('campaignFilter'),
        progress: document.getElementById('campaignProgress'),
        progressBar: document.getElementById('campaignProgressBar'),
        statusText: document.getElementById('campaignStatusText')
    };

    campaignElements.startBtn.addEventListener('click', async () => {
        const targetGroup = campaignElements.filter.value;
        const targetLeads = state.leads.filter(l => targetGroup === 'all' || l.status === targetGroup);

        if (targetLeads.length === 0) return alert('No leads found in this group');

        if (!confirm(`Start campaign for ${targetLeads.length} leads? This will send the current message configuration to all selected leads.`)) return;

        campaignElements.progress.style.display = 'block';
        campaignElements.startBtn.disabled = true;

        let sentCount = 0;
        for (const lead of targetLeads) {
            try {
                // Reuse the same logic as single send but for bulk
                // Note: In real world, you'd add delays to prevent rate limiting
                const phone = lead.phone.replace('+', '');
                await sendWhatsAppMessage(phone);
                sentCount++;
                const percent = Math.round((sentCount / targetLeads.length) * 100);
                campaignElements.progressBar.style.width = `${percent}%`;
                campaignElements.statusText.textContent = `Sent ${sentCount} of ${targetLeads.length} messages`;
            } catch (e) {
                addLog('error', `Campaign failed for ${lead.name}: ${e.message}`);
            }
        }

        addLog('success', `Campaign completed: ${sentCount} messages sent`);
        campaignElements.startBtn.disabled = false;
        campaignElements.startBtn.textContent = 'Campaign Finished';
        setTimeout(() => {
            campaignElements.startBtn.textContent = 'Prepare Campaign';
            campaignElements.progress.style.display = 'none';
        }, 5000);
    });

    // --- Inbox Logic (WhatsApp Preview) ---
    let inboxState = {
        activeChat: null,
        chats: JSON.parse(localStorage.getItem('crm_chats')) || {} // { phone: { messages: [], name: '' } }
    };

    function saveInbox() {
        localStorage.setItem('crm_chats', JSON.stringify(inboxState.chats));
        renderInboxList();
    }

    function addMessageToInbox(phone, type, text, name = 'Customer') {
        const cleanPhone = phone.replace(/[^\d]/g, '');
        if (!inboxState.chats[cleanPhone]) {
            inboxState.chats[cleanPhone] = { name: name || cleanPhone, messages: [] };
        }
        inboxState.chats[cleanPhone].messages.push({
            type, text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        saveInbox();
        if (inboxState.activeChat === cleanPhone) renderActiveChat();
    }

    function renderInboxList() {
        const container = document.getElementById('chatsContainer');
        const query = document.getElementById('chatSearch').value.toLowerCase();

        const chatArray = Object.keys(inboxState.chats).map(phone => ({
            phone, ...inboxState.chats[phone]
        })).filter(c => c.phone.includes(query) || c.name.toLowerCase().includes(query));

        if (chatArray.length === 0) {
            container.innerHTML = '<div style="padding:40px 20px; text-align:center; color:#667781;">No active chats</div>';
            return;
        }

        container.innerHTML = chatArray.sort((a, b) => b.messages.length - a.messages.length).map(chat => `
            <div class="chat-item ${inboxState.activeChat === chat.phone ? 'active' : ''}" 
                 onclick="window.selectChat('${chat.phone}')"
                 style="padding: 12px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; border-bottom: 1px solid #f0f2f5; ${inboxState.activeChat === chat.phone ? 'background:#f0f2f5' : ''}">
                <div style="width: 44px; height: 44px; background: #25d366; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">${chat.name[0]}</div>
                <div style="flex: 1; overflow: hidden;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; color: #111b21;">${chat.name}</span>
                        <span style="font-size: 11px; color: #667781;">${chat.messages[chat.messages.length - 1]?.time || ''}</span>
                    </div>
                    <p style="font-size: 13px; color: #667781; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0;">${chat.messages[chat.messages.length - 1]?.text || 'No messages'}</p>
                </div>
            </div>
        `).join('');
    }

    window.selectChat = (phone) => {
        inboxState.activeChat = phone;
        document.getElementById('noChatSelected').style.display = 'none';
        document.getElementById('activeChat').style.display = 'flex';
        renderInboxList();
        renderActiveChat();
    };

    function renderActiveChat() {
        const chat = inboxState.chats[inboxState.activeChat];
        if (!chat) return;

        document.getElementById('chatName').textContent = chat.name;
        document.getElementById('chatAvatar').textContent = chat.name[0];

        const msgContainer = document.getElementById('chatMessages');
        msgContainer.innerHTML = chat.messages.map(m => `
            <div style="align-self: ${m.type === 'out' ? 'flex-end' : 'flex-start'}; 
                        background: ${m.type === 'out' ? '#d9fdd3' : '#fff'}; 
                        padding: 8px 12px; border-radius: 8px; max-width: 80%; 
                        box-shadow: 0 1px 0.5px rgba(0,0,0,0.13); position: relative;">
                <div style="font-size: 14.2px; color: #111b21; margin-bottom: 4px; white-space: pre-wrap;">${m.text}</div>
                <div style="font-size: 11px; color: #667781; text-align: right;">${m.time} ${m.type === 'out' ? '✓✓' : ''}</div>
            </div>
        `).join('');
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }

    document.getElementById('inboxReplyBtn').addEventListener('click', async () => {
        const input = document.getElementById('inboxReplyInput');
        const text = input.value.trim();
        if (!text || !inboxState.activeChat) return;

        try {
            const payload = {
                messaging_product: "whatsapp",
                to: inboxState.activeChat,
                type: "text",
                text: { body: text }
            };
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${CONFIG.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                addMessageToInbox(inboxState.activeChat, 'out', text);
                input.value = '';
                addLog('success', `Reply sent to ${inboxState.activeChat}`);
            } else {
                throw new Error('API Send Failed');
            }
        } catch (e) {
            addLog('error', `Failed to reply: ${e.message}`);
        }
    });

    document.getElementById('chatSearch').addEventListener('input', renderInboxList);

    // --- Broadcast Logic (Multi-number) ---
    const bcl = {
        numbers: document.getElementById('broadcastNumbers'),
        type: document.getElementById('broadcastMessageType'),
        tplGroup: document.getElementById('broadcastTplGroup'),
        tplName: document.getElementById('broadcastTemplateName'),
        textGroup: document.getElementById('broadcastTextGroup'),
        msgText: document.getElementById('broadcastMessageText'),
        tplVars: document.getElementById('broadcastTplVars'),
        varsInputs: document.getElementById('broadcastVarsInputs'),
        startBtn: document.getElementById('startBroadcastBtn'),
        progress: document.getElementById('broadcastProgress'),
        pBar: document.getElementById('broadcastProgressBar'),
        pText: document.getElementById('broadcastStatusText')
    };

    bcl.type.addEventListener('change', (e) => {
        const isText = e.target.value === 'text';
        bcl.textGroup.style.display = isText ? 'block' : 'none';
        bcl.tplGroup.style.display = isText ? 'none' : 'block';
        updateBroadcastPreview();
    });

    bcl.tplName.addEventListener('change', (e) => {
        const template = state.templates.find(t => t.name === e.target.value);
        if (!template) { bcl.tplVars.style.display = 'none'; updateBroadcastPreview(); return; }

        let vars = [];
        template.components.forEach(c => {
            if (c.text) {
                const matches = c.text.match(/\{\{\d+\}\}/g);
                if (matches) vars = [...vars, ...matches];
            }
        });

        if (vars.length > 0) {
            bcl.tplVars.style.display = 'block';
            bcl.varsInputs.innerHTML = vars.map((v, i) => `
                <div class="form-group">
                    <label>${v}</label>
                    <input type="text" class="bc-tpl-var" data-index="${i + 1}" placeholder="Value for ${v}" oninput="window.updateBroadcastPreview()">
                </div>
            `).join('');
        } else {
            bcl.tplVars.style.display = 'none';
        }
        updateBroadcastPreview();
    });

    // --- Broadcast Preview Logic ---
    const bcPreviewText = document.getElementById('broadcastPreviewText');
    window.updateBroadcastPreview = function () {
        const type = bcl.type.value;
        if (type === 'text') {
            const val = bcl.msgText.value;
            bcPreviewText.textContent = val || 'Type a message to see preview...';
            bcPreviewText.style.color = val ? '#111b21' : '#667781';
        } else {
            const tplName = bcl.tplName.value;
            const template = state.templates.find(t => t.name === tplName);
            if (!template) {
                bcPreviewText.textContent = 'Select a template to see preview...';
                bcPreviewText.style.color = '#667781';
                return;
            }

            let body = '';
            template.components.forEach(c => {
                if (c.type === 'BODY') body = c.text;
                if (c.type === 'HEADER' && c.format === 'TEXT') body = `*${c.text}*\n\n` + body;
                if (c.type === 'FOOTER') body = body + `\n\n_ ${c.text} _`;
            });

            const varInputs = document.querySelectorAll('.bc-tpl-var');
            varInputs.forEach((input, i) => {
                const val = input.value || `{{${i + 1}}}`;
                body = body.replace(`{{${i + 1}}}`, `*${val}*`);
            });

            bcPreviewText.innerHTML = body.replace(/\n/g, '<br>');
            bcPreviewText.style.color = '#111b21';
        }
    };

    bcl.msgText.addEventListener('input', updateBroadcastPreview);

    bcl.startBtn.addEventListener('click', async () => {
        const raw = bcl.numbers.value.trim();
        if (!raw) return alert('Enter phone numbers');

        // Improved parsing for numbers: handles spaces, plus signs, dashes
        const nums = raw.split(/[\n,]/)
            .map(n => n.trim().replace(/[^\d]/g, ''))
            .filter(n => n.length > 5);

        if (nums.length === 0) return alert('Enter valid phone numbers (e.g. 1234567890)');
        if (!confirm(`Start broadcast to ${nums.length} numbers?`)) return;

        // Reset and show progress
        bcl.progress.style.display = 'block';
        bcl.pBar.style.width = '0%';
        bcl.pText.textContent = `Preparing broadcast for ${nums.length} recipients...`;
        bcl.startBtn.disabled = true;
        bcl.startBtn.textContent = 'Broadcasting...';

        let sent = 0;
        let failed = 0;

        for (const num of nums) {
            try {
                let payload = {
                    messaging_product: "whatsapp",
                    to: num,
                    type: bcl.type.value
                };

                if (payload.type === 'text') {
                    payload.text = { body: bcl.msgText.value };
                    if (!payload.text.body) throw new Error('Message text is empty');
                } else {
                    const tplName = bcl.tplName.value;
                    const template = state.templates.find(t => t.name === tplName);
                    if (!template) throw new Error('Select a valid template');

                    // Use the template's actual language code
                    payload.template = {
                        name: tplName,
                        language: { code: template.language || 'en_US' }
                    };

                    const vars = Array.from(document.querySelectorAll('.bc-tpl-var')).map(i => ({
                        type: "text",
                        text: i.value || ' ' // Placeholder if empty
                    }));
                    if (vars.length) {
                        payload.template.components = [{ type: "body", parameters: vars }];
                    }
                }

                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${CONFIG.WHATSAPP_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const result = await res.json();

                if (res.ok) {
                    sent++;
                    const msgContent = payload.type === 'text' ? payload.text.body : `Template: ${payload.template.name}`;
                    addMessageToInbox(num, 'out', msgContent, 'Broadcast Recipient');

                    state.metrics.sent++;
                    state.metrics.delivered++;
                } else {
                    throw new Error(result.error?.message || 'API Error');
                }
            } catch (e) {
                failed++;
                addLog('error', `Broadcast failed for ${num}: ${e.message}`);
            }

            // Update UI after each attempt (success or failure)
            const attempted = sent + failed;
            const pct = Math.round((attempted / nums.length) * 100);
            bcl.pBar.style.width = `${pct}%`;
            bcl.pText.textContent = `Sent ${sent} successfully, ${failed} failed (Total: ${nums.length})`;

            // Small delay to avoid aggressive rate limiting
            await new Promise(r => setTimeout(r, 100));
        }

        addLog('success', `Broadcast finished: ${sent} sent, ${failed} failed`);
        bcl.startBtn.disabled = false;
        bcl.startBtn.textContent = 'Start Direct Broadcast';
        saveState();
        updateUI();

        setTimeout(() => {
            if (sent === nums.length) {
                bcl.progress.style.display = 'none';
            }
        }, 8000);
    });

    // Helper to send message (refactored)
    async function sendWhatsAppMessage(phone) {
        let payload = {
            messaging_product: "whatsapp",
            to: phone,
            type: elements.messageType.value
        };

        if (payload.type === 'text') {
            payload.text = { body: elements.messageText.value };
        } else {
            const tplName = elements.templateName.value;
            const lang = document.getElementById('templateLanguage').value;
            payload.template = { name: tplName, language: { code: lang } };

            const vars = Array.from(document.querySelectorAll('.tpl-var')).map(i => ({
                type: "text", text: i.value
            }));
            if (vars.length) {
                payload.template.components = [{ type: "body", parameters: vars }];
            }
        }

        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${CONFIG.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const result = await res.json();
            throw new Error(result.error?.message || 'API Error');
        }

        state.metrics.sent++;
        state.metrics.delivered++;
        updateLeadLastContact(phone);

        // Add to Inbox
        const text = payload.type === 'text' ? payload.text.body : `Template: ${payload.template.name}`;
        addMessageToInbox(phone, 'out', text, 'Lead');

        saveState();
        return true;
    }

    // --- Init ---
    fetchTemplates();
    updateUI();
    renderInboxList();
});