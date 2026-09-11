import { defineContentScript } from '#imports';

import { getSettings } from '@/lib/settings';

import { createContentOverlayController } from './content/controller';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*', 'file:///*'],
  async main(ctx) {
    let entrypointActive = true;
    ctx.onInvalidated(() => {
      entrypointActive = false;
    });

    try {
      const initialSettings = await getSettings();
      if (!entrypointActive) {
        return;
      }

      await createContentOverlayController(ctx, initialSettings).start();
    } catch {
      // Existing pages can briefly run an old content script after an extension reload.
    }
  },
});
