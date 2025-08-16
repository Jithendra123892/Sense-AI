export interface ConversationMessage {
	sender: 'user' | 'ai';
	content: string;
}

export interface AIContext {
	selectedText?: string;
	fileContent?: string;
    history?: ConversationMessage[];
}

export interface AIResponse {
    speech: string;
    code?: string;
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

export function getAIResponse(message: string, context?: AIContext): AIResponse {
	const lowerCaseMessage = message.toLowerCase();

	// --- Prefixed Actions ---
	if (message.startsWith('editFile:')) {
		const parts = message.substring(9).split('\n---\n');
		const instruction = parts[0].toLowerCase();
		const fileContent = parts[1];
		if (instruction.includes('add jsdoc')) {
			const functionRegex = /(function\s+([a-zA-Z0-9_]+)\s*\((.*?)\))/g;
			const newContent = fileContent.replace(functionRegex, (match, p1, p2, p3) => {
				const params = p3.split(',').map((p: any) => p.trim()).filter(Boolean);
				const paramsDoc = params.map((p: any) => ` * @param {*} ${p}`).join('\n');
				const jsDoc = `/**\n * @description This is a sample JSDoc comment.\n${paramsDoc}\n * @returns {*} \n */`;
				return `${jsDoc}\n${p1}`;
			});
            return { speech: newContent };
		}
		return { speech: fileContent };
	}
	if (message.startsWith('refactor:')) {
		const parts = message.substring(9).split('\n---\n');
		const instruction = parts[0].toLowerCase();
		const code = parts[1];
		if (instruction.includes('add comment')) {
			return { speech: `// This is a simulated refactoring. Here are some comments:\n${code.split('\n').map(line => `// ${line}`).join('\n')}` };
		}
		if (instruction.includes('arrow function')) {
			return { speech: code.replace(/function\s*([a-zA-Z0-9_]+)\s*\((.*?)\)/, 'const $1 = ($2) =>') };
		}
		return { speech: code };
	}
	if (message.startsWith('insertCode:')) {
		const description = message.substring(11).toLowerCase();
		if (description.includes('hello world')) {
			return { speech: `function helloWorld() {\n  console.log("Hello, World!");\n}` };
		}
		if (description.includes('try catch')) {
			return { speech: `try {\n\t// your code here\n} catch (error) {\n\tconsole.error(error);\n}` };
		}
		return { speech: `// Sorry, I can't generate that code for insertion yet.` };
	}
	if (message.startsWith('explain:')) {
		const code = message.substring(8).trim();
		return {
            speech: `You got it. This block of code appears to be a JavaScript snippet. Here’s a simple breakdown of what it does:`,
            code: code
        };
	}
	if (message.startsWith('generate:')) {
		const description = lowerCaseMessage.substring(9);
		if (description.includes('hello world')) {
            return {
                speech: `Sure, here is a classic "Hello, World!" function in JavaScript. I've generated it for you. I can insert this into your current file if you'd like.`,
                code: `function helloWorld() {\n  return "Hello, World!";\n}`
            };
		}
		if (description.includes('person class')) {
            return {
                speech: `No problem. Here is a simple 'Person' class with a constructor and a method. Let me know if you'd like me to explain it or add it to your file.`,
                code: `class Person {\n  constructor(name, age) {\n    this.name = name;\n    this.age = age;\n  }\n\n  greet() {\n    return \`Hello, my name is \${this.name}.\`;\n  }\n}`
            };
		}
		return { speech: "I'm not quite advanced enough to generate that yet, but I'm learning! How about we try generating a simple 'hello world' function?" };
	}

	// --- General Conversation & Knowledge Base ---
	const knowledge: { [key: string]: { speech: string, code?: string } } = {
		'function': { speech: 'A function is a fundamental building block in JavaScript. It’s a reusable set of statements that performs a task or calculates a value. You can think of it as a recipe: you define it once and can use it many times.', code: 'function greet(name) {\n  return `Hello, ${name}!`;\n}' },
		'variable': { speech: 'A variable is essentially a named container for a value. You can store different types of data in variables, like numbers, strings, or objects. In modern JavaScript, we typically use `let` for variables that might change and `const` for variables that should not change.', code: 'let score = 100;\nconst playerName = "Alex";' },
		'loop': { speech: 'A loop is a control structure that\'s used to repeatedly execute a block of code as long as a certain condition is met. They are essential for iterating over arrays or performing a task multiple times.', code: 'for (let i = 0; i < 5; i++) {\n  console.log(`Iteration number ${i}`);\n}' },
	};
	for (const keyword in knowledge) {
		if (lowerCaseMessage.includes(keyword)) {
			return knowledge[keyword];
		}
	}

	// --- Default / Greeting ---
	const greetings = ['Hello! How can I help you code today?', 'Hi there! What can I help you with?', 'Hey! Ready to write some amazing code?'];
	if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi') || lowerCaseMessage.includes('hey')) {
		return { speech: greetings[Math.floor(Math.random() * greetings.length)] };
	}
	const defaultResponses = ["I'm sorry, I'm not quite sure how to help with that. Could you try rephrasing your request? I'm best at tasks like explaining code, generating functions, or refactoring your selection.", "That's a bit outside of what I can do right now. I'm still learning! You can ask me to do things like 'create a file' or 'explain this function'.",];
	return { speech: defaultResponses[Math.floor(Math.random() * defaultResponses.length)] };
}
