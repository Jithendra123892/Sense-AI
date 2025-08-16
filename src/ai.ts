export interface ConversationMessage {
	sender: 'user' | 'ai';
	content: string;
}

export interface AIContext {
	selectedText?: string;
	fileContent?: string;
    history?: ConversationMessage[];
}

export type Intent =
	| { type: 'refactor'; instruction: string; code: string }
	| { type: 'explain'; code: string }
	| { type: 'generate'; description: string }
	| { type: 'insertCode'; description: string }
	| { type: 'editFile'; instruction: string; fileContent: string }
	| { type: 'createFile'; filename: string }
	| { type: 'deleteFile'; filename: string }
	| { type: 'chat'; message: string };

export function getIntention(message: string, context: AIContext): Intent {
	const lowerCaseMessage = message.toLowerCase();

	// Handle Follow-up Intents
	const lastMessage = context.history?.[context.history.length - 1];
	if (lastMessage && lastMessage.sender === 'ai' && (lowerCaseMessage.includes(' it') || lowerCaseMessage.includes(' that') || lowerCaseMessage.includes(' this'))) {
		const codeBlockRegex = /```(?:\w*\n)?([\s\S]*?)```/;
		const codeMatch = lastMessage.content.match(codeBlockRegex);
		if (codeMatch && codeMatch[1]) {
			const code = codeMatch[1].trim();
			return { type: 'refactor', instruction: message, code: code };
		}
	}

	// File Operations
	const createFileMatch = lowerCaseMessage.match(/(?:create|make|add) (?:a )?(?:new )?file (?:called|named)?\s*['"`]?([a-zA-Z0-9_.-]+)['"`]?/);
	if (createFileMatch) {
		return { type: 'createFile', filename: createFileMatch[1] };
	}
	const deleteFileMatch = lowerCaseMessage.match(/(?:delete|remove) (?:the )?file (?:called|named)?\s*['"`]?([a-zA-Z0-9_.-]+)['"`]?/);
	if (deleteFileMatch) {
		return { type: 'deleteFile', filename: deleteFileMatch[1] };
	}

	// Check for intents that require selected text
	if (context.selectedText) {
		if (lowerCaseMessage.startsWith('refactor') || lowerCaseMessage.startsWith('edit') || lowerCaseMessage.startsWith('change') || lowerCaseMessage.startsWith('replace') || lowerCaseMessage.startsWith('rewrite')) {
			return { type: 'refactor', instruction: message, code: context.selectedText };
		}
		if (lowerCaseMessage.startsWith('explain')) {
			return { type: 'explain', code: context.selectedText };
		}
	}

	// Check for file-level editing
	if (lowerCaseMessage.includes('this file')) {
		return { type: 'editFile', instruction: message, fileContent: context.fileContent || '' };
	}

	// Check for code insertion (no selection)
	const insertMatch = lowerCaseMessage.match(/^(?:add|insert) (?:a |an |some )?(.*)/);
	if (insertMatch && !context.selectedText) {
		return { type: 'insertCode', description: insertMatch[1] };
	}

	// Check for generation
	if (lowerCaseMessage.startsWith('generate') || lowerCaseMessage.startsWith('create')) {
		return { type: 'generate', description: message };
	}

	// Default to chat
	return { type: 'chat', message: message };
}

export function getAIResponse(message: string, context?: AIContext): string {
	const lowerCaseMessage = message.toLowerCase();

	// --- Prefixed Actions ---
	if (message.startsWith('editFile:')) {
		const parts = message.substring(9).split('\n---\n');
		const instruction = parts[0].toLowerCase();
		const fileContent = parts[1];
		if (instruction.includes('add jsdoc')) {
			// Using the simpler, more brittle regex version
			const functionRegex = /(function\s+([a-zA-Z0-9_]+)\s*\((.*?)\))/g;
			return fileContent.replace(functionRegex, (match, p1, p2, p3) => {
				const params = p3.split(',').map((p: any) => p.trim()).filter(Boolean);
				const paramsDoc = params.map((p: any) => ` * @param {*} ${p}`).join('\n');
				const jsDoc = `/**\n * @description This is a sample JSDoc comment.\n${paramsDoc}\n * @returns {*} \n */`;
				return `${jsDoc}\n${p1}`;
			});
		}
		return fileContent;
	}
	if (message.startsWith('refactor:')) {
		const parts = message.substring(9).split('\n---\n');
		const instruction = parts[0].toLowerCase();
		const code = parts[1];
		if (instruction.includes('add comment')) {
			return `// This is a simulated refactoring. Here are some comments:\n${code.split('\n').map(line => `// ${line}`).join('\n')}`;
		}
		if (instruction.includes('arrow function')) {
			return code.replace(/function\s*([a-zA-Z0-9_]+)\s*\((.*?)\)/, 'const $1 = ($2) =>');
		}
		return code;
	}
	if (message.startsWith('insertCode:')) {
		const description = message.substring(11).toLowerCase();
		if (description.includes('hello world')) {
			return `function helloWorld() {\n  console.log("Hello, World!");\n}`;
		}
		if (description.includes('try catch')) {
			return `try {\n\t// your code here\n} catch (error) {\n\tconsole.error(error);\n}`;
		}
		return `// Sorry, I can't generate that code for insertion yet.`;
	}
	if (message.startsWith('explain:')) {
		const code = message.substring(8);
		return `Of course! Here is an explanation of the following code:\n\n\`\`\`\n${code}\n\`\`\`\n\nThis is a simulated explanation.`;
	}
	if (message.startsWith('generate:')) {
		const description = lowerCaseMessage.substring(9);
		if (description.includes('hello world')) {
			return `Sure, here is a JavaScript function that returns "Hello, World!":\n\n\`\`\`javascript\nfunction helloWorld() {\n  return "Hello, World!";\n}\n\`\`\``;
		}
		if (description.includes('person class')) {
			return `Here is a simple 'Person' class:\n\n\`\`\`javascript\nclass Person {\n  constructor(name, age) {\n    this.name = name;\n    this.age = age;\n  }\n\n  greet() {\n    return \`Hello, my name is \${this.name}.\`;\n  }\n}\n\`\`\``;
		}
		return "I can't generate that specific code yet.";
	}

	// --- General Conversation & Knowledge Base ---
	const knowledge: { [key: string]: string } = {
		'function': 'A function is a reusable block of code.',
		'variable': 'A variable is a container for storing data.',
		'loop': 'Loops are used to repeatedly run a block of code.',
	};
	for (const keyword in knowledge) {
		if (lowerCaseMessage.includes(keyword)) {
			return knowledge[keyword];
		}
	}

	return "I'm sorry, I'm not sure how to answer that. I'm still learning!";
}
