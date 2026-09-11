import type { AiProviderType } from '@/lib/settings';

import { fetchModelCatalogJson, fetchModels, normalizeModels, type ModelRecord } from './list-models';
import { AiProviderError, type AiModel } from './types';

export type ModelCatalogData = Partial<Record<AiProviderType, AiModel[]>>;

const MODELS_DEV_PROVIDERS = { deepseek: 'deepseek', kimi: 'moonshotai' } as const;

export function getPublicCatalogKey(type: AiProviderType): string {
  return type === 'openrouter' ? 'public:openrouter' : 'public:models.dev';
}

export async function fetchPublicModels(type: AiProviderType): Promise<ModelCatalogData> {
  if (type === 'openrouter') {
    return { openrouter: await fetchModels('https://openrouter.ai/api/v1/models') };
  }

  // Catalog requests never accept credentials, and never use endpoints supplied by the feed.
  const body = await fetchModelCatalogJson('https://models.dev/api.json') as
    Record<string, { models?: Record<string, ModelRecord> }> | null;
  const result: ModelCatalogData = {};
  for (const [provider, key] of Object.entries(MODELS_DEV_PROVIDERS)) {
    const models = body?.[key]?.models;
    if (!models || typeof models !== 'object' || Array.isArray(models)) {
      throw new AiProviderError({ code: 'provider', messageKey: 'modelsLoadError' });
    }
    result[provider as keyof typeof MODELS_DEV_PROVIDERS] = normalizeModels(Object.values(models));
  }
  return result;
}
