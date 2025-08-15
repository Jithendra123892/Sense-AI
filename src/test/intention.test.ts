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

	test('should identify a refactor intent with various phrasing', () => {
		const context: AIContext = { selectedText: 'function bar() {}' };
		let intent = getIntention('refactor this to be an arrow function', context);
		assert.strictEqual(intent.type, 'refactor');

		intent = getIntention('replace this with a try/catch block', context);
		assert.strictEqual(intent.type, 'refactor');

		intent = getIntention('rewrite this code', context);
		assert.strictEqual(intent.type, 'refactor');
	});

	test('should identify an insertCode intent', () => {
		const context: AIContext = {};
		const intent = getIntention('add a function here', context);
		assert.deepStrictEqual(intent, { type: 'insertCode', description: 'function here' });
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

	test('should identify a create file intent with various phrasing', () => {
		const context: AIContext = {};
		let intent = getIntention('create a new file called test.js', context);
		assert.deepStrictEqual(intent, { type: 'createFile', filename: 'test.js' });

		intent = getIntention('make file "index.html"', context);
		assert.deepStrictEqual(intent, { type: 'createFile', filename: 'index.html' });
	});

	test('should identify a delete file intent with various phrasing', () => {
		const context: AIContext = {};
		let intent = getIntention('delete the file temp.txt', context);
		assert.deepStrictEqual(intent, { type: 'deleteFile', filename: 'temp.txt' });

		intent = getIntention('remove file "old_styles.css"', context);
		assert.deepStrictEqual(intent, { type: 'deleteFile', filename: 'old_styles.css' });
	});

	test('should identify a git status intent', () => {
		const context: AIContext = {};
		const intent = getIntention('what is the git status?', context);
		assert.deepStrictEqual(intent, { type: 'gitStatus' });
	});

	test('should identify a git commit intent and parse the message', () => {
		const context: AIContext = {};
		const intent = getIntention('commit with message "feat: add new feature"', context);
		assert.deepStrictEqual(intent, { type: 'gitCommit', message: 'feat: add new feature' });
	});

	test('should identify a git push intent', () => {
		const context: AIContext = {};
		const intent = getIntention('push my changes', context);
		assert.deepStrictEqual(intent, { type: 'gitPush' });
	});
});
