// Simple Templates Display JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const WHATSAPP_TOKEN = 'EAAMl282UAZCgBQkB8nvuSFf3GTemEJVEla0No5qiQmyEzdGGhR5ZB3HYhrXgeE1rZBBZB2nabsmEXiZBMxLV2H6w2A66NAfLCW3bjSaokIxmZBqwQ3SlVZCD0RnJ3tHa1fS356EuhiQIJ6XjQh01EzgR8H4ZCFquRINOxYU2Q2FTf1TcM4QN8ofoe6Niv0UEYLwoiwZDZD';
    const WABA_ID = '1463396578516155';
    const API_VERSION = 'v19.0';
    
    // DOM Elements
    const templatesGrid = document.getElementById('templatesGrid');
    const refreshBtn = document.getElementById('refreshBtn');
    const tooltip = document.getElementById('tooltip');
    
    let templates = [];
    
    // Load templates on page load
    loadTemplates();
    
    // Refresh button
    refreshBtn.addEventListener('click', loadTemplates);
    
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
                displayTemplates();
            } else {
                throw new Error(result.error?.message || 'Failed to load templates');
            }
        } catch (error) {
            templatesGrid.innerHTML = `<div class="error">Error loading templates: ${error.message}</div>`;
        }
    }
    
    // Display templates in grid
    function displayTemplates() {
        if (templates.length === 0) {
            templatesGrid.innerHTML = '<div class="loading">No templates found</div>';
            return;
        }
        
        templatesGrid.innerHTML = templates.map(template => {
            const variableCount = getVariableCount(template);
            const createdDate = new Date(template.created_time * 1000).toLocaleDateString();
            
            return `
                <div class="template-card" 
                     onmouseenter="showTooltip(event, '${template.name}')" 
                     onmouseleave="hideTooltip()">
                    <div class="template-name">${template.name}</div>
                    <div class="template-info">
                        <span class="template-category ${template.category.toLowerCase()}">${template.category}</span>
                        <span class="template-status ${template.status.toLowerCase()}">${template.status}</span>
                        <span class="template-language">${template.language}</span>
                        <span class="template-variables">${variableCount} variables</span>
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
    
    // Make functions global
    window.showTooltip = showTooltip;
    window.hideTooltip = hideTooltip;
});