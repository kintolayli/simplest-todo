'use strict';
const { Notice, Plugin, PluginSettingTab, Setting, MarkdownView, TFile } = require('obsidian');

// ─── Localisation ─────────────────────────────────────────────────────────

const LOCALES = {
    ru: {
        months: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
        ribbonTooltip:      'Архивировать выполненные задачи',
        cmdArchive:         'Архивировать выполненные задачи',
        cmdRollover:        'Перенести архив в месячный файл (вручную)',
        cmdReorganize:      'Реорганизовать архив по месяцам (миграция)',
        noticeDone:         (n) => `✅ Архивировано: ${n} ${plural(n,'задача','задачи','задач')}`,
        noticeRestored:     (n) => `↩️ Восстановлено: ${n} ${plural(n,'задача','задачи','задач')}`,
        noticeMoved:        (n, m) => `📦 Перенесено в архив: ${n} ${plural(n,'задача','задачи','задач')}\nФайлы: ${m}`,
        noticeReorgDone:    (n, f, m) => `✅ Реорганизация завершена!\n${n} ${plural(n,'задача','задачи','задач')} → ${f} файлов:\n${m}`,
        noticeReorgReading: (n) => `🔄 Читаю ${n} файлов архива...`,
        noticeReorgEmpty:   '📂 Архивная папка пуста — нечего реорганизовывать',
        noticeReorgNoTasks: '🔍 Задачи с распознаваемыми датами не найдены',
        noticeFolderNotFound:(p) => `❌ Папка архива не найдена: "${p}"\nПроверьте настройки плагина.`,
        noticeFileNotFound: '❌ Файл задач не найден! Проверьте путь в настройках.',
        noticeNoSection:    (s) => `⚠️ Секция '${s}' не найдена в файле задач`,
        noticeError:        '❌ Ошибка архивации. Подробности в консоли (Ctrl+Shift+I)',
        archiveTitle:       (month, year) => `# Архив задач — ${month} ${year}`,
        archiveMoved:       'Перенесено',
        archiveAppended:    'Дополнено',
        archiveReorg:       '🔀 Реорганизовано',
        archiveReorgNoDate: '🔀 Реорганизовано (без даты)',
        settingsTitle:      '⚙️ SimplestTodo — Настройки',
        grpFile:            'Файл задач',
        grpArchive:         'Месячный архив',
        grpMigration:       'Миграция архива',
        setLang:            'Язык интерфейса',
        setLangDesc:        'Язык уведомлений, команд и архивных файлов',
        setFilePath:        'Путь к файлу задач',
        setFilePathDesc:    'Путь относительно корня хранилища',
        setFilePathPh:      '00 - Input/000 - Задачи.md',
        setSections:        'Обрабатываемые секции',
        setSectionsDesc:    'Заголовки через запятую',
        setSectionsPh:      '## Ближайшее время, ## Без срока',
        setDivider:         'Разделитель секций',
        setDividerDesc:     'Маркер вставки задач (по умолчанию ---)',
        setDebounce:        'Задержка обработки (мс)',
        setDebounceDesc:    'Дебаунс после изменения файла',
        setAuto:            'Автоматическая архивация',
        setAutoDesc:        'Переносить выполненные задачи в архив при изменении файла',
        setArcSection:      'Название секции архива',
        setArcSectionDesc:  'Заголовок секции в файле задач для выполненных задач',
        setArcFolder:       'Папка архивных файлов',
        setArcFolderDesc:   'Путь к папке месячных архивов',
        setArcFolderPh:     '00 - Input/Архив',
        setPrefix:          'Префикс имени файла',
        setPrefixDesc:      'Префикс → "Префикс - 2026-04 - Апрель.md"',
        setPrefixPh:        'Задачи',
        setPreview:         (p) => `📄 Пример: ${p}`,
        setRolloverName:    'Перенести архив прямо сейчас',
        setRolloverDesc:    'Вручную перенести задачи из архивной секции в месячный файл',
        setRolloverBtn:     'Перенести',
        setArcDesc:         'По окончании месяца задачи переносятся в отдельный файл по реальной дате архивации.',
        setMigDesc:         '⚠️ Реорганизует ВСЕ файлы в папке архива по реальным датам. Старые файлы — в корзину Obsidian (можно восстановить).',
        setReorgName:       'Реорганизовать архив по месяцам',
        setReorgDesc:       'Запустить один раз для исправления существующего архива',
        setReorgBtn:        '🔀 Реорганизовать',
    },
    en: {
        months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
        ribbonTooltip:      'Archive completed tasks',
        cmdArchive:         'Archive completed tasks',
        cmdRollover:        'Move archive to monthly file (manual)',
        cmdReorganize:      'Reorganize archive by months (migration)',
        noticeDone:         (n) => `✅ Archived: ${n} task${n!==1?'s':''}`,
        noticeRestored:     (n) => `↩️ Restored: ${n} task${n!==1?'s':''}`,
        noticeMoved:        (n, m) => `📦 Moved to archive: ${n} task${n!==1?'s':''}\nFiles: ${m}`,
        noticeReorgDone:    (n, f, m) => `✅ Reorganization complete!\n${n} task${n!==1?'s':''} → ${f} file${f!==1?'s':''}:\n${m}`,
        noticeReorgReading: (n) => `🔄 Reading ${n} archive file${n!==1?'s':''}...`,
        noticeReorgEmpty:   '📂 Archive folder is empty — nothing to reorganize',
        noticeReorgNoTasks: '🔍 No tasks with recognizable dates found',
        noticeFolderNotFound:(p) => `❌ Archive folder not found: "${p}"\nCheck plugin settings.`,
        noticeFileNotFound: '❌ Task file not found! Check the path in settings.',
        noticeNoSection:    (s) => `⚠️ Section '${s}' not found in task file`,
        noticeError:        '❌ Archive error. See console for details (Ctrl+Shift+I)',
        archiveTitle:       (month, year) => `# Task Archive — ${month} ${year}`,
        archiveMoved:       'Archived',
        archiveAppended:    'Updated',
        archiveReorg:       '🔀 Reorganized',
        archiveReorgNoDate: '🔀 Reorganized (no date)',
        settingsTitle:      '⚙️ SimplestTodo — Settings',
        grpFile:            'Task file',
        grpArchive:         'Monthly archive',
        grpMigration:       'Archive migration',
        setLang:            'Language',
        setLangDesc:        'Language for notifications, commands and archive file content',
        setFilePath:        'Task file path',
        setFilePathDesc:    'Path relative to vault root',
        setFilePathPh:      '00 - Input/000 - Tasks.md',
        setSections:        'Sections to process',
        setSectionsDesc:    'Section headers, comma-separated',
        setSectionsPh:      '## Upcoming, ## Someday',
        setDivider:         'Section divider',
        setDividerDesc:     'Task insertion marker (default ---)',
        setDebounce:        'Processing delay (ms)',
        setDebounceDesc:    'Debounce delay after file modification',
        setAuto:            'Auto-archive',
        setAutoDesc:        'Automatically move completed tasks to archive on file save',
        setArcSection:      'Archive section name',
        setArcSectionDesc:  'Section header in the task file where completed tasks are collected',
        setArcFolder:       'Archive folder',
        setArcFolderDesc:   'Path to the folder where monthly archive files are saved',
        setArcFolderPh:     '00 - Input/Archive',
        setPrefix:          'File name prefix',
        setPrefixDesc:      'Prefix → "Prefix - 2026-04 - April.md"',
        setPrefixPh:        'Tasks',
        setPreview:         (p) => `📄 Example: ${p}`,
        setRolloverName:    'Move archive now',
        setRolloverDesc:    'Manually move tasks from archive section to a monthly file',
        setRolloverBtn:     'Move',
        setArcDesc:         'At month end, tasks are exported to a file grouped by their actual archive date.',
        setMigDesc:         '⚠️ Reorganizes ALL files in the archive folder by actual date. Old files are moved to Obsidian trash (recoverable).',
        setReorgName:       'Reorganize archive by months',
        setReorgDesc:       'Run once to fix an existing mixed archive',
        setReorgBtn:        '🔀 Reorganize',
    },
};

