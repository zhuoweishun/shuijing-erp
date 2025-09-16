import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { networkInterfaces } from 'os'
import { fileURLToPath } from 'node:url'

// 获取本机IP地址
function getLocalIP(): string {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    const netInfo = nets[name]
    if (netInfo) {
      for (const net of netInfo) {
        // 跳过内部地址和IPv6地址
        if (net.family === 'IPv4' && !net.internal) {
          return net.address
        }
      }
    }
  }
  return 'localhost'
}

const localIP = getLocalIP()
if (typeof console !== 'undefined') {
  console.log(`🌐 本地IP地址: ${localIP}`)
  console.log(`📱 手机端访问地址: http://${localIP}:5173`)
  console.log(`💻 电脑端访问地址: http://localhost:5173`)
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
  },
  server: {
    // 开发环境使用HTTP避免混合内容问题
    // https: {
    //   key: fs.readFileSync('./localhost+3-key.pem'),
    //   cert: fs.readFileSync('./localhost+3.pem'),
    // },
    host: '0.0.0.0', // 允许外部访问
    port: 5173,
    strictPort: true,
    cors: true,
    proxy: {
      '/api': {
        target: `http://${localIP}:3001`,
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: `http://${localIP}:3001`,
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react'],
          utils: ['axios', 'socket.io-client']
        }
      }
    }
  },
  define: {
    __LOCAL_IP__: JSON.stringify(localIP),
    __PUBLIC_IP__: JSON.stringify('139.224.189.1'),
    __API_DOMAIN__: JSON.stringify('api.dorblecapital.com')
  }
})