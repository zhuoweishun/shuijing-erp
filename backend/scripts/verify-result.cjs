const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function verifyAndSave() {
  let connection;
  let output = [];
  
  function log(message) {
    console.log(message);
    output.push(message);
  }
  
  try {
    const databaseUrl = process.env.DATABASE_URL || 'mysql://root:ZWSloveWCC123@localhost:3306/crystal_erp_dev';
    const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    const [, user, password, host, port, database] = urlMatch;
    
    connection = await mysql.createConnection({
      host, user, password, database, port: parseInt(port)
    });

    log('=== 张美丽购买记录验证报告 ===');
    log('');
    
    // 查找张美丽
    const [customers] = await connection.execute(
      'SELECT * FROM customers WHERE name = ?', ['张美丽']
    );

    if (customers.length === 0) {
      log('❌ 未找到客户"张美丽"');
      return;
    }

    const customer = customers[0];
    log(`✅ 客户信息: ${customer.name} (ID: ${customer.id})`);
    log(`📱 联系方式: ${customer.phone || '未设置'}`);
    log('');
    
    // 查询购买记录
    const [purchases] = await connection.execute(`
      SELECT 
        cp.id, cp.sku_id, cp.quantity, cp.unit_price, cp.total_price, cp.status, cp.created_at,
        ps.sku_code, ps.sku_name, ps.available_quantity, ps.total_quantity
      FROM customer_purchases cp
      JOIN product_skus ps ON cp.sku_id = ps.id
      WHERE cp.customer_id = ?
      ORDER BY cp.created_at DESC
    `, [customer.id]);

    log(`📊 购买记录总数: ${purchases.length} 条`);
    
    if (purchases.length === 0) {
      log('❌ 张美丽没有任何购买记录');
      return;
    }

    // 统计不同SKU数量
    const uniqueSkus = new Set(purchases.map(p => p.sku_id));
    log(`🎯 购买的不同SKU数量: ${uniqueSkus.size} 个`);
    
    // 统计总购买件数
    const totalQuantity = purchases.reduce((sum, p) => sum + p.quantity, 0);
    log(`📦 总购买件数: ${totalQuantity} 件`);
    
    // 统计总金额
    const totalAmount = purchases.reduce((sum, p) => sum + parseFloat(p.total_price), 0);
    log(`💰 总购买金额: ¥${totalAmount.toFixed(2)}`);
    log('');
    
    log('📋 详细购买记录:');
    log(''.padEnd(80, '-'));
    
    let validRecords = 0;
    let invalidRecords = 0;
    
    for (let i = 0; i < purchases.length; i++) {
      const purchase = purchases[i];
      log(`${i + 1}. 购买记录 ID: ${purchase.id}`);
      log(`   SKU编码: ${purchase.sku_code}`);
      log(`   SKU名称: ${purchase.sku_name}`);
      log(`   购买数量: ${purchase.quantity} 件`);
      log(`   单价: ¥${purchase.unit_price}`);
      log(`   总价: ¥${purchase.total_price}`);
      log(`   购买时间: ${purchase.created_at}`);
      log(`   状态: ${purchase.status}`);
      log(`   当前库存: ${purchase.available_quantity}`);
      log(`   总库存: ${purchase.total_quantity}`);
      
      // 验证SKU是否存在
      const [skuExists] = await connection.execute(
        'SELECT id FROM product_skus WHERE id = ?', [purchase.sku_id]
      );
      
      if (skuExists.length > 0) {
        log(`   ✅ SKU存在于管理列表中`);
        validRecords++;
      } else {
        log(`   ❌ SKU不存在于管理列表中`);
        invalidRecords++;
      }
      
      if (purchase.available_quantity < 0) {
        log(`   ⚠️  警告: 库存为负数`);
      }
      
      log('');
    }
    
    log(''.padEnd(80, '='));
    log('📊 验证总结:');
    log(''.padEnd(80, '='));
    log(`👤 客户: ${customer.name}`);
    log(`📝 购买记录总数: ${purchases.length} 条`);
    log(`✅ 有效记录: ${validRecords} 条`);
    log(`❌ 无效记录: ${invalidRecords} 条`);
    log(`🎯 不同SKU数量: ${uniqueSkus.size} 个`);
    log(`📦 总购买件数: ${totalQuantity} 件`);
    log(`💰 总金额: ¥${totalAmount.toFixed(2)}`);
    log('');
    
    log('🎯 最终结论:');
    if (uniqueSkus.size === 14) {
      log('✅ 确认: 张美丽确实购买了14个不同的SKU');
    } else {
      log(`❌ 不符合: 张美丽实际购买了${uniqueSkus.size}个不同的SKU，不是14个`);
    }
    
    if (invalidRecords === 0) {
      log('✅ 所有购买记录都对应真实的SKU');
    } else {
      log(`⚠️  有${invalidRecords}条购买记录对应的SKU不存在`);
    }
    
    const negativeStock = purchases.filter(p => p.available_quantity < 0);
    if (negativeStock.length === 0) {
      log('✅ 所有SKU库存状态正常');
    } else {
      log(`⚠️  有${negativeStock.length}个SKU库存为负数`);
    }
    
    // 保存结果到文件
    fs.writeFileSync('verify-zhangmeili-result.txt', output.join('\n'), 'utf8');
    log('');
    log('📄 验证结果已保存到 verify-zhangmeili-result.txt');

  } catch (error) {
    log(`❌ 验证失败: ${error.message}`);
  } finally {
    if (connection) await connection.end();
  }
}

verifyAndSave();