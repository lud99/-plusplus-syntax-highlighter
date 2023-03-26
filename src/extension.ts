import * as vscode from 'vscode';

import util = require("node:util");
const exec = util.promisify(require("node:child_process").exec);
const spawn = require('child_process').spawn;

const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();

const exePath = "D:/Spel/Programming/C++/ÖPlusPlus/Debug/ÖPlusPlus.exe";
const exeDir = "D:/Spel/Programming/C++/ÖPlusPlus/Debug";
//const exeDirectory = workingDir + "/Debug";
const exeFilename = "ÖPlusPlus.exe";

function convertToVSCodeTokenTypes(compilerText: string): string {

	const table = new Map<string, string>();

	table.set("VoidType", "type");
	table.set("IntType", "type");
	table.set("FloatType", "type");
	table.set("DoubleType", "type");
	table.set("StringType", "type");

	table.set("IntLiteral", "number");
	table.set("FloatLiteral", "number");
	table.set("DoubleLiteral", "number");
	table.set("StringLiteral", "string");

	table.set("SingleLineComment", "comment");
	table.set("MultiLineComment", "comment");

	table.set("Add", "operator");
	table.set("Subtract", "operator");
	table.set("Multiply", "operator");
	table.set("Divide", "operator");
	table.set("PlusEquals", "operator");
	table.set("MinusEquals", "operator");

	table.set("SetEquals", "operator");
	table.set("CompareEquals", "operator");
	table.set("NotEquals", "operator");
	table.set("LessThan", "operator");
	table.set("GreaterThan", "operator");
	table.set("LessThanEqual", "operator");
	table.set("GreaterThanEqual", "operator");

	table.set("RightArrow", "operator");

	table.set("PostIncrement", "operator");
	table.set("PreIncrement", "operator");
	table.set("PostDecrement", "operator");
	table.set("PreDecrement", "operator");

	table.set("If", "keyword");
	table.set("Else", "keyword");
	table.set("While", "keyword");
	table.set("For", "keyword");
	table.set("Break", "keyword");
	table.set("Continue", "keyword");
	table.set("Return", "keyword");

	table.set("Variable", "variable");
	table.set("FunctionName", "function");

	/*
			"Variable",
	
			"Semicolon",
			"Comma",
			"Colon",
	
			"Add",
			"Subtract",
			"Multiply",
			"Divide",
			"PlusEquals",
			"MinusEquals",
	
			"SetEquals",
			"CompareEquals",
			"NotEquals",
			"LessThan",
			"GreaterThan",
			"LessThanEqual",
			"GreaterThanEqual",
	
			"RightArrow",
	
			"And",
			"Or",
			"Not",
			"LeftShift",
			"RightShift",
			"Xor",
			"Modulus",
	
			"PostIncrement",
			"PreIncrement",
			"PostDecrement",
			"PreDecrement",
	
			"LeftParentheses",
			"RightParentheses",
			"LeftCurlyBracket",
			"RightCurlyBracket",
			"LeftSquareBracket",
			"RightSquareBracket",
	
			"FunctionName",
	
			"If",
			"Else",
			"While",
			"For",
			"Break",
			"Continue",
			"Return",
			"Global"*/


	let s = "";

	if (table.has(compilerText))
		return table!.get(compilerText)!;
	else
		return "";
}

const legend = (function () {
	const tokenTypesLegend = [
		'comment', 'string', 'keyword', 'number', 'regexp', 'operator', 'namespace',
		'type', 'struct', 'class', 'interface', 'enum', 'typeParameter', 'function',
		'method', 'decorator', 'macro', 'variable', 'parameter', 'property', 'label'
	];
	tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));

	const tokenModifiersLegend = [
		'declaration', 'documentation', 'readonly', 'static', 'abstract', 'deprecated',
		'modification', 'async'
	];
	tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));

	return new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();

let cmd: any;
let abortController: any;
let quiet: boolean = true;