// ─── Вспомогательные функции ───────────────────────────────────────────────

/** Возвращает ключ месяца в формате "YYYY-MM" */
function getMonthKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

/** Формирует имя файла месячного архива */
function buildArchiveFileName(prefix, monthKey, months) {
    const [year, month] = monthKey.split('-');
    const monthName = (months ?? LOCALES.ru.months)[parseInt(month, 10) - 1];
    const base = prefix ? `${prefix} - ` : '';
    return `${base}${year}-${month} - ${monthName}.md`;
}

/**
 * Извлекает ключ месяца из строки задачи (оба формата метаданных).
 * Старый: [архивировано: DD.MM.YYYY]
 * Новый:  <!-- archived:DD.MM.YYYY|section:... -->
 * @returns {string|null} "YYYY-MM" или null если дата не найдена
 */
function extractMonthFromTask(line) {
    const oldMatch = line.match(/\[архивировано:\s*(\d{2})\.(\d{2})\.(\d{4})\]/);
    if (oldMatch) return `${oldMatch[3]}-${oldMatch[2]}`;

    const newMatch = line.match(/<!--\s*archived:(\d{2})\.(\d{2})\.(\d{4})/);
    if (newMatch) return `${newMatch[3]}-${newMatch[2]}`;

    return null;
}

