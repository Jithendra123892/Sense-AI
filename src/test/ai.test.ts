import * as assert from 'assert';
import { suite, test } from 'mocha';
import { getAIResponse } from '../ai';

suite('AI Response Generation Test Suite', () => {
	test('should generate a response for a chat message', () => {
		const response = getAIResponse('hello');
		assert.ok(typeof response === 'string');
	});

	test('should generate a response for an explain request', () => {
		const response = getAIResponse('explain: const x = 1;');
		assert.ok(response.includes('explanation of the following code'));
		assert.ok(response.includes('const x = 1;'));
	});

	test('should generate a response for a refactor request', () => {
		const response = getAIResponse('refactor: add comments\n---\nconsole.log("hi")');
		assert.ok(response.includes('code with added comments'));
		assert.ok(response.includes('// console.log("hi")'));
	});

	test('should generate a response for a generate request', () => {
		const response = getAIResponse('generate: a hello world function');
		assert.ok(response.includes('function helloWorld()'));
	});

	test('should generate a response for a file edit request', () => {
		const response = getAIResponse('editFile: add jsdoc\n---\nfunction main() {}');
		assert.ok(response.includes('/**'));
		assert.ok(response.includes('function main() {}'));
	});
});
