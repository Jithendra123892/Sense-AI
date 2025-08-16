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
		assert.deepStrictEqual(intent, { type: 'editFile', instruction: 'add comments to this file', fileContent: 'const x = 1;' });
	});

	test('should identify a create file intent', () => {
		const context: AIContext = {};
		const intent = getIntention('create a new file called test.js', context);
		assert.deepStrictEqual(intent, { type: 'createFile', filename: 'test.js' });
	});

	test('should identify a delete file intent', () => {
		const context: AIContext = {};
		const intent = getIntention('delete the file temp.txt', context);
		assert.deepStrictEqual(intent, { type: 'deleteFile', filename: 'temp.txt' });
	});

	test('should identify a git status intent', () => {
		const context: AIContext = {};
		const intent = getIntention('what is the git status?', context);
		assert.deepStrictEqual(intent, { type: 'gitStatus' });
	});

	test('should identify a git commit intent', () => {
		const context: AIContext = {};
		const intent = getIntention('commit with message "feat: new feature"', context);
		assert.deepStrictEqual(intent, { type: 'gitCommit', message: 'feat: new feature' });
	});

	test('should identify a git push intent', () => {
		const context: AIContext = {};
		const intent = getIntention('push my changes', context);
		assert.deepStrictEqual(intent, { type: 'gitPush' });
	});

	test('should identify a run in terminal intent', () => {
		const context: AIContext = {};
		const intent = getIntention('run `npm install`', context);
		assert.deepStrictEqual(intent, { type: 'runInTerminal', command: 'npm install' });
	});

	test('should identify a follow-up intent from history', () => {
		const codeBlock = 'function doSomething() {\n  // ...\n}';
		const context: AIContext = {
			history: [
				{ sender: 'user', content: 'generate a function' },
				{ sender: 'ai', content: `Here you go:\n\n\`\`\`\n${codeBlock}\n\`\`\`` }
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
