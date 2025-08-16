import * as assert from 'assert';
import { suite, test } from 'mocha';
import { getIntention, getAIResponse, AIContext } from '../ai';

suite('AI Logic Test Suite (Rolled Back)', () => {

    // --- getIntention Tests ---

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
        const intent = getIntention('refactor this', context);
        assert.deepStrictEqual(intent, { type: 'refactor', instruction: 'refactor this', code: 'function bar() {}' });
    });

    test('should identify an insertCode intent', () => {
		const context: AIContext = {};
		const intent = getIntention('add a function here', context);
		assert.deepStrictEqual(intent, { type: 'insertCode', description: 'function here' });
	});

    test('should identify a createFile intent', () => {
		const context: AIContext = {};
		const intent = getIntention('create a new file called test.js', context);
		assert.deepStrictEqual(intent, { type: 'createFile', filename: 'test.js' });
	});

    // --- getAIResponse Tests ---

    test('should get a response for a chat message', () => {
        const response = getAIResponse('a nonsensical message');
        assert.ok(response.includes("I'm sorry, I'm not sure how to answer that."));
    });

    test('should get a response for an explain request', () => {
		const response = getAIResponse('explain: const x = 1;');
		assert.ok(response.includes('This is a simulated explanation.'));
	});

    test('should get a response for a refactor request', () => {
        const response = getAIResponse('refactor: add comments\n---\nconsole.log("hi")');
		assert.strictEqual(response, '// This is a simulated refactoring. Here are some comments:\n// console.log("hi")');
    });

    test('should get a response for an insertCode request', () => {
        const response = getAIResponse('insertCode: a try catch block');
		assert.strictEqual(response, 'try {\n\t// your code here\n} catch (error) {\n\tconsole.error(error);\n}');
    });

    test('should get a response for a file edit request', () => {
		const response = getAIResponse('editFile: add jsdoc\n---\nfunction main() {}');
		assert.ok(response.includes('/**'));
	});
});
