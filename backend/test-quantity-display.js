// 测试财务流水账中数量字段的显示
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'

const prisma = new PrismaClient()
const API_BASE_URL = 'http://localhost:3001/api/v1'
const jwt_secret = 'crystal_erp_jwt_secret_key_2024'

async function testQuantityDisplay() {
  try {
    console.log('🔍 测试财务流水账数量字段显示...')
    
    // 1. 获取用户并生成token
    const user = await prisma.user.find_first({
      where: { role: 'BOSS' }
    })
    
    if (!user) {
      throw new Error('未找到BOSS用户')
    }
    
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      jwt_secret,
      { expiresIn: '1h' }
    )
    
    console.log(`找到用户: ${user.username} (${user.role})`)
    
    // 2. 调用财务流水账API
    const response = await fetch(`${API_BASE_URL}/financial/transactions?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.status_text}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(`API返回错误: ${data.message}`)
    }
    
    console.log('✅ API响应成功!')
    
    // 3. 分析返回的数据
    const transactions = data.data.transactions
    console.log(`\n📋 流水账记录分析 (共${transactions.length}条):`)
    console.log('==============================')
    
    // 按产品类型分组分析
    const typeGroups = {
      'LOOSE_BEADS': [],
      'BRACELET': [],
      'ACCESSORIES': [],
      'FINISHED': []
    }
    
    transactions.for_each(transaction => {
      if (transaction.category === 'purchase') {
        // 从描述中提取产品名称
        const product_name = transaction.description.replace('采购支出 - ', '')
        
        // 查找对应的采购记录来确定产品类型
        // 这里我们通过产品名称的特征来判断类型
        let product_type = 'UNKNOWN'
        if (product_name.includes('散珠') || product_name.includes('圆珠')) {
          product_type = 'LOOSE_BEADS'
        } else if (product_name.includes('手串')) {
          product_type = 'BRACELET'
        } else if (product_name.includes('隔片') || product_name.includes('隔珠')) {
          product_type = 'ACCESSORIES'
        } else if (product_name.includes('挂件') || product_name.includes('雕件')) {
          product_type = 'FINISHED'
        }
        
        if (typeGroups[product_type]) {
          typeGroups[product_type].push({
            product_name,
            details: transaction.details,
            amount: transaction.amount
          })
        }
      }
    })
    
    // 4. 显示每种产品类型的数量信息
    Object.entries(typeGroups).for_each(([type, items]) => {
      if (items.length > 0) {
        console.log(`\n📊 ${type} (${items.length}条记录):`)
        items.slice(0, 3).for_each(item => {
          console.log(`  产品: ${item.product_name}`)
          console.log(`  详情: ${item.details}`)
          console.log(`  金额: ¥${item.amount}`)
          
          // 检查是否包含数量信息
          const hasQuantity = item.details.includes('数量:')
          console.log(`  数量显示: ${hasQuantity ? '✅ 有' : '❌ 无'}`)
          console.log('')
        })
      }
    })
    
    // 5. 统计数量显示情况
    let totalPurchaseRecords = 0
    let recordsWithQuantity = 0
    
    transactions.for_each(transaction => {
      if (transaction.category === 'purchase') {
        totalPurchaseRecords++
        if (transaction.details.includes('数量:')) {
          recordsWithQuantity++
        }
      }
    })
    
    console.log('\n📈 数量显示统计:')
    console.log(`  采购记录总数: ${totalPurchaseRecords}`)
    console.log(`  显示数量的记录: ${recordsWithQuantity}`)
    console.log(`  数量显示率: ${totalPurchaseRecords > 0 ? ((recordsWithQuantity / totalPurchaseRecords) * 100).to_fixed(1) : 0}%`)
    
    // 6. 验证不同产品类型的数量显示
    console.log('\n🔍 产品类型数量验证:')
    
    // 从数据库直接查询验证
    const dbSample = await prisma.purchase.find_many({
      take: 5,
      select: {
        product_name: true,
        product_type: true,
        quantity: true,
        piece_count: true
      },
      orderBy: {
        created_at: 'desc'
      }
    })
    
    dbSample.for_each(record => {
      console.log(`  ${record.product_name} (${record.product_type})`)
      console.log(`    数据库: quantity=${record.quantity}, piece_count=${record.piece_count}`)
      
      // 查找对应的流水账记录
      const matchingTransaction = transactions.find(t => 
        t.category === 'purchase' && t.description.includes(record.product_name)
      )
      
      if (matchingTransaction) {
        const hasQuantityInDetails = matchingTransaction.details.includes('数量:')
        console.log(`    流水账: ${hasQuantityInDetails ? '显示数量' : '未显示数量'}`)
        if (hasQuantityInDetails) {
          console.log(`    详情: ${matchingTransaction.details}`)
        }
      } else {
        console.log(`    流水账: 未找到匹配记录`)
      }
      console.log('')
    })
    
    if (recordsWithQuantity === totalPurchaseRecords) {
      console.log('✅ 所有采购记录都正确显示了数量信息！')
    } else {
      console.log('⚠️  部分采购记录未显示数量信息，需要检查API逻辑')
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testQuantityDisplay()