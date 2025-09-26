import mysql from 'mysql2/promise';

async function verifyFixResult() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });
  
  try {
    console.log('📦 验证修复结果...');
    
    const [materials] = await connection.execute(`
      SELECT 
        material_name, 
        original_quantity, 
        used_quantity, 
        remaining_quantity
      FROM materials 
      WHERE material_name IN ('镀金随行隔片', '玻利维亚紫水晶') 
         OR material_name LIKE '%油胆%'
      ORDER BY material_name
    `);
    
    console.log('\n📋 最终库存状态:');
    materials.forEach(material => {
      console.log(`\n${material.material_name}:`);
      console.log(`- 原始数量: ${material.original_quantity}`);
      console.log(`- 已用数量: ${material.used_quantity}`);
      console.log(`- 剩余数量: ${material.remaining_quantity}`);
      
      // 验证计算是否正确
      const calculated = Number(material.original_quantity) - Number(material.used_quantity);
      if (calculated === Number(material.remaining_quantity)) {
        console.log('✅ 库存计算正确');
      } else {
        console.log(`❌ 库存计算错误: 应为${calculated}, 实际为${material.remaining_quantity}`);
      }
    });
    
    // 检查预期结果
    console.log('\n🎯 预期结果验证:');
    const expectations = {
      '镀金随行隔片': { original: 30, used: 5, remaining: 25 },
      '玻利维亚紫水晶': { original: 21, used: 5, remaining: 16 },
      '油胆': { original: 1, used: 1, remaining: 0 }
    };
    
    materials.forEach(material => {
      const expected = expectations[material.material_name];
      if (expected) {
        const isCorrect = 
          Number(material.original_quantity) === expected.original &&
          Number(material.used_quantity) === expected.used &&
          Number(material.remaining_quantity) === expected.remaining;
        
        if (isCorrect) {
          console.log(`✅ ${material.material_name}: 符合预期`);
        } else {
          console.log(`❌ ${material.material_name}: 不符合预期`);
          console.log(`   预期: 原始=${expected.original}, 已用=${expected.used}, 剩余=${expected.remaining}`);
          console.log(`   实际: 原始=${material.original_quantity}, 已用=${material.used_quantity}, 剩余=${material.remaining_quantity}`);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
  } finally {
    await connection.end();
  }
}

verifyFixResult();