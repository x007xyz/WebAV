import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { externalizeDeps } from 'vite-plugin-externalize-deps';

export default defineConfig({
  plugins: [dts({ rollupTypes: true }), externalizeDeps()],
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'av-cliper',
    },
  },
  define: {
    ...(process.env.NODE_ENV !== 'test'
      ? { 'import.meta.vitest': 'undefined' }
      : {}),
  },
  test: {
    includeSource: ['src/**/*.{ts,tsx}'],
    browser: {
      provider: 'webdriverio',
      enabled: true,
      headless: true,
      // 配置浏览器测试的 API 服务器端口
      api: 5055,
      instances: [
        {
          name: 'chrome-tests',
          browser: 'chrome',
          // 添加 WebDriverIO capabilities 来启用 WebGL 支持
          capabilities: {
            browserName: 'chrome',
            'goog:chromeOptions': {
              args: [
                // WebGL 相关参数
                '--enable-unsafe-webgpu',
              ],
            },
          },
        },
      ],
    },
  },
  server: {
    host: '0.0.0.0',
    port: 6066,
  },
  ...(['development', 'test'].includes(process.env.NODE_ENV ?? '')
    ? {
        publicDir: resolve(__dirname, '../../doc-site/public'),
      }
    : {}),
});
