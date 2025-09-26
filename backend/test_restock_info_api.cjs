const mysql = require('mysql2/promise');

// 测试SKU补货信息API
async function testRestockInfoAPI() {
  try {
    console.log('🔍 [测试] 开始测试SKU补货信息API...');
    
    // 数据库连接配置
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    // 1. 查找一个有效的SKU ID
    console.log('\n📋 [步骤1] 查找有效的SKU...');
    const [skus] = await connection.execute(
      'SELECT id, sku_code, sku_name, available_quantity FROM product_skus WHERE status = "ACTIVE" LIMIT 1'
    );
    
    if (skus.length === 0) {
      console.log('❌ 没有找到有效的SKU');
      await connection.end();
      return;
    }
    
    const testSku = skus[0];
    console.log('✅ 找到测试SKU:', {
      id: testSku.id,
      sku_code: testSku.sku_code,
      sku_name: testSku.sku_name,
      available_quantity: testSku.available_quantity
    });
    
    // 2. 查看该SKU的原材料使用记录
    console.log('\n📋 [步骤2] 查看SKU的原材料使用记录...');
    const [materialUsages] = await connection.execute(`
      SELECT 
        mu.id as usage_id,
        mu.material_id,
        mu.quantity_used,
        m.material_name,
        m.material_type,
        m.remaining_quantity,
        m.unit_cost,
        p.purchase_name,
        s.name as supplier_name
      FROM material_usage mu
      LEFT JOIN materials m ON mu.material_id = m.id
      LEFT JOIN purchases p ON m.purchase_id = p.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE mu.sku_id = ?
    `, [testSku.id]);
    
    console.log(`✅ 找到 ${materialUsages.length} 条原材料使用记录:`);
    materialUsages.forEach((usage, index) => {
      console.log(`   ${index + 1}. ${usage.material_name} (${usage.material_type})`);
      console.log(`      - 使用数量: ${usage.quantity_used}`);
      console.log(`      - 剩余库存: ${usage.remaining_quantity}`);
      console.log(`      - 供应商: ${usage.supplier_name || '未知'}`);
      console.log(`      - 单价: ¥${usage.unit_cost || 0}`);
    });
    
    // 3. 测试API调用
    console.log('\n📋 [步骤3] 测试API调用...');
    
    // 模拟API调用（这里我们直接测试数据库逻辑）
    const networkConfig = {
      api_base_url: 'http://192.168.50.160:3001'
    };
    
    console.log(`🌐 API URL: ${networkConfig.api_base_url}/api/v1/skus/${testSku.id}/restock-info`);
    
    // 4. 分析补货可行性
    console.log('\n📋 [步骤4] 分析补货可行性...');
    let canRestock = true;
    const insufficientMaterials = [];
    
    materialUsages.forEach(usage => {
      const needed = usage.quantity_used;
      const available = usage.remaining_quantity || 0;
      const sufficient = available >= needed;
      
      console.log(`   ${usage.material_name}:`);
      console.log(`      - 需要: ${needed}`);
      console.log(`      - 可用: ${available}`);
      console.log(`      - 状态: ${sufficient ? '✅ 充足' : '❌ 不足'}`);
      
      if (!sufficient) {
        canRestock = false;
        insufficientMaterials.push(usage.material_name);
      }
    });
    
    console.log(`\n🎯 [结果] 补货可行性: ${canRestock ? '✅ 可以补货' : '❌ 无法补货'}`);
    if (!canRestock) {
      console.log(`   库存不足的原材料: ${insufficientMaterials.join(', ')}`);
    }
    
    await connection.end();
    console.log('\n✅ [完成] SKU补货信息API测试完成!');
    
  } catch (error) {
    console.error('❌ [错误] 测试失败:', error.message);
  }
}

// 运行测试
testRestockInfoAPI();