const commandHandlerRunAST = async () => {
	if (!vscode.window.activeTextEditor) return vscode.window.showErrorMessage("No active document to run");

	const text = vscode.window.activeTextEditor.document.getText();
	const filename = vscode.window.activeTextEditor.document.fileName.split("\\").slice(-1)[0];

	await executeCode(filename, text, "-ast");
};
const commandHandlerRunBytecode = async () => {
	if (!vscode.window.activeTextEditor) return vscode.window.showErrorMessage("No active document to run");

	const text = vscode.window.activeTextEditor.document.getText();
	const filename = vscode.window.activeTextEditor.document.fileName.split("\\").slice(-1)[0];

	await executeCode(filename, text, "-bytecode");
};
const commandHandlerRunASM = async () => {
	if (!vscode.window.activeTextEditor) return vscode.window.showErrorMessage("No active document to run");

	const text = vscode.window.activeTextEditor.document.getText();
	const filename = vscode.window.activeTextEditor.document.fileName.split("\\").slice(-1)[0];

	await executeCode(filename, text, "-asm");
};

const stopExecution = () => {
	if (abortController)
		abortController.abort();

	if (!cmd) 
	{
		vscode.window.showInformationMessage("No program to stop");
		return;
	}

	abortController.abort();
	cmd = null;
	abortController = new AbortController();

	vscode.window.showInformationMessage("Stopped the program");
	programOutput.appendLine("Stopped the program");
	programOutput.appendLine("");
};

let programOutput: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'ö' }, new DocumentSemanticTokensProvider(), legend));

	programOutput = vscode.window.createOutputChannel("Ö++ Program Output");

	context.subscriptions.push(vscode.commands.registerCommand('oplusplus-syntax-highlighter.runAST', commandHandlerRunAST));
	context.subscriptions.push(vscode.commands.registerCommand('oplusplus-syntax-highlighter.runBytecode', commandHandlerRunBytecode));
	context.subscriptions.push(vscode.commands.registerCommand('oplusplus-syntax-highlighter.runASM', commandHandlerRunASM));

	context.subscriptions.push(vscode.commands.registerCommand('oplusplus-syntax-highlighter.stop', stopExecution));

	context.subscriptions.push(vscode.commands.registerCommand('oplusplus-syntax-highlighter.setQuiet', () => quiet = true));
	context.subscriptions.push(vscode.commands.registerCommand('oplusplus-syntax-highlighter.setLoad', () => quiet = false));
}

interface IParsedToken {
	line: number;
	startCharacter: number;
	length: number;
	tokenType: string;
	tokenModifiers: string[];
}

const getLinesFromText = (text: string, extraQuotes: boolean = true) => {
	let lines = text.split("\n");

	// Escape string
	lines = lines.map(line => line.split("\"").join("\"\""));

	// Remove newlines
	lines = lines.map(line => line.split("\n").join(""));

	const lineArgs = lines.map(line => `"${line}"`);
	
	if (extraQuotes)
		return lines.map(line => `"${line}"`).join(" ");

	return lines.join(" ");
} 

const getLinesFromTextForSpawn = (text: string) => {
	let lines = text.split("\n");

	// Remove newlines and split with spaces inbetween
	const seperatedLines = lines.map(line => line.split("\n").join("")).join(" ");

	return seperatedLines;
} 

async function executeCode(filename: string, text: string, method: string, arg: string = "" ): Promise<void> {
	return new Promise((resolve, reject) => {
		let workspaceDir = "";
		if (vscode.workspace.workspaceFolders !== undefined) {
			workspaceDir = vscode.workspace.workspaceFolders[0].uri.fsPath ; 
		} 
		else {
			vscode.window.showErrorMessage("Working folder not found");
			return;
		}

		let methodString: string = "";
		if (method == "-ast") methodString = "AST Interpreter";
		if (method == "-bytecode") methodString = "Bytecode Interpreter";
		if (method == "-asm") methodString = "Assembly Compiler";

		if (cmd)
		{
			programOutput.appendLine(`Program already running, terminating it.`);
			abortController.abort();
			cmd = null;
		}

		programOutput.appendLine(`Running '${filename}' with the ${methodString}:`);

		abortController = new AbortController();

		cmd  = spawn(exeFilename, [method, quiet ? "-q" : "", "-buildDir", workspaceDir + "\\build", "-fc", getLinesFromTextForSpawn(text)], 
			{ cwd: exeDir, signal: abortController.signal });

		cmd.stdout.setEncoding("utf-8");
		cmd.stderr.setEncoding("utf-8");

		cmd.stdout.on('data', function(data: string) {
			data.split("\n").forEach(line => line != "" && programOutput.appendLine(`${line}`));
		});
	
		cmd.stderr.on('data', function(data: string) {
			programOutput.appendLine("error: " + data);

			vscode.window.showErrorMessage("Execution error: " + data);

			cmd = null;

			return reject(data);
		});
	
		cmd.on('close', function(code: any) {
			cmd = null;

			// peaceful termination
			if (code == null) {
				programOutput.appendLine("");
				return resolve();
			}

			if (code == 0)
			{
				programOutput.appendLine("Execution finished successfully");
				return resolve();
			}
			else
			{
				programOutput.appendLine("Execution finished unexpectedly with error code " + code);	
				return reject(code);
			}
		});
	});
}

