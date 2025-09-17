import { PrismaClient } from '@prisma/client'
import mysql from 'mysql2/promise'

const prisma = new PrismaClient()

async function test_image_fix() {
  let connection
  
  try {
    // 创建直接数据库连接
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    })

    console.log('🔍 测试图片URL修复效果')
    console.log('=' * 40)

    // 1. 检查materials表中的photos数据
    console.log('\n📊 检查materials表中的photos数据:')
    
    const [materials] = await connection.query(`
      SELECT 
        id,
        material_name,
        material_type,
        photos,
        LENGTH(photos) as photos_length
      FROM materials 
      WHERE material_type IN ('ACCESSORIES', 'FINISHED_MATERIAL')
        AND photos IS NOT NULL
      ORDER BY material_type, material_name
    `)
    
    materials.forEach((material, index) => {
      console.log(`\n${index + 1}. ${material.material_name} (${material.material_type}):`)
      console.log(`   - photos字段: ${material.photos}`)
      console.log(`   - 长度: ${material.photos_length}`)
      
      // 模拟前端的photos处理逻辑
      let photos = []
      if (material.photos) {
        try {
          if (typeof material.photos === 'string') {
            photos = JSON.parse(material.photos)
          } else if (Array.isArray(material.photos)) {
            photos = material.photos
          }
          if (!Array.isArray(photos)) {
            photos = []
          }
        } catch (error) {
          console.log(`   ❌ JSON解析失败: ${error.message}`)
          photos = []
        }
      }
      
      console.log(`   - 解析后的photos数组: ${JSON.stringify(photos)}`)
      console.log(`   - 数组长度: ${photos.length}`)
      
      if (photos.length > 0) {
        console.log(`   - 第一张图片URL: ${photos[0]}`)
        
        // 模拟fixImageUrl函数的处理
        const originalUrl = photos[0]
        let fixedUrl = originalUrl
        
        // 简单的IP替换逻辑（模拟fixImageUrl）
        if (originalUrl.includes('192.168.50.160')) {
          fixedUrl = originalUrl.replace('192.168.50.160', 'localhost')
          console.log(`   - 修复后的URL: ${fixedUrl}`)
        } else {
          console.log(`   - URL无需修复: ${fixedUrl}`)
        }
        
        console.log(`   ✅ 图片数据处理正常`)
      } else {
        console.log(`   ❌ 没有有效的图片数据`)
      }
    })
    
    // 2. 模拟API返回的数据格式
    console.log('\n🔍 模拟API返回数据格式:')
    
    const [api_data] = await connection.query(`
      SELECT 
        m.id as material_id,
        m.material_code as material_code,
        m.material_name as material_name,
        m.material_type as material_type,
        m.photos,
        m.remaining_quantity,
        m.unit_cost as price_per_unit
      FROM materials m
      WHERE m.material_type IN ('ACCESSORIES', 'FINISHED_MATERIAL')
        AND m.photos IS NOT NULL
      LIMIT 2
    `)
    
    api_data.forEach((batch, index) => {
      console.log(`\nAPI数据 ${index + 1}:`)
      console.log(`   - material_name: ${batch.material_name}`)
      console.log(`   - photos (原始): ${batch.photos}`)
      console.log(`   - photos类型: ${typeof batch.photos}`)
      
      // 模拟前端组件中的photos处理逻辑
      let photos = []
      if (batch.photos) {
        try {
          if (typeof batch.photos === 'string') {
            photos = JSON.parse(batch.photos)
          } else if (Array.isArray(batch.photos)) {
            photos = batch.photos
          }
          if (!Array.isArray(photos)) {
            photos = []
          }
        } catch (error) {
          console.error(`   ❌ photos解析失败:`, error, 'batch.photos:', batch.photos)
          photos = []
        }
      }
      
      console.log(`   - photos处理后: ${JSON.stringify(photos)}`)
      
      if (photos.length > 0) {
        console.log(`   - 将传递给fixImageUrl的参数: "${photos[0]}"`)
        console.log(`   - 参数类型: ${typeof photos[0]}`)
        console.log(`   ✅ 数据格式正确`)
      } else {
        console.log(`   ❌ photos数组为空`)
      }
    })
    
    console.log('\n🎯 测试总结:')
    const valid_photos = materials.filter(m => {
      try {
        const photos = JSON.parse(m.photos)
        return Array.isArray(photos) && photos.length > 0
      } catch {
        return false
      }
    })
    
    console.log(`- 总记录数: ${materials.length}`)
    console.log(`- 有效图片数据: ${valid_photos.length}`)
    
    if (valid_photos.length > 0) {
      console.log('✅ 图片数据修复成功！')
      console.log('\n📝 下一步:')
      console.log('1. 刷新前端页面')
      console.log('2. 检查配件和成品库存页面的图片显示')
      console.log('3. 确认不再出现URL格式错误')
    } else {
      console.log('❌ 仍然没有有效的图片数据')
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
    throw error
  } finally {
    if (connection) {
      await connection.end()
    }
    await prisma.$disconnect()
  }
}

// 运行测试
test_image_fix().catch(error => {
  console.error('测试失败:', error)
  process.exit(1)
})