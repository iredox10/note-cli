const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.note-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
    notesDir: path.join(CONFIG_DIR, 'notes'),
    editor: process.env.EDITOR || 'nano'
};

async function ensureConfig() {
    await fs.ensureDir(CONFIG_DIR);
    if (!(await fs.pathExists(CONFIG_FILE))) {
        await fs.writeJson(CONFIG_FILE, DEFAULT_CONFIG, { spaces: 2 });
    }
    const config = await fs.readJson(CONFIG_FILE);
    await fs.ensureDir(config.notesDir);
    return config;
}

async function getConfig() {
    return await fs.readJson(CONFIG_FILE);
}

async function setConfig(newConfig) {
    const current = await getConfig();
    await fs.writeJson(CONFIG_FILE, { ...current, ...newConfig }, { spaces: 2 });
}

module.exports = { ensureConfig, getConfig, setConfig };
