import * as vscode from 'vscode';
import * as fs from 'fs';
import { TextDocument, Position, ProviderResult, Location, Uri } from 'vscode';
import { parse, resolve } from 'path';

export class AngularDefinitionProvider implements vscode.DefinitionProvider {
    textRangeRegex = /[\w./-]+/;

    provideDefinition(document: TextDocument, position: Position): ProviderResult<Location> {
    const currentLine = document.lineAt(position.line).text;
    
    if (!currentLine.includes('templateUrl') && !currentLine.includes('styleUrls')) {
        return null;
    }
    
    const wordRange = document.getWordRangeAtPosition(position, this.textRangeRegex);
    const clickedWord = document.getText(wordRange);
    
    const filePath = parse(document.fileName);
    const definitionUri = resolve(filePath.dir, clickedWord);
    
    return fs.existsSync(definitionUri) ? new Location(Uri.file(definitionUri), new Position(0, 0)) : null;
    }
}