import mysql from 'mysql2/promise';

async function checkTriggers() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('🔍 检查数据库中的purchase相关触发器...');
    const [triggers] = await connection.execute('SHOW TRIGGERS LIKE \'tr_purchase_%\'');
    
    if (triggers.length === 0) {
      console.log('❌ 没有找到purchase相关的触发器！');
    } else {
      console.log('✅ 找到以下触发器:');
      triggers.forEach(t => {
        console.log(`- ${t.Trigger}: ${t.Timing} ${t.Event} ON ${t.Table}`);
      });
    }
    
    // 检查CG20250917120816的具体情况
    console.log('\n🔍 检查CG20250917120816的purchase记录...');
    const [purchases] = await connection.execute(
      'SELECT * FROM purchases WHERE purchase_code = ?',
      ['CG20250917120816']
    );
    
    if (purchases.length > 0) {
      const purchase = purchases[0];
      console.log('Purchase记录:');
      console.log('- ID:', purchase.id);
      console.log('- Status:', purchase.status);
      console.log('- Purchase Type:', purchase.purchase_type);
      console.log('- Piece Count:', purchase.piece_count);
      console.log('- Weight:', purchase.weight);
      console.log('- Total Price:', purchase.total_price);
      console.log('- Created At:', purchase.created_at);
      
      // 检查对应的material记录
      console.log('\n🔍 检查对应的material记录...');
      const [materials] = await connection.execute(
        'SELECT * FROM materials WHERE material_code = ?',
        ['CG20250917120816']
      );
      
      if (materials.length > 0) {
        const material = materials[0];
        console.log('Material记录:');
        console.log('- ID:', material.id);
        console.log('- Original Quantity:', material.original_quantity);
        console.log('- Used Quantity:', material.used_quantity);
        console.log('- Remaining Quantity:', material.remaining_quantity);
        console.log('- Unit Cost:', material.unit_cost);
        console.log('- Created At:', material.created_at);
        
        // 分析问题
        console.log('\n📊 数据分析:');
        if (material.remaining_quantity !== material.original_quantity) {
          console.log('❌ 问题确认: remaining_quantity不等于original_quantity');
          console.log(`   应该是: ${material.original_quantity}`);
          console.log(`   实际是: ${material.remaining_quantity}`);
          console.log(`   差异: ${material.original_quantity - material.remaining_quantity}`);
        } else {
          console.log('✅ remaining_quantity等于original_quantity，数据正常');
        }
      } else {
        console.log('❌ 没有找到对应的material记录！');
      }
    } else {
      console.log('❌ 没有找到CG20250917120816的purchase记录！');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTriggers();