// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
let panel: vscode.WebviewPanel | undefined = undefined;

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "sense" is now active!');

	const helloWorldDisposable = vscode.commands.registerCommand('sense.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Sense!');
	});
	context.subscriptions.push(helloWorldDisposable);

	const provider = vscode.languages.registerCompletionItemProvider(
		{ scheme: 'file', language: 'typescript' },
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				const linePrefix = document.lineAt(position).text.substr(0, position.character);
				if (!linePrefix.endsWith('log')) {
					return undefined;
				}
				const consoleLogCompletion = new vscode.CompletionItem('console.log');
				consoleLogCompletion.insertText = new vscode.SnippetString('console.log(${1:message});');
				consoleLogCompletion.documentation = new vscode.MarkdownString('Inserts a `console.log` statement.');
				consoleLogCompletion.kind = vscode.CompletionItemKind.Snippet;
				return [consoleLogCompletion];
			}
		}
	);
	context.subscriptions.push(provider);

	const openChatDisposable = vscode.commands.registerCommand('sense.openChat', () => {
		if (panel) {
			panel.reveal(vscode.ViewColumn.Beside);
		} else {
			panel = vscode.window.createWebviewPanel(
				'senseChat',
				'Sense AI Chat',
				vscode.ViewColumn.Beside,
				{ enableScripts: true }
			);

			panel.webview.html = getWebviewContent();

			panel.webview.onDidReceiveMessage(
				message => {
					// Simulate thinking delay
					setTimeout(() => {
						switch (message.command) {
							case 'userMessage':
								const editor = vscode.window.activeTextEditor;
								const editorContent = editor ? editor.document.getText() : '';
								const userMessage = message.text;
								const aiResponse = getAIResponse(userMessage, editorContent);
								panel?.webview.postMessage({ command: 'aiResponse', text: aiResponse });
								return;
							case 'explainCode':
								const codeToExplain = message.text;
								const explanation = getAIResponse(`explain: ${codeToExplain}`);
								panel?.webview.postMessage({ command: 'aiResponse', text: explanation });
								return;
						}
					}, 300 + Math.random() * 400);
				},
				undefined,
				context.subscriptions
			);

			panel.onDidDispose(() => {
				panel = undefined;
			}, null, context.subscriptions);
		}
	});
	context.subscriptions.push(openChatDisposable);

	const explainCodeDisposable = vscode.commands.registerCommand('sense.explainCode', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const selection = editor.selection;
			const selectedText = editor.document.getText(selection);
			if (selectedText) {
				vscode.commands.executeCommand('sense.openChat').then(() => {
					panel?.webview.postMessage({ command: 'explainCode', text: selectedText });
				});
			} else {
				vscode.window.showInformationMessage('Please select some code to explain.');
			}
		}
	});
	context.subscriptions.push(explainCodeDisposable);

	const generateCodeDisposable = vscode.commands.registerCommand('sense.generateCode', async () => {
		const description = await vscode.window.showInputBox({
			prompt: 'What code would you like to generate?',
			placeHolder: 'e.g., a javascript function that returns hello world'
		});

		if (description) {
			await vscode.commands.executeCommand('sense.openChat');
			panel?.webview.postMessage({ command: 'showUserMessage', text: `Generate code for: ${description}` });
			const generatedCode = getAIResponse(`generate: ${description}`);
			panel?.webview.postMessage({ command: 'aiResponse', text: generatedCode });
		}
	});
	context.subscriptions.push(generateCodeDisposable);

	const refactorCodeDisposable = vscode.commands.registerCommand('sense.refactorCode', async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const selection = editor.selection;
			const selectedText = editor.document.getText(selection);
			if (selectedText) {
				const instruction = await vscode.window.showInputBox({
					prompt: 'How should I refactor this code?',
					placeHolder: 'e.g., add comments, convert to arrow function'
				});

				if (instruction) {
					await vscode.commands.executeCommand('sense.openChat');
					const fullRequest = `Refactor this code: \n\`\`\`\n${selectedText}\n\`\`\`\nWith the following instruction: "${instruction}"`;
					panel?.webview.postMessage({ command: 'showUserMessage', text: fullRequest });

					const refactoredCode = getAIResponse(`refactor: ${instruction}\n---\n${selectedText}`);
					panel?.webview.postMessage({ command: 'aiResponse', text: refactoredCode });
				}
			} else {
				vscode.window.showInformationMessage('Please select some code to refactor.');
			}
		}
	});
	context.subscriptions.push(refactorCodeDisposable);

	const editCodeDisposable = vscode.commands.registerCommand('sense.editCode', async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const instruction = await vscode.window.showInputBox({
				prompt: 'How should I edit this file?',
				placeHolder: 'e.g., add JSDoc comments to all functions'
			});

			if (instruction) {
				const document = editor.document;
				const fileContent = document.getText();

				const newFileContent = getAIResponse(`editFile: ${instruction}\n---\n${fileContent}`);

				const edit = new vscode.WorkspaceEdit();
				const fullRange = new vscode.Range(
					document.positionAt(0),
					document.positionAt(fileContent.length)
				);
				edit.replace(document.uri, fullRange, newFileContent);

				await vscode.workspace.applyEdit(edit);
				vscode.window.showInformationMessage('File edited by Sense AI.');
			}
		} else {
			vscode.window.showInformationMessage('Please open a file to edit.');
		}
	});
	context.subscriptions.push(editCodeDisposable);
}

import { getAIResponse } from './ai';

function getWebviewContent() {
	const htmlPath = path.join(__dirname, '..', 'src', 'webview.html');
	return fs.readFileSync(htmlPath, 'utf8');
}
