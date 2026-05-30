import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Translate',
    description: 'Translate selected text from any webpage with your own Google Translate API key.',
    permissions: ['storage', 'contextMenus'],
    host_permissions: ['https://translation.googleapis.com/*'],
  },
});
