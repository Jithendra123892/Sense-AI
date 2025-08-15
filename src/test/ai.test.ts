import * as assert from 'assert';
import { suite, test } from 'mocha';
import { getAIResponse } from '../ai';

suite('AI Response Test Suite', () => {
	test('getAIResponse for greeting', () => {
		const response = getAIResponse('hello');
		assert.ok(response.toLowerCase().includes('hello') || response.toLowerCase().includes('hi') || response.toLowerCase().includes('hey'));
	});

	test('getAIResponse for help', () => {
		const response = getAIResponse('help');
		if (!response.toLowerCase().includes('help')) {
			console.log(`Unexpected response for 'help': ${response}`);
		}
		assert.ok(response.toLowerCase().includes('help'), `Response was: ${response}`);
	});

	test('getAIResponse for function', () => {
		const response = getAIResponse('what is a function?');
		assert.ok(response.toLowerCase().includes('function'));
	});

	test('getAIResponse for code explanation', () => {
		const response = getAIResponse('explain: function foo() {}');
		assert.ok(response.includes('function foo() {}'));
		assert.ok(response.toLowerCase().includes('explanation'));
	});

	test('getAIResponse for code generation', () => {
		const response = getAIResponse('generate: hello world function');
		assert.ok(response.includes('function helloWorld()'));
	});

	test('getAIResponse for unknown topic', () => {
		const response = getAIResponse('what is the meaning of life?');
		const lowerResponse = response.toLowerCase();
		assert.ok(
			lowerResponse.includes('sorry') ||
			lowerResponse.includes('not sure') ||
			lowerResponse.includes("don't have an answer"),
			`Unexpected default response: ${response}`
		);
	});

	test('getAIResponse for context-aware question', () => {
		const context = 'function myFunction() { console.log("hello"); }';
		const response = getAIResponse('explain this', context);
		assert.ok(response.includes('myFunction'));
	});

	test('getAIResponse for refactor (add comments)', () => {
		const code = 'function add(a, b) {\n  return a + b;\n}';
		const response = getAIResponse(`refactor: add comments\n---\n${code}`);
		assert.ok(response.includes('//'));
	});

	test('getAIResponse for refactor (arrow function)', () => {
		const code = 'function multiply(a, b) {\n  return a * b;\n}';
		const response = getAIResponse(`refactor: convert to arrow function\n---\n${code}`);
		assert.ok(response.includes('=>'));
		assert.ok(response.includes('const multiply'));
	});

	test('getAIResponse for file edit (add JSDoc)', () => {
		const fileContent = 'function greet(name) {\n  return `Hello, ${name}`;\n}\n\nfunction farewell(name) {\n  return `Goodbye, ${name}`;\n}';
		const response = getAIResponse(`editFile: add jsdoc\n---\n${fileContent}`);
		assert.strictEqual((response.match(/\/\*\*/g) || []).length, 2, "Should have added two JSDoc blocks");
		assert.ok(response.includes('@param {*} name'));
	});
});
