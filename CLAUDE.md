# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development

This plugin is **plain JavaScript with no build system**. There is no `package.json`, no npm scripts, and no TypeScript compilation step. `main.js` is the direct distributable artifact — edit it in place.

To install in Obsidian for testing:
1. Ensure `main.js` and `manifest.json` are present in the plugin folder.
2. Reload Obsidian or toggle the plugin off/on in settings.

## Architecture

Single-file plugin (`main.js`, ~900+ lines) with two main classes:

- **`SimplestTodo`** (`extends Plugin`) — core logic: auto-archiving completed tasks, month-rollover export to monthly files, unarchiving on uncheck, and one-time migration tools.
- **`SimplestTodoSettingsTab`** (`extends PluginSettingTab`) — all settings UI.
- **`LOCALES`** object at the top — all user-facing strings for `ru` and `en`, accessed via `this.locale` getter.

The plugin monitors a single configurable Markdown file. On file save, it scans for `- [x]` tasks in configured sections, tags them with metadata, moves them to an `## Archive` section, and at month boundary exports them to dated monthly files.

## Coding Style & Conventions

- **JavaScript Version:** Use modern ES6+ syntax (arrow functions, async/await, destructuring), but keep it compatible with the Obsidian Electron environment.
- **Type Checking:** Since there is no TypeScript, use **JSDoc comments** for any new functions, complex parameters, or class properties to maintain readability and type safety.
- **Localization:** ALWAYS add new user-facing strings (UI labels, Notice messages, errors) to both `ru` and `en` properties in the `LOCALES` object. Do not hardcode English/Russian strings in the logic.
- **Error Handling:** Use `new Notice('message')` for user-facing warnings, and `console.error('[SimplestTodo]', error)` for debugging information.
- **Versioning:** When instructed to bump the plugin version, update the `version` field in `manifest.json` (and `versions.json` if applicable).

## Key Patterns

**Task metadata (invisible HTML comments):**
```
- [x] Task text <!-- archived:DD.MM.YYYY|section:## SectionName -->
```
This is how archiving and unarchiving are tracked. Also handles a deprecated format `[архивировано: DD.MM.YYYY]` for backward compatibility.

**Processing guards** — `this.isProcessing` reentrancy flag + `this.processQueue` debounce timer (default 500ms) prevent concurrent or rapid-fire processing.

**Settings** (`data.json`, git-ignored) are merged over defaults with `Object.assign(defaults, await this.loadData())`. Key settings: `targetFilePath`, `archiveSectionName`, `sectionsToProcess` (array), `archiveFolderPath`, `autoArchive`, `debounceMs`, `lastArchivedMonth`.

**Obsidian API** — accessed via CommonJS `require('obsidian')`. Uses `Notice`, `Plugin`, `PluginSettingTab`, `Setting`, `MarkdownView`, `TFile`. Minimum Obsidian version: 1.4.0.

**Date format** — always `DD.MM.YYYY` stored in metadata; month keys are `YYYY-MM`.

## Important Constraints

- All file paths are relative to vault root; no absolute paths.
- The archive migration (`reorganizeArchiveFolder`) moves old files to Obsidian trash (recoverable), not permanent deletion.
- Regex-based metadata parsing is the fragile point — if the comment format changes, both write and read paths must be updated together.
- Month rollover is checked on load and every file save (via `lastArchivedMonth` in settings), not on a timer.
