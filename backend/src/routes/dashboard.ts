import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

// 获取仪表板数据
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  // 模拟数据，后续替换为真实数据库查询
  const mockData = {
    totalPurchases: 156,
    totalProducts: 89,
    totalInventoryValue: 125680.50,
    lowStockItems: 12,
    recentPurchases: [
      {
        id: 1,
        productName: '紫水晶手链',
        purchaseDate: new Date().toISOString(),
        totalPrice: 1200.00
      },
      {
        id: 2,
        productName: '白水晶项链',
        purchaseDate: new Date(Date.now() - 86400000).toISOString(),
        totalPrice: 800.00
      }
    ],
    recentProducts: [
      {
        id: 1,
        productName: '紫水晶手链成品',
        createdDate: new Date().toISOString(),
        totalCost: 1500.00,
        status: 'in_stock'
      },
      {
        id: 2,
        productName: '白水晶项链成品',
        createdDate: new Date(Date.now() - 86400000).toISOString(),
        totalCost: 1000.00,
        status: 'sold'
      }
    ],
    supplierStats: [
      {
        supplierId: 1,
        supplierName: '水晶供应商A',
        totalSpent: 25000.00,
        purchaseCount: 45
      },
      {
        supplierId: 2,
        supplierName: '水晶供应商B',
        totalSpent: 18500.00,
        purchaseCount: 32
      }
    ]
  }

  res.json({
    success: true,
    data: mockData,
    message: '仪表板数据获取成功'
  })
}))

export default router