/**
 * Очищает строку задачи для хранения в месячном архиве:
 * убирает чекбокс [x]/[ ] и секцию, но СОХРАНЯЕТ дату архивации.
 * Результат: «- Текст задачи *(22.04.2026)*»
 */
function cleanTaskForArchive(line) {
    let text = line.trim();

    // Извлекаем дату перед удалением метаданных
    let archiveDate = null;

    // Старый формат: [архивировано: DD.MM.YYYY]
    const oldDateMatch = text.match(/\[архивировано:\s*(\d{2}\.\d{2}\.\d{4})\]/);
    if (oldDateMatch) archiveDate = oldDateMatch[1];

    // Новый формат: <!-- archived:DD.MM.YYYY|... -->
    const newDateMatch = text.match(/<!--\s*archived:(\d{2}\.\d{2}\.\d{4})/);
    if (newDateMatch) archiveDate = newDateMatch[1];

    // Убираем чекбокс: "- [x] " или "- [ ] " → ""
    text = text.replace(/^-\s*\[.\]\s*/, '');
    // Убираем старый формат целиком: [архивировано: ...] и [секция: ...]
    text = text.replace(/\s*\[архивировано:\s*[^\]]+\]/g, '');
    text = text.replace(/\s*\[секция:\s*[^\]]+\]/g, '');
    // Убираем новый формат: <!-- archived:...|section:... -->
    text = text.replace(/\s*<!--\s*archived:[^>]*-->/g, '');

    text = text.trim();

    // Добавляем дату в читаемом виде
    const dateSuffix = archiveDate ? ` *(${archiveDate})*` : '';
    return `- ${text}${dateSuffix}`;
}

/** Склонение числительных */
function plural(n, one, few, many) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return many;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
}

/** Форматирует дату как DD.MM.YYYY (не зависит от системной локали) */
function formatDate(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
}

// ─── Основной класс плагина ────────────────────────────────────────────────

