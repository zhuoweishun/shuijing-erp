// 测试SKU销毁API数据验证的脚本
import axios from 'axios'

const API_BASE = 'http://localhost:3001/api/v1'

// 测试用的认证token（需要先登录获取）
const TEST_TOKEN = 'your_test_token_here'

async function testDestroyValidation() {
  try {
    console.log('🧪 开始测试SKU销毁API数据验证...')
    
    // 1. 先获取一个可用的SKU
    console.log('\n1. 获取SKU列表...')
    const skuListResponse = await axios.get(`${API_BASE}/skus?limit=5`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    })
    
    if (!skuListResponse.data.success || !skuListResponse.data.data.skus.length) {
      console.log('❌ 没有找到可用的SKU')
      return
    }
    
    const testSku = skuListResponse.data.data.skus[0]
    console.log(`✅ 找到测试SKU: ${testSku.sku_code} (可售数量: ${testSku.available_quantity})`)
    
    // 2. 测试不同的数据格式
    const testCases = [
      {
        name: '正确格式 - 简单销毁',
        data: {
          quantity: 1,
          reason: '测试销毁',
          returnToMaterial: false
        }
      },
      {
        name: '正确格式 - 拆散重做（数字格式）',
        data: {
          quantity: 1,
          reason: '拆散重做',
          returnToMaterial: true,
          selected_materials: ['test_purchase_id'],
          customReturnQuantities: {
            'test_purchase_id': 5  // 数字格式
          }
        }
      },
      {
        name: '错误格式 - 对象格式（前端原始格式）',
        data: {
          quantity: 1,
          reason: '拆散重做',
          returnToMaterial: true,
          selected_materials: ['test_purchase_id'],
          customReturnQuantities: {
            'test_purchase_id': { beads: 5, pieces: 0 }  // 对象格式
          }
        }
      }
    ]
    
    for (const testCase of testCases) {
      console.log(`\n2. 测试: ${testCase.name}`)
      console.log('发送数据:', JSON.stringify(testCase.data, null, 2))
      
      try {
        const response = await axios.post(
          `${API_BASE}/skus/${testSku.id}/destroy`,
          testCase.data,
          {
            headers: {
              'Authorization': `Bearer ${TEST_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        console.log('✅ 验证通过:', response.data.message)
        
      } catch (error) {
        if (error.response) {
          console.log('❌ 验证失败:')
          console.log('状态码:', error.response.status)
          console.log('错误信息:', error.response.data)
          
          // 如果是验证错误，显示详细信息
          if (error.response.data.details) {
            console.log('验证详情:', JSON.stringify(error.response.data.details, null, 2))
          }
        } else {
          console.log('❌ 请求失败:', error.message)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message)
  }
}

// 运行测试
testDestroyValidation()

console.log('\n📝 使用说明:')
console.log('1. 请先登录获取有效的token')
console.log('2. 将token替换到TEST_TOKEN变量中')
console.log('3. 运行脚本: node test-destroy-validation.js')
console.log('4. 观察不同数据格式的验证结果')