async function getTokensFromCompiler(text: string, arg: string = "-tokens" ): Promise<string> {
	let stdout = "";
	try {
		let cmd = `${exePath} ${arg} -fc ${getLinesFromText(text)}`;

		const output = await exec(cmd, { timeout: 5000 });

		//console.log("Command:", cmd);
		//console.log("Output:", output.stdout);

		stdout = output.stdout;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (e: any) {
		//console.error(e);

		if (e.killed)
			vscode.window.showErrorMessage("Token generation timed out");
		//else
		//	programOutput.appendLine("Code error: " + e.stdout);
	}

	return stdout;
}

class DocumentSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
	async provideDocumentSemanticTokens(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.SemanticTokens> {
		const allTokens = await this._parseText(document.getText());
		const builder = new vscode.SemanticTokensBuilder();
		allTokens.forEach((token) => {
			builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), this._encodeTokenModifiers(token.tokenModifiers));
		});
		return builder.build();
	}

	private _encodeTokenType(tokenType: string): number {
		if (tokenTypes.has(tokenType)) {
			return tokenTypes.get(tokenType)!;
		} else if (tokenType === 'notInLegend') {
			return tokenTypes.size + 2;
		}
		return 0;
	}

	private _encodeTokenModifiers(strTokenModifiers: string[]): number {
		let result = 0;
		for (let i = 0; i < strTokenModifiers.length; i++) {
			const tokenModifier = strTokenModifiers[i];
			if (tokenModifiers.has(tokenModifier)) {
				result = result | (1 << tokenModifiers.get(tokenModifier)!);
			} else if (tokenModifier === 'notInLegend') {
				result = result | (1 << tokenModifiers.size + 2);
			}
		}
		return result;
	}

	private async _parseText(text: string): Promise<IParsedToken[]> {
		const r: IParsedToken[] = [];

		let compilerTokens = JSON.parse(await getTokensFromCompiler(text));

		let line = 0;
		let startOffset = 0;
		let lineStartIndex = 0;
		let prevLineLength = 0;

		for (let i = 0; i < compilerTokens.length; i++) {
			const token = compilerTokens[i];

			token.value = token.value.split("\n").join("\\n");
			//split("\r").join("\\r").
			//split("\"").join("\\\"");
			//split("\\").join("\\\\");

			let len = token.value.length;

			if (token.type == "StringLiteral")
				len += 2;
			if (token.type == "SingleLineComment")
				len += 2;

			if (i > 0 && compilerTokens[i - 1].type == "NewLine") {
				let delta = token.index - compilerTokens[i - 1].index;
				lineStartIndex = token.index - delta + 1;
			}

			if (token.type == "NewLine") {
				line++;

				let lineLength = token.index - lineStartIndex + 1;

				prevLineLength = token.index;

				startOffset += lineLength;

				continue;
			}

			if (convertToVSCodeTokenTypes(token.type) == "")
				continue;

			r.push({
				line: line,
				startCharacter: token.index - startOffset,
				length: len,
				tokenType: convertToVSCodeTokenTypes(token.type),
				tokenModifiers: []
			});
		};
		return r;
	}
}
