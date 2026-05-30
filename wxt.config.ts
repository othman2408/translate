import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage', 'contextMenus', 'activeTab'],
    host_permissions: ['https://translation.googleapis.com/*'],
    action: {
      default_title: '__MSG_extName__',
    },
  },
});
