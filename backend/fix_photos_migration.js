import { PrismaClient } from '@prisma/client'
import mysql from 'mysql2/promise'

const prisma = new PrismaClient()

async function fix_photos_migration() {
  let connection
  
  try {
    // 创建直接数据库连接
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    })

    console.log('🔧 修复图片数据迁移问题')
    console.log('=' * 50)

    // 1. 检查purchase表中photos字段的格式
    console.log('\n📊 分析purchase表中photos字段格式:')
    
    const [purchases] = await connection.query(`
      SELECT 
        id,
        purchase_name,
        purchase_type,
        photos,
        LENGTH(photos) as photos_length
      FROM purchases 
      WHERE purchase_type IN ('LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED_MATERIAL')
        AND photos IS NOT NULL
      ORDER BY purchase_type, purchase_name
    `)
    
    console.log(`找到 ${purchases.length} 条有图片的采购记录`)
    
    purchases.forEach((purchase, index) => {
      console.log(`\n${index + 1}. ${purchase.purchase_name}:`)
      
      // 确保photos是字符串类型
      const photos_str = purchase.photos ? String(purchase.photos) : ''
      console.log(`   - 原始photos: ${photos_str}`)
      console.log(`   - 长度: ${purchase.photos_length}`)
      console.log(`   - 数据类型: ${typeof purchase.photos}`)
      console.log(`   - 类型判断: ${photos_str.startsWith('http') ? '单个URL' : '可能是JSON'}`)
      
      // 尝试解析为JSON
      try {
        const parsed = JSON.parse(photos_str)
        console.log(`   - JSON解析成功: ${Array.isArray(parsed) ? '数组' : '对象'}`)
        console.log(`   - 解析结果: ${JSON.stringify(parsed)}`)
      } catch (error) {
        console.log(`   - JSON解析失败: 这是一个单纯的URL字符串`)
      }
    })

    // 2. 修复迁移逻辑：将单个URL转换为JSON数组
    console.log('\n🔄 执行修复后的图片数据迁移:')
    
    const [material_purchase_mapping] = await connection.query(`
      SELECT 
        m.id as material_id,
        m.material_name,
        m.material_type,
        m.photos as material_photos,
        m.purchase_id,
        p.photos as purchase_photos
      FROM materials m
      LEFT JOIN purchases p ON m.purchase_id = p.id
      WHERE m.material_type IN ('LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED_MATERIAL')
        AND (m.photos IS NULL OR m.photos = 'null')
        AND p.photos IS NOT NULL
      ORDER BY m.material_type, m.material_name
    `)
    
    console.log(`需要迁移 ${material_purchase_mapping.length} 条记录`)
    
    let success_count = 0
    let error_count = 0
    
    for (const record of material_purchase_mapping) {
      console.log(`\n处理 ${record.material_name}:`)
      
      // 确保purchase_photos是字符串类型
      const purchase_photos_str = record.purchase_photos ? String(record.purchase_photos) : ''
      console.log(`   - 原始purchase photos: ${purchase_photos_str}`)
      console.log(`   - 数据类型: ${typeof record.purchase_photos}`)
      
      try {
        let photos_array
        
        // 检查是否已经是JSON格式
        try {
          const parsed = JSON.parse(purchase_photos_str)
          if (Array.isArray(parsed)) {
            photos_array = parsed
            console.log(`   - 已是JSON数组格式: ${JSON.stringify(photos_array)}`)
          } else {
            // 如果是对象或其他格式，转换为数组
            photos_array = [String(parsed)]
            console.log(`   - 从JSON对象转换为数组: ${JSON.stringify(photos_array)}`)
          }
        } catch (jsonError) {
          // 不是JSON格式，当作单个URL处理
          photos_array = [purchase_photos_str]
          console.log(`   - 从单个URL转换为数组: ${JSON.stringify(photos_array)}`)
        }
        
        // 将数组转换为JSON字符串
        const photos_json = JSON.stringify(photos_array)
        console.log(`   - 最终JSON: ${photos_json}`)
        
        // 更新materials表
        await connection.query(
          'UPDATE materials SET photos = ? WHERE id = ?',
          [photos_json, record.material_id]
        )
        
        console.log(`   ✅ 迁移成功`)
        success_count++
        
      } catch (error) {
        console.log(`   ❌ 迁移失败: ${error.message}`)
        error_count++
      }
    }
    
    console.log(`\n📊 迁移结果:`)
    console.log(`- 成功: ${success_count}`)
    console.log(`- 失败: ${error_count}`)

    // 3. 验证迁移结果
    console.log('\n🔍 验证迁移结果:')
    
    const [updated_materials] = await connection.query(`
      SELECT 
        id,
        material_name,
        material_type,
        photos,
        LENGTH(photos) as photos_length
      FROM materials 
      WHERE material_type IN ('LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED_MATERIAL')
      ORDER BY material_type, material_name
    `)
    
    let final_has_photos = 0
    let final_no_photos = 0
    
    updated_materials.forEach((material, index) => {
      console.log(`\n${index + 1}. ${material.material_name}:`)
      console.log(`   - photos字段: ${material.photos || 'NULL'}`)
      console.log(`   - 长度: ${material.photos_length || 0}`)
      
      if (material.photos && material.photos !== 'null') {
        try {
          const parsed = JSON.parse(material.photos)
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`   - 状态: ✅ 有效JSON数组，包含 ${parsed.length} 张图片`)
            console.log(`   - 图片: ${parsed.join(', ')}`)
            final_has_photos++
          } else {
            console.log(`   - 状态: ⚠️  空数组或无效格式`)
            final_no_photos++
          }
        } catch (error) {
          console.log(`   - 状态: ❌ JSON解析失败: ${error.message}`)
          final_no_photos++
        }
      } else {
        console.log(`   - 状态: ❌ 无图片数据`)
        final_no_photos++
      }
    })
    
    console.log(`\n📊 最终统计:`)
    console.log(`- 有图片数据的materials: ${final_has_photos}/${updated_materials.length}`)
    console.log(`- 无图片数据的materials: ${final_no_photos}/${updated_materials.length}`)
    
    if (final_has_photos > 0) {
      console.log('\n🎉 图片数据迁移修复成功！')
      console.log('\n📝 后续步骤:')
      console.log('1. 刷新前端页面')
      console.log('2. 检查配件和成品库存页面的图片显示')
      console.log('3. 如果图片仍不显示，检查fixImageUrl函数的IP地址转换逻辑')
      
      // 检查图片URL中的IP地址
      console.log('\n🌐 检查图片URL中的IP地址:')
      updated_materials.forEach((material) => {
        if (material.photos && material.photos !== 'null') {
          try {
            const parsed = JSON.parse(material.photos)
            if (Array.isArray(parsed)) {
              parsed.forEach((url, index) => {
                console.log(`   ${material.material_name} 图片${index + 1}: ${url}`)
                if (url.includes('192.168.50.160')) {
                  console.log(`     ⚠️  包含固定IP地址，可能需要动态转换`)
                }
              })
            }
          } catch (error) {
            // 忽略解析错误
          }
        }
      })
      
    } else {
      console.log('\n❌ 仍然没有有效的图片数据')
      console.log('建议检查purchase表中的photos字段是否包含有效的图片URL')
    }
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error)
    throw error
  } finally {
    if (connection) {
      await connection.end()
    }
    await prisma.$disconnect()
  }
}

// 运行修复
fix_photos_migration().catch(error => {
  console.error('修复失败:', error)
  process.exit(1)
})