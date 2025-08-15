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
				async message => {
					if (message.command === 'userMessage') {
						// Simulate thinking delay
						setTimeout(async () => {
							const editor = vscode.window.activeTextEditor;
							const selectedText = editor ? editor.document.getText(editor.selection) : undefined;
							const fileContent = editor ? editor.document.getText() : undefined;

							const intent = getIntention(message.text, { selectedText, fileContent });

							let response;
							switch (intent.type) {
								case 'explain':
									response = getAIResponse(`explain: ${intent.code}`);
									panel?.webview.postMessage({ command: 'aiResponse', text: response });
									break;
								case 'refactor':
									response = getAIResponse(`refactor: ${intent.instruction}\n---\n${intent.code}`);
									panel?.webview.postMessage({ command: 'aiResponse', text: response });
									break;
								case 'editFile':
									const newFileContent = getAIResponse(`editFile: ${intent.instruction}\n---\n${intent.fileContent}`);
									if (editor) {
										const edit = new vscode.WorkspaceEdit();
										const fullRange = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(intent.fileContent.length));
										edit.replace(editor.document.uri, fullRange, newFileContent);
										await vscode.workspace.applyEdit(edit);
										vscode.window.showInformationMessage('File edited by Sense AI.');
									}
									break;
								case 'generate':
									response = getAIResponse(`generate: ${intent.description}`);
									panel?.webview.postMessage({ command: 'aiResponse', text: response });
									break;
								case 'chat':
								default:
									if (intent.type === 'chat') {
										response = getAIResponse(intent.message, fileContent);
										panel?.webview.postMessage({ command: 'aiResponse', text: response });
									}
									break;
							}
						}, 300 + Math.random() * 400);
					}
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
}

import { getAIResponse, getIntention, AIContext } from './ai';

function getWebviewContent() {
	const htmlPath = path.join(__dirname, '..', 'src', 'webview.html');
	return fs.readFileSync(htmlPath, 'utf8');
}
