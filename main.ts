import { App, MarkdownView, WorkspaceLeaf, Plugin, PluginSettingTab, Setting, FrontMatterCache, debounce } from 'obsidian';

interface PerfileConfigsSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: PerfileConfigsSettings = {
	mySetting: 'default'
}

type PerfileConfigHandler = (app: App, leaf: WorkspaceLeaf, value: any) => void;

// Given a pane, find the content of the open file and return its frontmatter
// if any.
function getFrontMatter(leaf: WorkspaceLeaf): FrontMatterCache {
	let view = leaf.view instanceof MarkdownView ? leaf.view : null;
	if (!view) {
		return null;
	}
	const fileCache = this.app.metadataCache.getFileCache(view.file);
	return fileCache.frontmatter;
}

// List all leaves.
function getOpenLeaves(app: App): WorkspaceLeaf[] {
	let leaves: WorkspaceLeaf[] = [];
	app.workspace.iterateAllLeaves((leaf) => {
		let view = leaf.view instanceof MarkdownView ? leaf.view : null;
		if (view) {
			leaves.push(leaf);
		}
	})
	return leaves;
}

function setViewState(leaf: WorkspaceLeaf, mode: string) {
	let state = leaf.getViewState();
	if (mode === "source") {
		state.state.mode = mode;
		state.state.source = true;
	} else if (mode === "live") {
		state.state.mode = "source";
		state.state.source = false;
	} else if (mode === "preview") {
		state.state.mode = "preview";
	}
	leaf.setViewState(state);
}

// default utility: set viewmode based on yaml key 'viewmode'; defaults to
// Ob default if passed in null for value.
function viewStateHandler(app: App, leaf: WorkspaceLeaf, value: any): void {
	if (value) {
		setViewState(leaf, value);
	} else {
		let config = app.vault.config;
		// @ts-ignore
		if ("preview" === config.defaultViewMode) {
			setViewState(leaf, "preview");
		} else {
			setViewState(leaf, config.livePreview ? "live" : "source");
		}
	}
}

// special case -- switching panes should _NOT_ revert setting.
function pinStateHandler(_: App, leaf: WorkspaceLeaf, value: any): void {
	if (value) {
		leaf.setPinned(true);
	}
}

function directionHandler(_: App, leaf: WorkspaceLeaf, value: any): void {
	if (value) {
		// @ts-ignore; unexported
		leaf.containerEl.style.direction = 'rtl';
	} else {
		// @ts-ignore
		leaf.containerEl.style.direction = 'ltr';
	}
}

export default class PerfileConfigsPlugin extends Plugin {
	settings: PerfileConfigsSettings;

	MAIN_KEY = "perfile_configs";

	// on null value, the ConfigHandler should _reset_ the leaf for non-customized usage.
	frontmatterKeyRecords = new Map<string, PerfileConfigHandler>();

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new PerfileConfigsSettingTab(this.app, this));

		this.frontmatterKeyRecords.set("viewmode", viewStateHandler);
		this.frontmatterKeyRecords.set("pinned", pinStateHandler);
		this.frontmatterKeyRecords.set("rtl", directionHandler);

		const updateLeaves = async (): Promise<void> => {
			var leaves = getOpenLeaves(this.app);
			for (let leaf of leaves) {
				let frontmatter = getFrontMatter(leaf);
				let options = frontmatter && this.MAIN_KEY in frontmatter ? frontmatter[this.MAIN_KEY] : {};
				for (let p of this.frontmatterKeyRecords.entries()) {
					if (options[p[0]]) {
						p[1](this.app, leaf, options[p[0]]);
					} else {
						p[1](this.app, leaf, null);
					}
				}
			}
		}

		// register on leaf change; whenever a view changes, the view should be checked
		// for potential updates.
		this.registerEvent(
			this.app.workspace.on(
				'active-leaf-change',
				debounce(updateLeaves, 0)));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class PerfileConfigsSettingTab extends PluginSettingTab {
	plugin: PerfileConfigsPlugin;

	constructor(app: App, plugin: PerfileConfigsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
