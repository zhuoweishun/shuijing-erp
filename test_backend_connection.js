// 测试后端连接状态
const test_endpoints = [
  'http://localhost:3001/api/v1/health',
  'http://127.0.0.1:3001/api/v1/health',
  'http://192.168.50.160:3001/api/v1/health'
]

async function test_backend_connection() {
  console.log('🔍 测试后端连接状态...')
  
  for (const endpoint of test_endpoints) {
    try {
      console.log(`测试: ${endpoint}`)
      const response = await fetch(endpoint, {
        method: 'GET',
        timeout: 5000
      })
      
      if (response.ok) {
        console.log(`✅ ${endpoint} - 连接成功`)
        const data = await response.text()
        console.log('响应:', data)
      } else {
        console.log(`❌ ${endpoint} - HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - 连接失败:`, error.message)
    }
  }
}

// 清除IP缓存
function clear_ip_cache() {
  console.log('🧹 清除IP缓存...')
  localStorage.removeItem('cached_local_ip')
  if (window.__LOCAL_IP__) {
    delete window.__LOCAL_IP__
  }
  console.log('✅ IP缓存已清除')
}

// 运行测试
test_backend_connection()
clear_ip_cache()

console.log('💡 请刷新页面以使用新的网络配置')