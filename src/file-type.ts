export default class FileType {
  static ts = new FileType("Typescript", ["ts"], "file-code", "nagular.goToTs");
  static html = new FileType("HTML", ["html"], "code", "nagular.goToHtml");
  static test = new FileType("Test", ["ts"], "beaker", "nagular.goToTest", "spec");
  static style = new FileType("Style", ["css", "scss", "less"], "symbol-color", "nagular.goToStyle");
  static allFileType = [FileType.ts, FileType.html, FileType.style, FileType.test];

  private _type = "";
  private _extensions: string[] = [];
  private _icon = "";
  private _command = "";
  private _prefix = "";

  constructor(type: string, extensions: string[], icon: string, command: string, prefix = "") {
    this._type = type;
    this._extensions = extensions;
    this._icon = icon;
    this._command = command;
    this._prefix = prefix;
  }

  get type(): string {
    return this._type;
  }
  get extensions(): string[] {
    return this._extensions;
  }
  get icon(): string {
    return this._icon;
  }
  get command(): string {
    return this._command;
  }
  get prefix(): string {
    return this._prefix;
  }

  /**
   * Get the file pattern for the current object.
   *
   * @return {string} The file pattern.
   */
  get filePattern(): string {
    let pattern = this.prefix ? `.${this.prefix}` : "";
    pattern += this.extensions.length === 1 ? `.${this.extensions[0]}` : `.{${this.extensions.join(",")}}`;
    return pattern;
  }

  /**
   * Determines if the given file name has the same type as the prefix and extensions specified.
   *
   * @param {string} fileName - The name of the file to check.
   * @return {boolean} True if the file name has the same type, false otherwise.
   */
  isSameTypeOfFile(fileName: string): boolean {
    if (this.prefix && (fileName.split(".").length <= 1 || fileName.split(".").at(-2) !== this.prefix)) {
      return false;
    }
    const ext = fileName.split(".").at(-1);
    return Boolean(ext && this.extensions.includes(ext));
  }
}
