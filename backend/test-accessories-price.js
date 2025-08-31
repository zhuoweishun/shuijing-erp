import fetch from 'node-fetch'

async function testAccessoriesPrice() {
  try {
    console.log('🔍 测试配件库存价格显示...')
    
    // 模拟登录获取token（使用BOSS账号）
    const loginResponse = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'boss',
        password: 'boss123'
      })
    })
    
    const loginData = await loginResponse.json()
    if (!loginData.success) {
      console.error('登录失败:', loginData.message)
      return
    }
    
    const token = loginData.data.token
    console.log('✅ 登录成功')
    
    // 查询层级式库存API，筛选配件类型
    const inventoryResponse = await fetch('http://localhost:3001/api/v1/inventory/hierarchical?product_types=ACCESSORIES', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const inventoryData = await inventoryResponse.json()
    if (!inventoryData.success) {
      console.error('库存查询失败:', inventoryData.message)
      return
    }
    
    console.log('✅ 库存查询成功')
    
    // 查找南红隔珠的数据
    const hierarchy = inventoryData.data.hierarchy
    let nanghongFound = false
    
    hierarchy.forEach(typeGroup => {
      if (typeGroup.product_type === 'ACCESSORIES') {
        typeGroup.specifications.forEach(specGroup => {
          specGroup.qualities.forEach(qualityGroup => {
            qualityGroup.batches.forEach(batch => {
              if (batch.product_name.includes('南红隔珠')) {
                nanghongFound = true
                console.log('\n🎯 找到南红隔珠数据:')
                console.log('  产品名称:', batch.product_name)
                console.log('  采购编号:', batch.purchase_id)
                console.log('  规格:', batch.specification ? `${batch.specification}mm` : 'null')
                console.log('  库存数量:', batch.remaining_quantity, '片')
                console.log('  每片价格(price_per_unit):', batch.price_per_unit ? `${batch.price_per_unit}元/片` : 'null')
                console.log('  克价(price_per_gram):', batch.price_per_gram ? `${batch.price_per_gram}元/g` : 'null')
                console.log('  供应商:', batch.supplier_name)
                console.log('  采购日期:', batch.purchase_date)
                
                // 验证价格计算
                if (batch.price_per_unit) {
                  console.log('  ✅ 每片价格显示正常')
                } else {
                  console.log('  ❌ 每片价格为空')
                }
              }
            })
          })
        })
      }
    })
    
    if (!nanghongFound) {
      console.log('❌ 未找到南红隔珠数据')
    }
    
  } catch (error) {
    console.error('测试失败:', error)
  }
}

testAccessoriesPrice()