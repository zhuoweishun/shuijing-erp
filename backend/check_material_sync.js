import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    // 查看最新的油胆采购记录ID
    const purchaseId = 'cmfnlqwb00001g8zs7ruz4g60';
    
    console.log('检查采购记录ID:', purchaseId);
    
    // 查看该采购记录详情
    const [purchase] = await connection.execute(
      'SELECT * FROM purchases WHERE id = ?', 
      [purchaseId]
    );
    
    if (purchase.length > 0) {
      console.log('\n采购记录详情:');
      console.log('名称:', purchase[0].purchase_name);
      console.log('类型:', purchase[0].purchase_type);
      console.log('数量:', purchase[0].piece_count);
      console.log('总价:', purchase[0].total_price);
      console.log('创建时间:', purchase[0].created_at);
    }
    
    // 查看materials表中是否有对应记录
    const [materials] = await connection.execute(
      'SELECT * FROM materials WHERE purchase_id = ?', 
      [purchaseId]
    );
    
    console.log('\nmaterials表中对应记录数量:', materials.length);
    
    if (materials.length > 0) {
      materials.forEach((material, index) => {
        console.log('\nmaterial记录', index + 1, ':');
        console.log('ID:', material.id);
        console.log('名称:', material.name);
        console.log('类型:', material.material_type);
        console.log('原始数量:', material.original_quantity);
        console.log('已使用数量:', material.used_quantity);
        console.log('剩余数量:', material.remaining_quantity);
        console.log('创建时间:', material.created_at);
      });
    } else {
      console.log('\n❌ 未找到对应的material记录！触发器可能未执行！');
    }
    
    await connection.end();
  } catch (error) {
    console.error('错误:', error.message);
  }
})();