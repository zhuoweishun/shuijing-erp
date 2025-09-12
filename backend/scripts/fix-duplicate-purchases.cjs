const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDuplicatePurchases() {
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

    console.log('🔍 开始修复张美丽的重复购买记录...');
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

    // 2. 查询张美丽的所有购买记录，按SKU分组
    const [purchases] = await connection.execute(`
      SELECT 
        cp.*,
        ps.skuCode,
        ps.skuName
      FROM customer_purchases cp
      JOIN product_skus ps ON cp.skuId = ps.id
      WHERE cp.customerId = ?
      ORDER BY cp.skuId, cp.createdAt DESC
    `, [customer.id]);

    console.log(`📊 张美丽的购买记录总数: ${purchases.length} 条`);

    // 3. 找出重复的SKU购买记录
    const skuGroups = {};
    purchases.forEach(purchase => {
      if (!skuGroups[purchase.skuId]) {
        skuGroups[purchase.skuId] = [];
      }
      skuGroups[purchase.skuId].push(purchase);
    });

    const duplicateSkus = Object.keys(skuGroups).filter(skuId => skuGroups[skuId].length > 1);
    
    console.log(`🔍 发现重复购买的SKU数量: ${duplicateSkus.length} 个`);
    
    if (duplicateSkus.length === 0) {
      console.log('✅ 没有发现重复购买记录');
      return;
    }

    // 4. 处理重复购买记录
    let totalRemoved = 0;
    let totalQuantityAdjusted = 0;
    
    for (const skuId of duplicateSkus) {
      const duplicates = skuGroups[skuId];
      console.log(`\n📦 处理SKU: ${duplicates[0].skuCode} (${duplicates[0].skuName})`);
      console.log(`   重复记录数: ${duplicates.length} 条`);
      
      // 保留最早的记录，合并数量，删除其他记录
      const keepRecord = duplicates[duplicates.length - 1]; // 最早的记录
      const removeRecords = duplicates.slice(0, -1); // 其他记录
      
      // 计算总数量和总价格
      const totalQuantity = duplicates.reduce((sum, record) => sum + record.quantity, 0);
      const totalPrice = duplicates.reduce((sum, record) => sum + parseFloat(record.totalPrice), 0);
      const avgUnitPrice = totalPrice / totalQuantity;
      
      console.log(`   保留记录ID: ${keepRecord.id}`);
      console.log(`   原数量: ${keepRecord.quantity}, 合并后数量: ${totalQuantity}`);
      console.log(`   原总价: ¥${keepRecord.totalPrice}, 合并后总价: ¥${totalPrice.toFixed(2)}`);
      
      // 更新保留的记录
      await connection.execute(`
        UPDATE customer_purchases 
        SET quantity = ?, totalPrice = ?, unitPrice = ?
        WHERE id = ?
      `, [totalQuantity, totalPrice.toFixed(2), avgUnitPrice.toFixed(2), keepRecord.id]);
      
      // 删除重复的记录
      for (const record of removeRecords) {
        console.log(`   删除重复记录ID: ${record.id}`);
        await connection.execute(
          'DELETE FROM customer_purchases WHERE id = ?',
          [record.id]
        );
        totalRemoved++;
      }
      
      totalQuantityAdjusted += (totalQuantity - keepRecord.quantity);
    }

    // 5. 验证修复结果
    const [updatedPurchases] = await connection.execute(`
      SELECT COUNT(*) as total_records,
             COUNT(DISTINCT skuId) as unique_skus,
             SUM(quantity) as total_quantity
      FROM customer_purchases 
      WHERE customerId = ?
    `, [customer.id]);

    console.log('\n' + '='.repeat(60));
    console.log('📊 修复结果总结:');
    console.log('='.repeat(60));
    console.log(`👤 客户: ${customer.name}`);
    console.log(`🗑️  删除的重复记录: ${totalRemoved} 条`);
    console.log(`📦 调整的数量: +${totalQuantityAdjusted} 件`);
    console.log(`📝 修复后购买记录总数: ${updatedPurchases[0].total_records} 条`);
    console.log(`🎯 修复后不同SKU数量: ${updatedPurchases[0].unique_skus} 个`);
    console.log(`📦 修复后总购买件数: ${updatedPurchases[0].total_quantity} 件`);
    
    if (updatedPurchases[0].total_records === updatedPurchases[0].unique_skus) {
      console.log('✅ 修复成功: 每个SKU只有一条购买记录');
    } else {
      console.log('⚠️  仍有问题: 购买记录数与SKU数量不匹配');
    }

  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error.message);
    console.error('详细错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 执行修复
fixDuplicatePurchases().catch(console.error);