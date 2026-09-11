import { afterEach, beforeEach, expect, mock, test } from 'bun:test';

const values = new Map();
let locale = 'en-US';
mock.module('#imports', () => ({
  browser: { i18n: { getUILanguage: () => locale, getMessage: () => '' } },
  storage: {
    defineItem: (key, { fallback }) => ({
      getValue: async () => structuredClone(values.get(key) ?? fallback),
      setValue: async (value) => {
        values.set(key, structuredClone(value));
      },
    }),
  },
}));

const { DEFAULT_SETTINGS, getSettings, normalizeSettings } = await import('../lib/settings');
const { resolvePreferredLanguage } = await import('../lib/languages');
const { getManualLanguages } = await import('../entrypoints/popup/hooks/useManualTranslation');
const { AiModelCatalog } = await import('../lib/ai/model-catalog');
const { AiTextActionService } = await import('../lib/ai/service');
const { AiProviderError } = await import('../lib/ai/types');
const { AiProviderFactory } = await import('../lib/ai/factory');
const { fetchModels } = await import('../lib/ai/list-models');

const originalFetch = globalThis.fetch;
const originalNow = Date.now;
const provider = {
  id: 'test',
  type: 'deepseek',
  name: 'Test provider',
  apiKey: 'test-key',
  model: 'future-model',
};
const settings = () =>
  normalizeSettings({
    ...DEFAULT_SETTINGS,
    preferredLanguage: 'en',
    targetLanguage: 'ar',
    aiProviders: [provider],
    defaultAiProviderId: provider.id,
    aiRewriteEnabled: true,
    aiExplainEnabled: true,
  });
beforeEach(() => {
  values.clear();
  locale = 'en-US';
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  Date.now = originalNow;
});

test('preferred language resolves exact locales, base locales and fallback', () => {
  expect(resolvePreferredLanguage('zh_TW')).toBe('zh-TW');
  expect(resolvePreferredLanguage('ar-QA')).toBe('ar');
  expect(resolvePreferredLanguage('unsupported')).toBe('en');
});

test('preferred language initializes once and reset uses current browser language', async () => {
  locale = 'ar-QA';
  expect((await getSettings()).preferredLanguage).toBe('ar');
  locale = 'fr-FR';
  expect((await getSettings()).preferredLanguage).toBe('ar');
  expect(normalizeSettings(DEFAULT_SETTINGS).preferredLanguage).toBe('fr');
});

test('translation direction uses explicit source or preferred language, not detected text', () => {
  expect(getManualLanguages('source', settings())).toEqual({
    sourceLanguage: 'auto',
    targetLanguage: 'ar',
  });
  expect(getManualLanguages('target', settings())).toEqual({
    sourceLanguage: 'ar',
    targetLanguage: 'en',
  });
  expect(getManualLanguages('target', { ...settings(), sourceLanguage: 'fr' })).toEqual({
    sourceLanguage: 'ar',
    targetLanguage: 'fr',
  });
});

test('every provider preserves custom/new model IDs while legacy empty IDs remain compatible', () => {
  for (const type of ['deepseek', 'kimi', 'openrouter']) {
    const normalized = normalizeSettings({
      aiProviders: [{ ...provider, type, model: '  next/model  ' }],
    });
    expect(normalized.aiProviders[0].model).toBe('next/model');
    expect(
      normalizeSettings({ aiProviders: [{ ...provider, type, model: '' }] }).aiProviders[0].model,
    ).toBeTruthy();
  }
});

test('provider normalization preserves valid defaults and falls back consistently', () => {
  const input = {
    providers: [
      { id: 'first', type: 'google-v2', name: 'First', apiKey: 'key-1' },
      { id: 'second', type: 'google-v2', name: 'Second', apiKey: 'key-2' },
    ],
    aiProviders: [provider, { ...provider, id: 'second-ai' }],
    defaultProviderId: 'second',
    defaultAiProviderId: 'second-ai',
  };
  const normalized = normalizeSettings(input);
  expect(normalized.defaultProviderId).toBe('second');
  expect(normalized.apiKey).toBe('key-2');
  expect(normalized.defaultAiProviderId).toBe('second-ai');
  const fallback = normalizeSettings({ ...input, defaultProviderId: 'missing', defaultAiProviderId: 'missing' });
  expect(fallback.defaultProviderId).toBe('first');
  expect(fallback.defaultAiProviderId).toBe(provider.id);
  expect(normalizeSettings({}).defaultProviderId).toBe('');
  expect(normalizeSettings({}).defaultAiProviderId).toBe('');
});

