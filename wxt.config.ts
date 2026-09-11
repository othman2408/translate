import { resolve } from 'node:path';
import { defineConfig } from 'wxt';

const edgeBinary = process.platform === 'win32'
  ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  : undefined;
const chromiumProfile = resolve('.wxt/chromium-data');

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  webExt: {
    binaries: edgeBinary ? {
      edge: edgeBinary,
    } : undefined,
    chromiumProfile,
    keepProfileChanges: true,
  },
  vite: () => ({
    build: {
      chunkSizeWarningLimit: 700,
    },
  }),
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage', 'contextMenus', 'activeTab'],
    host_permissions: [
      'https://translation.googleapis.com/*',
      'https://api.deepseek.com/*',
      'https://openrouter.ai/api/*',
      'https://api.moonshot.ai/*',
      'https://models.dev/api.json',
    ],
    action: {
      default_title: '__MSG_extName__',
    },
    commands: {
      'translate-selection': {
        suggested_key: {
          default: 'Ctrl+Shift+Y',
          mac: 'Command+Shift+Y',
        },
        description: '__MSG_commandTranslateSelection__',
      },
      'rewrite-selection': {
        suggested_key: {
          default: 'Ctrl+Shift+U',
          mac: 'Command+Shift+U',
        },
        description: '__MSG_commandRewriteSelection__',
      },
      'explain-selection': {
        suggested_key: {
          default: 'Ctrl+Shift+E',
          mac: 'Command+Shift+E',
        },
        description: '__MSG_commandExplainSelection__',
      },
    },
    browser_specific_settings: {
      gecko: {
        id: 'translate@othman2408.github.io',
        data_collection_permissions: {
          required: ['authenticationInfo', 'websiteContent'],
        },
      },
    },
  },
});
