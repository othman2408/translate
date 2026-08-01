import { defineConfig } from 'wxt';

const edgeBinary = process.platform === 'win32'
  ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  : undefined;

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  webExt: {
    binaries: edgeBinary ? {
      edge: edgeBinary,
    } : undefined,
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
    ],
    action: {
      default_title: '__MSG_extName__',
    },
    browser_specific_settings: {
      gecko: {
        data_collection_permissions: {
          required: ['authenticationInfo', 'websiteContent'],
        },
      },
    },
  },
});
