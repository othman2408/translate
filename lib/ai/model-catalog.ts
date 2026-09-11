import { t } from '@/lib/i18n';
import type { ListAiModelsMessage, ListAiModelsResponse } from '@/lib/messages';
import { getSettings, type AiProviderConfig } from '@/lib/settings';

import { AiProviderFactory } from './factory';
import { AiProviderError, type AiModel } from './types';
import { fetchPublicModels, getPublicCatalogKey, type ModelCatalogData } from './public-models';

const CACHE_MS = 15 * 60 * 1000;
const MAX_CATALOGS = 20;

export class AiModelCatalog {
  private readonly cache = new Map<string, { catalog: ModelCatalogData; expiresAt: number }>();
  private readonly inFlight = new Map<string, Promise<ModelCatalogData>>();

  constructor(private readonly factory = new AiProviderFactory()) {}

  async list(request: ListAiModelsMessage): Promise<ListAiModelsResponse> {
    const settings = await getSettings();
    try {
      if ('providerType' in request) {
        const catalog = await this.loadCached(
          getPublicCatalogKey(request.providerType),
          () => fetchPublicModels(request.providerType),
          request.refresh === true,
        );
        return { ok: true, models: catalog[request.providerType] ?? [] };
      }
      const config =
        'providerId' in request
          ? settings.aiProviders.find((provider) => provider.id === request.providerId)
          : {
              ...request.credentials,
              apiKey: request.credentials.apiKey.trim(),
              id: '',
              name: '',
              model: '',
            };
      if (!config?.apiKey) {
        throw new AiProviderError({ code: 'missing-api-key', messageKey: 'errorAiMissingApiKey' });
      }
      return { ok: true, models: await this.load(config, request.refresh === true) };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: error instanceof AiProviderError ? error.code : 'provider',
          message: t(
            error instanceof AiProviderError ? error.messageKey : 'modelsLoadError',
            undefined,
            settings.appLanguage,
          ),
        },
      };
    }
  }

  private async load(config: AiProviderConfig, refresh: boolean): Promise<AiModel[]> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(config.apiKey));
    const key = `${config.type}:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
    const catalog = await this.loadCached(key, async () => ({
      [config.type]: await this.factory.createProvider(config).listModels(),
    }), refresh);
    return catalog[config.type] ?? [];
  }

  private async loadCached(
    key: string,
    fetchCatalog: () => Promise<ModelCatalogData>,
    refresh: boolean,
  ): Promise<ModelCatalogData> {
    const pending = this.inFlight.get(key);
    if (pending) return pending;
    const cached = this.cache.get(key);
    if (!refresh && cached && cached.expiresAt > Date.now()) return cached.catalog;

    const promise = fetchCatalog()
      .then((catalog) => {
        this.cache.delete(key);
        this.cache.set(key, { catalog, expiresAt: Date.now() + CACHE_MS });
        while (this.cache.size > MAX_CATALOGS) this.cache.delete(this.cache.keys().next().value!);
        return catalog;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }
}
