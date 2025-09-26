import mysql from 'mysql2/promise';

async function fixRemainingQuantity() {
  let connection;
  
  try {
    console.log('🔧 修复原材料库存的剩余数量...');
    
    // 连接数据库
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      charset: 'utf8mb4'
    });
    
    console.log('✅ 数据库连接成功');
    
    // 1. 检查当前状态
    console.log('\n📊 1. 检查当前状态...');
    const [currentStatus] = await connection.execute(`
      SELECT 
        id,
        material_code,
        material_name,
        original_quantity,
        used_quantity,
        remaining_quantity
      FROM materials 
      ORDER BY created_at DESC
    `);
    
    console.log('修复前的状态:');
    currentStatus.forEach((item, index) => {
      console.log(`${index + 1}. ${item.material_name}: 原始=${item.original_quantity}, 已用=${item.used_quantity}, 剩余=${item.remaining_quantity}`);
    });
    
    // 2. 修复remaining_quantity
    console.log('\n🔧 2. 修复remaining_quantity...');
    const updateResult = await connection.execute(`
      UPDATE materials 
      SET remaining_quantity = original_quantity - used_quantity
      WHERE remaining_quantity != (original_quantity - used_quantity)
    `);
    
    console.log(`✅ 更新了 ${updateResult[0].affectedRows} 条记录`);
    
    // 3. 验证修复结果
    console.log('\n📊 3. 验证修复结果...');
    const [fixedStatus] = await connection.execute(`
      SELECT 
        id,
        material_code,
        material_name,
        original_quantity,
        used_quantity,
        remaining_quantity
      FROM materials 
      ORDER BY created_at DESC
    `);
    
    console.log('修复后的状态:');
    fixedStatus.forEach((item, index) => {
      console.log(`${index + 1}. ${item.material_name}: 原始=${item.original_quantity}, 已用=${item.used_quantity}, 剩余=${item.remaining_quantity}`);
    });
    
    // 4. 统计可用库存
    console.log('\n📈 4. 统计可用库存...');
    const [availableStock] = await connection.execute(`
      SELECT 
        material_type,
        COUNT(*) as record_count,
        SUM(remaining_quantity) as total_available
      FROM materials 
      WHERE remaining_quantity > 0
      GROUP BY material_type
      ORDER BY material_type
    `);
    
    console.log('可用库存统计:');
    availableStock.forEach(stat => {
      console.log(`- ${stat.material_type}: ${stat.record_count}条记录, 总可用量: ${stat.total_available}`);
    });
    
    // 5. 检查是否有库存为0的记录
    const [zeroStock] = await connection.execute(`
      SELECT COUNT(*) as zero_count
      FROM materials 
      WHERE remaining_quantity = 0
    `);
    
    if (zeroStock[0].zero_count > 0) {
      console.log(`\n⚠️ 注意: 有 ${zeroStock[0].zero_count} 条记录的剩余库存为0`);
    } else {
      console.log('\n✅ 所有记录都有可用库存');
    }
    
    console.log('\n🎉 剩余数量修复完成!');
    console.log('\n💡 建议:');
    console.log('1. 刷新前端库存页面查看是否正常显示');
    console.log('2. 测试新的采购记录是否能正确设置剩余数量');
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

fixRemainingQuantity();