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
	| { type: 'gitStatus' }
	| { type: 'gitCommit'; message: string }
	| { type: 'gitPush' }
	| { type: 'runInTerminal'; command: string }
	| { type: 'chat'; message: string };

export function getIntention(message: string, context: AIContext): Intent {
	const lowerCaseMessage = message.toLowerCase();

    // Terminal Commands
	const runInTerminalMatch = lowerCaseMessage.match(/(?:run|execute|perform)(?: in terminal)?\s*`([^`]+)`/);
	if (runInTerminalMatch) {
		return { type: 'runInTerminal', command: runInTerminalMatch[1] };
	}
	const runInTerminalMatch2 = lowerCaseMessage.match(/^(?:run|execute|perform)\s+(.*)/);
    if (runInTerminalMatch2 && !runInTerminalMatch2[1].startsWith('git')) { // Avoid clashing with git commands
        return { type: 'runInTerminal', command: runInTerminalMatch2[1] };
    }

	// Git Operations
	if (lowerCaseMessage.includes('status')) {
		return { type: 'gitStatus' };
	}
	const commitMatch = lowerCaseMessage.match(/(?:git )?commit(?: my changes)?(?: with message)?\s*['"`](.*?)['"`]/);
	if (commitMatch) {
		return { type: 'gitCommit', message: commitMatch[1] };
	}
	if (lowerCaseMessage.includes('push')) {
		return { type: 'gitPush' };
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
			const functionRegex = /(function\s+([a-zA-Z0-9_]+)\s*\((.*?)\))/g;
			return fileContent.replace(functionRegex, (match, p1, p2, p3) => {
				const params = p3.split(',').map((p: string) => p.trim()).filter(Boolean);
				const paramsDoc = params.map((p: string) => ` * @param {*} ${p}`).join('\n');
				const jsDoc = `/**\n * @description This is a sample JSDoc comment.\n${paramsDoc}\n * @returns {*} \n */`;
				return `${jsDoc}\n${p1}`;
			});
		}
		return fileContent; // Return original content if instruction is not understood
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
		return code; // Return original code if instruction is not understood
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
		return `Of course! Here is an explanation of the following code:\n\n\`\`\`\n${code}\n\`\`\`\n\nThis is a simulated explanation. I've identified it as a piece of code and in the future, I will be able to provide a detailed analysis of its functionality, structure, and potential improvements.`;
	}
	if (message.startsWith('generate:')) {
		const description = lowerCaseMessage.substring(9);
		if (description.includes('hello world')) {
			return `Sure, here is a JavaScript function that returns "Hello, World!":\n\n\`\`\`javascript\nfunction helloWorld() {\n  return "Hello, World!";\n}\n\`\`\``;
		}
		if (description.includes('person class')) {
			return `Here is a simple 'Person' class:\n\n\`\`\`javascript\nclass Person {\n  constructor(name, age) {\n    this.name = name;\n    this.age = age;\n  }\n\n  greet() {\n    return \`Hello, my name is \${this.name}.\`;\n  }\n}\n\`\`\``;
		}
		const defaultGeneration = ["I can't generate that specific code yet, but I'm learning every day!", "That's a bit too complex for me right now."];
		return defaultGeneration[Math.floor(Math.random() * defaultGeneration.length)];
	}

	// --- General Conversation & Knowledge Base ---
	const greetings = ['Hello! How can I help you code today?', 'Hi there! What can I help you with?', 'Hey! Ready to write some amazing code?'];
	if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi') || lowerCaseMessage.includes('hey')) {
		return greetings[Math.floor(Math.random() * greetings.length)];
	}
	const helpMessages = ["Of course! I can help you with programming concepts, generate code snippets, and more. Try asking \"what is a promise?\" or \"generate a fetch example\".", 'I can help with that! Ask me to explain concepts like "async/await" or "arrays". You can also ask me to generate code.'];
	if (lowerCaseMessage.includes('help')) {
		return helpMessages[Math.floor(Math.random() * helpMessages.length)];
	}
	const knowledge = {
		'function': 'A function is a reusable block of code designed to perform a particular task. Functions are executed when they are called. You can pass data, known as parameters, into a function.\n\nExample:\n`function add(a, b) {\n  return a + b;\n}`',
		'variable': 'A variable is a container for storing data. In JavaScript, `let` is used for variables that can be reassigned, while `const` is for variables that cannot.\n\nExample:\n`let score = 100;\nconst playerName = "Jules";`',
		'loop': 'Loops are used to repeatedly run a block of code. The `for` loop is common for a set number of iterations, while `while` loops run as long as a condition is true.\n\nExample (for loop):\n`for (let i = 0; i < 5; i++) {\n  console.log("Iteration " + i);\n}`',
		'array': 'An array is a special variable, which can hold more than one value at a time. Arrays are used to store lists of items.\n\nExample:\n`const fruits = ["Apple", "Banana", "Cherry"];`',
		'object': 'An object is a collection of key-value pairs. It\'s a common way to group related data.\n\nExample:\n`const person = { firstName: "John", lastName: "Doe", age: 50 };`',
		'promise': 'A Promise is an object representing the eventual completion or failure of an asynchronous operation. It allows you to handle async operations in a more synchronous-like fashion.\n\nExample:\n`const myPromise = new Promise((resolve, reject) => {\n  setTimeout(() => resolve("Success!"), 1000);\n});`',
		'async/await': '`async/await` is modern syntax for handling asynchronous operations. An `async` function returns a Promise, and `await` pauses the function execution until the Promise is settled.\n\nExample:\n`async function getData() {\n  const data = await somePromise;\n  console.log(data);\n}`',
	};
	for (const keyword in knowledge) {
		if (lowerCaseMessage.includes(keyword)) {
			return knowledge[keyword as keyof typeof knowledge];
		}
	}

	// --- Default Response ---
	const defaultResponses = ["I'm not sure how to answer that yet. I'm still under development. Try asking about functions, variables, or loops!", "That's a great question! I don't have an answer for it right now, but I'm learning more every day.", "I'm sorry, I can't help with that particular query at the moment. Could you try rephrasing it?"];
	return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}
