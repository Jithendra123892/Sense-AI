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
									if (editor && selectedText) {
										const refactoredCode = getAIResponse(`refactor: ${intent.instruction}\n---\n${intent.code}`);
										const edit = new vscode.WorkspaceEdit();
										edit.replace(editor.document.uri, editor.selection, refactoredCode);
										await vscode.workspace.applyEdit(edit);
										panel?.webview.postMessage({ command: 'aiResponse', text: "I've applied the refactoring to your selection." });
									} else {
										panel?.webview.postMessage({ command: 'aiResponse', text: "Please select code to refactor." });
									}
									break;
								case 'insertCode':
									if (editor) {
										const codeToInsert = getAIResponse(`insertCode: ${intent.description}`);
										const edit = new vscode.WorkspaceEdit();
										edit.insert(editor.document.uri, editor.selection.active, codeToInsert);
										await vscode.workspace.applyEdit(edit);
										panel?.webview.postMessage({ command: 'aiResponse', text: "I've inserted the code at your cursor." });
									} else {
										panel?.webview.postMessage({ command: 'aiResponse', text: "Please open a file to insert code." });
									}
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
								case 'createFile':
									const workspaceFolders = vscode.workspace.workspaceFolders;
									if (workspaceFolders) {
										const rootUri = workspaceFolders[0].uri;
										const fileUri = vscode.Uri.joinPath(rootUri, intent.filename);
										try {
											// Check if file exists
											await vscode.workspace.fs.stat(fileUri);
											panel?.webview.postMessage({ command: 'aiResponse', text: `File '${intent.filename}' already exists.` });
										} catch {
											// File does not exist, create it
											await vscode.workspace.fs.writeFile(fileUri, new Uint8Array());
											panel?.webview.postMessage({ command: 'aiResponse', text: `Successfully created file '${intent.filename}'.` });
										}
									} else {
										panel?.webview.postMessage({ command: 'aiResponse', text: "I can't create a file because you don't have a workspace folder open." });
									}
									break;
								case 'deleteFile':
									const workspaceFoldersForDelete = vscode.workspace.workspaceFolders;
									if (workspaceFoldersForDelete) {
										const rootUri = workspaceFoldersForDelete[0].uri;
										const fileUriToDelete = vscode.Uri.joinPath(rootUri, intent.filename);

										const confirmation = await vscode.window.showWarningMessage(
											`Are you sure you want to delete the file '${intent.filename}'? This action cannot be undone.`,
											{ modal: true },
											'Yes, delete it'
										);

										if (confirmation === 'Yes, delete it') {
											try {
												await vscode.workspace.fs.delete(fileUriToDelete, { useTrash: true });
												panel?.webview.postMessage({ command: 'aiResponse', text: `Successfully deleted file '${intent.filename}'.` });
											} catch (error) {
												panel?.webview.postMessage({ command: 'aiResponse', text: `Error deleting file: ${error}` });
											}
										} else {
											panel?.webview.postMessage({ command: 'aiResponse', text: 'File deletion cancelled.' });
										}
									} else {
										panel?.webview.postMessage({ command: 'aiResponse', text: "I can't delete a file because you don't have a workspace folder open." });
									}
									break;
								case 'gitStatus':
									try {
										const git = simpleGit(vscode.workspace.workspaceFolders?.[0].uri.fsPath);
										const status = await git.status();
										const statusReport = `
*Branch:* ${status.current}
*Changes:*
  *Modified:* ${status.modified.join(', ') || 'none'}
  *New:* ${status.not_added.join(', ') || 'none'}
  *Deleted:* ${status.deleted.join(', ') || 'none'}
										`;
										panel?.webview.postMessage({ command: 'aiResponse', text: `Here is the current Git status:\n\n\`\`\`\n${statusReport}\n\`\`\`` });
									} catch (error) {
										panel?.webview.postMessage({ command: 'aiResponse', text: `Error getting Git status: ${error}` });
									}
									break;
								case 'gitCommit':
									const commitConfirm = await vscode.window.showWarningMessage(
										`Are you sure you want to add all files and commit with message: "${intent.message}"?`,
										{ modal: true },
										'Yes'
									);
									if (commitConfirm === 'Yes') {
										try {
											const git = simpleGit(vscode.workspace.workspaceFolders?.[0].uri.fsPath);
											await git.add('./*');
											await git.commit(intent.message);
											panel?.webview.postMessage({ command: 'aiResponse', text: 'Successfully committed changes.' });
										} catch (error) {
											panel?.webview.postMessage({ command: 'aiResponse', text: `Error committing changes: ${error}` });
										}
									} else {
										panel?.webview.postMessage({ command: 'aiResponse', text: 'Commit cancelled.' });
									}
									break;
								case 'gitPush':
									const pushConfirm = await vscode.window.showWarningMessage(
										`Are you sure you want to push your changes to the remote repository?`,
										{ modal: true },
										'Yes'
									);
									if (pushConfirm === 'Yes') {
										try {
											const git = simpleGit(vscode.workspace.workspaceFolders?.[0].uri.fsPath);
											await git.push();
											panel?.webview.postMessage({ command: 'aiResponse', text: 'Successfully pushed changes.' });
										} catch (error) {
											panel?.webview.postMessage({ command: 'aiResponse', text: `Error pushing changes: ${error}` });
										}
									} else {
										panel?.webview.postMessage({ command: 'aiResponse', text: 'Push cancelled.' });
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
import simpleGit from 'simple-git';

function getWebviewContent() {
	const htmlPath = path.join(__dirname, '..', 'src', 'webview.html');
	return fs.readFileSync(htmlPath, 'utf8');
}
