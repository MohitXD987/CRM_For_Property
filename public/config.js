// Environment Configuration Manager
class ConfigManager {
    constructor() {
        this.config = {};
        this.loaded = false;
    }

    async load() {
        if (this.loaded) return;
        try {
            const response = await fetch('.env');
            const text = await response.text();
            const lines = text.split('\n');
            
            lines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const [key, ...valueParts] = trimmed.split('=');
                    this.config[key.trim()] = valueParts.join('=').trim();
                }
            });
            
            this.loaded = true;
            console.log('✓ Configuration loaded');
        } catch (error) {
            console.error('Failed to load .env file:', error);
        }
    }

    get(key, defaultValue = null) {
        const value = this.config[key];
        if (!value && defaultValue === null) {
            console.warn(`⚠ Missing config: ${key}`);
        }
        return value || defaultValue;
    }

    getToken() {
        return this.get('WHATSAPP_TOKEN');
    }

    getWabaId() {
        return this.get('WABA_ID');
    }

    getApiVersion() {
        return this.get('API_VERSION', 'v19.0');
    }

    getAll() {
        return { ...this.config };
    }
}

const config = new ConfigManager();
