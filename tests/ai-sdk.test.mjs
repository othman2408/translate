import '../lib/ai/schema-runtime';

import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createMoonshotAI } from '@ai-sdk/moonshotai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { runAiSdkTextAction } from '../lib/ai/run-text-action';

let dynamicCode;
beforeEach(() => {
  dynamicCode = spyOn(globalThis, 'Function').mockImplementation(() => {
    throw new EvalError('Blocked by extension CSP');
  });
});
afterEach(() => {
  const calls = dynamicCode.mock.calls.length;
  dynamicCode.mockRestore();
  expect(calls).toBe(0);
});

const providers = [
  ['DeepSeek', createDeepSeek, 'https://api.deepseek.com/chat/completions'],
  ['Kimi', createMoonshotAI, 'https://api.moonshot.ai/v1/chat/completions'],
  ['OpenRouter', createOpenRouter, 'https://openrouter.ai/api/v1/chat/completions'],
];
const request = { action: 'rewrite', prompt: 'Rewrite clearly', text: 'Selected words', language: 'Arabic' };

function completionStream() {
  const chunks = [
    { choices: [{ index: 0, delta: { role: 'assistant', content: ' Hello' }, finish_reason: null }] },
    { choices: [{ index: 0, delta: { content: ' world ' }, finish_reason: null }] },
    { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
  ].map((chunk) => ({ id: 'test', object: 'chat.completion.chunk', created: 1, model: 'custom-model', ...chunk }));
  return new Response(chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('') + 'data: [DONE]\n\n', {
    headers: { 'content-type': 'text/event-stream' },
  });
}

for (const [name, createProvider, endpoint] of providers) {
  test(`${name}: real SDK serializes requests and streams text with the resolved schema dependency`, async () => {
    const calls = [];
    const provider = createProvider({
      apiKey: 'test-key',
      fetch: async (url, init) => {
        calls.push({ url: String(url), init });
        return completionStream();
      },
    });
    const deltas = [];
    const result = await runAiSdkTextAction(provider('custom-model'), 'custom-model', request, {
      onTextDelta: (text) => deltas.push(text),
    });
    expect(result).toEqual({ resultText: 'Hello world', model: 'custom-model' });
    expect(deltas).toEqual([' Hello', ' world ']);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(endpoint);
    const body = JSON.parse(calls[0].init.body);
    expect(body.model).toBe('custom-model');
    expect(body.stream).toBe(true);
    expect(body.messages).toEqual([
      { role: 'system', content: name === 'OpenRouter'
        ? [{ type: 'text', text: expect.stringContaining('You process selected text') }]
        : expect.stringContaining('You process selected text') },
      { role: 'user', content: 'Rewrite clearly\n\nOutput language: Arabic\n\nSelected text:\nSelected words' },
    ]);
    expect(new Headers(calls[0].init.headers).get('authorization')).toBe('Bearer test-key');
  });

  test(`${name}: real SDK authentication failures retain the application error mapping`, async () => {
    const provider = createProvider({
      apiKey: 'test-key',
      fetch: async () => Response.json({ error: { message: 'Invalid API key', type: 'authentication_error', code: '401' } }, { status: 401 }),
    });
    await expect(runAiSdkTextAction(provider('custom-model'), 'custom-model', request)).rejects.toMatchObject({
      code: 'auth', messageKey: 'errorAiApiKeyRejected',
    });
  });
}
