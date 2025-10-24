import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanup_test_data() {
  console.log('🧹 开始清理测试数据...')
  
  try {
    // 开始事务
    await prisma.$transaction(async (tx) => {
      console.log('📊 清理前数据统计:')
      
      // 统计清理前的数据
      const before_stats = {
        users: await tx.user.count(),
        customers: await tx.customers.count(),
        customer_purchases: await tx.customerPurchases.count(),
        customer_notes: await tx.customerNotes.count(),
        product_skus: await tx.productSku.count(),
        sku_inventory_logs: await tx.skuInventoryLog.count(),
        products: await tx.product.count(),
        materials: await tx.material.count(),
        material_usage: await tx.materialUsage.count(),
        purchases: await tx.purchase.count(),
        edit_logs: await tx.editLog.count(),
        suppliers: await tx.supplier.count(),
        financial_records: await tx.financialRecords.count(),
        audit_logs: await tx.auditLog.count(),
        system_configs: await tx.systemConfig.count()
      }
      
      console.log('清理前统计:', before_stats)
      
      // 1. 删除客户相关数据（保留客户备注和客户购买记录的关联）
      console.log('🗑️ 删除客户购买记录...')
      await tx.customerPurchases.deleteMany({})
      
      console.log('🗑️ 删除客户备注...')
      await tx.customerNotes.deleteMany({})
      
      console.log('🗑️ 删除客户信息...')
      await tx.customers.deleteMany({})
      
      // 2. 删除SKU相关数据
      console.log('🗑️ 删除SKU库存日志...')
      await tx.skuInventoryLog.deleteMany({})
      
      console.log('🗑️ 删除产品记录...')
      await tx.product.deleteMany({})
      
      console.log('🗑️ 删除材料使用记录...')
      await tx.materialUsage.deleteMany({})
      
      console.log('🗑️ 删除产品SKU...')
      await tx.productSku.deleteMany({})
      
      // 3. 删除材料和采购相关数据
      console.log('🗑️ 删除材料记录...')
      await tx.material.deleteMany({})
      
      console.log('🗑️ 删除编辑日志...')
      await tx.editLog.deleteMany({})
      
      console.log('🗑️ 删除采购记录...')
      await tx.purchase.deleteMany({})
      
      // 4. 删除供应商（除了可能需要保留的基础供应商）
      console.log('🗑️ 删除测试供应商...')
      // 删除名称包含"测试"、"TEST"等关键词的供应商
      await tx.supplier.deleteMany({
        where: {
          OR: [
            { name: { contains: '测试' } },
            { name: { contains: 'TEST' } },
            { name: { contains: 'test' } },
            { name: { contains: 'Test' } },
            { name: { contains: '临时' } },
            { name: { contains: 'TEMP' } },
            { name: { contains: 'temp' } }
          ]
        }
      })
      
      // 5. 删除财务记录（保留可能的初始化记录）
      console.log('🗑️ 删除测试财务记录...')
      await tx.financialRecords.deleteMany({
        where: {
          OR: [
            { description: { contains: '测试' } },
            { description: { contains: 'TEST' } },
            { description: { contains: 'test' } },
            { description: { contains: 'Test' } },
            { notes: { contains: '测试' } },
            { notes: { contains: 'TEST' } }
          ]
        }
      })
      
      // 6. 删除审计日志（可选，根据需要保留）
      console.log('🗑️ 删除审计日志...')
      await tx.auditLog.deleteMany({})
      
      // 7. 删除测试用户（保留boss和employee）
      console.log('🗑️ 删除测试用户...')
      await tx.user.deleteMany({
        where: {
          AND: [
            { user_name: { not: 'boss' } },
            { user_name: { not: 'employee' } }
          ]
        }
      })
      
      // 8. 重置boss和employee用户的统计信息
      console.log('🔄 重置boss和employee用户信息...')
      await tx.user.updateMany({
        where: {
          OR: [
            { user_name: 'boss' },
            { user_name: 'employee' }
          ]
        },
        data: {
          last_login_at: null,
          updated_at: new Date()
        }
      })
      
      // 9. 清理系统配置中的测试配置（保留必要的系统配置）
      console.log('🗑️ 删除测试系统配置...')
      await tx.systemConfig.deleteMany({
        where: {
          OR: [
            { key: { contains: 'test' } },
            { key: { contains: 'TEST' } },
            { key: { contains: 'temp' } },
            { key: { contains: 'TEMP' } },
            { description: { contains: '测试' } }
          ]
        }
      })
      
      // 统计清理后的数据
      console.log('📊 清理后数据统计:')
      const after_stats = {
        users: await tx.user.count(),
        customers: await tx.customers.count(),
        customer_purchases: await tx.customerPurchases.count(),
        customer_notes: await tx.customerNotes.count(),
        product_skus: await tx.productSku.count(),
        sku_inventory_logs: await tx.skuInventoryLog.count(),
        products: await tx.product.count(),
        materials: await tx.material.count(),
        material_usage: await tx.materialUsage.count(),
        purchases: await tx.purchase.count(),
        edit_logs: await tx.editLog.count(),
        suppliers: await tx.supplier.count(),
        financial_records: await tx.financialRecords.count(),
        audit_logs: await tx.auditLog.count(),
        system_configs: await tx.systemConfig.count()
      }
      
      console.log('清理后统计:', after_stats)
      
      // 显示清理的数据量
      console.log('📈 清理数据量统计:')
      Object.keys(before_stats).forEach(key => {
        const before = before_stats[key as keyof typeof before_stats]
        const after = after_stats[key as keyof typeof after_stats]
        const deleted = before - after
        if (deleted > 0) {
          console.log(`  ${key}: 删除 ${deleted} 条记录 (${before} → ${after})`)
        }
      })
    })
    
    console.log('✅ 测试数据清理完成！')
    
    // 验证保留的用户
    const remaining_users = await prisma.user.findMany({
      select: {
        user_name: true,
        role: true,
        name: true,
        is_active: true
      }
    })
    
    console.log('👥 保留的用户账号:')
    remaining_users.forEach(user => {
      console.log(`  - ${user.user_name} (${user.role}) - ${user.name} - ${user.is_active ? '激活' : '未激活'}`)
    })
    
  } catch (error) {
    console.error('❌ 清理测试数据时发生错误:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 直接运行清理函数
cleanup_test_data()
  .then(() => {
    console.log('🎉 数据库清理脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 数据库清理脚本执行失败:', error)
    process.exit(1)
  })

export { cleanup_test_data }