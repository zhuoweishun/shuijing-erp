import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function analyzeCurrentTrigger() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔍 分析当前SKU销毁财务触发器的比例计算问题...');
    
    const [triggerDef] = await connection.query('SHOW CREATE TRIGGER tr_sku_destroy_financial');
    
    if (triggerDef.length > 0) {
      const triggerSQL = triggerDef[0]['SQL Original Statement'];
      
      console.log('\n📋 当前触发器关键逻辑分析：');
      
      // 检查是否获取了销毁数量
      const hasDestroyedQuantity = triggerSQL.includes('destroyed_quantity');
      console.log(`1. 获取销毁数量: ${hasDestroyedQuantity ? '✅' : '❌'}`);
      
      // 检查是否获取了SKU总数量
      const hasSkuTotalQuantity = triggerSQL.includes('total_quantity');
      console.log(`2. 获取SKU总数量: ${hasSkuTotalQuantity ? '✅' : '❌'}`);
      
      // 检查是否使用了比例计算
      const hasProportionalCalculation = triggerSQL.includes('* destroyed_quantity') || triggerSQL.includes('* quantity');
      console.log(`3. 使用比例计算: ${hasProportionalCalculation ? '✅' : '❌'}`);
      
      console.log('\n❌ 发现的问题：');
      console.log('当前触发器直接使用 SUM(mu_create.quantity_used) 作为原始使用量');
      console.log('这包含了所有SKU的原材料使用量，而不是按销毁比例计算');
      
      console.log('\n🎯 正确的计算逻辑应该是：');
      console.log('1. 获取销毁的SKU数量：ABS(NEW.quantity_change)');
      console.log('2. 获取SKU的总数量：从product_skus表查询total_quantity');
      console.log('3. 计算应销毁的原材料数量：');
      console.log('   expected_destroy_qty = (original_usage * destroyed_quantity) / total_quantity');
      console.log('4. 计算实际损耗：');
      console.log('   loss_quantity = expected_destroy_qty - returned_quantity');
      
      console.log('\n📊 举例说明问题：');
      console.log('- 创建5个SKU，每个用10个A材料，总共用了50个A');
      console.log('- 现在销毁4个SKU');
      console.log('- 当前触发器：使用50个A作为原始使用量（错误）');
      console.log('- 正确逻辑：应销毁40个A = (50 * 4) / 5');
      console.log('- 如果退回了38个A，损耗应该是2个A，而不是12个A');
      
    } else {
      console.log('❌ 触发器不存在');
    }
    
  } catch (error) {
    console.error('❌ 分析失败:', error);
  } finally {
    await connection.end();
  }
}

analyzeCurrentTrigger().catch(console.error);