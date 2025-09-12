import mysql from 'mysql2/promise';

async function fixImageUrls() {
  const connection = await mysql.create_connection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔧 修复采购记录中的示例图片URL...');
    
    // 查询所有使用示例URL的记录
    const [rows] = await connection.execute(`
      SELECT 
        id, 
        purchase_code, 
        product_name,
        product_type,
        photos
      FROM purchases 
      WHERE photos LIKE '%example.com%'
      ORDER BY created_at DESC
    `);

    console.log(`\n📊 找到 ${rows.length} 条需要修复的记录`);
    console.log('=' .repeat(80));
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const row of rows) {
      console.log(`\n🏷️  处理: ${row.purchase_code} - ${row.product_name}`);
      
      try {
        // 根据产品类型和名称生成图片URL
        const imagePrompt = generateImagePrompt(row.product_name, row.product_type);
        const newImageUrl = `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(imagePrompt)}&image_size=square`;
        
        console.log(`🎨 图片提示词: ${imagePrompt}`);
        console.log(`🖼️  新图片URL: ${newImageUrl}`);
        
        // 更新数据库
        const newPhotos = JSON.stringify([newImageUrl]);
        await connection.execute(
          'UPDATE purchases SET photos = ? WHERE id = ?',
          [newPhotos, row.id]
        );
        
        console.log(`✅ 已更新`);
        fixedCount++;
        
      } catch (error) {
        console.log(`❌ 修复失败: ${error.message}`);
        errorCount++;
      }
      
      // 添加延迟避免请求过快
      if (fixedCount % 10 === 0) {
        console.log(`\n⏸️  已处理 ${fixedCount} 条记录，暂停1秒...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n📈 修复完成统计：`);
    console.log('=' .repeat(50));
    console.log(`✅ 成功修复: ${fixedCount} 条`);
    console.log(`❌ 修复失败: ${errorCount} 条`);
    console.log(`📊 总处理数: ${rows.length} 条`);
    
    // 验证修复结果
    const [remainingCount] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM purchases 
      WHERE photos LIKE '%example.com%'
    `);
    
    console.log(`\n🔍 验证结果：`);
    console.log(`📊 剩余示例URL记录: ${remainingCount[0].count}`);
    
    if (remainingCount[0].count === 0) {
      console.log(`🎉 所有示例URL已成功修复！`);
    } else {
      console.log(`⚠️  还有 ${remainingCount[0].count} 条记录需要手动处理`);
    }
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
  } finally {
    await connection.end();
  }
}

// 根据产品信息生成图片提示词
function generateImagePrompt(product_name, product_type) {
  // 提取产品关键信息
  const name = product_name.to_lower_case();
  
  // 材质映射
  const materialMap = {
    '紫水晶': 'purple amethyst crystal',
    '白水晶': 'clear white crystal quartz',
    '粉水晶': 'pink rose quartz crystal',
    '黄水晶': 'yellow citrine crystal',
    '绿水晶': 'green crystal',
    '黑曜石': 'black obsidian stone',
    '玛瑙': 'agate stone',
    '翡翠': 'jade stone',
    '和田玉': 'white jade stone',
    '蜜蜡': 'amber honey stone',
    '琥珀': 'amber stone',
    '珊瑚': 'coral stone',
    '珍珠': 'pearl',
    '金属': 'metal',
    '银': 'silver metal',
    '金': 'gold metal',
    '铜': 'copper metal',
    '弹力线': 'elastic cord',
    '流苏': 'tassel'
  };
  
  // 查找匹配的材质
  let material = 'crystal stone';
  for (const [key, value] of Object.entries(materialMap)) {
    if (name.includes(key)) {
      material = value;
      break;
    }
  }
  
  // 产品类型映射
  const type_map = {
    'LOOSE_BEADS': 'loose beads',
    'BRACELET': 'bracelet',
    'ACCESSORIES': 'jewelry accessory',
    'FINISHED': 'finished jewelry'
  };
  
  const type = type_map[product_type] || 'jewelry';
  
  // 生成提示词
  const prompt = `beautiful ${material} ${type}, high quality, jewelry photography, white background, professional lighting`;
  
  return prompt;
}

fixImageUrls().catch(console.error);