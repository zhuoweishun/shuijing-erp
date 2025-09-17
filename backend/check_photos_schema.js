import { PrismaClient } from '@prisma/client'
import mysql from 'mysql2/promise'

const prisma = new PrismaClient()

async function check_photos_schema() {
  let connection
  
  try {
    // 创建直接数据库连接
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    })

    console.log('🔍 检查photos字段的数据库结构')
    console.log('=' * 50)

    // 1. 检查materials表结构
    console.log('\n📊 检查materials表的photos字段结构:')
    
    const [materials_schema] = await connection.query(`
      DESCRIBE materials
    `)
    
    const photos_field = materials_schema.find(field => field.Field === 'photos')
    if (photos_field) {
      console.log('Materials表photos字段信息:')
      console.log(`- 字段名: ${photos_field.Field}`)
      console.log(`- 数据类型: ${photos_field.Type}`)
      console.log(`- 是否允许NULL: ${photos_field.Null}`)
      console.log(`- 默认值: ${photos_field.Default}`)
    } else {
      console.log('❌ materials表中没有找到photos字段')
    }

    // 2. 检查purchase表结构
    console.log('\n📊 检查purchase表的photos字段结构:')
    
    const [purchase_schema] = await connection.query(`
      DESCRIBE purchases
    `)
    
    const purchase_photos_field = purchase_schema.find(field => field.Field === 'photos')
    if (purchase_photos_field) {
      console.log('Purchase表photos字段信息:')
      console.log(`- 字段名: ${purchase_photos_field.Field}`)
      console.log(`- 数据类型: ${purchase_photos_field.Type}`)
      console.log(`- 是否允许NULL: ${purchase_photos_field.Null}`)
      console.log(`- 默认值: ${purchase_photos_field.Default}`)
    } else {
      console.log('❌ purchase表中没有找到photos字段')
    }

    // 3. 检查实际数据的HEX值
    console.log('\n🔍 检查实际数据的HEX值:')
    
    const [hex_data] = await connection.query(`
      SELECT 
        id,
        purchase_name,
        HEX(photos) as photos_hex,
        LENGTH(photos) as photos_length,
        CAST(photos AS CHAR) as photos_char
      FROM purchases 
      WHERE purchase_type IN ('ACCESSORIES', 'FINISHED_MATERIAL')
        AND photos IS NOT NULL
      LIMIT 2
    `)
    
    hex_data.forEach((row, index) => {
      console.log(`\n${index + 1}. ${row.purchase_name}:`)
      console.log(`   - HEX值: ${row.photos_hex}`)
      console.log(`   - 长度: ${row.photos_length}`)
      console.log(`   - 转换为字符: ${row.photos_char}`)
      
      // 尝试从HEX解码
      try {
        const hex_str = row.photos_hex
        let decoded = ''
        for (let i = 0; i < hex_str.length; i += 2) {
          decoded += String.fromCharCode(parseInt(hex_str.substr(i, 2), 16))
        }
        console.log(`   - HEX解码结果: ${decoded}`)
      } catch (error) {
        console.log(`   - HEX解码失败: ${error.message}`)
      }
    })

    // 4. 尝试直接更新为正确的JSON格式
    console.log('\n🔧 尝试直接更新为正确的JSON格式:')
    
    const [materials_to_update] = await connection.query(`
      SELECT 
        m.id as material_id,
        m.material_name,
        m.purchase_id,
        CAST(p.photos AS CHAR) as purchase_photos_char
      FROM materials m
      LEFT JOIN purchases p ON m.purchase_id = p.id
      WHERE m.material_type IN ('ACCESSORIES', 'FINISHED_MATERIAL')
        AND p.photos IS NOT NULL
    `)
    
    console.log(`找到 ${materials_to_update.length} 条需要更新的记录`)
    
    let update_success = 0
    let update_error = 0
    
    for (const record of materials_to_update) {
      console.log(`\n处理 ${record.material_name}:`)
      console.log(`   - Purchase photos (CHAR): ${record.purchase_photos_char}`)
      
      try {
        // 将单个URL转换为JSON数组
        const photos_array = [record.purchase_photos_char]
        const photos_json = JSON.stringify(photos_array)
        
        console.log(`   - 转换为JSON: ${photos_json}`)
        
        // 使用正确的JSON格式更新
        await connection.query(
          'UPDATE materials SET photos = ? WHERE id = ?',
          [photos_json, record.material_id]
        )
        
        console.log(`   ✅ 更新成功`)
        update_success++
        
      } catch (error) {
        console.log(`   ❌ 更新失败: ${error.message}`)
        update_error++
      }
    }
    
    console.log(`\n📊 更新结果:`)
    console.log(`- 成功: ${update_success}`)
    console.log(`- 失败: ${update_error}`)

    // 5. 最终验证
    console.log('\n🔍 最终验证:')
    
    const [final_check] = await connection.query(`
      SELECT 
        id,
        material_name,
        material_type,
        photos,
        LENGTH(photos) as photos_length
      FROM materials 
      WHERE material_type IN ('ACCESSORIES', 'FINISHED_MATERIAL')
      ORDER BY material_type, material_name
    `)
    
    let valid_photos = 0
    let invalid_photos = 0
    
    final_check.forEach((material, index) => {
      console.log(`\n${index + 1}. ${material.material_name}:`)
      console.log(`   - photos字段: ${material.photos || 'NULL'}`)
      console.log(`   - 长度: ${material.photos_length || 0}`)
      
      if (material.photos && material.photos !== 'null') {
        try {
          const parsed = JSON.parse(material.photos)
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`   - 状态: ✅ 有效JSON数组，包含 ${parsed.length} 张图片`)
            console.log(`   - 图片URL: ${parsed[0]}`)
            valid_photos++
          } else {
            console.log(`   - 状态: ⚠️  空数组`)
            invalid_photos++
          }
        } catch (error) {
          console.log(`   - 状态: ❌ JSON解析失败: ${error.message}`)
          invalid_photos++
        }
      } else {
        console.log(`   - 状态: ❌ 无图片数据`)
        invalid_photos++
      }
    })
    
    console.log(`\n🎯 最终结果:`)
    console.log(`- 有效图片数据: ${valid_photos}/${final_check.length}`)
    console.log(`- 无效图片数据: ${invalid_photos}/${final_check.length}`)
    
    if (valid_photos > 0) {
      console.log('\n🎉 图片数据修复成功！')
      console.log('\n📝 下一步:')
      console.log('1. 刷新前端页面')
      console.log('2. 检查配件和成品库存页面的图片显示')
      console.log('3. 如果图片URL包含固定IP，前端的fixImageUrl函数会自动转换')
    } else {
      console.log('\n❌ 图片数据仍然有问题，需要进一步调试')
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error)
    throw error
  } finally {
    if (connection) {
      await connection.end()
    }
    await prisma.$disconnect()
  }
}

// 运行检查
check_photos_schema().catch(error => {
  console.error('检查失败:', error)
  process.exit(1)
})