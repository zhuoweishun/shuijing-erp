import fetch from 'node-fetch'

async function test_api_response() {
  const API_BASE_URL = 'http://localhost:3001/api/v1'
  const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlcl8xNzM3MzU5NzE5NzI5IiwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJCT1NTIiwiaWF0IjoxNzM3MzU5NzIwLCJleHAiOjE3Mzc0NDYxMjB9.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

  try {
    console.log('🧪 测试层级式库存API响应...')
    
    // 调用层级式库存API，筛选散珠类型
    const response = await fetch(`${API_BASE_URL}/inventory/hierarchical?material_types=LOOSE_BEADS`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    console.log('✅ API调用成功')
    console.log('响应状态:', data.success)
    console.log('数据结构:', JSON.stringify(data.data, null, 2))
    
    // 查找油胆数据
    const hierarchy = data.data?.hierarchy || []
    console.log('\n🔍 查找油胆数据...')
    
    let foundYoudan = false
    
    hierarchy.forEach((typeGroup, typeIndex) => {
      console.log(`\n类型组 ${typeIndex + 1}: ${typeGroup.material_type}`)
      
      if (typeGroup.material_type === 'LOOSE_BEADS') {
        typeGroup.specifications?.forEach((spec, specIndex) => {
          console.log(`  规格 ${specIndex + 1}: ${spec.specification_value}${spec.specification_unit}`)
          
          spec.qualities?.forEach((quality, qualityIndex) => {
            console.log(`    品相 ${qualityIndex + 1}: ${quality.quality}级`)
            console.log(`    剩余数量: ${quality.remaining_quantity}`)
            console.log(`    price_per_unit: ${quality.price_per_unit}`)
            console.log(`    price_per_gram: ${quality.price_per_gram}`)
            
            quality.batches?.forEach((batch, batchIndex) => {
              if (batch.material_name?.includes('油胆')) {
                foundYoudan = true
                console.log(`\n      🎯 找到油胆批次 ${batchIndex + 1}:`)
                console.log(`        - material_name: ${batch.material_name}`)
                console.log(`        - material_type: ${batch.material_type}`)
                console.log(`        - quality: ${batch.quality || '未知'}`)
                console.log(`        - remaining_quantity: ${batch.remaining_quantity}`)
                console.log(`        - price_per_unit: ${batch.price_per_unit} (类型: ${typeof batch.price_per_unit})`)
                console.log(`        - unit_cost: ${batch.unit_cost} (类型: ${typeof batch.unit_cost})`)
                console.log(`        - price_per_gram: ${batch.price_per_gram}`)
                console.log(`        - supplier_name: ${batch.supplier_name}`)
                console.log(`        - bead_diameter: ${batch.bead_diameter}mm`)
                
                // 模拟前端价格计算
                const frontendPrice = Number(batch.price_per_unit) || 0
                console.log(`        - 前端计算价格: ${frontendPrice}`)
              }
            })
          })
        })
      }
    })
    
    if (!foundYoudan) {
      console.log('\n⚠️ 未在层级数据中找到油胆记录')
      
      // 尝试搜索所有批次
      console.log('\n🔍 搜索所有批次中的油胆...')
      hierarchy.forEach((typeGroup) => {
        typeGroup.specifications?.forEach((spec) => {
          spec.qualities?.forEach((quality) => {
            quality.batches?.forEach((batch) => {
              console.log(`批次: ${batch.material_name} (${batch.material_type})`)
            })
          })
        })
      })
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  }
}

test_api_response()