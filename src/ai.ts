export function getAIResponse(message: string, context: string = ''): string {
	const lowerCaseMessage = message.toLowerCase();

	// --- Context-Aware Logic ---
	if (lowerCaseMessage.includes('explain this') || lowerCaseMessage.includes('what does this do')) {
		const functionRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
		const functions = [...context.matchAll(functionRegex)].map(match => match[1]);

		if (functions.length > 0) {
			return `I see a few functions in this file: ${functions.join(', ')}. Which one are you asking about?`;
		} else {
			return "I'm not sure what you're referring to. Can you be more specific or select the code you want me to explain?";
		}
	}

	// --- Refactoring ---
	if (message.startsWith('refactor:')) {
		const parts = message.substring(9).split('\n---\n');
		const instruction = parts[0].toLowerCase();
		const code = parts[1];

		if (instruction.includes('add comment')) {
			const commentedCode = `// This is a simulated refactoring. Here are some comments:\n${code.split('\n').map(line => `// ${line}`).join('\n')}`;
			return `Sure, here is the code with added comments:\n\n\`\`\`\n${commentedCode}\n\`\`\``;
		}

		if (instruction.includes('arrow function')) {
			const arrowFunc = code.replace(/function\s*([a-zA-Z0-9_]+)\s*\((.*?)\)/, 'const $1 = ($2) =>');
			return `Here is the function converted to an arrow function:\n\n\`\`\`\n${arrowFunc}\n\`\`\``;
		}

		return "I'm sorry, I don't know how to perform that refactoring yet. Try 'add comments' or 'convert to arrow function'.";
	}

	// --- Code Explanation ---
	if (message.startsWith('explain:')) {
		const code = message.substring(8);
		// In a real scenario, you would analyze the code. Here, we give a generic response.
		return `Of course! Here is an explanation of the following code:\n\n\`\`\`\n${code}\n\`\`\`\n\nThis is a simulated explanation. I've identified it as a piece of code and in the future, I will be able to provide a detailed analysis of its functionality, structure, and potential improvements.`;
	}

	// --- Code Generation ---
	if (message.startsWith('generate:')) {
		const description = lowerCaseMessage.substring(9);
		if (description.includes('hello world')) {
			return `Sure, here is a JavaScript function that returns "Hello, World!":\n\n\`\`\`javascript\nfunction helloWorld() {\n  return "Hello, World!";\n}\n\`\`\``;
		}
		if (description.includes('person class')) {
			return `Here is a simple 'Person' class:\n\n\`\`\`javascript\nclass Person {\n  constructor(name, age) {\n    this.name = name;\n    this.age = age;\n  }\n\n  greet() {\n    return \`Hello, my name is \${this.name}.\`;\n  }\n}\n\`\`\``;
		}
		if (description.includes('fetch')) {
			return `Here's an example of using fetch to get data from an API:\n\n\`\`\`javascript\nasync function fetchData(url) {\n  try {\n    const response = await fetch(url);\n    if (!response.ok) {\n      throw new Error('Network response was not ok');\n    }\n    const data = await response.json();\n    return data;\n  } catch (error) {\n    console.error('There has been a problem with your fetch operation:', error);\n  }\n}\n\`\`\``;
		}
		const defaultGeneration = [
			"I can't generate that specific code yet, but I'm learning every day! Try asking for a 'hello world function' or a 'person class'.",
			"That's a bit too complex for me right now. How about we start with something simpler, like a 'fetch example'?"
		];
		return defaultGeneration[Math.floor(Math.random() * defaultGeneration.length)];
	}

	// --- General Conversation ---
	const greetings = ['Hello! How can I help you code today?', 'Hi there! What can I help you with?', 'Hey! Ready to write some amazing code?'];
	if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi') || lowerCaseMessage.includes('hey')) {
		return greetings[Math.floor(Math.random() * greetings.length)];
	}

	const helpMessages = [
		'Of course! I can explain programming concepts, generate code snippets, and more. Try asking "what is a promise?" or "generate a fetch example".',
		'I can help with that! Ask me to explain concepts like "async/await" or "arrays". You can also ask me to generate code.'
	];
	if (lowerCaseMessage.includes('help')) {
		return helpMessages[Math.floor(Math.random() * helpMessages.length)];
	}

	// --- Knowledge Base ---
	const knowledge = {
		'function': 'A function is a reusable block of code designed to perform a particular task. Functions are executed when they are called. You can pass data, known as parameters, into a function.\n\nExample:\n`function add(a, b) {\n  return a + b;\n}`',
		'variable': 'A variable is a container for storing data. In JavaScript, `let` is used for variables that can be reassigned, while `const` is for variables that cannot.\n\nExample:\n`let score = 100;\nconst playerName = "Jules";`',
		'loop': 'Loops are used to repeatedly run a block of code. The `for` loop is common for a set number of iterations, while `while` loops run as long as a condition is true.\n\nExample (for loop):\n`for (let i = 0; i < 5; i++) {\n  console.log("Iteration " + i);\n}`',
		'if statement': 'An `if` statement executes a block of code if a specified condition is true. You can use an `else` block to execute code if the condition is false.\n\nExample:\n`if (age >= 18) {\n  console.log("Adult");\n} else {\n  console.log("Minor");\n}`',
		'class': 'A class is a blueprint for creating objects. It encapsulates data and functions that work on that data.\n\nExample:\n`class Car {\n  constructor(brand) {\n    this.brand = brand;\n  }\n  present() {\n    return "I have a " + this.brand;\n  }\n}`',
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
	const defaultResponses = [
		"I'm not sure how to answer that yet. I'm still under development. Try asking about functions, variables, or loops!",
		"That's a great question! I don't have an answer for it right now, but I'm learning more every day.",
		"I'm sorry, I can't help with that particular query at the moment. Could you try rephrasing it?"
	];
	return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}
