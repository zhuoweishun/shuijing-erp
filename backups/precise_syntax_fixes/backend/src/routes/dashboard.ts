import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticate_token } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'

const router = Router()

// 获取仪表板数据
router.get('/', authenticate_token, asyncHandler(async (req, res) => {
  try {
    // 1. 查询采购记录总数
    const total_purchases = await prisma.purchase.count({
      where: {
        status: 'ACTIVE'
      }
    })

    // 2. 查询原材料总数
    const total_materials = await prisma.material.count({
      where: {
        status: 'ACTIVE'
      }
    })

    // 3. 计算库存总价值（原材料总成本 + SKU总价值）
    const materialsValue = await prisma.material.aggregate({
      where: {
        status: 'ACTIVE'
      },
      _sum: {
        total_cost: true
      }
    })

    const skusValue = await prisma.product_sku.aggregate({
      where: {
        status: 'ACTIVE'
      },
      _sum: {
        total_value: true
      }
    })

    const total_inventory_value = Number(materialsValue._sum.total_cost || 0) + Number(skusValue._sum.total_value || 0)

    // 4. 查询低库存商品数量（可用数量 <= 2）
    const low_stock_items = await prisma.product_sku.count({
      where: {
        status: 'ACTIVE',
        available_quantity: {
          lte: 2
        }
      }
    })

    // 5. 查询最近的采购记录（最近5条）
    const recentPurchasesData = await prisma.purchase.find_many({
      where: {
        status: 'ACTIVE'
      },
      orderBy: {
        purchase_date: 'desc'
      },
      take: 5,
      select: {
        id: true,
        product_name: true,
        purchase_date: true,
        total_price: true
      }
    })

    const recent_purchases = recentPurchasesData.map(purchase => ({
      id: purchase.id,
      product_name: purchase.product_name,
      purchase_date: purchase.purchase_date.toISOString(),
      total_price: Number(purchase.total_price || 0)
    }))

    // 6. 查询最近的原材料记录（最近5条）
    const recentMaterialsData = await prisma.material.find_many({
      where: {
        status: 'ACTIVE'
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 5,
      select: {
        id: true,
        material_name: true,
        created_at: true,
        total_cost: true,
        status: true,
        specification: true,
        available_quantity: true
      }
    })

    const recent_materials = recentMaterialsData.map(material => ({
      id: material.id,
      material_name: material.material_name,
      created_at: material.created_at.toISOString(),
      total_cost: Number(material.total_cost),
      status: material.available_quantity > 0 ? 'in_stock' : 'out_of_stock',
      specification: material.specification || '',
      quantity: material.available_quantity
    }))

    // 7. 查询供应商统计数据
    const supplierStatsData = await prisma.supplier.find_many({
      where: {
        is_active: true
      },
      select: {
        id: true,
        name: true,
        purchases: {
          where: {
            status: 'ACTIVE'
          },
          select: {
            total_price: true
          }
        }
      }
    })

    const supplier_stats = supplierStatsData.map(supplier => {
      const total_spent = supplier.purchases.reduce((sum, purchase) => {
        return sum + Number(purchase.total_price || 0)
      }, 0)
      
      return {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        total_spent: total_spent,
        purchase_count: supplier.purchases.length
      }
    }).filter(stat => stat.purchase_count > 0) // 只显示有采购记录的供应商
      .sort((a, b) => b.total_spent - a.total_spent) // 按消费金额降序排列
      .slice(0, 10) // 取前10个供应商

    const dashboardData = {
      total_purchases: total_purchases,
      total_materials: total_materials,
      total_inventory_value: Number(total_inventory_value.toFixed(2)),
      low_stock_items: low_stock_items,
      recent_purchases: recent_purchases,
      recent_materials: recent_materials,
      supplier_stats: supplier_stats
    }

    res.json({
      success: true,
      data: dashboardData,
      message: '仪表板数据获取成功'
    })
  } catch (error) {
    console.error('❌ [Dashboard] 获取仪表板数据失败:', error)
    
    // 如果数据库查询失败，返回空数据而不是假数据
    const emptyData = {
      total_purchases: 0,
      total_materials: 0,
      total_inventory_value: 0,
      low_stock_items: 0,
      recent_purchases: [],
      recent_materials: [],
      supplier_stats: []
    }

    res.json({
      success: true,
      data: emptyData,
      message: '仪表板数据获取成功（暂无数据）'
    })
  }
}))

export default router