import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    manifest_version: 3,
    permissions: ['storage', 'tabs', 'alarms', 'notifications'],
    host_permissions: ['<all_urls>'],
    name: 'TabFocus',
    description: 'Study timer and focus tracker inspired by Yeolpumta',
    browser_specific_settings: {
      gecko: {
        id: "pthfdsa@gmail.com",
        // @ts-ignore
        data_collection_permissions: {
          optional: [],
          required: ["none"]
        }
      }
    }
  },
});
