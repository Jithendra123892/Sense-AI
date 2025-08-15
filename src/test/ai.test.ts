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
		assert.ok(response.toLowerCase().includes('help'));
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
		assert.ok(response.toLowerCase().includes('sorry') || response.toLowerCase().includes('not sure'));
	});
});
