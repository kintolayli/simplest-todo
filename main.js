'use strict';
const { Notice, Plugin, PluginSettingTab, Setting, MarkdownView, TFile } = require('obsidian');

// ─── Константы ────────────────────────────────────────────────────────────

const MONTHS_RU = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// ─── Вспомогательные функции ───────────────────────────────────────────────

/** Возвращает ключ месяца в формате "YYYY-MM" */
function getMonthKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

/** Формирует имя файла месячного архива */
function buildArchiveFileName(prefix, monthKey) {
    const [year, month] = monthKey.split('-');
    const monthName = MONTHS_RU[parseInt(month, 10) - 1];
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
        this.addRibbonIcon('archive', 'Архивировать выполненные задачи', async () => {
            await this.runManualArchive();
        });

        // Команды в палитре (Ctrl+P)
        this.addCommand({
            id: 'archive-completed-tasks',
            name: 'Архивировать выполненные задачи',
            callback: async () => await this.runManualArchive()
        });

        this.addCommand({
            id: 'rollover-monthly-archive',
            name: 'Перенести архив в месячный файл (вручную)',
            callback: async () => {
                const month = getMonthKey(new Date());
                await this.rolloverArchive(month);
            }
        });

        this.addCommand({
            id: 'reorganize-archive-folder',
            name: 'Реорганизовать архив по месяцам (миграция)',
            callback: async () => await this.reorganizeArchiveFolder()
        });

        this.addSettingTab(new SimplestTodoSettingsTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({
            targetFilePath: '00 - Input/000 - Задачи.md',
            sectionsToProcess: ['## Ближайшее время', '## Без срока'],
            sectionDivider: '---',
            autoArchive: true,
            debounceMs: 500,
            archiveFolderPath: '00 - Input/Архив',
            archiveFilePrefix: 'Задачи',
            lastArchivedMonth: ''
        }, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // ─── Ручной запуск ──────────────────────────────────────────────────────

    async runManualArchive() {
        const file = this.app.vault.getAbstractFileByPath(this.settings.targetFilePath);
        if (!file) {
            new Notice('❌ Файл задач не найден! Проверьте путь в настройках.');
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
            return `${MONTHS_RU[parseInt(m, 10) - 1]} ${y}`;
        }).join(', ');

        new Notice(
            `📦 Перенесено в архив: ${totalWritten} ${plural(totalWritten, 'задача', 'задачи', 'задач')}\n` +
            `Файлы: ${monthList}`,
            6000
        );
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
            new Notice(`❌ Папка архива не найдена: "${folderPath}"\nПроверьте настройки плагина.`, 6000);
            return;
        }

        const mdFiles = folder.children.filter(f => f instanceof TFile && f.extension === 'md');
        if (mdFiles.length === 0) {
            new Notice('📂 Архивная папка пуста — нечего реорганизовывать');
            return;
        }

        new Notice(`🔄 Читаю ${mdFiles.length} файлов архива...`, 2000);

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
            new Notice('🔍 Задачи с распознаваемыми датами не найдены');
            return;
        }

        // Перемещаем старые файлы в корзину (безопасно, можно восстановить)
        for (const file of mdFiles) {
            await this.app.vault.trash(file, true);
        }

        // Создаём правильные месячные файлы (сортируем по дате)
        const sortedMonths = [...tasksByMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
        for (const [monthKey, tasks] of sortedMonths) {
            await this.writeToMonthlyArchiveFromScratch(monthKey, tasks, '🔀 Реорганизовано');
        }

        // Задачи без дат — в текущий месяц
        if (noDateTasks.length > 0) {
            const currentMonth = getMonthKey(new Date());
            await this.writeToMonthlyArchiveFromScratch(currentMonth, noDateTasks, '🔀 Реорганизовано (без даты)');
        }

        const totalTasks = [...tasksByMonth.values()].reduce((s, a) => s + a.length, 0) + noDateTasks.length;
        const monthNames = sortedMonths.map(([mk]) => {
            const [y, m] = mk.split('-');
            return `${MONTHS_RU[parseInt(m, 10) - 1]} ${y}`;
        });

        new Notice(
            `✅ Реорганизация завершена!\n` +
            `${totalTasks} ${plural(totalTasks, 'задача', 'задачи', 'задач')} → ${tasksByMonth.size} файлов:\n` +
            monthNames.join(', '),
            8000
        );
    }

    // ─── Запись месячных файлов ───────────────────────────────────────────────

    /** Создаёт или дополняет месячный файл архива */
    async writeToMonthlyArchive(monthKey, tasks) {
        const [year, month] = monthKey.split('-');
        const monthName = MONTHS_RU[parseInt(month, 10) - 1];
        const fileName = buildArchiveFileName(this.settings.archiveFilePrefix, monthKey);
        const folderPath = this.settings.archiveFolderPath.replace(/\/$/, '');
        const filePath = `${folderPath}/${fileName}`;

        await this.ensureFolderExists(folderPath);

        const today = new Date().toLocaleDateString('ru-RU');
        const existingFile = this.app.vault.getAbstractFileByPath(filePath);

        // Очищаем задачи: убираем чекбоксы и метаданные → простой список
        const cleanedTasks = tasks.map(cleanTaskForArchive);

        if (existingFile) {
            const existing = await this.app.vault.read(existingFile);
            const separator = `\n\n> Дополнено ${today}\n\n`;
            await this.app.vault.modify(existingFile, existing.trimEnd() + separator + cleanedTasks.join('\n') + '\n');
        } else {
            const header = [
                `# Архив задач — ${monthName} ${year}`,
                '',
                `> Перенесено: ${today}`,
                '',
                '---',
                '',
            ].join('\n');
            await this.app.vault.create(filePath, header + cleanedTasks.join('\n') + '\n');
        }
    }

    /** Создаёт месячный файл заново (для команды реорганизации) */
    async writeToMonthlyArchiveFromScratch(monthKey, tasks, label = 'Перенесено') {
        const [year, month] = monthKey.split('-');
        const monthName = MONTHS_RU[parseInt(month, 10) - 1];
        const fileName = buildArchiveFileName(this.settings.archiveFilePrefix, monthKey);
        const folderPath = this.settings.archiveFolderPath.replace(/\/$/, '');
        const filePath = `${folderPath}/${fileName}`;

        await this.ensureFolderExists(folderPath);

        const today = new Date().toLocaleDateString('ru-RU');
        const header = [
            `# Архив задач — ${monthName} ${year}`,
            '',
            `> ${label}: ${today}`,
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

            const idxArchive = lines.findIndex(line => line?.trim() === '## Архив');
            if (idxArchive === -1) {
                console.warn("SimplestTodo: секция '## Архив' не найдена");
                new Notice("⚠️ Секция '## Архив' не найдена в файле задач");
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
                new Notice(`✅ Архивировано: ${tasksToArchive.length} ${plural(tasksToArchive.length, 'задача', 'задачи', 'задач')}`, 3000);
            }
            if (tasksToUnarchive.size > 0) {
                new Notice(`↩️ Восстановлено: ${tasksToUnarchive.size} ${plural(tasksToUnarchive.size, 'задача', 'задачи', 'задач')}`, 3000);
            }

        } catch (error) {
            console.error('SimplestTodo: ошибка при обработке файла:', error);
            new Notice('❌ Ошибка архивации. Подробности в консоли (Ctrl+Shift+I)', 5000);
        } finally {
            this.isProcessing = false;
        }
    }

    processSection(lines, startIndex, endIndex, tasksToArchive, currentSection) {
        for (let i = startIndex + 1; i < endIndex; i++) {
            const line = lines[i]?.trim();
            if (line?.startsWith('- [x]')) {
                const currentDate = new Date().toLocaleDateString('ru-RU');
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
                    const cleanTask = line.replace(/<!--.*?-->/, '').trim();
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

        containerEl.createEl('h2', { text: '⚙️ SimplestTodo — Настройки' });

        // ── Основной файл задач ──

        containerEl.createEl('h3', { text: 'Файл задач' });

        new Setting(containerEl)
            .setName('Путь к файлу задач')
            .setDesc('Путь относительно корня хранилища')
            .addText(text => text
                .setPlaceholder('00 - Input/000 - Задачи.md')
                .setValue(this.plugin.settings.targetFilePath)
                .onChange(async (value) => {
                    this.plugin.settings.targetFilePath = value.trim();
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Обрабатываемые секции')
            .setDesc('Заголовки через запятую')
            .addText(text => text
                .setPlaceholder('## Ближайшее время, ## Без срока')
                .setValue(this.plugin.settings.sectionsToProcess.join(', '))
                .onChange(async (value) => {
                    this.plugin.settings.sectionsToProcess = value.split(',').map(s => s.trim()).filter(Boolean);
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Разделитель секций')
            .setDesc('Маркер вставки задач (по умолчанию ---)')
            .addText(text => text
                .setPlaceholder('---')
                .setValue(this.plugin.settings.sectionDivider)
                .onChange(async (value) => {
                    this.plugin.settings.sectionDivider = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Задержка обработки (мс)')
            .setDesc('Дебаунс после изменения файла')
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
            .setName('Автоматическая архивация')
            .setDesc('Переносить выполненные задачи в архив при изменении файла')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoArchive)
                .onChange(async (value) => {
                    this.plugin.settings.autoArchive = value;
                    await this.plugin.saveSettings();
                }));

        // ── Месячный архив ──

        containerEl.createEl('h3', { text: 'Месячный архив' });

        containerEl.createEl('p', {
            text: 'По окончании месяца задачи переносятся в отдельный файл, сгруппированный по реальной дате архивации.',
            cls: 'setting-item-description'
        });

        new Setting(containerEl)
            .setName('Папка архивных файлов')
            .setDesc('Путь к папке, куда сохраняются месячные архивы')
            .addText(text => text
                .setPlaceholder('00 - Input/Архив')
                .setValue(this.plugin.settings.archiveFolderPath)
                .onChange(async (value) => {
                    this.plugin.settings.archiveFolderPath = value.trim().replace(/\/$/, '');
                    await this.plugin.saveSettings();
                    updatePreview();
                }));

        new Setting(containerEl)
            .setName('Префикс имени файла')
            .setDesc('Префикс → "Префикс - 2026-04 - Апрель.md". Можно задать "00 - Задачи".')
            .addText(text => text
                .setPlaceholder('Задачи')
                .setValue(this.plugin.settings.archiveFilePrefix)
                .onChange(async (value) => {
                    this.plugin.settings.archiveFilePrefix = value.trim();
                    await this.plugin.saveSettings();
                    updatePreview();
                }));

        // Превью имени файла
        const previewEl = containerEl.createEl('div', { cls: 'setting-item-description' });
        const updatePreview = () => {
            const month = getMonthKey(new Date());
            const name = buildArchiveFileName(this.plugin.settings.archiveFilePrefix, month);
            previewEl.setText(`📄 Пример: ${this.plugin.settings.archiveFolderPath}/${name}`);
        };
        updatePreview();

        new Setting(containerEl)
            .setName('Перенести архив прямо сейчас')
            .setDesc('Вручную перенести задачи из ## Архив в месячный файл')
            .addButton(btn => btn
                .setButtonText('Перенести')
                .setCta()
                .onClick(async () => {
                    const month = getMonthKey(new Date());
                    await this.plugin.rolloverArchive(month);
                }));

        // ── Миграция ──

        containerEl.createEl('h3', { text: 'Миграция архива' });

        containerEl.createEl('p', {
            text: '⚠️ Реорганизует ВСЕ файлы в папке архива: группирует задачи по реальным датам архивации. Старые файлы перемещаются в корзину Obsidian (можно восстановить).',
            cls: 'setting-item-description'
        });

        new Setting(containerEl)
            .setName('Реорганизовать архив по месяцам')
            .setDesc('Запустить один раз для исправления существующего архива')
            .addButton(btn => btn
                .setButtonText('🔀 Реорганизовать')
                .setWarning()
                .onClick(async () => {
                    await this.plugin.reorganizeArchiveFolder();
                }));
    }
}