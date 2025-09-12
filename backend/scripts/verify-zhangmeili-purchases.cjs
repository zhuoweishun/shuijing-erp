const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyZhangmeiliPurchases() {
  let connection;
  
  try {
    // 从DATABASE_URL解析数据库连接信息
    const databaseUrl = process.env.DATABASE_URL || 'mysql://root:ZWSloveWCC123@localhost:3306/crystal_erp_dev';
    const urlMatch = databaseUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (!urlMatch) {
      throw new Error('无法解析DATABASE_URL');
    }
    
    const [, user, password, host, port, database] = urlMatch;
    
    // 创建数据库连接
    connection = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port: parseInt(port)
    });

    console.log('🔍 开始验证张美丽的购买记录...');
    console.log('=' .repeat(60));

    // 1. 查找张美丽的客户信息
    const [customers] = await connection.execute(
      'SELECT * FROM customers WHERE name = ?',
      ['张美丽']
    );

    if (customers.length === 0) {
      console.log('❌ 未找到客户"张美丽"');
      return;
    }

    const customer = customers[0];
    console.log(`✅ 找到客户: ${customer.name} (ID: ${customer.id})`);
    console.log(`📱 联系方式: ${customer.phone || '未设置'}`);
    console.log('');

    // 2. 查询张美丽的所有购买记录
    const [purchases] = await connection.execute(`
      SELECT 
        cp.*,
        ps.skuCode,
        ps.skuName,
        ps.availableQuantity as current_stock,
        ps.totalQuantity as total_stock
      FROM customer_purchases cp
      JOIN product_skus ps ON cp.skuId = ps.id
      WHERE cp.customerId = ?
      ORDER BY cp.createdAt DESC
    `, [customer.id]);

    console.log(`📊 张美丽的购买记录总数: ${purchases.length} 条`);
    console.log('');

    if (purchases.length === 0) {
      console.log('❌ 张美丽没有任何购买记录');
      return;
    }

    // 3. 验证每个购买记录
    let totalSkuCount = 0;
    let validPurchases = 0;
    let invalidPurchases = 0;
    const issues = [];

    console.log('📋 详细购买记录验证:');
    console.log('-'.repeat(80));

    for (let i = 0; i < purchases.length; i++) {
      const purchase = purchases[i];
      totalSkuCount += purchase.quantity;
      
      console.log(`\n${i + 1}. 购买记录 ID: ${purchase.id}`);
      console.log(`   SKU编码: ${purchase.skuCode}`);
      console.log(`   SKU名称: ${purchase.skuName}`);
      console.log(`   购买数量: ${purchase.quantity}`);
      console.log(`   单价: ¥${purchase.unitPrice}`);
      console.log(`   总价: ¥${purchase.totalPrice}`);
      console.log(`   购买时间: ${purchase.createdAt}`);
      console.log(`   状态: ${purchase.status}`);
      
      // 验证SKU是否存在
      const [skuExists] = await connection.execute(
        'SELECT id, skuCode, skuName, availableQuantity, totalQuantity FROM product_skus WHERE id = ?',
        [purchase.skuId]
      );
      
      if (skuExists.length === 0) {
        console.log(`   ❌ SKU不存在于SKU管理列表中`);
        issues.push(`购买记录${purchase.id}: SKU ${purchase.skuCode} 不存在`);
        invalidPurchases++;
      } else {
        console.log(`   ✅ SKU存在于管理列表中`);
        console.log(`   📦 当前库存: ${skuExists[0].availableQuantity}`);
        console.log(`   📦 总库存: ${skuExists[0].totalQuantity}`);
        
        // 检查库存逻辑合理性
        if (skuExists[0].availableQuantity < 0) {
          console.log(`   ⚠️  警告: 当前库存为负数`);
          issues.push(`SKU ${purchase.skuCode}: 库存为负数 (${skuExists[0].availableQuantity})`);
        }
        
        validPurchases++;
      }
    }

    // 4. 生成验证报告
    console.log('\n' + '='.repeat(60));
    console.log('📊 验证报告总结:');
    console.log('='.repeat(60));
    console.log(`👤 客户姓名: ${customer.name}`);
    console.log(`📞 联系方式: ${customer.phone || '未设置'}`);
    console.log(`📝 购买记录总数: ${purchases.length} 条`);
    console.log(`📦 购买SKU总件数: ${totalSkuCount} 件`);
    console.log(`✅ 有效购买记录: ${validPurchases} 条`);
    console.log(`❌ 无效购买记录: ${invalidPurchases} 条`);
    
    // 5. 验证是否真的有14个SKU
    const uniqueSkus = new Set(purchases.map(p => p.skuId));
    console.log(`🎯 购买的不同SKU数量: ${uniqueSkus.size} 个`);
    
    if (uniqueSkus.size === 14) {
      console.log(`✅ 确认: 张美丽确实购买了14个不同的SKU`);
    } else {
      console.log(`❌ 不符合: 张美丽实际购买了${uniqueSkus.size}个不同的SKU，不是14个`);
    }

    // 6. 检查库存扣减情况
    console.log('\n📊 库存扣减验证:');
    console.log('-'.repeat(40));
    
    for (const purchase of purchases) {
      if (purchase.status === 'ACTIVE') {
        console.log(`✅ ${purchase.skuCode}: 购买已生效，库存应已扣减`);
      } else {
        console.log(`⚠️  ${purchase.skuCode}: 购买状态为${purchase.status}，可能未扣减库存`);
      }
    }

    // 7. 问题汇总
    if (issues.length > 0) {
      console.log('\n⚠️  发现的问题:');
      console.log('-'.repeat(40));
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    } else {
      console.log('\n✅ 未发现数据一致性问题');
    }

    // 8. 最终结论
    console.log('\n🎯 最终结论:');
    console.log('-'.repeat(40));
    
    if (uniqueSkus.size === 14 && invalidPurchases === 0) {
      console.log('✅ 张美丽确实购买了14个不同的SKU，所有记录真实有效');
    } else if (uniqueSkus.size !== 14) {
      console.log(`❌ 张美丽实际购买了${uniqueSkus.size}个SKU，不是14个`);
    } else if (invalidPurchases > 0) {
      console.log(`⚠️  张美丽有${invalidPurchases}条无效购买记录，需要进一步检查`);
    }

  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error.message);
    console.error('详细错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 执行验证
verifyZhangmeiliPurchases().catch(console.error);