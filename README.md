# Obsidian Simplest Todo

A minimalist Obsidian plugin for managing tasks with automatic archiving. Keep your task list clean — completed tasks move to a rolling archive automatically, organized by month into separate files.

## Features

- ✅ **Auto-archive** — completed tasks (`- [x]`) are automatically moved to the `## Архив` section on save
- 📦 **Monthly rollover** — at the start of each new month, archived tasks are exported to a separate file (e.g. `Задачи - 2026-04 - Апрель.md`)
- 📅 **Date-aware grouping** — tasks are filed into the correct monthly file based on their actual completion date, not the current date
- ↩️ **Unarchive** — unchecking a task in the archive (`- [x]` → `- [ ]`) automatically returns it to its original section
- 🎀 **Ribbon button** — one-click manual archive trigger
- ⌨️ **Command palette** — run archiving or monthly rollover from `Ctrl+P`
- 🔀 **Migration command** — reorganize an existing mixed archive into proper monthly files

## How It Works

The plugin monitors a single Markdown file (your task file). It expects a specific structure with named sections:

```markdown
## Ближайшее время
---
- [ ] Buy groceries
- [x] Call the dentist

## Без срока
---
- [ ] Learn Portuguese

## Архив
---
```

When you check off a task (`- [x]`), the plugin detects the change and:
1. Moves the task to `## Архив` with a hidden completion date tag
2. At the end of the month, exports all archived tasks to a monthly file in your archive folder

### Monthly Archive Files

Archive files are created automatically in your configured archive folder:

```
📁 Archive Folder/
   Задачи - 2025-02 - Февраль.md
   Задачи - 2025-03 - Март.md
   Задачи - 2026-04 - Апрель.md   ← current month
```

Each file contains a clean bullet list with completion dates:

```markdown
# Архив задач — Апрель 2026

> Перенесено: 01.05.2026

---

- Buy groceries *(22.04.2026)*
- Call the dentist *(18.04.2026)*
```

## Installation

### Manual

1. Download `main.js` and `manifest.json` from the [latest release](../../releases/latest)
2. Create a folder: `<your vault>/.obsidian/plugins/obsidian-simplest-todo/`
3. Copy both files into it
4. In Obsidian: **Settings → Community plugins → Reload plugins**, then enable **Obsidian Simplest Todo**

### BRAT (Beta Reviewers Auto-update Tool)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Add this repository via **BRAT → Add Beta Plugin**

## Configuration

Open **Settings → Obsidian Simplest Todo**:

| Setting | Default | Description |
|---|---|---|
| Task file path | `00 - Input/000 - Задачи.md` | Path to your task file (relative to vault root) |
| Sections to process | `## Ближайшее время, ## Без срока` | Comma-separated section headers to watch |
| Section divider | `---` | Marker used as insertion point within sections |
| Processing delay | `500` ms | Debounce delay after file modification |
| Auto-archive | `on` | Enable/disable automatic archiving |
| Archive folder | `00 - Input/Архив` | Folder where monthly archive files are saved |
| File prefix | `Задачи` | Prefix for archive filenames → `Задачи - 2026-04 - Апрель.md` |

## Commands

| Command | Description |
|---|---|
| **Archive completed tasks** | Manually trigger archiving right now |
| **Move archive to monthly file** | Force a monthly rollover without waiting for month end |
| **Reorganize archive by months** | One-time migration: splits a mixed archive file into proper monthly files based on each task's actual completion date |

## Task File Structure

The plugin requires `## Архив` section to exist in your task file. Sections listed in settings will be scanned for completed tasks on each save.

**Recommended structure:**

```markdown
## Ближайшее время
---
- [ ] Urgent task A
- [ ] Urgent task B

## Без срока
---
- [ ] Someday task

## Архив
---
```

The `---` divider inside each section is optional but controls where new tasks are inserted (below the divider).

## Notes

- The plugin only processes the file when it is **open and active** in Obsidian (Live Preview or Reading View)
- `data.json` stores your personal settings and is excluded from version control via `.gitignore` — you configure the plugin paths yourself after installation
- Monthly rollover is checked on every plugin load and on every file save — no need to keep Obsidian open at midnight

## License

MIT
