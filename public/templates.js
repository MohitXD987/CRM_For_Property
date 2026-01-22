// Simple Templates Display JavaScript
document.addEventListener('DOMContentLoaded', async function () {
    // Load configuration
    await config.load();
    const WHATSAPP_TOKEN = config.getToken();
    const WABA_ID = config.getWabaId();
    const API_VERSION = config.getApiVersion();

    // DOM Elements
    const templatesGrid = document.getElementById('templatesGrid');
    const refreshBtn = document.getElementById('refreshBtn');
    const tooltip = document.getElementById('tooltip');

    let templates = [];
    let filteredTemplates = [];
    let sortBy = localStorage.getItem('templateSort') || 'name';
    let searchQuery = '';

    // Load templates on page load
    if (WHATSAPP_TOKEN && WABA_ID) {
        loadTemplates();
    } else {
        templatesGrid.innerHTML = '<div class="error">Configuration missing. Check .env file.</div>';
    }

    // Refresh button
    refreshBtn.addEventListener('click', loadTemplates);

    // Add search and sort controls
    createControlsUI();

    // Load templates from API
    async function loadTemplates() {
        templatesGrid.innerHTML = '<div class="loading">Loading templates...</div>';

        try {
            const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates`, {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_TOKEN}`
                }
            });

            const result = await response.json();

            if (response.ok && result.data) {
                templates = result.data;
                applyFiltersAndSort();
            } else {
                throw new Error(result.error?.message || 'Failed to load templates');
            }
        } catch (error) {
            templatesGrid.innerHTML = `<div class="error">Error loading templates: ${error.message}</div>`;
        }
    }

    // Display templates in grid
    function displayTemplates() {
        if (filteredTemplates.length === 0) {
            templatesGrid.innerHTML = templates.length === 0 
                ? '<div class="loading">No templates found</div>' 
                : '<div class="loading">No templates match your search</div>';
            return;
        }

        updateStats();
        templatesGrid.innerHTML = filteredTemplates.map(template => {
            const variableCount = getVariableCount(template);
            const createdDate = new Date(template.created_time * 1000).toLocaleDateString();
            const bodyText = template.components?.find(c => c.type === 'BODY')?.text || '';

            return `
                <div class="template-card" 
                     onmouseenter="showTooltip(event, '${template.name}')" 
                     onmouseleave="hideTooltip()">
                    <div class="template-name">${template.name}</div>
                    <div class="template-info">
                        <span class="template-category ${template.category.toLowerCase()}">${template.category}</span>
                        <span class="template-status ${template.status.toLowerCase()}">${template.status}</span>
                        <span class="template-language">${template.language}</span>
                        <span class="template-variables">${variableCount} vars</span>
                    </div>
                    <div class="template-actions">
                        <button class="action-btn" onclick="copyTemplate('${template.name}', '${bodyText.replace(/'/g, "\\'")}')">Copy</button>
                        <button class="action-btn delete" onclick="deleteTemplate('${template.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Get variable count
    function getVariableCount(template) {
        let count = 0;
        if (template.components) {
            template.components.forEach(component => {
                if (component.text) {
                    const matches = component.text.match(/\{\{\d+\}\}/g);
                    if (matches) {
                        count += matches.length;
                    }
                }
            });
        }
        return count;
    }

    // Show tooltip on hover
    function showTooltip(event, templateName) {
        const template = templates.find(t => t.name === templateName);
        if (!template) return;

        const bodyText = template.components && template.components.find(c => c.type === 'BODY')?.text || 'No body text';
        const headerText = template.components && template.components.find(c => c.type === 'HEADER')?.text || '';
        const footerText = template.components && template.components.find(c => c.type === 'FOOTER')?.text || '';
        const createdDate = new Date(template.created_time * 1000).toLocaleDateString();

        let tooltipContent = `
            <strong>${template.name}</strong><br>
            <strong>Created:</strong> ${createdDate}<br>
            <strong>Status:</strong> ${template.status}<br>
            <strong>Category:</strong> ${template.category}<br>
        `;

        if (headerText) {
            tooltipContent += `<strong>Header:</strong> ${headerText.substring(0, 50)}${headerText.length > 50 ? '...' : ''}<br>`;
        }

        tooltipContent += `<strong>Body:</strong> ${bodyText.substring(0, 100)}${bodyText.length > 100 ? '...' : ''}`;

        if (footerText) {
            tooltipContent += `<br><strong>Footer:</strong> ${footerText.substring(0, 30)}${footerText.length > 30 ? '...' : ''}`;
        }

        tooltip.innerHTML = tooltipContent;
        tooltip.className = 'tooltip show';

        // Position tooltip
        const rect = event.target.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';

        // Adjust if tooltip goes off screen
        if (tooltip.offsetLeft < 10) {
            tooltip.style.left = '10px';
        }
        if (tooltip.offsetLeft + tooltip.offsetWidth > window.innerWidth - 10) {
            tooltip.style.left = (window.innerWidth - tooltip.offsetWidth - 10) + 'px';
        }
    }

    // Hide tooltip
    function hideTooltip() {
        tooltip.className = 'tooltip';
    }

    // --- Template Creation Logic ---
    const addTplBtn = document.getElementById('addTemplateBtn');
    const tplModal = document.getElementById('templateModal');
    const closeTplModal = document.getElementById('closeTplModal');
    const saveTplBtn = document.getElementById('saveTplBtn');

    if (addTplBtn) {
        addTplBtn.addEventListener('click', () => {
            tplModal.style.display = 'flex';
        });
    }

    if (closeTplModal) {
        closeTplModal.addEventListener('click', () => {
            tplModal.style.display = 'none';
        });
    }

    if (saveTplBtn) {
        saveTplBtn.addEventListener('click', async () => {
            const name = document.getElementById('newTplName').value.trim();
            const category = document.getElementById('newTplCategory').value;
            const language = document.getElementById('newTplLang').value;
            const body = document.getElementById('newTplBody').value.trim();

            if (!name || !body) {
                alert('Please fill in all fields');
                return;
            }

            saveTplBtn.disabled = true;
            saveTplBtn.textContent = 'Submitting...';

            try {
                const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        category: category,
                        language: language,
                        components: [
                            {
                                type: "BODY",
                                text: body
                            }
                        ]
                    })
                });

                const result = await response.json();
                if (response.ok) {
                    alert('Template submitted successfully! It may take a few minutes to be approved.');
                    tplModal.style.display = 'none';
                    loadTemplates(); // Refresh list
                } else {
                    throw new Error(result.error?.message || 'Failed to create template');
                }
            } catch (error) {
                alert('Error: ' + error.message);
            } finally {
                saveTplBtn.disabled = false;
                saveTplBtn.textContent = 'Submit for Approval';
            }
        });
    }

    // Make functions global
    window.showTooltip = showTooltip;
    window.hideTooltip = hideTooltip;
    window.copyTemplate = copyTemplate;
    window.deleteTemplate = deleteTemplate;
    window.filterTemplates = filterTemplates;
    window.setSortBy = setSortBy;
    window.exportTemplates = exportTemplates;

    // Create search and sort UI
    function createControlsUI() {
        const header = document.querySelector('.header');
        const controlsDiv = document.createElement('div');
        controlsDiv.style.cssText = 'display: flex; gap: 12px; margin-top: 20px; padding: 16px; background: #f5f5f5; border-radius: 8px; align-items: center; flex-wrap: wrap;';
        controlsDiv.innerHTML = `
            <input type="text" id="searchInput" placeholder="Search templates..." 
                style="flex: 1; min-width: 200px; padding: 8px 12px; border: 1px solid #d1d7db; border-radius: 6px; font-size: 14px;">
            <select id="sortSelect" style="padding: 8px 12px; border: 1px solid #d1d7db; border-radius: 6px; font-size: 14px;">
                <option value="name">Sort by Name</option>
                <option value="date">Sort by Date</option>
                <option value="status">Sort by Status</option>
            </select>
            <button onclick="exportTemplates()" style="padding: 8px 16px; background: #25d366; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Export</button>
        `;
        header.appendChild(controlsDiv);

        document.getElementById('searchInput').addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            applyFiltersAndSort();
        });

        document.getElementById('sortSelect').addEventListener('change', (e) => {
            sortBy = e.target.value;
            localStorage.setItem('templateSort', sortBy);
            applyFiltersAndSort();
        });

        document.getElementById('sortSelect').value = sortBy;
    }

    // Apply filters and sorting
    function applyFiltersAndSort() {
        filteredTemplates = templates.filter(t => 
            t.name.toLowerCase().includes(searchQuery) || 
            t.category.toLowerCase().includes(searchQuery)
        );

        if (sortBy === 'name') {
            filteredTemplates.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'date') {
            filteredTemplates.sort((a, b) => b.created_time - a.created_time);
        } else if (sortBy === 'status') {
            const statusOrder = { APPROVED: 0, PENDING_REVIEW: 1, REJECTED: 2, DISABLED: 3 };
            filteredTemplates.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));
        }

        displayTemplates();
    }

    // Copy template text to clipboard
    function copyTemplate(name, text) {
        navigator.clipboard.writeText(text).then(() => {
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = originalText, 2000);
        }).catch(() => alert('Failed to copy'));
    }

    // Delete template
    async function deleteTemplate(templateId) {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${templateId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
            });

            if (response.ok) {
                alert('Template deleted successfully');
                loadTemplates();
            } else {
                throw new Error('Failed to delete template');
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    // Export templates as JSON
    function exportTemplates() {
        const dataStr = JSON.stringify(filteredTemplates, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `templates_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // Update statistics
    function updateStats() {
        const approved = filteredTemplates.filter(t => t.status === 'APPROVED').length;
        const pending = filteredTemplates.filter(t => t.status === 'PENDING_REVIEW').length;
        const rejected = filteredTemplates.filter(t => t.status === 'REJECTED').length;
        
        let statsDiv = document.getElementById('statsDiv');
        if (!statsDiv) {
            statsDiv = document.createElement('div');
            statsDiv.id = 'statsDiv';
            document.querySelector('.container').insertBefore(statsDiv, templatesGrid);
        }
        
        statsDiv.style.cssText = 'display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap;';
        statsDiv.innerHTML = `
            <div style="padding: 12px 16px; background: #e8f5e9; border-radius: 6px; font-size: 14px;">
                <strong>${approved}</strong> Approved
            </div>
            <div style="padding: 12px 16px; background: #fff3e0; border-radius: 6px; font-size: 14px;">
                <strong>${pending}</strong> Pending
            </div>
            <div style="padding: 12px 16px; background: #ffebee; border-radius: 6px; font-size: 14px;">
                <strong>${rejected}</strong> Rejected
            </div>
            <div style="padding: 12px 16px; background: #f0f0f0; border-radius: 6px; font-size: 14px;">
                <strong>${filteredTemplates.length}</strong> Total
            </div>
        `;
    }
});