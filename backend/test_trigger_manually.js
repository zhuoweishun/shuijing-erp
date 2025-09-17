import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    // 手动执行触发器逻辑，模拟最新的油胆采购记录
    const purchaseId = 'cmfnlqwb00001g8zs7ruz4g60';
    
    // 获取采购记录详情
    const [purchase] = await connection.execute(
      'SELECT * FROM purchases WHERE id = ?', 
      [purchaseId]
    );
    
    if (purchase.length === 0) {
      console.log('未找到采购记录');
      return;
    }
    
    const p = purchase[0];
    console.log('采购记录详情:');
    console.log('状态:', p.status);
    console.log('类型:', p.purchase_type);
    console.log('数量:', p.piece_count);
    console.log('重量:', p.weight);
    
    // 检查触发器执行条件
    if (p.status !== 'ACTIVE') {
      console.log('❌ 状态不是ACTIVE，触发器不会执行');
      return;
    }
    
    console.log('✅ 状态是ACTIVE，触发器应该执行');
    
    // 手动执行触发器逻辑
    const materialId = `mat_${Math.random().toString(36).substr(2, 8)}_${Date.now()}`;
    
    const originalQuantity = Math.max(
      p.purchase_type === 'LOOSE_BEADS' ? (p.piece_count || 1) :
      p.purchase_type === 'BRACELET' ? (p.total_beads || p.piece_count || 1) :
      (p.piece_count || 1),
      1
    );
    
    console.log('计算的原始数量:', originalQuantity);
    
    // 手动插入material记录
    await connection.execute(`
      INSERT INTO materials (
        id, material_code, material_name, material_type, quality,
        original_quantity, inventory_unit, unit_cost, total_cost,
        purchase_id, supplier_id, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      materialId,
      p.purchase_code,
      p.purchase_name,
      p.purchase_type,
      p.quality || 'UNKNOWN',
      originalQuantity,
      'PIECES',
      (p.total_price || 0) / originalQuantity,
      p.total_price || 0,
      p.id,
      p.supplier_id,
      p.user_id
    ]);
    
    console.log('✅ 手动创建material记录成功');
    
    // 验证创建结果
    const [materials] = await connection.execute(
      'SELECT * FROM materials WHERE purchase_id = ?',
      [purchaseId]
    );
    
    console.log('\n验证结果:');
    console.log('materials表记录数量:', materials.length);
    if (materials.length > 0) {
      console.log('原始数量:', materials[0].original_quantity);
      console.log('剩余数量:', materials[0].remaining_quantity);
    }
    
    await connection.end();
  } catch (error) {
    console.error('错误:', error.message);
  }
})();