module.exports = class SimplestTodo extends Plugin {

    async onload() {
        console.log('SimplestTodo загружен');

        await this.loadSettings();

        this.isProcessing = false;
        this.processQueue = null;

        this.app.workspace.onLayoutReady(async () => {

            // Проверяем смену месяца при старте
            await this.checkMonthRollover();

            // Слушаем изменения файла задач
            this.registerEvent(
                this.app.vault.on('modify', async (file) => {
                    if (file.path !== this.settings.targetFilePath || this.isProcessing) return;

                    clearTimeout(this.processQueue);
                    this.processQueue = setTimeout(async () => {
                        const activeFile = this.app.workspace.getActiveFile();
                        if (activeFile?.path !== this.settings.targetFilePath) return;

                        const mode = this.app.workspace.activeLeaf?.view?.getMode();
                        if (mode === 'preview' || mode === 'source') {
                            await this.checkMonthRollover();
                            await this.processFile(file);
                        }
                    }, this.settings.debounceMs ?? 500);
                })
            );
        });

        // Кнопка в Ribbon
        this.addRibbonIcon('archive', this.locale.ribbonTooltip, async () => {
            await this.runManualArchive();
        });

        // Команды в палитре (Ctrl+P)
        this.addCommand({
            id: 'archive-completed-tasks',
            name: this.locale.cmdArchive,
            callback: async () => await this.runManualArchive()
        });

        this.addCommand({
            id: 'rollover-monthly-archive',
            name: this.locale.cmdRollover,
            callback: async () => {
                const month = getMonthKey(new Date());
                await this.rolloverArchive(month);
            }
        });

        this.addCommand({
            id: 'reorganize-archive-folder',
            name: this.locale.cmdReorganize,
            callback: async () => await this.reorganizeArchiveFolder()
        });

        this.addSettingTab(new SimplestTodoSettingsTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({
            language: 'ru',
            targetFilePath: '00 - Input/000 - Задачи.md',
            archiveSectionName: '## Архив',
            sectionsToProcess: ['## Ближайшее время', '## Без срока'],
            sectionDivider: '---',
            autoArchive: true,
            debounceMs: 500,
            archiveFolderPath: '00 - Input/Архив',
            archiveFilePrefix: 'Задачи',
            lastArchivedMonth: ''
        }, await this.loadData());
    }

    /** Текущая локаль */
    get locale() {
        return LOCALES[this.settings.language] ?? LOCALES.ru;
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // ─── Ручной запуск ──────────────────────────────────────────────────────

    async runManualArchive() {
        const file = this.app.vault.getAbstractFileByPath(this.settings.targetFilePath);
        if (!file) {
            new Notice(this.locale.noticeFileNotFound);
            return;
        }
        await this.checkMonthRollover();
        await this.processFile(file);
    }

    // ─── Смена месяца ────────────────────────────────────────────────────────

    async checkMonthRollover() {
        const currentMonth = getMonthKey(new Date());
        const { lastArchivedMonth } = this.settings;

        if (!lastArchivedMonth) {
            this.settings.lastArchivedMonth = currentMonth;
            await this.saveSettings();
            return;
        }

        if (lastArchivedMonth !== currentMonth) {
            console.log(`SimplestTodo: rollover ${lastArchivedMonth} → ${currentMonth}`);
            await this.rolloverArchive(lastArchivedMonth);
            this.settings.lastArchivedMonth = currentMonth;
            await this.saveSettings();
        }
    }

    /**
     * Переносит задачи из ## Архив основного файла в месячные файлы.
     * ИСПРАВЛЕНО: группирует по реальной дате архивации, а не по fromMonth.
     */
    async rolloverArchive(fromMonth) {
        const taskFile = this.app.vault.getAbstractFileByPath(this.settings.targetFilePath);
        if (!taskFile) return;

        const content = await this.app.vault.read(taskFile);
        const lines = content.split('\n');

        const idxArchive = lines.findIndex(l => l?.trim() === '## Архив');
        if (idxArchive === -1) return;

        // Определяем границы секции ## Архив
        let endOfArchive = lines.length;
        for (let i = idxArchive + 1; i < lines.length; i++) {
            if (lines[i]?.trim().startsWith('## ')) {
                endOfArchive = i;
                break;
            }
        }

        // Собираем задачи из архивной секции
        const archiveTasks = [];
        for (let i = idxArchive + 1; i < endOfArchive; i++) {
            const trimmed = lines[i]?.trim();
            if (trimmed && (trimmed.startsWith('- [x]') || trimmed.startsWith('- [ ]'))) {
                archiveTasks.push(lines[i]);
            }
        }

        if (archiveTasks.length === 0) return;

        // ✅ ИСПРАВЛЕНО: группируем по реальной дате в метаданных задачи
        const tasksByMonth = new Map();
        for (const task of archiveTasks) {
            // extractMonthFromTask работает с обоими форматами (старый и новый)
            const monthKey = extractMonthFromTask(task) ?? fromMonth;
            if (!tasksByMonth.has(monthKey)) tasksByMonth.set(monthKey, []);
            tasksByMonth.get(monthKey).push(task);
        }

        // Записываем каждую группу в соответствующий месячный файл
        let totalWritten = 0;
        for (const [monthKey, tasks] of tasksByMonth) {
            await this.writeToMonthlyArchive(monthKey, tasks);
            totalWritten += tasks.length;
        }

        // Очищаем секцию ## Архив в основном файле
        const newLines = [];
        for (let i = 0; i < lines.length; i++) {
            if (i > idxArchive && i < endOfArchive) {
                const trimmed = lines[i]?.trim();
                if (trimmed && (trimmed.startsWith('- [x]') || trimmed.startsWith('- [ ]'))) {
                    continue; // удаляем задачи
                }
            }
            newLines.push(lines[i]);
        }

        await this.app.vault.modify(taskFile, newLines.join('\n'));

        // Обновляем вид
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view?.file === taskFile && view.getMode() === 'preview') {
            view.previewMode.rerender(true);
        }

        const monthList = [...tasksByMonth.keys()].map(mk => {
            const [y, m] = mk.split('-');
            return `${this.locale.months[parseInt(m, 10) - 1]} ${y}`;
        }).join(', ');

        new Notice(this.locale.noticeMoved(totalWritten, monthList), 6000);
    }

    // ─── Миграция: реорганизация архивной папки ──────────────────────────────

    /**
     * Читает все .md файлы в папке архива, группирует задачи по
     * реальным датам архивации и пересоздаёт правильные месячные файлы.
     * Старые файлы перемещаются в корзину Obsidian (безопасно).
     */
    async reorganizeArchiveFolder() {
        const folderPath = this.settings.archiveFolderPath;
        const folder = this.app.vault.getAbstractFileByPath(folderPath);

        if (!folder || !folder.children) {
            new Notice(this.locale.noticeFolderNotFound(folderPath), 6000);
            return;
        }

        const mdFiles = folder.children.filter(f => f instanceof TFile && f.extension === 'md');
        if (mdFiles.length === 0) {
            new Notice(this.locale.noticeReorgEmpty);
            return;
        }

        new Notice(this.locale.noticeReorgReading(mdFiles.length), 2000);

        // Собираем задачи из всех файлов
        const tasksByMonth = new Map();
        const noDateTasks = [];

        for (const file of mdFiles) {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('- [')) continue;
                const monthKey = extractMonthFromTask(trimmed);
                if (monthKey) {
                    if (!tasksByMonth.has(monthKey)) tasksByMonth.set(monthKey, []);
                    tasksByMonth.get(monthKey).push(line);
                } else {
                    noDateTasks.push(line);
                }
            }
        }

        if (tasksByMonth.size === 0 && noDateTasks.length === 0) {
            new Notice(this.locale.noticeReorgNoTasks);
            return;
        }

        // Перемещаем старые файлы в корзину (безопасно, можно восстановить)
        for (const file of mdFiles) {
            await this.app.vault.trash(file, true);
        }

        // Создаём правильные месячные файлы (сортируем по дате)
        const sortedMonths = [...tasksByMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
        for (const [monthKey, tasks] of sortedMonths) {
            await this.writeToMonthlyArchiveFromScratch(monthKey, tasks, this.locale.archiveReorg);
        }

        // Задачи без дат — в текущий месяц
        if (noDateTasks.length > 0) {
            const currentMonth = getMonthKey(new Date());
            await this.writeToMonthlyArchiveFromScratch(currentMonth, noDateTasks, this.locale.archiveReorgNoDate);
        }

        const totalTasks = [...tasksByMonth.values()].reduce((s, a) => s + a.length, 0) + noDateTasks.length;
        const monthNames = sortedMonths.map(([mk]) => {
            const [y, m] = mk.split('-');
            return `${this.locale.months[parseInt(m, 10) - 1]} ${y}`;
        });

        new Notice(this.locale.noticeReorgDone(totalTasks, tasksByMonth.size, monthNames.join(', ')), 8000);
    }

    // ─── Запись месячных файлов ───────────────────────────────────────────────

    /** Создаёт или дополняет месячный файл архива */
    async writeToMonthlyArchive(monthKey, tasks) {
        const [year, month] = monthKey.split('-');
        const monthName = this.locale.months[parseInt(month, 10) - 1];
        const fileName = buildArchiveFileName(this.settings.archiveFilePrefix, monthKey, this.locale.months);
        const folderPath = this.settings.archiveFolderPath.replace(/\/$/, '');
        const filePath = `${folderPath}/${fileName}`;

        await this.ensureFolderExists(folderPath);

        const today = formatDate(new Date());
        const existingFile = this.app.vault.getAbstractFileByPath(filePath);

        const cleanedTasks = tasks.map(cleanTaskForArchive);

        if (existingFile) {
            const existing = await this.app.vault.read(existingFile);
            const separator = `\n\n> ${this.locale.archiveAppended} ${today}\n\n`;
            await this.app.vault.modify(existingFile, existing.trimEnd() + separator + cleanedTasks.join('\n') + '\n');
        } else {
            const header = [
                this.locale.archiveTitle(monthName, year),
                '',
                `> ${this.locale.archiveMoved}: ${today}`,
                '',
                '---',
                '',
            ].join('\n');
            await this.app.vault.create(filePath, header + cleanedTasks.join('\n') + '\n');
        }
    }

    /** Создаёт месячный файл заново (для команды реорганизации) */
    async writeToMonthlyArchiveFromScratch(monthKey, tasks, label) {
        const [year, month] = monthKey.split('-');
        const monthName = this.locale.months[parseInt(month, 10) - 1];
        const fileName = buildArchiveFileName(this.settings.archiveFilePrefix, monthKey, this.locale.months);
        const folderPath = this.settings.archiveFolderPath.replace(/\/$/, '');
        const filePath = `${folderPath}/${fileName}`;

        await this.ensureFolderExists(folderPath);

        const today = formatDate(new Date());
        const resolvedLabel = label ?? this.locale.archiveMoved;
        const header = [
            this.locale.archiveTitle(monthName, year),
            '',
            `> ${resolvedLabel}: ${today}`,
            '',
            '---',
            '',
        ].join('\n');

        // Сортируем по дате (пока ещё есть метаданные) — новые сверху
        const sortedTasks = [...tasks].sort((a, b) => {
            const dateA = extractMonthFromTask(a) ?? '';
            const dateB = extractMonthFromTask(b) ?? '';
            return dateB.localeCompare(dateA);
        });

        // Очищаем задачи: убираем чекбоксы и метаданные → простой список
        const cleanedTasks = sortedTasks.map(cleanTaskForArchive);

        const existingFile = this.app.vault.getAbstractFileByPath(filePath);
        if (existingFile) {
            await this.app.vault.modify(existingFile, header + cleanedTasks.join('\n') + '\n');
        } else {
            await this.app.vault.create(filePath, header + cleanedTasks.join('\n') + '\n');
        }
    }

    /** Создаёт все недостающие папки в пути */
    async ensureFolderExists(folderPath) {
        const parts = folderPath.split('/');
        let current = '';
        for (const part of parts) {
            if (!part) continue;
            current = current ? `${current}/${part}` : part;
            if (!this.app.vault.getAbstractFileByPath(current)) {
                try { await this.app.vault.createFolder(current); } catch (_) {}
            }
        }
    }

    // ─── Обработка файла задач ───────────────────────────────────────────────

    async processFile(file) {
        if (this.isProcessing) return;
        if (!this.settings.autoArchive) return;

        this.isProcessing = true;

        try {
            const content = await this.app.vault.read(file);
            let lines = content.split('\n');

            const idxArchive = lines.findIndex(line => line?.trim() === this.settings.archiveSectionName);
            if (idxArchive === -1) {
                console.warn(`SimplestTodo: секция '${this.settings.archiveSectionName}' не найдена`);
                new Notice(this.locale.noticeNoSection(this.settings.archiveSectionName));
                return;
            }

            // Собираем задачи для архивации из рабочих секций
            const tasksToArchive = [];
            for (const section of this.settings.sectionsToProcess) {
                const idxSection = lines.findIndex(l => l?.trim() === section);
                if (idxSection === -1) continue;

                const idxNextSection = lines.findIndex(
                    (l, i) => i > idxSection && l?.trim().startsWith('## ')
                );
                const endIndex = idxNextSection === -1 ? lines.length : idxNextSection;
                this.processSection(lines, idxSection, endIndex, tasksToArchive, section);
            }

            // Собираем задачи для возврата из архива
            const tasksToUnarchive = new Map();
            this.processArchiveSection(lines, idxArchive, tasksToUnarchive);

            if (tasksToArchive.length === 0 && tasksToUnarchive.size === 0) return;

            lines = lines.filter(l => l !== null && l.trim() !== '');

            // Вставляем задачи в ## Архив
            if (tasksToArchive.length > 0) {
                const newIdxArchive = lines.findIndex(l => l.trim() === '## Архив');
                if (newIdxArchive !== -1) {
                    const separatorIndex = lines.findIndex(
                        (l, i) => i > newIdxArchive && l.trim() === this.settings.sectionDivider
                    );
                    const insertPosition = separatorIndex !== -1 ? separatorIndex + 1 : newIdxArchive + 1;
                    const insertContent = separatorIndex === -1 ? ['', ...tasksToArchive] : tasksToArchive;
                    lines.splice(insertPosition, 0, ...insertContent);
                }
            }

            // Возвращаем задачи из архива
            for (const [task, targetSection] of tasksToUnarchive) {
                const sectionIndex = lines.findIndex(l => l.trim() === targetSection);
                const fallback = this.settings.sectionsToProcess.at(-1) ?? '## Без срока';
                const targetIdx = sectionIndex !== -1 ? sectionIndex : lines.findIndex(l => l.trim() === fallback);

                if (targetIdx !== -1) {
                    const separatorIndex = lines.findIndex(
                        (l, i) => i > targetIdx && l.trim() === this.settings.sectionDivider
                    );
                    const insertPos = separatorIndex !== -1 ? separatorIndex + 1 : targetIdx + 1;
                    lines.splice(insertPos, 0, task);
                }
            }

            await this.app.vault.modify(file, lines.join('\n'));

            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view?.file === file && view.getMode() === 'preview') {
                view.previewMode.rerender(true);
            }

            if (tasksToArchive.length > 0) {
                new Notice(this.locale.noticeDone(tasksToArchive.length), 3000);
            }
            if (tasksToUnarchive.size > 0) {
                new Notice(this.locale.noticeRestored(tasksToUnarchive.size), 3000);
            }

        } catch (error) {
            console.error('SimplestTodo: ошибка при обработке файла:', error);
            new Notice(this.locale.noticeError, 5000);
        } finally {
            this.isProcessing = false;
        }
    }

    processSection(lines, startIndex, endIndex, tasksToArchive, currentSection) {
        for (let i = startIndex + 1; i < endIndex; i++) {
            const line = lines[i]?.trim();
            if (line?.startsWith('- [x]')) {
                const currentDate = formatDate(new Date());
                // Новый формат: HTML-комментарий (не виден в Preview)
                const archivedTask = `${line} <!-- archived:${currentDate}|section:${currentSection} -->`;
                tasksToArchive.push(archivedTask);
                lines[i] = null;
            }
        }
    }

    processArchiveSection(lines, archiveIndex, tasksToUnarchive) {
        let i = archiveIndex + 1;
        while (i < lines.length && !lines[i]?.trim().startsWith('## ')) {
            const line = lines[i]?.trim();
            if (line?.startsWith('- [ ]')) {
                const metaMatch = line.match(/<!--\s*archived:(.*?)\|section:(.*?)\s*-->/);
                if (metaMatch) {
                    const originalSection = metaMatch[2].trim();
                    const cleanTask = line.replace(/<!--.*?-->/, '').replace(/^-\s*\[.\]\s*/, '- ').trim();
                    tasksToUnarchive.set(cleanTask, originalSection);
                    lines[i] = null;
                }
            }
            i++;
        }
    }

    onunload() {
        clearTimeout(this.processQueue);
        console.log('SimplestTodo выгружен');
    }
};