test('catalog normalizes, deduplicates and filters explicitly non-text models', async () => {
  globalThis.fetch = async () =>
    Response.json({
      data: [
        { id: 'b', name: 'Beta' },
        { id: 'a' },
        { id: 'a' },
        null,
        { id: 3 },
        { id: 'image', architecture: { output_modalities: ['image'] } },
        {
          id: 'multimodal',
          architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] },
        },
      ],
    });
  expect(
    (await fetchModels('https://test.invalid/models', 'key')).map((model) => model.id),
  ).toEqual(['a', 'b', 'multimodal']);
});

test('each provider owns its catalog endpoint and sends only authentication', async () => {
  const endpoints = {
    deepseek: 'https://api.deepseek.com/models',
    openrouter: 'https://openrouter.ai/api/v1/models',
    kimi: 'https://api.moonshot.ai/v1/models',
  };
  for (const [type, endpoint] of Object.entries(endpoints)) {
    globalThis.fetch = async (url, options) => {
      expect(url).toBe(endpoint);
      expect(options.headers.Authorization).toBe('Bearer test-key');
      expect(options.body).toBeUndefined();
      expect(options.redirect).toBe('error');
      return Response.json({ data: [{ id: 'new-model' }] });
    };
    expect(
      await new AiProviderFactory().createProvider({ ...provider, type }).listModels(),
    ).toEqual([{ id: 'new-model', name: 'new-model' }]);
  }
});

test('catalog maps authentication, quota, malformed data and network errors', async () => {
  for (const [status, code] of [
    [401, 'auth'],
    [403, 'auth'],
    [429, 'quota'],
    [500, 'provider'],
  ]) {
    globalThis.fetch = async () => new Response('', { status });
    await expect(fetchModels('https://test.invalid', 'key')).rejects.toMatchObject({ code });
  }
  globalThis.fetch = async () => Response.json({});
  await expect(fetchModels('https://test.invalid', 'key')).rejects.toBeInstanceOf(AiProviderError);
  globalThis.fetch = async () => {
    throw new TypeError('offline');
  };
  await expect(fetchModels('https://test.invalid', 'key')).rejects.toMatchObject({
    code: 'network',
  });
});

test('catalog caches, deduplicates, refreshes, expires and isolates credentials/providers', async () => {
  let calls = 0;
  const catalog = new AiModelCatalog({
    createProvider: () => ({
      listModels: async () => {
        ++calls;
        await Bun.sleep(10);
        return [{ id: 'live-model', name: 'Live model' }];
      },
    }),
  });
  const request = { type: 'LIST_AI_MODELS', credentials: { type: 'deepseek', apiKey: 'draft' } };
  await Promise.all([catalog.list(request), catalog.list(request)]);
  expect(calls).toBe(1);
  await catalog.list(request);
  expect(calls).toBe(1);
  await catalog.list({ ...request, refresh: true });
  expect(calls).toBe(2);
  Date.now = () => originalNow() + 16 * 60 * 1000;
  await catalog.list(request);
  expect(calls).toBe(3);
  await catalog.list({ ...request, credentials: { type: 'deepseek', apiKey: 'other' } });
  await catalog.list({ ...request, credentials: { type: 'kimi', apiKey: 'draft' } });
  expect(calls).toBe(5);
  expect(values.get('local:settings').aiProviders).toEqual([]);
});

test('catalog resolves saved provider keys, caps entries and does not cache failures', async () => {
  values.set('local:settings', settings());
  let calls = 0;
  let fail = true;
  const catalog = new AiModelCatalog({
    createProvider: (config) => ({
      listModels: async () => {
        ++calls;
        expect(config.apiKey).toBeTruthy();
        if (fail) throw new AiProviderError({ code: 'auth', messageKey: 'errorAiApiKeyRejected' });
        return [];
      },
    }),
  });
  const request = { type: 'LIST_AI_MODELS', providerId: 'test' };
  expect((await catalog.list(request)).ok).toBe(false);
  fail = false;
  expect((await catalog.list(request)).ok).toBe(true);
  expect(calls).toBe(2);
  for (let i = 0; i < 21; i++)
    await catalog.list({
      type: 'LIST_AI_MODELS',
      credentials: { type: 'deepseek', apiKey: 'key' + i },
    });
  await catalog.list(request);
  expect(calls).toBe(24);
  expect((await catalog.list({ type: 'LIST_AI_MODELS', providerId: 'missing' })).ok).toBe(false);
});

