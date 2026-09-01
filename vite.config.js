import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { featureFeedPlugin } from './server/featureFeed.mjs'
import { homeApiPlugin } from './server/homeApi.mjs'
import { transitApiPlugin } from './server/transitApi.mjs'
import { diplomacyApiPlugin } from './server/diplomacyApi.mjs'
import { assetsApiPlugin } from './server/assetsApi.mjs'
import { resourcesApiPlugin } from './server/resourcesApi.mjs'

export default defineConfig({
  plugins: [react(), featureFeedPlugin(), homeApiPlugin(), transitApiPlugin(), diplomacyApiPlugin(), assetsApiPlugin(), resourcesApiPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
})
