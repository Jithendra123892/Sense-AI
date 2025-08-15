import * as assert from 'assert';
import { suite, test } from 'mocha';
import { getIntention, AIContext } from '../ai';

suite('Intention Recognition Test Suite', () => {
	test('should identify a chat intent', () => {
		const context: AIContext = {};
		const intent = getIntention('hello there', context);
		assert.deepStrictEqual(intent, { type: 'chat', message: 'hello there' });
	});

	test('should identify an explain intent with selected text', () => {
		const context: AIContext = { selectedText: 'function foo() {}' };
		const intent = getIntention('explain this', context);
		assert.deepStrictEqual(intent, { type: 'explain', code: 'function foo() {}' });
	});

	test('should identify a refactor intent with selected text', () => {
		const context: AIContext = { selectedText: 'function bar() {}' };
		const intent = getIntention('refactor this to be an arrow function', context);
		assert.deepStrictEqual(intent, {
			type: 'refactor',
			instruction: 'refactor this to be an arrow function',
			code: 'function bar() {}'
		});
	});

	test('should identify a generate intent', () => {
		const context: AIContext = {};
		const intent = getIntention('generate a function that adds two numbers', context);
		assert.deepStrictEqual(intent, { type: 'generate', description: 'generate a function that adds two numbers' });
	});

	test('should identify a file edit intent', () => {
		const context: AIContext = { fileContent: 'const x = 1;' };
		const intent = getIntention('add comments to this file', context);
		assert.deepStrictEqual(intent, {
			type: 'editFile',
			instruction: 'add comments to this file',
			fileContent: 'const x = 1;'
		});
	});

	test('should default to chat if keywords are present but context is missing', () => {
		const context: AIContext = {}; // No selected text
		const intent = getIntention('explain this code', context);
		assert.deepStrictEqual(intent, { type: 'chat', message: 'explain this code' });
	});
});
