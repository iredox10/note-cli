# note-cli 📝

A frictionless terminal note-taking app designed for speed and "lazy" productivity.

## Features
- **Shorthand Capture:** `note -n "My Title" This is the content`
- **Daily Notes:** `note -d` opens/creates today's note.
- **Fuzzy Search:** Type `note` to browse and search your notes interactively.
- **Quick Preview:** `note -p title` to read without opening an editor.
- **Tagging:** Organize notes with `-t tag1,tag2`.

## Installation
Once published:
```bash
npm install -g note-cli
```

## Usage
- `note` - Interactive mode (fuzzy search)
- `note -n <title> [content]` - Create a new note
- `note -d` - Daily note
- `note -p <title>` - Preview note content
- `note -s <query>` - Search in notes
- `note -l [tag]` - List notes
- `note --rm <title>` - Delete a note
- `note -c` - View config

## Configuration
Notes are stored in `~/.note-cli/notes/` by default. Change the editor or directory:
```bash
note --set-editor vim
note --set-dir /path/to/custom/dir
```
