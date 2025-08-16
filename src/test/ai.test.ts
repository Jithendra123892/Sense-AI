import * as assert from 'assert';
import { suite, test } from 'mocha';
import { getAIResponse, AIResponse } from '../ai';

suite('AI Response Generation Test Suite', () => {
	test('should generate a response for a chat message', () => {
		const response: AIResponse = getAIResponse('a nonsensical message');
		const lowerSpeech = response.speech.toLowerCase();
		assert.ok(
			lowerSpeech.includes('sorry') ||
			lowerSpeech.includes('not sure') ||
			lowerSpeech.includes("don't have an answer") ||
            lowerSpeech.includes("outside of what i can do")
		);
	});

	test('should generate a response for an explain request', () => {
		const response: AIResponse = getAIResponse('explain: const x = 1;');
		assert.ok(response.speech.includes('breakdown'));
        assert.strictEqual(response.code, 'const x = 1;');
	});

	test('should return raw code for a refactor request', () => {
		const response: AIResponse = getAIResponse('refactor: add comments\n---\nconsole.log("hi")');
		assert.strictEqual(response.speech, '// This is a simulated refactoring. Here are some comments:\n// console.log("hi")');
        assert.strictEqual(response.code, undefined);
	});

	test('should generate a response for an insertCode request', () => {
		const response: AIResponse = getAIResponse('insertCode: a try catch block');
		assert.strictEqual(response.speech, 'try {\n\t// your code here\n} catch (error) {\n\tconsole.error(error);\n}');
        assert.strictEqual(response.code, undefined);
	});

	test('should generate a response for a generate request', () => {
		const response: AIResponse = getAIResponse('generate: a hello world function');
		assert.ok(response.speech.includes('here is a classic'));
        assert.ok(response.code?.includes('function helloWorld()'));
	});

	test('should generate a response for a file edit request', () => {
		const response: AIResponse = getAIResponse('editFile: add jsdoc\n---\nfunction main() {}');
		assert.ok(response.speech.includes('/**'));
	});
});
