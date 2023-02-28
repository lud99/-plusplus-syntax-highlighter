import * as vscode from 'vscode';

import util = require("node:util");
const exec = util.promisify(require("node:child_process").exec);

const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();

const exePath = "D:/Spel/Programming/C++/ÖPlusPlus/Debug/ÖPlusPlus.exe";

function convertToVSCodeTokenTypes (compilerText: string): string {

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

const legend = (function() {
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

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'ö' }, new DocumentSemanticTokensProvider(), legend));
}

interface IParsedToken {
	line: number;
	startCharacter: number;
	length: number;
	tokenType: string;
	tokenModifiers: string[];
}

async function runCompiler(
    text: string
): Promise<string> {
    let stdout = "";
    try {

		let lines = text.split("\n");
		
		// Escape string
		lines = lines.map(line => line.split("\"").join("\"\"")); 

		// Remove newlines
		lines = lines.map(line => line.split("\n").join(""));

		const lineArgs = lines.map(line => `"${line}"`).join(" ");

		let cmd = `${exePath} -tokens ${lineArgs}`;
        

		console.log(cmd);

		const output = await exec(cmd);

		console.log(output);

        stdout = output.stdout;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
       console.error(e);
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

		let compilerTokens = JSON.parse(await runCompiler(text));

		console.log(compilerTokens);

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

		/*const lines = text.split(/\r\n|\r|\n/);
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			let currentOffset = 0;
			do {
				const openOffset = line.indexOf('[', currentOffset);
				if (openOffset === -1) {
					break;
				}
				const closeOffset = line.indexOf(']', openOffset);
				if (closeOffset === -1) {
					break;
				}
				const tokenData = this._parseTextToken(line.substring(openOffset + 1, closeOffset));
				r.push({
					line: i,
					startCharacter: openOffset + 1,
					length: closeOffset - openOffset - 1,
					tokenType: tokenData.tokenType,
					tokenModifiers: tokenData.tokenModifiers
				});
				currentOffset = closeOffset;
			} while (true);
		}*/
		return r;
	}

	private _parseTextToken(text: string): { tokenType: string; tokenModifiers: string[]; } {
		const parts = text.split('.');
		return {
			tokenType: parts[0],
			tokenModifiers: parts.slice(1)
		};
	}
}