// ─── Вкладка настроек ─────────────────────────────────────────────────────

class SimplestTodoSettingsTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        const L = this.plugin.locale;

        containerEl.createEl('h2', { text: L.settingsTitle });

        // ── Language ──

        new Setting(containerEl)
            .setName(L.setLang)
            .setDesc(L.setLangDesc)
            .addDropdown(drop => drop
                .addOption('ru', 'Русский')
                .addOption('en', 'English')
                .setValue(this.plugin.settings.language ?? 'ru')
                .onChange(async (value) => {
                    this.plugin.settings.language = value;
                    await this.plugin.saveSettings();
                    this.display();
                }));

        // ── File ──

        containerEl.createEl('h3', { text: L.grpFile });

        new Setting(containerEl)
            .setName(L.setFilePath)
            .setDesc(L.setFilePathDesc)
            .addText(text => text
                .setPlaceholder(L.setFilePathPh)
                .setValue(this.plugin.settings.targetFilePath)
                .onChange(async (value) => {
                    this.plugin.settings.targetFilePath = value.trim();
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(L.setSections)
            .setDesc(L.setSectionsDesc)
            .addText(text => text
                .setPlaceholder(L.setSectionsPh)
                .setValue(this.plugin.settings.sectionsToProcess.join(', '))
                .onChange(async (value) => {
                    this.plugin.settings.sectionsToProcess = value.split(',').map(s => s.trim()).filter(Boolean);
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(L.setArcSection)
            .setDesc(L.setArcSectionDesc)
            .addText(text => text
                .setPlaceholder('## Архив')
                .setValue(this.plugin.settings.archiveSectionName)
                .onChange(async (value) => {
                    this.plugin.settings.archiveSectionName = value.trim();
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(L.setDivider)
            .setDesc(L.setDividerDesc)
            .addText(text => text
                .setPlaceholder('---')
                .setValue(this.plugin.settings.sectionDivider)
                .onChange(async (value) => {
                    this.plugin.settings.sectionDivider = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName(L.setDebounce)
            .setDesc(L.setDebounceDesc)
            .addText(text => text
                .setPlaceholder('500')
                .setValue(String(this.plugin.settings.debounceMs ?? 500))
                .onChange(async (value) => {
                    const num = parseInt(value, 10);
                    if (!isNaN(num) && num >= 100) {
                        this.plugin.settings.debounceMs = num;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName(L.setAuto)
            .setDesc(L.setAutoDesc)
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoArchive)
                .onChange(async (value) => {
                    this.plugin.settings.autoArchive = value;
                    await this.plugin.saveSettings();
                }));

        // ── Archive ──

        containerEl.createEl('h3', { text: L.grpArchive });
        containerEl.createEl('p', { text: L.setArcDesc, cls: 'setting-item-description' });

        new Setting(containerEl)
            .setName(L.setArcFolder)
            .setDesc(L.setArcFolderDesc)
            .addText(text => text
                .setPlaceholder(L.setArcFolderPh)
                .setValue(this.plugin.settings.archiveFolderPath)
                .onChange(async (value) => {
                    this.plugin.settings.archiveFolderPath = value.trim().replace(/\/$/, '');
                    await this.plugin.saveSettings();
                    updatePreview();
                }));

        new Setting(containerEl)
            .setName(L.setPrefix)
            .setDesc(L.setPrefixDesc)
            .addText(text => text
                .setPlaceholder(L.setPrefixPh)
                .setValue(this.plugin.settings.archiveFilePrefix)
                .onChange(async (value) => {
                    this.plugin.settings.archiveFilePrefix = value.trim();
                    await this.plugin.saveSettings();
                    updatePreview();
                }));

        const previewEl = containerEl.createEl('div', { cls: 'setting-item-description' });
        const updatePreview = () => {
            const month = getMonthKey(new Date());
            const name = buildArchiveFileName(this.plugin.settings.archiveFilePrefix, month, this.plugin.locale.months);
            previewEl.setText(L.setPreview(`${this.plugin.settings.archiveFolderPath}/${name}`));
        };
        updatePreview();

        new Setting(containerEl)
            .setName(L.setRolloverName)
            .setDesc(L.setRolloverDesc)
            .addButton(btn => btn
                .setButtonText(L.setRolloverBtn)
                .setCta()
                .onClick(async () => {
                    const month = getMonthKey(new Date());
                    await this.plugin.rolloverArchive(month);
                }));

        // ── Migration ──

        containerEl.createEl('h3', { text: L.grpMigration });
        containerEl.createEl('p', { text: L.setMigDesc, cls: 'setting-item-description' });

        new Setting(containerEl)
            .setName(L.setReorgName)
            .setDesc(L.setReorgDesc)
            .addButton(btn => btn
                .setButtonText(L.setReorgBtn)
                .setWarning()
                .onClick(async () => {
                    await this.plugin.reorganizeArchiveFolder();
                }));
    }
}
