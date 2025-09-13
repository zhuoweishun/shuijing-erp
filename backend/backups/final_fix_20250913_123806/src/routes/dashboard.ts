import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken } from '../middleware/auth.js'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// 获取仪表板数据
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  try {
    // 获取真实数据库统计
    const total_purchases = await prisma.purchase.count()
    const total_products = await prisma.product.count()
    
    // 获取最近的采购记录
    const recent_purchases = await prisma.purchase.findMany({
      take: 5,
      orderBy: {
        created_at: 'desc'
      },
      select: {
        id: true,
        product_name: true,
        created_at: true,
        total_price: true
      }
    })
    
    // 获取最近的成品记录
    const recent_products = await prisma.product.findMany({
      take: 5,
      orderBy: {
        created_at: 'desc'
      },
      select: {
        id: true,
        name: true,
        created_at: true,
        total_value: true
      }
    })
    
    // 计算库存总价值
    const inventory_value_result = await prisma.product.aggregate({
      _sum: {
        total_value: true
      }
    })
    
    const dashboard_data = {
      total_purchases,
      total_products,
      total_inventory_value: inventory_value_result._sum.total_value || 0,
      low_stock_items: 0, // 暂时设为0，后续可以根据库存阈值计算
      recent_purchases: recent_purchases.map(purchase => ({
        id: purchase.id,
        product_name: purchase.product_name,
        purchase_date: purchase.created_at,
        total_price: purchase.total_price
      })),
      recent_products: recent_products.map(product => ({
        id: product.id,
        product_name: product.name,
        created_date: product.created_at,
        total_cost: product.total_value,
        status: 'in_stock' // 暂时默认为库存中
      })),
      supplier_stats: [] // 暂时为空数组，后续可以添加供应商统计
    }

    res.json({
      success: true,
      data: dashboard_data,
      message: '仪表板数据获取成功'
    })
  } catch (error) {
    console.error('获取仪表板数据失败:', error)
    res.status(500).json({
      success: false,
      message: '获取仪表板数据失败',
      error: (error as Error).message
    })
  }
}))

export default router