// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "sense" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('sense.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Sense!');
	});

	context.subscriptions.push(disposable);

	// Register a simple completion item provider
	const provider = vscode.languages.registerCompletionItemProvider(
		{ scheme: 'file', language: 'typescript' }, // Register for TypeScript files
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

	// Register a command to open the chat panel
	const chatDisposable = vscode.commands.registerCommand('sense.openChat', () => {
		const panel = vscode.window.createWebviewPanel(
			'senseChat',
			'Sense AI Chat',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true
			}
		);

		panel.webview.html = getWebviewContent();

		// Handle messages from the webview
		panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'userMessage':
						const userMessage = message.text;
						const aiResponse = getAIResponse(userMessage);
						panel.webview.postMessage({ command: 'aiResponse', text: aiResponse });
						return;
				}
			},
			undefined,
			context.subscriptions
		);
	});

	context.subscriptions.push(chatDisposable);
}

function getWebviewContent() {
	const htmlPath = path.join(__dirname, '..', 'src', 'webview.html');
	return fs.readFileSync(htmlPath, 'utf8');
}

function getAIResponse(message: string): string {
	return `You said: "${message}"`;
}
