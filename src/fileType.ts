export default class FileType {
    static ts = new FileType('Typescript', ['ts'], 'file-code', 'nagular.goToTs');
    static test = new FileType('Test', ['ts'], 'beaker', 'nagular.goToTest', 'spec');
    static html = new FileType('HTML', ['html'], 'code', 'nagular.goToHtml');
    static style = new FileType('Style', ['css', 'scss', 'less'], 'symbol-color', 'nagular.goToStyle');
    static allFileType = [FileType.ts, FileType.test, FileType.html, FileType.style];

	private _type: string = '';
	private _extensions: string[] = [];
	private _icon: string = '';
	private _command: string = '';
    private _prefix: string = '';

	constructor(type: string, extensions: string[], icon: string, command: string, prefix = '') {
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
    get prefixPattern(): string {
        return this.prefix ? `.${this.prefix}` : '';
    }
    get extensionPattern(): string {
        return this.extensions.length === 1 ? `.${this.extensions[0]}` : `.{${this.extensions.join(',')}}`;
    }

    isSameTypeOfFile(fileName: string): boolean {
        if(this.prefix && (fileName.split('.').length <= 1 || fileName.split('.').at(-2) !== this.prefix)) {
            return false;
        }
        const ext = fileName.split('.').at(-1);
        return Boolean(ext && this.extensions.includes(ext));
    }
}