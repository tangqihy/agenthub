import type { UserConfigExport } from "@tarojs/cli";

const apiTarget = process.env.AGENTHUB_API_TARGET || 'http://127.0.0.1:8000'

export default {
  mini: {},
  h5: {
    devServer: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  },
} satisfies UserConfigExport<'vite'>