test('public catalogs load without credentials and share the Models.dev feed across providers', async () => {
  values.set('local:settings', settings());
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(url);
    expect(options.headers).toBeUndefined();
    expect(options.body).toBeUndefined();
    expect(options.credentials).toBe('omit');
    expect(options.redirect).toBe('error');
    await Bun.sleep(10);
    if (url === 'https://openrouter.ai/api/v1/models') {
      return Response.json({ data: [{ id: 'deepseek/router-model', name: 'Router model' }] });
    }
    expect(url).toBe('https://models.dev/api.json');
    return Response.json({
      deepseek: { models: {
        live: { id: ' ds-live ', name: 'DeepSeek live', modalities: { input: ['text'], output: ['text'] } },
        retired: { id: 'ds-old', status: 'deprecated' },
        image: { id: 'image-only', modalities: { output: ['image'] } },
        malformed: null,
      } },
      moonshotai: { models: { live: { id: 'kimi-live', name: 'Kimi live' } } },
      'moonshotai-cn': { models: { different: { id: 'wrong-region' } } },
    });
  };
  const catalog = new AiModelCatalog({ createProvider: () => { throw new Error('Public discovery must not instantiate a credentialed provider'); } });
  const [deepseek, kimi, openrouter] = await Promise.all(['deepseek', 'kimi', 'openrouter'].map(providerType =>
    catalog.list({ type: 'LIST_AI_MODELS', providerType })));
  expect(deepseek).toEqual({ ok: true, models: [{ id: 'ds-live', name: 'DeepSeek live' }] });
  expect(kimi.models).toEqual([{ id: 'kimi-live', name: 'Kimi live' }]);
  expect(openrouter.models).toEqual([{ id: 'deepseek/router-model', name: 'Router model' }]);
  expect(calls).toHaveLength(2);
  await catalog.list({ type: 'LIST_AI_MODELS', providerType: 'deepseek' });
  expect(calls).toHaveLength(2);
  await catalog.list({ type: 'LIST_AI_MODELS', providerType: 'kimi', refresh: true });
  expect(calls).toHaveLength(3);
  Date.now = () => originalNow() + 16 * 60 * 1000;
  await catalog.list({ type: 'LIST_AI_MODELS', providerType: 'deepseek' });
  expect(calls).toHaveLength(4);
  expect(values.get('local:settings').aiProviders).toEqual([provider]);
});

test('public and authenticated catalogs cannot leak results or keys into each other', async () => {
  values.set('local:settings', settings());
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, authorization: options.headers?.Authorization });
    if (url === 'https://models.dev/api.json') {
      return Response.json({ deepseek: { models: { public: { id: 'public' } } }, moonshotai: { models: {} } });
    }
    expect(url).toBe('https://api.deepseek.com/models');
    return Response.json({ data: [{ id: 'account-specific' }] });
  };
  const catalog = new AiModelCatalog();
  expect((await catalog.list({ type: 'LIST_AI_MODELS', providerType: 'deepseek' })).models[0].id).toBe('public');
  expect((await catalog.list({ type: 'LIST_AI_MODELS', providerId: provider.id })).models[0].id).toBe('account-specific');
  expect((await catalog.list({ type: 'LIST_AI_MODELS', providerType: 'deepseek' })).models[0].id).toBe('public');
  expect(calls).toEqual([
    { url: 'https://models.dev/api.json', authorization: undefined },
    { url: 'https://api.deepseek.com/models', authorization: 'Bearer test-key' },
  ]);
});

test('public discovery failures are retryable and never cached as an empty catalog', async () => {
  const catalog = new AiModelCatalog();
  const request = { type: 'LIST_AI_MODELS', providerType: 'deepseek' };
  for (const body of [null, {}, { deepseek: { models: [] } }]) {
    globalThis.fetch = async () => Response.json(body);
    expect((await catalog.list(request)).ok).toBe(false);
  }
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  expect((await catalog.list(request)).error.code).toBe('network');
  globalThis.fetch = async () => Response.json({deepseek:{models:{}},moonshotai:{models:{}}});
  expect(await catalog.list(request)).toEqual({ ok: true, models: [] });
});

