import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getAIResponse, getIntention, AIContext, ConversationMessage, AIResponse } from './ai';

let panel: vscode.WebviewPanel | undefined = undefined;
let conversationHistory: ConversationMessage[] = [];
const MAX_HISTORY_LENGTH = 20;

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "sense" is now active!');

	const openChatDisposable = vscode.commands.registerCommand('sense.openChat', () => {
		if (panel) {
			panel.reveal(vscode.ViewColumn.Beside);
		} else {
			panel = vscode.window.createWebviewPanel(
				'senseChat',
				'Sense AI Chat',
				vscode.ViewColumn.Beside,
				{ enableScripts: true, retainContextWhenHidden: true }
			);
			panel.webview.html = getWebviewContent();

			panel.webview.onDidReceiveMessage(
				async message => {
					if (message.command === 'userMessage') {
						const userMessage = message.text;
						conversationHistory.push({ sender: 'user', content: userMessage });

						const postAIResponse = (response: AIResponse) => {
							const formattedResponse = response.code
								? `${response.speech}\n\n\`\`\`\n${response.code}\n\`\`\``
								: response.speech;

							panel?.webview.postMessage({ command: 'aiResponse', text: formattedResponse });
							conversationHistory.push({ sender: 'ai', content: formattedResponse });
							if (conversationHistory.length > MAX_HISTORY_LENGTH) {
								conversationHistory = conversationHistory.slice(-MAX_HISTORY_LENGTH);
							}
						};

						setTimeout(async () => {
							const editor = vscode.window.activeTextEditor;
							const selection = editor?.selection;
							const selectedText = selection && !selection.isEmpty ? editor?.document.getText(selection) : undefined;
							const fileContent = editor ? editor.document.getText() : undefined;

							const intent = getIntention(userMessage, { selectedText, fileContent, history: conversationHistory });

							let response: AIResponse;
							switch (intent.type) {
								case 'explain':
									response = getAIResponse(`explain: ${intent.code}`);
									postAIResponse(response);
									break;
								case 'refactor':
									if (editor && selectedText) {
										const refactoredCode = getAIResponse(`refactor: ${intent.instruction}\n---\n${intent.code}`).speech;
										const edit = new vscode.WorkspaceEdit();
										edit.replace(editor.document.uri, editor.selection, refactoredCode);
										await vscode.workspace.applyEdit(edit);
										postAIResponse({ speech: "I've applied the refactoring to your selection." });
									} else {
										postAIResponse({ speech: "Please select code to refactor." });
									}
									break;
								case 'insertCode':
									if (editor) {
										const codeToInsert = getAIResponse(`insertCode: ${intent.description}`).speech;
										const edit = new vscode.WorkspaceEdit();
										edit.insert(editor.document.uri, editor.selection.active, codeToInsert);
										await vscode.workspace.applyEdit(edit);
										postAIResponse({ speech: "I've inserted the code at your cursor." });
									} else {
										postAIResponse({ speech: "Please open a file to insert code." });
									}
									break;
								case 'editFile':
									if (editor) {
										const newFileContent = getAIResponse(`editFile: ${intent.instruction}\n---\n${intent.fileContent}`).speech;
										const edit = new vscode.WorkspaceEdit();
										const fullRange = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(intent.fileContent.length));
										edit.replace(editor.document.uri, fullRange, newFileContent);
										await vscode.workspace.applyEdit(edit);
										vscode.window.showInformationMessage('File edited by Sense AI.');
										postAIResponse({ speech: "I've edited the file as you requested."});
									}
									break;
								case 'createFile':
									const workspaceFolders = vscode.workspace.workspaceFolders;
									if (workspaceFolders) {
										const rootUri = workspaceFolders[0].uri;
										const fileUri = vscode.Uri.joinPath(rootUri, intent.filename);
										try {
											await vscode.workspace.fs.stat(fileUri);
											postAIResponse({ speech: `File '${intent.filename}' already exists.` });
										} catch {
											await vscode.workspace.fs.writeFile(fileUri, new Uint8Array());
											postAIResponse({ speech: `Successfully created file '${intent.filename}'. Now what should we put in it?` });
										}
									} else {
										postAIResponse({ speech: "I can't create a file because you don't have a workspace folder open." });
									}
									break;
								case 'deleteFile':
									const workspaceFoldersForDelete = vscode.workspace.workspaceFolders;
									if (workspaceFoldersForDelete) {
										const rootUri = workspaceFoldersForDelete[0].uri;
										const fileUriToDelete = vscode.Uri.joinPath(rootUri, intent.filename);
										const confirmation = await vscode.window.showWarningMessage(
											`Are you sure you want to delete the file '${intent.filename}'? This action cannot be undone.`,
											{ modal: true }, 'Yes, delete it'
										);
										if (confirmation === 'Yes, delete it') {
											try {
												await vscode.workspace.fs.delete(fileUriToDelete, { useTrash: true });
												postAIResponse({ speech: `Successfully deleted file '${intent.filename}'.` });
											} catch (error: any) {
												postAIResponse({ speech: `Error deleting file: ${error.message}` });
											}
										} else {
											postAIResponse({ speech: 'File deletion cancelled.' });
										}
									} else {
										postAIResponse({ speech: "I can't delete a file because you don't have a workspace folder open." });
									}
									break;
								case 'generate':
									response = getAIResponse(`generate: ${intent.description}`);
									postAIResponse(response);
									break;
								case 'chat':
								default:
									if (intent.type === 'chat') {
										response = getAIResponse(intent.message, { fileContent, history: conversationHistory });
										postAIResponse(response);
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
				conversationHistory = []; // Clear history
			}, null, context.subscriptions);
		}
	});
	context.subscriptions.push(openChatDisposable);
}

function getWebviewContent() {
	const htmlPath = path.join(__dirname, '..', 'src', 'webview.html');
	return fs.readFileSync(htmlPath, 'utf8');
}
