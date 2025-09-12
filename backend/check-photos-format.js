import mysql from 'mysql2/promise';

async function checkPhotosFormat() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔍 检查采购记录的photos字段格式...');
    
    // 查询所有采购记录的photos字段
    const [rows] = await connection.execute(`
      SELECT 
        id, 
        purchase_code, 
        product_name,
        photos,
        JSON_TYPE(photos) as photos_type,
        JSON_VALID(photos) as is_valid_json
      FROM purchases 
      ORDER BY created_at DESC
      LIMIT 20
    `);

    console.log(`\n📊 检查结果（最近20条记录）：`);
    console.log('=' .repeat(80));
    
    let validJsonCount = 0;
    let invalidJsonCount = 0;
    let stringFormatCount = 0;
    let nullCount = 0;
    let arrayFormatCount = 0;
    
    for (const row of rows) {
      console.log(`\n🏷️  采购编号: ${row.purchase_code}`);
      console.log(`📦 产品名称: ${row.product_name}`);
      console.log(`📸 Photos字段类型: ${row.photos_type}`);
      console.log(`✅ JSON有效性: ${row.is_valid_json ? '有效' : '无效'}`);
      
      if (!row.photos) {
        console.log(`📄 Photos内容: NULL`);
        nullCount++;
      } else {
        console.log(`📄 Photos内容: ${JSON.stringify(row.photos)}`);
        
        if (row.is_valid_json) {
          validJsonCount++;
          
          // 检查是否为数组格式
          try {
            const parsed = typeof row.photos === 'string' ? JSON.parse(row.photos) : row.photos;
            if (Array.is_array(parsed)) {
              arrayFormatCount++;
              console.log(`🎯 格式状态: ✅ 正确的JSON数组格式`);
              
              // 检查数组内容
              if (parsed.length > 0) {
                console.log(`🖼️  第一张图片: ${parsed[0]}`);
                
                // 检查URL格式
                if (typeof parsed[0] === 'string' && parsed[0].startsWith('http')) {
                  console.log(`🔗 URL格式: ✅ 有效的HTTP URL`);
                } else {
                  console.log(`🔗 URL格式: ❌ 无效的URL格式`);
                }
              } else {
                console.log(`📭 数组状态: 空数组`);
              }
            } else {
              console.log(`🎯 格式状态: ❌ JSON有效但不是数组格式`);
            }
          } catch (e) {
            console.log(`🎯 格式状态: ❌ JSON解析失败: ${e.message}`);
          }
        } else {
          invalidJsonCount++;
          
          // 检查是否为字符串URL格式
          if (typeof row.photos === 'string' && row.photos.startsWith('http')) {
            stringFormatCount++;
            console.log(`🎯 格式状态: ⚠️  字符串URL格式（需要转换为JSON数组）`);
            console.log(`🔗 URL内容: ${row.photos}`);
          } else {
            console.log(`🎯 格式状态: ❌ 无效格式`);
          }
        }
      }
      
      console.log('-'.repeat(60));
    }
    
    // 统计总结
    console.log(`\n📈 统计总结：`);
    console.log('=' .repeat(50));
    console.log(`📊 总记录数: ${rows.length}`);
    console.log(`✅ 有效JSON格式: ${validJsonCount}`);
    console.log(`🎯 正确数组格式: ${arrayFormatCount}`);
    console.log(`⚠️  字符串URL格式: ${stringFormatCount}`);
    console.log(`❌ 无效JSON格式: ${invalidJsonCount}`);
    console.log(`📭 NULL值: ${nullCount}`);
    
    // 检查需要修复的记录
    if (stringFormatCount > 0) {
      console.log(`\n🔧 发现 ${stringFormatCount} 条记录需要格式修复（字符串URL -> JSON数组）`);
    }
    
    if (invalidJsonCount > stringFormatCount) {
      console.log(`\n⚠️  发现 ${invalidJsonCount - stringFormatCount} 条记录存在其他格式问题`);
    }
    
    // 查询所有需要修复的记录数量
    const [countResult] = await connection.execute(`
      SELECT COUNT(*) as total_count
      FROM purchases 
      WHERE photos IS NOT NULL 
        AND (JSON_VALID(photos) = 0 OR JSON_TYPE(photos) != 'ARRAY')
    `);
    
    console.log(`\n🔍 全库扫描结果：`);
    console.log(`📊 需要修复的记录总数: ${countResult[0].total_count}`);
    
    if (countResult[0].total_count > 0) {
      console.log(`\n💡 建议执行修复脚本来统一photos字段格式`);
    } else {
      console.log(`\n🎉 所有记录的photos字段格式都正确！`);
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error);
  } finally {
    await connection.end();
  }
}

checkPhotosFormat().catch(console.error);