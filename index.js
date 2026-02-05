#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const inquirer = require('inquirer');
const fuzzy = require('fuzzy');
const { ensureConfig, getConfig, setConfig } = require('./config');

// Register autocomplete prompt
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

const program = new Command();

program
    .name('note')
    .description('CLI note-taking app')
    .version('1.0.0')
    .option('-n, --new <title...>', 'Create a new note')
    .option('-e, --edit <title...>', 'Edit an existing note')
    .option('-s, --search <query...>', 'Search in notes')
    .option('-l, --list [tag]', 'List all notes (optionally filter by tag)')
    .option('-t, --tags <tags>', 'Comma-separated tags for the new note')
    .option('-d, --daily', 'Open/create a daily note')
    .option('-p, --preview <title...>', 'Quick preview of a note')
    .option('--rm <title...>', 'Delete a note')
    .option('-c, --config', 'View current configuration')
    .option('--set-editor <editor>', 'Update default editor')
    .option('--set-dir <dir>', 'Update notes directory');

const getFilePath = (config, titleArray) => {
    const title = titleArray.join(' ');
    const fileName = `${title.toLowerCase().replace(/\s+/g, '-')}.md`;
    return { title, filePath: path.join(config.notesDir, fileName) };
};

async function addNote(titleArray, tags, initialContent) {
    const config = await ensureConfig();
    const { title, filePath } = getFilePath(config, titleArray);

    if (await fs.pathExists(filePath)) {
        console.log(chalk.red(`Error: Note "${title}" already exists. Opening for edit...`));
        return editNote(titleArray);
    }

    let content = `# ${title}\n\n`;
    content += `Created: ${new Date().toLocaleString()}\n`;
    if (tags) {
        content += `Tags: ${tags}\n`;
    }
    content += `\n---\n\n`;
    
    if (initialContent) {
        content += initialContent + '\n';
    }
    
    await fs.writeFile(filePath, content);
    console.log(chalk.green(`Note created: ${filePath}`));
    
    if (!initialContent) {
        spawn(config.editor, [filePath], { stdio: 'inherit' })
            .on('exit', () => console.log(chalk.blue('Note saved.')));
    } else {
        console.log(chalk.blue('Content added to note.'));
    }
}

async function editNote(titleArray) {
    const config = await ensureConfig();
    const { title, filePath } = getFilePath(config, titleArray);

    if (!(await fs.pathExists(filePath))) {
        console.log(chalk.red(`Error: Note "${title}" not found. Creating it...`));
        return addNote(titleArray);
    }

    spawn(config.editor, [filePath], { stdio: 'inherit' })
        .on('exit', () => console.log(chalk.blue('Note updated.')));
}

async function previewNote(titleArray) {
    const config = await ensureConfig();
    const { title, filePath } = getFilePath(config, titleArray);

    if (!(await fs.pathExists(filePath))) {
        console.log(chalk.red(`Error: Note "${title}" not found.`));
        return;
    }

    const content = await fs.readFile(filePath, 'utf8');
    console.log(chalk.cyan.bold(`\n--- ${title} ---\n`));
    console.log(chalk.white(content));
    console.log(chalk.cyan.bold('\n--- End of Preview ---\n'));
}

async function deleteNote(titleArray) {
    const config = await ensureConfig();
    const { title, filePath } = getFilePath(config, titleArray);

    if (!(await fs.pathExists(filePath))) {
        console.log(chalk.red(`Error: Note "${title}" not found.`));
        return;
    }

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete "${title}"?`,
            default: false
        }
    ]);

    if (confirm) {
        await fs.remove(filePath);
        console.log(chalk.green(`Note "${title}" deleted.`));
    }
}

async function listNotes(tag) {
    const config = await ensureConfig();
    const files = await fs.readdir(config.notesDir);
    const notes = files.filter(f => f.endsWith('.md'));

    if (notes.length === 0) {
        console.log(chalk.yellow('No notes found.'));
        return;
    }

    console.log(chalk.cyan.bold('\nYour Notes:'));
    for (const note of notes) {
        const filePath = path.join(config.notesDir, note);
        const content = await fs.readFile(filePath, 'utf8');
        
        if (tag) {
            const tagLine = content.split('\n').find(l => l.startsWith('Tags:'));
            if (!tagLine || !tagLine.toLowerCase().includes(tag.toLowerCase())) {
                continue;
            }
        }
        console.log(chalk.white(`- ${note.replace('.md', '')}`));
    }
}

async function searchNotes(queryArray) {
    const config = await ensureConfig();
    const query = queryArray.join(' ');
    const files = await fs.readdir(config.notesDir);
    const notes = files.filter(f => f.endsWith('.md'));

    console.log(chalk.cyan(`Searching for "${query}"...`));
    for (const note of notes) {
        const filePath = path.join(config.notesDir, note);
        const content = await fs.readFile(filePath, 'utf8');
        
        if (content.toLowerCase().includes(query.toLowerCase())) {
            console.log(chalk.green(`\nFound in ${note}:`));
            const lines = content.split('\n');
            lines.filter(l => l.toLowerCase().includes(query.toLowerCase()))
                 .forEach(line => console.log(chalk.white(`  > ${line.trim()}`)));
        }
    }
}

async function handleConfig(options) {
    if (options.setEditor || options.setDir) {
        const newConfig = {};
        if (options.setEditor) newConfig.editor = options.setEditor;
        if (options.setDir) newConfig.notesDir = path.resolve(options.setDir);
        await setConfig(newConfig);
        console.log(chalk.green('Configuration updated.'));
    } else {
        const config = await getConfig();
        console.log(chalk.cyan('\nCurrent Configuration:'));
        console.log(chalk.white(`Editor: ${config.editor}`));
        console.log(chalk.white(`Notes Directory: ${config.notesDir}`));
    }
}

async function interactiveMode() {
    const config = await ensureConfig();
    const files = await fs.readdir(config.notesDir);
    const notes = files.filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));

    if (notes.length === 0) {
        console.log(chalk.yellow('No notes found. Try creating one with "note -n title".'));
        return;
    }

    const { action } = await inquirer.prompt([
        {
            type: 'autocomplete',
            name: 'action',
            message: 'Select a note to open (or type to search):',
            source: (answers, input) => {
                input = input || '';
                return new Promise((resolve) => {
                    const fuzzyResult = fuzzy.filter(input, notes);
                    resolve(fuzzyResult.map(el => el.original));
                });
            }
        }
    ]);

    if (action) {
        editNote([action]);
    }
}

program
    .arguments('[body...]')
    .action(async (body, options) => {
        if (options.new) {
            const contentBody = body && body.length > 0 ? body.join(' ') : null;
            await addNote(options.new, options.tags, contentBody);
        } else if (options.edit) {
            await editNote(options.edit);
        } else if (options.daily) {
            const today = new Date().toISOString().split('T')[0];
            await editNote([today]);
        } else if (options.preview) {
            await previewNote(options.preview);
        } else if (options.rm) {
            await deleteNote(options.rm);
        } else if (options.search) {
            await searchNotes(options.search);
        } else if (options.list !== undefined) {
            const tag = typeof options.list === 'string' ? options.list : null;
            await listNotes(tag);
        } else if (options.config || options.setEditor || options.setDir) {
            await handleConfig(options);
        } else if (program.args.length > 0) {
            await editNote(program.args);
        } else {
            await interactiveMode();
        }
    });

program.parse(process.argv);
