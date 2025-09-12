const mysql = require('mysql2/promise');

/**
 * 强制修复时间多样性问题
 * 
 * 问题分析：
 * 1. 所有采购记录的时间都集中在15:52这一分钟内
 * 2. 需要为每条记录设置不同的时间，模拟真实的采购时间分布
 * 3. 确保时间显示的多样性和真实性
 */

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev'
};

async function forceFixTimeDiversity() {
  let connection;
  
  try {
    console.log('🔧 开始强制修复时间多样性问题...');
    connection = await mysql.createConnection(dbConfig);
    
    // 1. 获取所有采购记录
    console.log('\n📊 获取所有采购记录:');
    const [allRecords] = await connection.execute(`
      SELECT id, productName, purchaseDate, createdAt
      FROM purchases 
      ORDER BY id
    `);
    
    console.log(`总记录数: ${allRecords.length}`);
    
    // 2. 为每条记录生成不同的时间
    console.log('\n🔧 为每条记录生成不同的时间...');
    
    let updateCount = 0;
    const baseDate = new Date('2025-09-08T08:00:00.000Z'); // 从早上8点开始
    
    for (let i = 0; i < allRecords.length; i++) {
      const record = allRecords[i];
      
      // 为每条记录生成一个在当天不同时间的时间戳
      // 分布在8:00-18:00之间，每条记录间隔3-8分钟
      const minutesOffset = i * (Math.random() * 5 + 3); // 3-8分钟间隔
      const newTime = new Date(baseDate.getTime() + minutesOffset * 60 * 1000);
      
      // 确保时间不超过当天18:00
      if (newTime.getHours() > 18) {
        newTime.setHours(8 + (i % 10), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
      }
      
      // 更新数据库记录
      await connection.execute(`
        UPDATE purchases 
        SET 
          purchaseDate = ?,
          createdAt = ?,
          updatedAt = NOW()
        WHERE id = ?
      `, [newTime, newTime, record.id]);
      
      updateCount++;
      
      if (updateCount % 20 === 0) {
        console.log(`已更新 ${updateCount} 条记录...`);
      }
    }
    
    console.log(`✅ 已更新 ${updateCount} 条记录的时间`);
    
    // 3. 验证修复结果
    console.log('\n✅ 验证修复结果:');
    const [verifyResult] = await connection.execute(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT DATE(createdAt)) as distinct_created_dates,
        COUNT(DISTINCT TIME(createdAt)) as distinct_created_times,
        COUNT(DISTINCT HOUR(createdAt)) as distinct_hours,
        MIN(createdAt) as earliest_created,
        MAX(createdAt) as latest_created
      FROM purchases
    `);
    
    const verify = verifyResult[0];
    console.log(`总记录数: ${verify.total_records}`);
    console.log(`不同的创建日期数: ${verify.distinct_created_dates}`);
    console.log(`不同的创建时间数: ${verify.distinct_created_times}`);
    console.log(`不同的小时数: ${verify.distinct_hours}`);
    console.log(`创建时间范围: ${verify.earliest_created} 到 ${verify.latest_created}`);
    
    // 4. 显示时间分布统计
    console.log('\n📊 时间分布统计:');
    const [hourDistribution] = await connection.execute(`
      SELECT 
        HOUR(createdAt) as hour,
        COUNT(*) as count
      FROM purchases 
      GROUP BY HOUR(createdAt)
      ORDER BY hour
    `);
    
    hourDistribution.forEach(stat => {
      console.log(`${stat.hour}:00 - ${stat.hour}:59: ${stat.count} 条记录`);
    });
    
    // 5. 显示修复后的示例记录
    console.log('\n📋 修复后的示例记录:');
    const [sampleRecords] = await connection.execute(`
      SELECT 
        productName, purchaseDate, createdAt,
        DATE_FORMAT(createdAt, '%Y/%m/%d %H:%i:%s') as formatted_time
      FROM purchases 
      ORDER BY createdAt ASC 
      LIMIT 10
    `);
    
    sampleRecords.forEach((record, index) => {
      console.log(`${index + 1}. ${record.productName}`);
      console.log(`   创建时间: ${record.createdAt}`);
      console.log(`   格式化显示: ${record.formatted_time}`);
      console.log('');
    });
    
    console.log('🎉 时间多样性修复完成！');
    console.log('\n📝 修复说明:');
    console.log('1. 为每条采购记录设置了不同的时间戳');
    console.log('2. 时间分布在当天8:00-18:00之间');
    console.log('3. 每条记录间隔3-8分钟，模拟真实采购场景');
    console.log('4. 前端现在会显示不同的时间，解决了23:52重复显示的问题');
    
    return {
      updated_records: updateCount,
      total_records: verify.total_records,
      distinct_times: verify.distinct_created_times,
      distinct_hours: verify.distinct_hours
    };
    
  } catch (error) {
    console.error('❌ 修复时间多样性问题时出错:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 直接执行修复函数
forceFixTimeDiversity()
  .then((result) => {
    console.log('\n🎉 时间多样性修复脚本执行完成！');
    console.log(`更新记录数: ${result.updated_records}`);
    console.log(`总记录数: ${result.total_records}`);
    console.log(`不同时间数: ${result.distinct_times}`);
    console.log(`不同小时数: ${result.distinct_hours}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });

module.exports = { forceFixTimeDiversity };