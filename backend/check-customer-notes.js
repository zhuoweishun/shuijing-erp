import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCustomerNotes() {
  try {
    console.log('=== 检查客户备注数据库记录 ===')
    
    // 1. 检查customer_notes表是否存在
    console.log('\n1. 检查customer_notes表结构...')
    try {
      const tableInfo = await prisma.$queryRaw`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'customer_notes' 
        AND TABLE_SCHEMA = DATABASE()
        ORDER BY ORDINAL_POSITION
      `
      
      if (tableInfo.length > 0) {
        console.log('✅ customer_notes表存在，字段结构：')
        tableInfo.for_each(col => {
          console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? '(可空)' : '(非空)'}`)
        })
      } else {
        console.log('❌ customer_notes表不存在')
        return
      }
    } catch (error) {
      console.log('❌ 检查表结构失败:', error.message)
      return
    }
    
    // 2. 查询张三的客户ID
    console.log('\n2. 查询张三的客户信息...')
    const zhangsan = await prisma.customer.find_first({
      where: {
        name: {
          contains: '张三'
        }
      },
      select: {
        id: true,
        name: true,
        phone: true,
        created_at: true
      }
    })
    
    if (!zhangsan) {
      console.log('❌ 未找到张三的客户记录')
      return
    }
    
    console.log('✅ 找到张三的客户记录：')
    console.log(`  - ID: ${zhangsan.id}`)
    console.log(`  - 姓名: ${zhangsan.name}`)
    console.log(`  - 手机号: ${zhangsan.phone}`)
    console.log(`  - 注册时间: ${zhangsan.created_at}`)
    
    // 3. 查询张三的所有备注记录
    console.log('\n3. 查询张三的备注记录...')
    const notes = await prisma.customer_note.find_many({
      where: {
        customer_id: zhangsan.id
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })
    
    if (notes.length === 0) {
      console.log('❌ 未找到张三的备注记录')
    } else {
      console.log(`✅ 找到 ${notes.length} 条张三的备注记录：`)
      notes.for_each((note, index) => {
        console.log(`\n  备注 ${index + 1}:`)
        console.log(`    - ID: ${note.id}`)
        console.log(`    - 类型: ${note.category}`)
        console.log(`    - 内容: ${note.content}`)
        console.log(`    - 创建时间: ${note.created_at}`)
        console.log(`    - 创建人: ${note.creator?.name || '未知'} (${note.creator?.username || '未知'})`)
      })
    }
    
    // 4. 统计所有客户的备注数量
    console.log('\n4. 统计所有客户备注数量...')
    const totalNotes = await prisma.customer_note.count()
    console.log(`📊 数据库中总共有 ${totalNotes} 条客户备注记录`)
    
    // 5. 查看最近的备注记录
    console.log('\n5. 查看最近的5条备注记录...')
    const recentNotes = await prisma.customer_note.find_many({
      take: 5,
      orderBy: {
        created_at: 'desc'
      },
      include: {
        customer: {
          select: {
            name: true,
            phone: true
          }
        },
        creator: {
          select: {
            name: true,
            username: true
          }
        }
      }
    })
    
    if (recentNotes.length > 0) {
      console.log('📝 最近的备注记录：')
      recentNotes.for_each((note, index) => {
        console.log(`\n  ${index + 1}. ${note.customer.name} (${note.customer.phone})`)
        console.log(`     类型: ${note.category}`)
        console.log(`     内容: ${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}`)
        console.log(`     时间: ${note.created_at}`)
        console.log(`     创建人: ${note.creator?.name || '未知'}`)
      })
    }
    
  } catch (error) {
    console.error('❌ 检查客户备注时发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 执行检查
checkCustomerNotes()