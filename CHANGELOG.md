# Changelog

All notable changes to **Obsidian Simplest Todo** are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.2] — 2026-10-09

### Fixed
- **Duplicates in monthly archive files** — rollover is now idempotent: tasks already present in the monthly file are not appended again (e.g. when a stale copy of the task file comes back via sync)
- **Sync conflicts on startup** — month rollover check is delayed by 15 s after layout ready so sync plugins (LiveSync etc.) can pull the latest task file first
- **Lost edits** — task file and monthly files are now changed atomically via `vault.process()` instead of `read` + `modify`; the task file is not written at all when there is nothing to do
- **Empty lines piling up** — if the archive section has no divider, the divider is inserted instead of an empty line; empty lines inside the archive section are removed on rollover
- **Multiline tasks and subtasks** — a completed task is archived/restored/exported together with its indented continuation lines and subtasks; completed *nested* subtasks stay with their parent
- `- [X]` (uppercase) is recognized as completed
- Identical tasks are no longer merged into one when unarchiving
- Rollover notice lists only months that actually received tasks
- Replaced deprecated `workspace.activeLeaf`

---

## [1.0.0] — 2026-04-22

### Added
- **Bilingual interface (i18n)** — full Russian and English support selectable from plugin settings
  - Language affects: notices, command palette names, archive file headers, month names in filenames
- **Archive section name setting** — configurable via settings (default `## Архив`), allows English users to use `## Archive`
- Automatic archiving of completed tasks (`- [x]`) into a configurable archive section on file save
- Monthly rollover: archive section tasks are exported to `Prefix - YYYY-MM - MonthName.md` files at month end
- Date-aware grouping: tasks land in the monthly file matching their actual completion date (extracted from hidden metadata)
- Unarchive: unchecking a task in the archive returns it to its original section
- Hidden metadata comments (`<!-- archived:DD.MM.YYYY|section:... -->`) preserve completion date and source section invisibly
- Clean archive file output: checkboxes and metadata stripped, dates rendered as `*(DD.MM.YYYY)*`
- Ribbon button for one-click manual archiving
- Command palette commands:
  - Archive completed tasks
  - Move archive to monthly file (manual rollover)
  - Reorganize archive by months (migration)
- Migration tool: reorganizes all files in the archive folder by actual task dates; old files moved to Obsidian trash (recoverable)
- Configurable debounce delay for file-change processing
- Live filename preview in settings
- Standard `.gitignore` excluding `data.json` and build artifacts
- Bilingual `README.md` (English + Russian)
- MIT `LICENSE`

---

## [Unreleased]

### Planned
- TypeScript + esbuild build pipeline
- Obsidian Community Plugins submission
- Screenshot assets for README
- Optional: recurrence tags (`[daily]`, `[weekly]`) for repeating tasks
