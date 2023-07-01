import * as vscode from 'vscode';
import { parse } from 'path';
import FileType from './file-type';
import { AngularDefinitionProvider } from './angular-definition-provider';
import { AngularHtmlDefinitionProvider } from './angular-html-definition-provider';


/**
 * Activates the extension.
 *
 * @param {vscode.ExtensionContext} context - The extension context.
 * @return {void} No return value.
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('Nagular is start !');
	FileType.allFileType.forEach(el => {
		let cmd = vscode.commands.registerCommand(el.command , () => goToFile(el));
		context.subscriptions.push(cmd);
	});
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(debounce(onChangeTextEditor)));
	onChangeTextEditor();
	const angularRegistration = vscode.languages.registerDefinitionProvider(
		{
		  language: 'typescript',
		  pattern: '**/*.component.ts',
		  scheme: 'file',
		},
		new AngularDefinitionProvider(),
	);
	context.subscriptions.push(angularRegistration);
	const angularHtmlRegistration = vscode.languages.registerDefinitionProvider(
		{
		  language: 'html',
		  pattern: '**/*.component.html',
		  scheme: 'file',
		},
		new AngularHtmlDefinitionProvider(),
	);
	context.subscriptions.push(angularHtmlRegistration);
}


/**
 * Goes to a file of the specified type.
 *
 * @param {FileType} fileType - The type of file to go to.
 * @return {Promise<void>} - A promise that resolves when the file is opened.
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
	const pattern = new vscode.RelativePattern(path.dir, `${path.name.replace('.spec', '')}${fileType.filePattern}`);
	const uriToGo = await findOneFile(pattern);
	if(uriToGo) {
		const doc = await vscode.workspace.openTextDocument(uriToGo);
		await vscode.window.showTextDocument(doc, { preview: false });
	} else {
		vscode.window.showInformationMessage('Cannot find file to open');
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
 * Executes when the text in the editor changes.
 *
 * @param {void} None
 * @return {void} None
 */
function onChangeTextEditor() {
	const uri = vscode.window.activeTextEditor?.document.uri.fsPath;
	vscode.commands.executeCommand('setContext', 'nagular.showActionButton', uri && (uri.includes('.component.') ||  uri.includes('.directive.') || uri.includes('.pipe.') || uri.includes('.service.'))); 
}

/**
 * Returns a debounced version of the given function. 
 * 
 * @template T The function's argument types.
 * @param func The function to debounce.
 * @param timeout The debounce timeout in milliseconds (default 200ms).
 * @returns A new debounced function.
 */
function debounce<T extends unknown[]>(func: (...args: T) => void, timeout = 200): (...args: T) => void {
	let timer: ReturnType<typeof setTimeout>;
	return (...args: T) => {
	  clearTimeout(timer);
	  timer = setTimeout(() => { func.apply(null, args); }, timeout);
	};
}
