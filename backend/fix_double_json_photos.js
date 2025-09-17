import { PrismaClient } from '@prisma/client'
import mysql from 'mysql2/promise'

const prisma = new PrismaClient()

async function fix_double_json_photos() {
  let connection
  
  try {
    // 创建直接数据库连接
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    })

    console.log('🔧 修复双重JSON编码的photos字段')
    console.log('=' * 50)

    // 1. 检查当前的photos数据
    console.log('\n📊 检查当前photos数据:')
    
    const [current_data] = await connection.query(`
      SELECT 
        id,
        material_name,
        material_type,
        photos
      FROM materials 
      WHERE material_type IN ('ACCESSORIES', 'FINISHED_MATERIAL')
        AND photos IS NOT NULL
      ORDER BY material_type, material_name
    `)
    
    console.log(`找到 ${current_data.length} 条需要检查的记录`)
    
    let needs_fix = []
    
    current_data.forEach((record, index) => {
      console.log(`\n${index + 1}. ${record.material_name}:`)
      console.log(`   - 原始photos: ${JSON.stringify(record.photos)}`)
      
      try {
        // 第一次解析
        let parsed1 = record.photos
        if (typeof parsed1 === 'string') {
          parsed1 = JSON.parse(parsed1)
        }
        console.log(`   - 第一次解析: ${JSON.stringify(parsed1)}`)
        
        // 检查是否需要第二次解析
        if (Array.isArray(parsed1) && parsed1.length > 0) {
          const firstItem = parsed1[0]
          console.log(`   - 第一个元素: ${JSON.stringify(firstItem)}`)
          console.log(`   - 第一个元素类型: ${typeof firstItem}`)
          
          // 如果第一个元素是字符串且看起来像JSON数组，说明是双重编码
          if (typeof firstItem === 'string' && firstItem.startsWith('[') && firstItem.endsWith(']')) {
            console.log(`   ❌ 检测到双重JSON编码`)
            
            try {
              const parsed2 = JSON.parse(firstItem)
              console.log(`   - 第二次解析: ${JSON.stringify(parsed2)}`)
              
              if (Array.isArray(parsed2) && parsed2.length > 0 && typeof parsed2[0] === 'string') {
                console.log(`   ✅ 找到正确的URL: ${parsed2[0]}`)
                needs_fix.push({
                  id: record.id,
                  material_name: record.material_name,
                  correct_photos: parsed2
                })
              }
            } catch (error) {
              console.log(`   ❌ 第二次解析失败: ${error.message}`)
            }
          } else if (typeof firstItem === 'string' && firstItem.startsWith('http')) {
            console.log(`   ✅ 数据格式正确，无需修复`)
          } else {
            console.log(`   ⚠️  未知格式: ${typeof firstItem}`)
          }
        }
      } catch (error) {
        console.log(`   ❌ 解析失败: ${error.message}`)
      }
    })
    
    console.log(`\n🔧 需要修复的记录数: ${needs_fix.length}`)
    
    // 2. 修复双重编码的数据
    if (needs_fix.length > 0) {
      console.log('\n开始修复...')
      
      let success_count = 0
      let error_count = 0
      
      for (const record of needs_fix) {
        console.log(`\n修复 ${record.material_name}:`)
        console.log(`   - 正确的photos: ${JSON.stringify(record.correct_photos)}`)
        
        try {
          const correct_json = JSON.stringify(record.correct_photos)
          console.log(`   - 将存储为: ${correct_json}`)
          
          await connection.query(
            'UPDATE materials SET photos = ? WHERE id = ?',
            [correct_json, record.id]
          )
          
          console.log(`   ✅ 修复成功`)
          success_count++
          
        } catch (error) {
          console.log(`   ❌ 修复失败: ${error.message}`)
          error_count++
        }
      }
      
      console.log(`\n📊 修复结果:`)
      console.log(`- 成功: ${success_count}`)
      console.log(`- 失败: ${error_count}`)
    }
    
    // 3. 验证修复结果
    console.log('\n🔍 验证修复结果:')
    
    const [final_check] = await connection.query(`
      SELECT 
        id,
        material_name,
        material_type,
        photos
      FROM materials 
      WHERE material_type IN ('ACCESSORIES', 'FINISHED_MATERIAL')
        AND photos IS NOT NULL
      ORDER BY material_type, material_name
    `)
    
    let valid_count = 0
    let invalid_count = 0
    
    final_check.forEach((record, index) => {
      console.log(`\n${index + 1}. ${record.material_name}:`)
      
      try {
        let photos = record.photos
        if (typeof photos === 'string') {
          photos = JSON.parse(photos)
        }
        
        if (Array.isArray(photos) && photos.length > 0 && typeof photos[0] === 'string' && photos[0].startsWith('http')) {
          console.log(`   ✅ 格式正确: ${photos[0]}`)
          valid_count++
        } else {
          console.log(`   ❌ 格式错误: ${JSON.stringify(photos)}`)
          invalid_count++
        }
      } catch (error) {
        console.log(`   ❌ 解析失败: ${error.message}`)
        invalid_count++
      }
    })
    
    console.log(`\n🎯 最终结果:`)
    console.log(`- 格式正确的记录: ${valid_count}/${final_check.length}`)
    console.log(`- 格式错误的记录: ${invalid_count}/${final_check.length}`)
    
    if (invalid_count === 0) {
      console.log('\n🎉 所有photos字段格式修复完成！')
      console.log('\n📝 下一步:')
      console.log('1. 刷新前端页面')
      console.log('2. 检查配件和成品库存页面的图片显示')
      console.log('3. 确认图片URL不再出现格式错误')
    } else {
      console.log('\n❌ 仍有记录需要手动处理')
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
fix_double_json_photos().catch(error => {
  console.error('修复失败:', error)
  process.exit(1)
})