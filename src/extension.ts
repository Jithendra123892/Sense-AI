import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getAIResponse, getIntention, AIContext, ConversationMessage } from './ai';
import simpleGit from 'simple-git';

let panel: vscode.WebviewPanel | undefined = undefined;
let terminal: vscode.Terminal | undefined = undefined;
let conversationHistory: ConversationMessage[] = [];
const MAX_HISTORY_LENGTH = 20; // Increased history length

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

						const postAIResponse = (text: string) => {
							panel?.webview.postMessage({ command: 'aiResponse', text });
							conversationHistory.push({ sender: 'ai', content: text });
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

							let response;
							switch (intent.type) {
								case 'explain':
									response = getAIResponse(`explain: ${intent.code}`);
									postAIResponse(response);
									break;
								case 'refactor':
									if (editor && selectedText) {
										const refactoredCode = getAIResponse(`refactor: ${intent.instruction}\n---\n${intent.code}`);
										const edit = new vscode.WorkspaceEdit();
										edit.replace(editor.document.uri, editor.selection, refactoredCode);
										await vscode.workspace.applyEdit(edit);
										postAIResponse("I've applied the refactoring to your selection.");
									} else {
										postAIResponse("Please select code to refactor.");
									}
									break;
								case 'insertCode':
									if (editor) {
										const codeToInsert = getAIResponse(`insertCode: ${intent.description}`);
										const edit = new vscode.WorkspaceEdit();
										edit.insert(editor.document.uri, editor.selection.active, codeToInsert);
										await vscode.workspace.applyEdit(edit);
										postAIResponse("I've inserted the code at your cursor.");
									} else {
										postAIResponse("Please open a file to insert code.");
									}
									break;
								case 'editFile':
									if (editor) {
										const newFileContent = getAIResponse(`editFile: ${intent.instruction}\n---\n${intent.fileContent}`);
										const edit = new vscode.WorkspaceEdit();
										const fullRange = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(intent.fileContent.length));
										edit.replace(editor.document.uri, fullRange, newFileContent);
										await vscode.workspace.applyEdit(edit);
										vscode.window.showInformationMessage('File edited by Sense AI.');
										postAIResponse("I've edited the file as you requested.");
									}
									break;
								case 'createFile':
									const workspaceFolders = vscode.workspace.workspaceFolders;
									if (workspaceFolders) {
										const rootUri = workspaceFolders[0].uri;
										const fileUri = vscode.Uri.joinPath(rootUri, intent.filename);
										try {
											await vscode.workspace.fs.stat(fileUri);
											postAIResponse(`File '${intent.filename}' already exists.`);
										} catch {
											await vscode.workspace.fs.writeFile(fileUri, new Uint8Array());
											postAIResponse(`Successfully created file '${intent.filename}'.`);
										}
									} else {
										postAIResponse("I can't create a file because you don't have a workspace folder open.");
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
												postAIResponse(`Successfully deleted file '${intent.filename}'.`);
											} catch (error: any) {
												postAIResponse(`Error deleting file: ${error.message}`);
											}
										} else {
											postAIResponse('File deletion cancelled.');
										}
									} else {
										postAIResponse("I can't delete a file because you don't have a workspace folder open.");
									}
									break;
								case 'gitStatus':
									try {
										const git = simpleGit(vscode.workspace.workspaceFolders?.[0].uri.fsPath);
										const status = await git.status();
										const statusReport = `*Branch:* ${status.current}\n*Changes:*\n  *Modified:* ${status.modified.join(', ') || 'none'}\n  *New:* ${status.not_added.join(', ') || 'none'}\n  *Deleted:* ${status.deleted.join(', ') || 'none'}`;
										postAIResponse(`Here is the current Git status:\n\n\`\`\`\n${statusReport}\n\`\`\``);
									} catch (error: any) {
										postAIResponse(`Error getting Git status: ${error.message}`);
									}
									break;
								case 'gitCommit':
									const commitConfirm = await vscode.window.showWarningMessage(
										`Are you sure you want to add all files and commit with message: "${intent.message}"?`,
										{ modal: true }, 'Yes'
									);
									if (commitConfirm === 'Yes') {
										try {
											const git = simpleGit(vscode.workspace.workspaceFolders?.[0].uri.fsPath);
											await git.add('./*');
											await git.commit(intent.message);
											postAIResponse('Successfully committed changes.');
										} catch (error: any) {
											postAIResponse(`Error committing changes: ${error.message}`);
										}
									} else {
										postAIResponse('Commit cancelled.');
									}
									break;
								case 'gitPush':
									const pushConfirm = await vscode.window.showWarningMessage(
										`Are you sure you want to push your changes to the remote repository?`,
										{ modal: true }, 'Yes'
									);
									if (pushConfirm === 'Yes') {
										try {
											const git = simpleGit(vscode.workspace.workspaceFolders?.[0].uri.fsPath);
											await git.push();
											postAIResponse('Successfully pushed changes.');
										} catch (error: any) {
											postAIResponse(`Error pushing changes: ${error.message}`);
										}
									} else {
										postAIResponse('Push cancelled.');
									}
									break;
								case 'runInTerminal':
									const termConfirm = await vscode.window.showWarningMessage(
										`Are you sure you want to run the following command in the terminal?\n\n` + `\`${intent.command}\``,
										{ modal: true }, 'Yes, run it'
									);
									if (termConfirm === 'Yes, run it') {
										if (!terminal || terminal.exitStatus) {
											terminal = vscode.window.createTerminal('Sense AI');
										}
										terminal.show();
										terminal.sendText(intent.command);
										postAIResponse(`I've sent the command \`${intent.command}\` to the terminal.`);
									} else {
										postAIResponse('Command execution cancelled.');
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
				terminal = undefined; // Also clear terminal reference
				conversationHistory = []; // Clear history
			}, null, context.subscriptions);
		}
	});
	context.subscriptions.push(openChatDisposable);

	const inlineSuggestionDisposable = vscode.languages.registerInlineCompletionItemProvider(
		{ pattern: '**' }, // Activate for all files
		inlineSuggestionProvider
	);
	context.subscriptions.push(inlineSuggestionDisposable);
}

const inlineSuggestionProvider = {
	provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.InlineCompletionItem[] | vscode.InlineCompletionList> {
		const line = document.lineAt(position.line);
		const textBeforeCursor = line.text.substring(0, position.character);

		if (textBeforeCursor.trim().toLowerCase() === 'function') {
			const snippet = new vscode.SnippetString(' ${1:functionName}(${2:args}) {\n\t${0}\n}');
			return [new vscode.InlineCompletionItem(snippet)];
		}

		return [];
	}
};

function getWebviewContent() {
	const htmlPath = path.join(__dirname, '..', 'src', 'webview.html');
	return fs.readFileSync(htmlPath, 'utf8');
}
