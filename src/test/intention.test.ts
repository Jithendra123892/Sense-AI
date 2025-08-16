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

	test('should identify a refactor intent', () => {
		const context: AIContext = { selectedText: 'function bar() {}' };
		const intent = getIntention('refactor this', context);
		assert.deepStrictEqual(intent, { type: 'refactor', instruction: 'refactor this', code: 'function bar() {}' });
	});

	test('should identify an insertCode intent', () => {
		const context: AIContext = {};
		const intent = getIntention('add a function here', context);
		assert.deepStrictEqual(intent, { type: 'insertCode', description: 'function here' });
	});

	test('should identify a generate intent', () => {
		const context: AIContext = {};
		const intent = getIntention('generate a function', context);
		assert.deepStrictEqual(intent, { type: 'generate', description: 'generate a function' });
	});

	test('should identify a file edit intent', () => {
		const context: AIContext = { fileContent: 'const x = 1;' };
		const intent = getIntention('add comments to this file', context);
		assert.deepStrictEqual(intent, { type: 'editFile', instruction: 'add comments to this file', fileContent: 'const x = 1;' });
	});

	test('should identify a create file intent', () => {
		const context: AIContext = {};
		const intent = getIntention('create file test.js', context);
		assert.deepStrictEqual(intent, { type: 'createFile', filename: 'test.js' });
	});

	test('should identify a delete file intent', () => {
		const context: AIContext = {};
		const intent = getIntention('delete file test.js', context);
		assert.deepStrictEqual(intent, { type: 'deleteFile', filename: 'test.js' });
	});

    test('should identify a follow-up intent from history', () => {
		const codeBlock = 'function doSomething() {}';
		const context: AIContext = {
			history: [
				{ sender: 'user', content: 'generate a function' },
				{ sender: 'ai', content: `Here you go:\n\`\`\`\n${codeBlock}\n\`\`\`` }
			]
		};
		const intent = getIntention('add comments to it', context);
		assert.deepStrictEqual(intent, {
			type: 'refactor',
			instruction: 'add comments to it',
			code: codeBlock
		});
	});
});
