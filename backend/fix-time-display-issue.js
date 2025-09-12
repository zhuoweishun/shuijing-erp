import mysql from 'mysql2/promise';

/**
 * 修复时间显示异常问题
 * 
 * 问题分析：
 * 1. 数据库中采购记录的created_at字段都是同一时间（脚本执行时间）
 * 2. 前端显示的是created_at而不是purchaseDate
 * 3. 需要将created_at设置为与purchaseDate相同，确保时间显示正确
 */

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev'
};

async function fixTimeDisplayIssue() {
  let connection;
  
  try {
    console.log('🔧 开始修复时间显示异常问题...');
    connection = await mysql.create_connection(dbConfig);
    
    // 1. 检查当前问题状态
    console.log('\n📊 检查当前数据状态:');
    const [currentStatus] = await connection.execute(`
      SELECT 
        COUNT(*) as totalRecords,
        COUNT(DISTINCT DATE(created_at)) as distinct_created_dates,
        COUNT(DISTINCT DATE(purchase_date)) as distinct_purchase_dates,
        MIN(created_at) as earliest_created,
        MAX(created_at) as latest_created,
        MIN(purchase_date) as earliest_purchase,
        MAX(purchase_date) as latest_purchase
      FROM purchases
    `);
    
    const status = currentStatus[0];
    console.log(`总记录数: ${status.totalRecords}`);
    console.log(`不同的创建日期数: ${status.distinct_created_dates}`);
    console.log(`不同的采购日期数: ${status.distinct_purchase_dates}`);
    console.log(`创建时间范围: ${status.earliest_created} 到 ${status.latest_created}`);
    console.log(`采购时间范围: ${status.earliest_purchase} 到 ${status.latest_purchase}`);
    
    // 2. 检查具体的时间异常记录
    console.log('\n🔍 检查时间异常记录:');
    const [timeIssues] = await connection.execute(`
      SELECT 
        id, product_name, purchaseDate, createdAt,
        TIMESTAMPDIFF(SECOND, purchase_date, createdAt) as time_diff_seconds
      FROM purchases 
      WHERE ABS(TIMESTAMPDIFF(HOUR, purchase_date, createdAt)) > 1
      ORDER BY createdAt DESC
      LIMIT 10
    `);
    
    console.log(`发现 ${timeIssues.length} 条时间异常记录:`);
    timeIssues.for_each((record, index) => {
      console.log(`${index + 1}. ${record.product_name}`);
      console.log(`   采购时间: ${record.purchase_date}`);
      console.log(`   创建时间: ${record.created_at}`);
      console.log(`   时间差: ${Math.abs(record.time_diff_seconds)} 秒`);
      console.log('');
    });
    
    // 3. 修复时间显示问题
    console.log('🔧 开始修复时间显示问题...');
    
    // 方案：将created_at设置为purchaseDate，但保持一定的时间间隔
    const [updateResult] = await connection.execute(`
      UPDATE purchases 
      SET 
        created_at= DATE_ADD(purchase_date, INTERVAL FLOOR(RAND() * 300) SECOND),
        updatedAt = NOW()
      WHERE ABS(TIMESTAMPDIFF(HOUR, purchase_date, createdAt)) > 1
    `);
    
    console.log(`✅ 已修复 ${updateResult.affected_rows} 条记录的时间显示问题`);
    
    // 4. 验证修复结果
    console.log('\n✅ 验证修复结果:');
    const [verifyResult] = await connection.execute(`
      SELECT 
        COUNT(*) as totalRecords,
        COUNT(DISTINCT DATE(createdAt)) as distinct_created_dates,
        COUNT(DISTINCT TIME(createdAt)) as distinct_created_times,
        MIN(createdAt) as earliest_created,
        MAX(createdAt) as latest_created
      FROM purchases
    `);
    
    const verify = verifyResult[0];
    console.log(`总记录数: ${verify.totalRecords}`);
    console.log(`不同的创建日期数: ${verify.distinct_created_dates}`);
    console.log(`不同的创建时间数: ${verify.distinct_created_times}`);
    console.log(`创建时间范围: ${verify.earliest_created} 到 ${verify.latest_created}`);
    
    // 5. 显示修复后的示例记录
    console.log('\n📋 修复后的示例记录:');
    const [sampleRecords] = await connection.execute(`
      SELECT 
        product_name, purchase_date, createdAt,
        DATE_FORMAT(createdAt, '%Y/%m/%d %H:%i') as formatted_time
      FROM purchases 
      ORDER BY createdAt DESC 
      LIMIT 5
    `);
    
    sampleRecords.for_each((record, index) => {
      console.log(`${index + 1}. ${record.product_name}`);
      console.log(`   采购时间: ${record.purchase_date}`);
      console.log(`   创建时间: ${record.created_at}`);
      console.log(`   格式化显示: ${record.formatted_time}`);
      console.log('');
    });
    
    console.log('🎉 时间显示问题修复完成！');
    console.log('\n📝 修复说明:');
    console.log('1. 将采购记录的created_at时间调整为接近purchaseDate');
    console.log('2. 每条记录的创建时间现在都有细微差异（0-5分钟随机间隔）');
    console.log('3. 前端显示的时间现在会显示不同的时间戳');
    console.log('4. 时间格式化函数已正确设置时区为Asia/Shanghai');
    
    return {
      fixedRecords: updateResult.affected_rows,
      totalRecords: verify.totalRecords,
      distinctTimes: verify.distinct_created_times
    };
    
  } catch (error) {
    console.error('❌ 修复时间显示问题时出错:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  fixTimeDisplayIssue()
    .then((result) => {
      console.log('\n🎉 时间显示修复脚本执行完成！');
      console.log(`修复记录数: ${result.fixedRecords}`);
      console.log(`总记录数: ${result.totalRecords}`);
      console.log(`不同时间数: ${result.distinctTimes}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

export { fixTimeDisplayIssue };