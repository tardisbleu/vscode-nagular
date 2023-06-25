import * as vscode from 'vscode';
import { parse } from 'path';
import FileType from './fileType';

/**
 * Priority item
 */
let priorityItem = -90;
/**
 * Default item color
 */
const itemColorDefault = '#87CEFA';
/**
 * Selected item color
 */
const itemColorSelected = 'green';
/**
 * Not found item color
 */
const itemColorNotFound = 'red';

/**
 * Map of items
 */
const items = new Map<string, vscode.StatusBarItem>();

/**
 * Activates the extension and adds all file types to the status bar.
 *
 * @param {vscode.ExtensionContext} context - The extension context.
 * @return {void} This function does not return anything.
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('Nagular is start !');
	FileType.allFileType.forEach(el => {
		addItemToStatusBar(context, el);
	});
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(debounce(onChangeTextEditor)));
}

/**
 * Adds a new item to the VS Code status bar for the given file type with the
 * corresponding command and icon. Returns void.
 *
 * @param {vscode.ExtensionContext} context - The extension context object.
 * @param {FileType} fileType - An object representing the file type with the
 * corresponding command and icon.
 * @return {void}
 */
function addItemToStatusBar(context: vscode.ExtensionContext, fileType: FileType) {
	let cmd = vscode.commands.registerCommand(fileType.command , () => goToFile(fileType));
	context.subscriptions.push(cmd);
	let navStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, priorityItem--);
	navStatusBarItem.command = fileType.command;
	navStatusBarItem.text = `$(${fileType.icon})`;
	navStatusBarItem.color = itemColorDefault;
	context.subscriptions.push(navStatusBarItem);
	items.set(fileType.type, navStatusBarItem);
}

/**
 * Asynchronously goes to a file of the specified type based on the currently active text editor's URI,
 * and opens it in a new tab. If the file is found, shifts the tab to the left of the current active tab.
 *
 * @param {FileType} fileType - The type of file to go to.
 * @return {Promise<void>} A promise that resolves with no value.
 */
async function goToFile(fileType: FileType) {
	const uri = vscode.window.activeTextEditor?.document.uri.fsPath;
	if (!uri) {
		vscode.window.showInformationMessage('No file opened');
		return;
	}
	const path = parse(uri);
	const currentFileType = typeFile(`${path.name}${path.ext}`);
	if(currentFileType === null || currentFileType.type === fileType.type){
		return;
	}
	const pattern = new vscode.RelativePattern(path.dir, `${path.name.replace('.spec', '')}${fileType.prefixPattern}${fileType.extensionPattern}`);
	const uriToGo = await findOneFile(pattern);
	if(uriToGo) {
		const activeTabIndex = vscode.window.tabGroups.activeTabGroup.tabs.findIndex((tab) => tab.isActive);
		const doc = await vscode.workspace.openTextDocument(uriToGo);
		vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		await vscode.window.showTextDocument(doc, { preview: false });
		let tabIndex = vscode.window.tabGroups.activeTabGroup.tabs.findIndex((tab) => tab.isActive);
		const shift = tabIndex - activeTabIndex;
		for (let i = 0; i < shift; i++) {
			vscode.commands.executeCommand('workbench.action.moveEditorLeftInGroup');
		}
	}
}

/**
 * Finds the type of file based on the given file name by iterating over all
 * possible file types. Returns null if no type is found.
 *
 * @param {string} fileName - The name of the file to find the type for.
 * @return {FileType | null} - The type of the file, or null if no type is found.
 */
function typeFile(fileName: string): FileType | null {
	let matchType: FileType | null = null;
	FileType.allFileType.forEach(type => {
		if((!matchType || (!matchType.prefix && type.prefix)) && type.isSameTypeOfFile(fileName)) {
			matchType = type;
		}
	});
	return matchType;
}

/**
 * Finds a single file matching the given pattern in the current workspace.
 *
 * @param {vscode.RelativePattern} pattern - The pattern to match against.
 * @return {Promise<string | null>} A string containing the absolute file path
 * of the matched file, or null if no file was found.
 */
async function findOneFile(pattern: vscode.RelativePattern): Promise<string | null> {
	const listUriFile = await vscode.workspace.findFiles(pattern);
	return listUriFile.length === 1 ? listUriFile[0].fsPath : null;
}

/**
 * Executes when the text in the active code editor is changed. 
 * Hides all items if the document URI is invalid or does not include '.component.'.
 * If the document URI is valid, shows an item for each file type. 
 *
 * @return {void} This function does not return anything.
 */
function onChangeTextEditor() {
	const uri = vscode.window.activeTextEditor?.document.uri.fsPath;
	if(!uri || !uri.includes('.component.')) {
		items.forEach(el => {
			el.hide();
		});
		return;
	}
	const path = parse(uri);
	const currentFileType = typeFile(`${path.name}${path.ext}`);
	FileType.allFileType.forEach(async el => {
		const item = items.get(el.type);
		if(item) {
			if(currentFileType && currentFileType.type === el.type) {
				item.color = itemColorSelected;
			}else {
				const pattern = new vscode.RelativePattern(path.dir, `${path.name.replace('.spec', '')}${el.prefixPattern}${el.extensionPattern}`);
				const uriToGo = await findOneFile(pattern);
				item.color = uriToGo ? itemColorDefault : itemColorNotFound;
			}
			item.show();
		}
	});
}

/**
 * Returns a debounced version of the given function. 
 * 
 * @template T The function's argument types.
 * @param func The function to debounce.
 * @param timeout The debounce timeout in milliseconds (default 250ms).
 * @returns A new debounced function.
 */
function debounce<T extends unknown[]>(func: (...args: T) => void, timeout = 250): (...args: T) => void {
	let timer: ReturnType<typeof setTimeout>;
	return (...args: T) => {
	  clearTimeout(timer);
	  timer = setTimeout(() => { func.apply(null, args); }, timeout);
	};
}
