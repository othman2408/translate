import { AiProviderError, type AiModel } from './types';

export type ModelRecord = {
  id?: unknown;
  name?: unknown;
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  modalities?: { input?: string[]; output?: string[] };
  status?: unknown;
};

// All three catalog APIs share the OpenAI-style data array.
export async function fetchModels(url: string, apiKey?: string): Promise<AiModel[]> {
  const body = await fetchModelCatalogJson(url, apiKey) as { data?: ModelRecord[] } | null;
  if (!Array.isArray(body?.data)) {
    throw new AiProviderError({ code: 'provider', messageKey: 'modelsLoadError' });
  }
  return normalizeModels(body.data);
}

export async function fetchModelCatalogJson(url: string, apiKey?: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      signal: AbortSignal.timeout(15_000),
      credentials: 'omit',
      redirect: 'error',
    });
  } catch {
    throw new AiProviderError({ code: 'network', messageKey: 'errorAiNetwork' });
  }
  if (!response.ok) {
    const auth = response.status === 401 || response.status === 403;
    const quota = response.status === 429;
    throw new AiProviderError({
      code: auth ? 'auth' : quota ? 'quota' : 'provider',
      messageKey: auth ? 'errorAiApiKeyRejected' : quota ? 'errorAiQuota' : 'modelsLoadError',
    });
  }
  return response.json().catch(() => {
    throw new AiProviderError({ code: 'provider', messageKey: 'modelsLoadError' });
  });
}

export function normalizeModels(records: ModelRecord[]): AiModel[] {
  const models = new Map<string, AiModel>();
  for (const item of records) {
    if (!item || typeof item.id !== 'string' || !item.id.trim()) continue;
    if (item.status === 'deprecated') continue;
    const input = item.architecture?.input_modalities ?? item.modalities?.input;
    const output = item.architecture?.output_modalities ?? item.modalities?.output;
    if (
      (Array.isArray(input) && !input.includes('text')) ||
      (Array.isArray(output) && !output.includes('text'))
    )
      continue;
    const id = item.id.trim();
    models.set(id, {
      id,
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : id,
    });
  }
  return [...models.values()].sort((a, b) => a.name.localeCompare(b.name));
}