test('catalog requests share an active refresh instead of returning the old cached list', async () => {
  let calls = 0;
  let finishRefresh;
  let startRefresh;
  const started = new Promise((resolve) => { startRefresh = resolve; });
  const pending = new Promise((resolve) => { finishRefresh = resolve; });
  const catalog = new AiModelCatalog({
    createProvider: () => ({
      listModels: async () => {
        if (++calls === 1) return [{ id: 'old', name: 'Old' }];
        startRefresh();
        return pending;
      },
    }),
  });
  const request = { type: 'LIST_AI_MODELS', credentials: { type: 'deepseek', apiKey: 'key' } };
  await catalog.list(request);
  const refresh = catalog.list({ ...request, refresh: true });
  await started;
  let completed = false;
  const concurrent = catalog.list(request).then((result) => { completed = true; return result; });
  await Bun.sleep(20);
  expect(completed).toBe(false);
  finishRefresh([{ id: 'new', name: 'New' }]);
  expect(await concurrent).toEqual(await refresh);
  expect((await concurrent).models[0].id).toBe('new');
  expect(calls).toBe(2);
});

test('non-streaming AI requests deduplicate, cache results and exclude draft history', async () => {
  values.set('local:settings', settings());
  let calls = 0;
  const service = new AiTextActionService({
    createProvider: () => ({
      providerName: 'Test',
      runTextAction: async (_request, options) => {
        expect(options.onTextDelta).toBeUndefined();
        ++calls;
        await Bun.sleep(20);
        return { resultText: 'Done', model: 'future-model' };
      },
    }),
  });
  const request = { action: 'rewrite', text: 'Example', recordHistory: false };
  const results = await Promise.all([service.run(request), service.run(request)]);
  expect(results.every((result) => result.ok)).toBe(true);
  expect(calls).toBe(1);
  expect((await service.run(request)).fromCache).toBe(true);
  expect(values.get('local:aiHistory')).toBeUndefined();
});

test('streaming AI requests keep separate cancellation ownership', async () => {
  values.set('local:settings', settings());
  let calls = 0;
  const service = new AiTextActionService({
    createProvider: () => ({
      providerName: 'Test',
      runTextAction: async (_request, options) => {
        ++calls;
        options.onTextDelta('Part');
        await Bun.sleep(10);
        return { resultText: 'Part', model: 'future-model' };
      },
    }),
  });
  const request = { action: 'explain', text: 'Example', recordHistory: false };
  const chunks = [];
  await Promise.all([
    service.run(request, { onTextDelta: (text) => chunks.push(text) }),
    service.run(request, { onTextDelta: (text) => chunks.push(text) }),
  ]);
  expect(calls).toBe(2);
  expect(chunks).toEqual(['Part', 'Part']);
});

test('AI failures are not cached and disabling caching forces provider calls', async () => {
  values.set('local:settings', settings());
  let calls = 0;
  let fail = true;
  const service = new AiTextActionService({ createProvider: () => ({
    providerName: 'Test',
    runTextAction: async () => {
      ++calls;
      if (fail) throw new AiProviderError({ code: 'auth', messageKey: 'errorAiApiKeyRejected' });
      return { resultText: 'Done', model: 'future-model' };
    },
  }) });
  const request = { action: 'rewrite', text: 'Retry', recordHistory: false };
  expect((await service.run(request)).ok).toBe(false);
  fail = false;
  expect((await service.run(request)).ok).toBe(true);
  expect(calls).toBe(2);
  values.set('local:settings', { ...settings(), cacheEnabled: false });
  await service.run(request);
  await service.run(request);
  expect(calls).toBe(4);
});

test('fallback records the successful user action once, but never follows partial output', async () => {
  const second = { ...provider, id: 'second', name: 'Second' };
  values.set('local:settings', {
    ...settings(), providerFallbackEnabled: true, aiProviders: [provider, second],
  });
  const calls = [];
  const service = new AiTextActionService({ createProvider: (config) => ({
    providerName: config.name,
    runTextAction: async (_request, options) => {
      calls.push(config.id);
      if (config.id === 'test') {
        options.onTextDelta?.('Partial');
        throw new AiProviderError({ code: 'quota', messageKey: 'errorAiQuota' });
      }
      return { resultText: 'Done', model: 'future-model' };
    },
  }) });
  expect((await service.run({ action: 'rewrite', text: 'Fallback' })).ok).toBe(true);
  expect(calls).toEqual(['test', 'second']);
  expect(values.get('local:aiHistory').entries).toHaveLength(1);
  expect((await service.run({ action: 'explain', text: 'Partial' }, { onTextDelta: () => {} })).ok).toBe(false);
  expect(calls).toEqual(['test', 'second', 'test']);
});
