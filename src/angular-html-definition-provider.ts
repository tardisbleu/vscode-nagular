import * as vscode from "vscode";
import { TextDocument, Uri, Position, Location } from "vscode";

export class AngularHtmlDefinitionProvider implements vscode.DefinitionProvider {
  async provideDefinition(document: TextDocument, position: Position): Promise<Location | null> {
    const clickedTag = document.getText(document.getWordRangeAtPosition(position));
    const findTagInDocumentRegex = new RegExp(`selector:\\s?(['"])\\[?${clickedTag}\\]?\\1`, "i");

    const tsFiles = await vscode.workspace.findFiles("{**/*.component.ts,**/*.directive.ts}", "node_modules/*");

    const mappedTsFiles = await Promise.all(
      tsFiles.map(async (file) => {
        const document = await vscode.workspace.openTextDocument(Uri.file(file.fsPath));
        const tagMatch = findTagInDocumentRegex.test(document.getText());
        let lineNumber = tagMatch ? 0 : -1;

        if (tagMatch) {
          const componentName = clickedTag.substring(clickedTag.indexOf("-")).replace(/-/g, "").toLowerCase();
          const lines = document.getText().split("\n");
          lineNumber = lines.findIndex((line) => line.includes("class") && line.toLowerCase().includes(componentName));
        }

        return {
          path: file.fsPath,
          match: tagMatch,
          lineNumber,
          colNumber: 0,
        };
      }),
    );

    const matchedTsFileObject = mappedTsFiles.find((mo) => mo.match);
    return matchedTsFileObject
      ? new Location(
          Uri.file(matchedTsFileObject.path),
          new Position(matchedTsFileObject.lineNumber, matchedTsFileObject.colNumber),
        )
      : null;
  }
}
