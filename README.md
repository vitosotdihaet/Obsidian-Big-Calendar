# Obsidian Kanban Calendar

A calendar plugin for Obsidian that integrates with the [Kanban Plugin](obsidian://show-plugin?id=obsidian-kanban). Based on [Obsidian Big Calendar](https://github.com/Quorafind/Obsidian-Big-Calendar).

## NOTICE

> [!WARNING]
> The plugin is in development. Don't expect too much from it, IT MAY BREAK YOUR NOTES, as I haven't touched the note-editing part of the codebase

## Features

- **Multiple Calendar Views**
  - Month View
  - Week View
  - Day View
  - Agenda View

- **Seamless Obsidian Integration**
  - Automatically detects and displays notes with time information
  - Parses time blocks from all around the vault
  - Click on events to jump to the original note
  - Real-time updates when files are created, modified, or deleted

- **Customization Options**
  - Choose first day of the week (Sunday or Monday)
  - Configure where to insert and process events in your notes
  - Customize event display format

## Usage

### Time Formats

The plugin recognizes time in kanban plugin format: `@{YYYY-MM-DD}`

### Configuration

1. **First Day of Week**: Choose between Sunday (default) or Monday

## Installation

### Manual Installation
1. Download the latest release from [GitHub](https://github.com/Quorafind/Obsidian-Big-Calendar/releases)
2. Extract the files (main.js, manifest.json, styles.css) to your vault's plugins folder: `{{obsidian_vault}}/.obsidian/plugins/Obsidian-Big-Calendar`
3. Reload Obsidian
4. Enable the plugin in Obsidian settings

### Building
1. Clone the repo
2. `npm run build`
2. Copy the files (main.js, manifest.json, styles.css) to your vault's plugins folder: `{{obsidian_vault}}/.obsidian/plugins/Obsidian-Big-Calendar`
3. Reload Obsidian
4. Enable the plugin in Obsidian settings

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
