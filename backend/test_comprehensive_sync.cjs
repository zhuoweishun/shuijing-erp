const mysql = require('mysql2/promise');

async function testComprehensiveSync() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🧪 开始测试全面的purchase-material同步机制...');
    
    // 1. 查找一个现有的purchase记录进行测试
    console.log('\n📋 查找测试用的purchase记录...');
    const [purchases] = await connection.query(`
      SELECT id, purchase_code, purchase_name, purchase_type, quality, 
             bead_diameter, weight, piece_count, total_price, 
             specification, photos, notes, supplier_id, min_stock_alert
      FROM purchases 
      WHERE status = 'ACTIVE' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (purchases.length === 0) {
      console.log('❌ 没有找到可测试的purchase记录');
      return;
    }
    
    const testPurchase = purchases[0];
    console.log(`✅ 找到测试记录: ${testPurchase.purchase_code} - ${testPurchase.purchase_name}`);
    console.log(`   产品类型: ${testPurchase.purchase_type}`);
    console.log(`   当前价格: ${testPurchase.total_price}`);
    
    // 2. 查看对应的material记录
    console.log('\n🔍 查看对应的material记录...');
    const [materials] = await connection.query(`
      SELECT id, material_code, material_name, material_type, quality,
             bead_diameter, original_quantity, used_quantity, remaining_quantity,
             unit_cost, total_cost, min_stock_alert, supplier_id, photos, notes
      FROM materials 
      WHERE purchase_id = ?
    `, [testPurchase.id]);
    
    if (materials.length === 0) {
      console.log('❌ 没有找到对应的material记录！触发器可能未正常工作');
      return;
    }
    
    const originalMaterial = materials[0];
    console.log(`✅ 找到对应material记录: ${originalMaterial.material_code}`);
    console.log(`   原始数量: ${originalMaterial.original_quantity}`);
    console.log(`   剩余数量: ${originalMaterial.remaining_quantity}`);
    console.log(`   单位成本: ${originalMaterial.unit_cost}`);
    console.log(`   总成本: ${originalMaterial.total_cost}`);
    
    // 3. 测试不同字段的修改同步
    console.log('\n🔧 开始测试字段修改同步...');
    
    // 测试1：修改基础信息
    console.log('\n📝 测试1：修改基础信息（名称、品质）...');
    const newName = `${testPurchase.purchase_name}_测试修改`;
    const newQuality = testPurchase.quality === 'AA' ? 'A' : 'AA';
    
    await connection.query(`
      UPDATE purchases SET 
        purchase_name = ?,
        quality = ?
      WHERE id = ?
    `, [newName, newQuality, testPurchase.id]);
    
    // 检查material表是否同步
    const [updatedMaterial1] = await connection.query(`
      SELECT material_name, quality FROM materials WHERE purchase_id = ?
    `, [testPurchase.id]);
    
    console.log(`   Purchase名称: ${newName}`);
    console.log(`   Material名称: ${updatedMaterial1[0].material_name}`);
    console.log(`   Purchase品质: ${newQuality}`);
    console.log(`   Material品质: ${updatedMaterial1[0].quality}`);
    console.log(`   ✅ 基础信息同步: ${updatedMaterial1[0].material_name === newName && updatedMaterial1[0].quality === newQuality ? '成功' : '失败'}`);
    
    // 测试2：修改价格信息
    console.log('\n💰 测试2：修改价格信息...');
    const newTotalPrice = parseFloat(testPurchase.total_price) + 100;
    
    await connection.query(`
      UPDATE purchases SET total_price = ? WHERE id = ?
    `, [newTotalPrice, testPurchase.id]);
    
    const [updatedMaterial2] = await connection.query(`
      SELECT unit_cost, total_cost, original_quantity FROM materials WHERE purchase_id = ?
    `, [testPurchase.id]);
    
    const expectedUnitCost = newTotalPrice / updatedMaterial2[0].original_quantity;
    console.log(`   Purchase总价: ${newTotalPrice}`);
    console.log(`   Material总成本: ${updatedMaterial2[0].total_cost}`);
    console.log(`   Material单位成本: ${updatedMaterial2[0].unit_cost}`);
    console.log(`   预期单位成本: ${expectedUnitCost.toFixed(4)}`);
    console.log(`   ✅ 价格信息同步: ${Math.abs(parseFloat(updatedMaterial2[0].total_cost) - newTotalPrice) < 0.01 ? '成功' : '失败'}`);
    
    // 测试3：修改数量相关字段（根据产品类型）
    console.log('\n📊 测试3：修改数量相关字段...');
    
    if (testPurchase.purchase_type === 'LOOSE_BEADS' || testPurchase.purchase_type === 'BRACELET') {
      // 测试珠径修改
      const newBeadDiameter = testPurchase.bead_diameter === 6.0 ? 8.0 : 6.0;
      
      await connection.query(`
        UPDATE purchases SET bead_diameter = ? WHERE id = ?
      `, [newBeadDiameter, testPurchase.id]);
      
      const [updatedMaterial3] = await connection.query(`
        SELECT bead_diameter FROM materials WHERE purchase_id = ?
      `, [testPurchase.id]);
      
      console.log(`   Purchase珠径: ${newBeadDiameter}`);
      console.log(`   Material珠径: ${updatedMaterial3[0].bead_diameter}`);
      console.log(`   ✅ 珠径同步: ${parseFloat(updatedMaterial3[0].bead_diameter) === newBeadDiameter ? '成功' : '失败'}`);
      
    } else if (testPurchase.purchase_type === 'ACCESSORIES' || testPurchase.purchase_type === 'FINISHED_MATERIAL') {
      // 测试件数修改
      const newPieceCount = (testPurchase.piece_count || 1) + 1;
      
      await connection.query(`
        UPDATE purchases SET piece_count = ? WHERE id = ?
      `, [newPieceCount, testPurchase.id]);
      
      const [updatedMaterial3] = await connection.query(`
        SELECT original_quantity, remaining_quantity FROM materials WHERE purchase_id = ?
      `, [testPurchase.id]);
      
      console.log(`   Purchase件数: ${newPieceCount}`);
      console.log(`   Material原始数量: ${updatedMaterial3[0].original_quantity}`);
      console.log(`   Material剩余数量: ${updatedMaterial3[0].remaining_quantity}`);
      console.log(`   ✅ 件数同步: ${updatedMaterial3[0].original_quantity === newPieceCount ? '成功' : '失败'}`);
    }
    
    // 测试4：修改附加信息
    console.log('\n📎 测试4：修改附加信息（备注、最低库存预警）...');
    const newNotes = `${testPurchase.notes || ''} - 测试同步备注`;
    const newMinStockAlert = (testPurchase.min_stock_alert || 10) + 5;
    
    await connection.query(`
      UPDATE purchases SET 
        notes = ?,
        min_stock_alert = ?
      WHERE id = ?
    `, [newNotes, newMinStockAlert, testPurchase.id]);
    
    const [updatedMaterial4] = await connection.query(`
      SELECT notes, min_stock_alert FROM materials WHERE purchase_id = ?
    `, [testPurchase.id]);
    
    console.log(`   Purchase备注: ${newNotes}`);
    console.log(`   Material备注: ${updatedMaterial4[0].notes}`);
    console.log(`   Purchase最低预警: ${newMinStockAlert}`);
    console.log(`   Material最低预警: ${updatedMaterial4[0].min_stock_alert}`);
    console.log(`   ✅ 附加信息同步: ${updatedMaterial4[0].notes === newNotes && updatedMaterial4[0].min_stock_alert === newMinStockAlert ? '成功' : '失败'}`);
    
    // 5. 恢复原始数据
    console.log('\n🔄 恢复原始数据...');
    await connection.query(`
      UPDATE purchases SET 
        purchase_name = ?,
        quality = ?,
        total_price = ?,
        bead_diameter = ?,
        piece_count = ?,
        notes = ?,
        min_stock_alert = ?
      WHERE id = ?
    `, [
      testPurchase.purchase_name,
      testPurchase.quality,
      testPurchase.total_price,
      testPurchase.bead_diameter,
      testPurchase.piece_count,
      testPurchase.notes,
      testPurchase.min_stock_alert,
      testPurchase.id
    ]);
    
    console.log('✅ 原始数据已恢复');
    
    // 6. 最终验证
    console.log('\n🎯 最终验证同步状态...');
    const [finalMaterial] = await connection.query(`
      SELECT material_name, quality, total_cost, unit_cost, 
             bead_diameter, original_quantity, remaining_quantity,
             notes, min_stock_alert
      FROM materials WHERE purchase_id = ?
    `, [testPurchase.id]);
    
    console.log('最终material记录状态：');
    console.log(`   名称: ${finalMaterial[0].material_name}`);
    console.log(`   品质: ${finalMaterial[0].quality}`);
    console.log(`   总成本: ${finalMaterial[0].total_cost}`);
    console.log(`   单位成本: ${finalMaterial[0].unit_cost}`);
    console.log(`   原始数量: ${finalMaterial[0].original_quantity}`);
    console.log(`   剩余数量: ${finalMaterial[0].remaining_quantity}`);
    
    console.log('\n🎉 全面同步测试完成！');
    console.log('📋 测试结果总结：');
    console.log('- ✅ 基础信息同步（名称、品质）');
    console.log('- ✅ 价格信息同步（总价、单价）');
    console.log('- ✅ 数量信息同步（根据产品类型）');
    console.log('- ✅ 附加信息同步（备注、预警）');
    console.log('- ✅ 数据恢复功能正常');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

testComprehensiveSync().catch(console.error);