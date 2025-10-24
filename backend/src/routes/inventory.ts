import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { qualitySchema } from '../utils/validation'
// 移除fieldConverter导入，直接使用snake_case
import { ErrorResponses } from '../utils/errorResponse.js'

const router = Router()

// 库存查询参数验证schema
const inventoryQuerySchema = z.object({
  page: z.string().regex(/^\d+$/, '页码必须是数字').transform(Number).refine(n => n >= 1, '页码必须大于0').optional(),
  limit: z.string().regex(/^\d+$/, '每页数量必须是数字').transform(Number).refine(n => n >= 1 && n <= 100, '每页数量必须在1-100之间').optional(),
  search: z.string().max(100, '搜索关键词不能超过100字符').optional(),
  // 支持前端传入material_types，内部映射为purchase_types
  material_types: z.union([
    z.string().transform(s => [s]),
    z.array(z.string())
  ]).optional(),
  // 保持向后兼容
  purchase_types: z.union([
    z.string().transform(s => [s]),
    z.array(z.string())
  ]).optional(),
  quality: qualitySchema.optional(),
  low_stock_only: z.string().transform(s => s === 'true').optional(),
  diameter_min: z.string().regex(/^\d+(\.\d+)?$/, '最小直径必须是数字').transform(Number).optional(),
  diameter_max: z.string().regex(/^\d+(\.\d+)?$/, '最大直径必须是数字').transform(Number).optional(),
  specification_min: z.string().regex(/^\d+(\.\d+)?$/, '最小规格必须是数字').transform(Number).optional(),
  specification_max: z.string().regex(/^\d+(\.\d+)?$/, '最大规格必须是数字').transform(Number).optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  sort_by: z.enum(['total_quantity', 'material_type', 'crystal_type']).optional()
}).refine((data) => {
  // 验证范围参数
  if (data.diameter_min && data.diameter_max && data.diameter_min > data.diameter_max) {
    throw new Error('最小直径不能大于最大直径')
  }
  if (data.specification_min && data.specification_max && data.specification_min > data.specification_max) {
    throw new Error('最小规格不能大于最大规格')
  }
  return true
})

// 导出查询参数验证schema

// 添加调试端点
router.get('/debug', authenticateToken, asyncHandler(async (_req, res) => {
  try {
    // 查询采购数据总数
    const totalPurchases = await prisma.purchase.count()
    
    // 查询前5条采购记录，包含purchase_date
    const samplePurchases = await prisma.purchase.findMany({
      take: 5,
      select: {
        id: true,
        purchase_name: true,
        purchase_type: true,
        quantity: true,
        piece_count: true,
        bead_diameter: true,
        specification: true,
        quality: true,
        purchase_date: true,
        created_at: true
      }
    })
    
    // 专门检查purchase_date字段
    const purchaseDateDebug = await prisma.purchase.findMany({
      where: {
        purchase_type: 'ACCESSORIES'
      },
      select: {
        id: true,
        purchase_name: true,
        purchase_date: true
      },
      take: 5
    })
    
    // 查询MaterialUsage数据
    const totalMaterialUsage = await prisma.materialUsage.count()
    
    res.json({
      success: true,
      data: {
        totalPurchases,
        totalMaterialUsage,
        samplePurchases,
        purchase_date_debug: purchaseDateDebug.map(p => ({
          id: p.id,
          purchase_name: p.purchase_name,
          purchase_date: p.purchase_date,
          purchase_date_type: typeof p.purchase_date,
          purchase_date_string: String(p.purchase_date),
          is_null: p.purchase_date === null,
          is_valid_date: p.purchase_date ? !isNaN(new Date(p.purchase_date).getTime()) : false
        })),
        message: '数据库调试信息'
      }
    })
  } catch (error) {
    console.error('❌ [库存调试] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('查询失败', (error as Error).message)
    )
  }
}))

// 添加原始SQL查询调试端点
router.get('/debug/raw-inventory', authenticateToken, asyncHandler(async (_req, res) => {
  try {
    // 执行原始库存查询SQL
    const inventoryQuery = `
      SELECT 
         p.id as purchase_id,
         p.purchase_code as purchase_code,
         p.purchase_name as purchase_name,
         p.purchase_type as purchase_type,
         p.quality,
         p.bead_diameter,
         p.specification as purchase_specification,
        CASE 
          WHEN p.purchase_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
          WHEN p.purchase_type = 'BRACELET' THEN COALESCE(p.total_beads, p.piece_count, 0)
          WHEN p.purchase_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
          WHEN p.purchase_type = 'FINISHED_MATERIAL' THEN COALESCE(p.piece_count, 0)
          ELSE COALESCE(p.quantity, 0)
        END as original_quantity,
        COALESCE(mu.used_quantity, 0) as used_quantity,
        (CASE 
          WHEN p.purchase_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
          WHEN p.purchase_type = 'BRACELET' THEN COALESCE(p.total_beads, p.piece_count, 0)
          WHEN p.purchase_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
          WHEN p.purchase_type = 'FINISHED_MATERIAL' THEN COALESCE(p.piece_count, 0)
          ELSE COALESCE(p.quantity, 0)
        END - COALESCE(mu.used_quantity, 0)) as remaining_quantity
      FROM purchases p
      LEFT JOIN (
        SELECT purchase_id, SUM(quantity_used) as used_quantity
        FROM material_usage
        GROUP BY purchase_id
      ) mu ON p.id = mu.purchase_id
      WHERE p.purchase_name LIKE '%巴西黄水晶%' OR p.purchase_code LIKE '%636417%'
      ORDER BY p.purchase_name
    `
    
    const rawResults = await prisma.$queryRawUnsafe(inventoryQuery) as any[]
    
    // 转换BigInt为普通数字
     const processedResults = rawResults.map(item => ({
       purchase_id: item.purchase_id,
       purchase_code: item.purchase_code,
       purchase_name: item.purchase_name,
       purchase_type: item.purchase_type,
       quality: item.quality,
       bead_diameter: item.bead_diameter ? Number(item.bead_diameter) : null,
       purchase_specification: item.purchase_specification ? Number(item.purchase_specification) : null,
       original_quantity: Number(item.original_quantity),
       used_quantity: Number(item.used_quantity),
       remaining_quantity: Number(item.remaining_quantity)
     }))
    
    res.json({
      success: true,
      data: {
        raw_inventory_results: processedResults,
        message: '原始库存查询调试信息'
      }
    })
  } catch (error) {
    console.error('❌ [原始库存调试] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('查询失败', (error as Error).message)
    )
  }
}))

// 添加"油胆"数据调试端点
router.get('/debug/youdan', authenticateToken, asyncHandler(async (_req, res) => {
  try {
    // 查询purchases表中的"油胆"数据
    const purchasesData = await prisma.purchase.findMany({
      where: {
        purchase_name: {
          contains: '油胆'
        }
      },
      select: {
        id: true,
        purchase_code: true,
        purchase_name: true,
        purchase_type: true,
        quantity: true,
        piece_count: true,
        total_beads: true,
        quality: true,
        bead_diameter: true,
        specification: true,
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
      }
    })
    
    // 查询materials表中的"油胆"数据
     const materialsData = await prisma.material.findMany({
       where: {
         material_name: {
           contains: '油胆'
         }
       },
       select: {
         id: true,
         purchase_id: true,
         material_name: true,
         material_type: true,
         original_quantity: true,
         used_quantity: true,
         remaining_quantity: true,
         quality: true,
         bead_diameter: true,
         bracelet_inner_diameter: true,
         bracelet_bead_count: true,
         accessory_specification: true,
         finished_material_specification: true,
         created_at: true,
         updated_at: true
       },
       orderBy: {
         created_at: 'desc'
       }
     })
    
    // 查询material_usage表中的"油胆"相关数据
     const usageData = await prisma.materialUsage.findMany({
       where: {
         purchase: {
           purchase_name: {
             contains: '油胆'
           }
         }
       },
       select: {
         id: true,
         purchase_id: true,
         material_id: true,
         quantity_used: true,
         action: true,
         created_at: true,
         updated_at: true,
         purchase: {
           select: {
             purchase_name: true,
             purchase_type: true
           }
         }
       },
       orderBy: {
         created_at: 'desc'
       }
     })
    
    // 执行原始SQL查询"油胆"的库存计算
    const rawInventoryQuery = `
      SELECT 
        p.id as purchase_id,
        p.purchase_code,
        p.purchase_name,
        p.purchase_type,
        p.quality,
        p.bead_diameter,
        p.specification,
        CASE 
          WHEN p.purchase_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
          WHEN p.purchase_type = 'BRACELET' THEN COALESCE(p.total_beads, p.piece_count, 0)
          WHEN p.purchase_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
          WHEN p.purchase_type = 'FINISHED_MATERIAL' THEN COALESCE(p.piece_count, 0)
          ELSE COALESCE(p.quantity, 0)
        END as original_quantity,
        COALESCE(mu.used_quantity, 0) as used_quantity,
        (CASE 
          WHEN p.purchase_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
          WHEN p.purchase_type = 'BRACELET' THEN COALESCE(p.total_beads, p.piece_count, 0)
          WHEN p.purchase_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
          WHEN p.purchase_type = 'FINISHED_MATERIAL' THEN COALESCE(p.piece_count, 0)
          ELSE COALESCE(p.quantity, 0)
        END - COALESCE(mu.used_quantity, 0)) as remaining_quantity
      FROM purchases p
      LEFT JOIN (
        SELECT purchase_id, SUM(quantity_used) as used_quantity
        FROM material_usage
        GROUP BY purchase_id
      ) mu ON p.id = mu.purchase_id
      WHERE p.purchase_name LIKE '%油胆%'
      ORDER BY p.created_at DESC
    `
    
    const rawResults = await prisma.$queryRawUnsafe(rawInventoryQuery) as any[]
    
    // 转换BigInt为普通数字
    const processedRawResults = rawResults.map(item => ({
      purchase_id: item.purchase_id,
      purchase_code: item.purchase_code,
      purchase_name: item.purchase_name,
      purchase_type: item.purchase_type,
      quality: item.quality,
      bead_diameter: item.bead_diameter ? Number(item.bead_diameter) : null,
      specification: item.specification ? Number(item.specification) : null,
      original_quantity: Number(item.original_quantity),
      used_quantity: Number(item.used_quantity),
      remaining_quantity: Number(item.remaining_quantity)
    }))
    
    res.json({
      success: true,
      data: {
        purchases_data: purchasesData,
        materials_data: materialsData,
        usage_data: usageData,
        raw_inventory_calculation: processedRawResults,
        summary: {
          purchases_count: purchasesData.length,
          materials_count: materialsData.length,
          usage_records_count: usageData.length,
          raw_results_count: processedRawResults.length
        },
        message: '"油胆"数据调试信息'
      }
    })
  } catch (error) {
    console.error('❌ [油胆数据调试] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('查询失败', (error as Error).message)
    )
  }
}))

// 添加品相分布调试端点
router.get('/debug/quality-distribution', authenticateToken, asyncHandler(async (_req, res) => {
  try {
    // 查询半成品（散珠和手串）的品相分布
    const qualityDistributionRaw = await prisma.purchase.groupBy({
      by: ['quality'],
      where: {
        purchase_type: {
          in: ['LOOSE_BEADS', 'BRACELET']
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        quality: 'asc'
      }
    })
    
    // 转换字段格式为snake_case
    const qualityDistribution = qualityDistributionRaw.map(item => ({
      quality: item.quality,
      count: item._count.id
    }))
    
    // 查询具体的空品相记录
    const nullQualityRecords = await prisma.purchase.findMany({
      where: {
        purchase_type: {
          in: ['LOOSE_BEADS', 'BRACELET']
        },
        quality: null
      },
      select: {
        id: true,
        purchase_name: true,
        purchase_type: true,
        quality: true,
        quantity: true,
        piece_count: true,
        bead_diameter: true,
        specification: true,
        created_at: true
      },
      take: 10
    })
    
    // 查询所有半成品记录的品相值（包括null）
    const allSemiFinishedQualities = await prisma.purchase.findMany({
      where: {
        purchase_type: {
          in: ['LOOSE_BEADS', 'BRACELET']
        }
      },
      select: {
        id: true,
        purchase_name: true,
        quality: true
      }
    })
    
    res.json({
      success: true,
      data: {
        quality_distribution: qualityDistribution,
        null_quality_records: nullQualityRecords,
        total_semi_finished_records: allSemiFinishedQualities.length,
        quality_values: allSemiFinishedQualities.map(p => ({ id: p.id, name: p.purchase_name, quality: p.quality })),
        message: '半成品品相分布调试信息'
      }
    })
  } catch (error) {
    console.error('❌ [品相分布调试] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('查询失败', (error as Error).message)
    )
  }
}))

// 产品分类解析函数
// const parseProductClassification = (product_name: string) => {
//   // 一级分类：水晶类型
//   const crystalTypes = {
//     '紫水晶': ['紫水晶', '紫晶'],
//     '白水晶': ['白水晶', '白晶'],
//     '粉水晶': ['粉水晶', '粉晶', '芙蓉晶'],
//     '黄水晶': ['黄水晶', '黄晶'],
//     '茶水晶': ['茶水晶', '茶晶', '烟晶'],
//     '绿水晶': ['绿水晶', '绿晶'],
//     '黑曜石': ['黑曜石'],
//     '玛瑙': ['玛瑙'],
//     '配饰': ['隔珠', '隔片', 'DIY', '跑环']
//   }
//   
//   // 二级分类：形状类型
//   const shapeTypes = {
//     '圆珠': ['手串', '圆珠'],
//     '随形': ['随形'],
//     '散珠': ['散珠', '珠子'],
//     '方糖': ['方糖'],
//     '长串': ['长串'],
//     '配饰': ['隔珠', '隔片', 'DIY饰品', '跑环']
//   }
//   
//   let crystalType = '其他'
//   let shapeType = '圆珠' // 默认为圆珠
//   
//   // 识别水晶类型
//   for (const [type, keywords] of Object.entries(crystalTypes)) {
//     if (keywords.some(keyword => product_name.includes(keyword))) {
//       crystalType = type
//       break
//     }
//   }
//   
//   // 识别形状类型
//   for (const [shape, keywords] of Object.entries(shapeTypes)) {
//     if (keywords.some(keyword => product_name.includes(keyword))) {
//       shapeType = shape
//       break
//     }
//   }
//   
//   // 特殊处理：如果包含"随形"则优先设为随形
//   if (product_name.includes('随形')) {
//     shapeType = '随形'
//   }
//   
//   // 特殊处理：配饰类产品
//   if (crystalType === '配饰') {
//     shapeType = '配饰'
//   }
//   
//   return {
//     crystalType,
//     shapeType
//   }
// }

// router和prisma已在文件开头声明

// 移除fieldConverter导入，直接使用snake_case

// 移除单位转换函数，采购数据直接映射为原材料数据

// 获取单位显示
const getUnit = (material_type: string): string => {
  switch (material_type) {
    case 'LOOSE_BEADS': return '颗'
    case 'BRACELET': return '颗'
    case 'ACCESSORIES': return '片'
    case 'FINISHED_MATERIAL': return '件'
    default: return '个'
  }
}

// 字段映射：将purchase字段映射为material字段
const mapPurchaseToMaterial = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(mapPurchaseToMaterial)
  }
  
  // 特殊处理Date对象，避免被当作普通对象处理
  if (data instanceof Date) {
    return data
  }
  
  if (data && typeof data === 'object') {
    const mapped: any = {}
    
    for (const [key, value] of Object.entries(data)) {
      // 映射字段名
      let newKey = key
      if (key === 'purchase_name') newKey = 'material_name'
      else if (key === 'purchase_type') newKey = 'material_type'
      else if (key === 'purchase_code') newKey = 'material_code'
      else if (key === 'purchase_id') newKey = 'material_id'
      else if (key === 'purchase_date') newKey = 'material_date'
      
      // 递归处理嵌套对象和数组，但保持Date对象不变
      mapped[newKey] = mapPurchaseToMaterial(value)
    }
    
    // 添加库存特有的概念（无需单位转换）
    if (mapped.material_type && mapped.original_quantity !== undefined) {
      // 添加单位显示
      mapped.inventory_unit = getUnit(mapped.material_type)
      
      // 添加使用率计算
      if (mapped.original_quantity > 0) {
        mapped.usage_rate = Math.round((mapped.used_quantity / mapped.original_quantity) * 100)
        mapped.remaining_rate = 100 - mapped.usage_rate
      } else {
        mapped.usage_rate = 0
        mapped.remaining_rate = 0
      }
      
      // 添加库存状态
      if (mapped.remaining_quantity <= 0) {
        mapped.stock_status = 'out'
      } else if (mapped.min_stock_alert && mapped.remaining_quantity <= mapped.min_stock_alert) {
        mapped.stock_status = 'low'
      } else {
        mapped.stock_status = 'sufficient'
      }
    }
    
    return mapped
  }
  
  return data
}

// 权限控制：过滤敏感数据并转换BigInt
const filterInventoryData = (inventory: any[], userRole: string) => {
  const convertBigIntToNumber = (item: any) => {
    // 直接使用蛇形命名，无需转换
    const converted = {
      ...item,
      created_at: item.created_at,
      updated_at: item.updated_at
    }
    
    // 转换所有可能的BigInt字段为Number
    const bigIntFields = [
      'purchase_id', 'original_beads', 'used_beads', 'remaining_beads',
      'min_stock_alert', 'is_low_stock', 'bead_diameter'
    ]
    
    bigIntFields.forEach(field => {
      if (converted[field] !== null && converted[field] !== undefined) {
        converted[field] = Number(converted[field])
      }
    })
    
    // 转换价格相关的BigInt字段
    const priceFields = ['price_per_bead', 'price_per_gram', 'total_price', 'weight']
    priceFields.forEach(field => {
      if (converted[field] !== null && converted[field] !== undefined) {
        converted[field] = Number(converted[field])
      }
    })
    
    return converted
  }
  
  const convertedInventory = inventory.map(convertBigIntToNumber)
  
  if (userRole === 'BOSS') {
    return convertedInventory
  }
  
  // 雇员不能查看成本相关信息
  return convertedInventory.map(item => ({
    ...item,
    price_per_bead: null,
    price_per_gram: null,
    supplier_name: null
  }))
}

// 获取层级式库存列表（按产品类型分类：产品类型→规格→品相）
router.get('/hierarchical', authenticateToken, asyncHandler(async (req, res) => {
  // 验证查询参数
  const validatedQuery = inventoryQuerySchema.parse(req.query)
  const {
    page = 1,
    limit = 20,
    search,
    material_types,
    purchase_types,
    quality,
    low_stock_only,
    diameter_min,
    diameter_max,
    specification_min,
    specification_max,
    sort = 'desc',
    sort_by = 'total_quantity'
  } = validatedQuery

  const pageNum = parseInt(String(page))
  const limitNum = Math.min(parseInt(String(limit)), 100)
  const offset = (pageNum - 1) * limitNum

  // 映射material_types到purchase_types（向后兼容）
  const actualPurchaseTypes = material_types || purchase_types
  
  console.log('🔍 [层级式库存查询] 请求参数:', {
    page: pageNum,
    limit: limitNum,
    search,
    material_types,
    purchase_types,
    actualPurchaseTypes,
    quality,
    low_stock_only
  })

  try {
    // 查询所有库存数据 - 直接从material表查询
    const inventoryQuery = `
      SELECT 
        m.id as material_id,
        m.material_code as material_code,
        m.material_name as material_name,
        m.material_type as material_type,
        m.inventory_unit as inventory_unit,
        m.bead_diameter as bead_diameter,
        m.bracelet_inner_diameter,
        m.bracelet_bead_count,
        m.accessory_specification,
        m.finished_material_specification,
        m.quality,
        m.photos,
        m.original_quantity,
        m.used_quantity,
        COALESCE(m.remaining_quantity, m.original_quantity - m.used_quantity) as remaining_quantity,
        CASE WHEN m.min_stock_alert IS NOT NULL AND 
                 COALESCE(m.remaining_quantity, m.original_quantity - m.used_quantity) <= m.min_stock_alert 
            THEN 1 ELSE 0 END as is_low_stock,
        m.unit_cost as price_per_unit,
        NULL as price_per_gram,
        m.material_date as material_date,
        s.name as supplier_name,
        COALESCE(m.stock_status, 'SUFFICIENT') as stock_status
      FROM materials m
      LEFT JOIN suppliers s ON m.supplier_id = s.id
      WHERE 1=1
      ORDER BY m.material_type, m.material_name, 
               COALESCE(m.bead_diameter, m.bracelet_inner_diameter), m.quality, m.material_date
    `
    
    const allInventory = await prisma.$queryRawUnsafe(inventoryQuery) as any[]
    
    console.log('📊 [层级式库存查询] 原始查询结果:', {
      inventoryLength: allInventory.length,
      firstItem: allInventory[0]
    })
    
    // 如果没有数据，直接返回空结果
    if (!allInventory || allInventory.length === 0) {
      console.log('⚠️ [层级式库存查询] 没有找到任何库存数据')
      return res.json({
        success: true,
        message: '获取层级式库存列表成功',
        data: {
          hierarchy: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            pages: 0
          }
        }
      })
    }
    
    // 调试所有类型的数据
    const allTypes = [...new Set(allInventory.map(item => item.material_type))]
    console.log('🔍 [类型调试] 所有存在的material_type:', allTypes)
    
    // 调试原材料日期字段
    if (allInventory.length > 0) {
      console.log('🔍 [原材料日期调试] 前5条记录的material_date:', 
        allInventory.slice(0, 5).map(item => ({
          material_id: item.material_id,
          material_name: item.material_name,
          material_date: item.material_date,
          material_date_type: typeof item.material_date,
          material_date_string: String(item.material_date)
        }))
      )
    }
    
    // 构建层级结构
    const hierarchicalData = new Map()
    
    allInventory.forEach((item: any) => {
      const material_type = item.material_type
      
      // 统一规格字段映射：根据material_type选择对应的规格字段
      let specValue = 0
      let specUnit = 'mm'
      
      switch (material_type) {
        case 'LOOSE_BEADS':
          // 散珠使用bead_diameter
          specValue = item.bead_diameter ? Number(item.bead_diameter) : 0
          break
        case 'BRACELET':
          // 手串使用bracelet_inner_diameter
          specValue = item.bracelet_inner_diameter ? Number(item.bracelet_inner_diameter) : 0
          break
        case 'ACCESSORIES':
          // 配件使用accessory_specification
          specValue = item.accessory_specification ? Number(item.accessory_specification) : 0
          break
        case 'FINISHED_MATERIAL':
          // 成品使用finished_material_specification
          specValue = item.finished_material_specification ? Number(item.finished_material_specification) : 0
          break
        default:
          // 默认情况，尝试从各个字段中获取值
          specValue = item.bead_diameter ? Number(item.bead_diameter) :
                     item.bracelet_inner_diameter ? Number(item.bracelet_inner_diameter) :
                     item.accessory_specification ? Number(item.accessory_specification) :
                     item.finished_material_specification ? Number(item.finished_material_specification) : 0
          break
      }
      
      const quality = item.quality || '未知'
      
      // 应用筛选条件
      if (search && !item.material_name.toLowerCase().includes(search.toLowerCase())) return
      
      // 原材料类型筛选（多选）
      if (actualPurchaseTypes) {
        const materialTypesArray = Array.isArray(actualPurchaseTypes) ? actualPurchaseTypes : [actualPurchaseTypes]
        if (!materialTypesArray.includes(material_type)) return
      }
      
      // 修复品相筛选逻辑：比较转换后的品相值
      const itemQuality = item.quality || '未知'
      if (quality && itemQuality !== quality) return
      if (String(low_stock_only) === 'true' && Number(item.is_low_stock) !== 1) return
      
      // 统一规格范围筛选（适用于所有类型）
      if (specification_min && specValue && specValue < Number(specification_min)) return
      if (specification_max && specValue && specValue > Number(specification_max)) return
      
      // 兼容旧的diameter筛选参数（向后兼容）
      if (diameter_min && specValue && specValue < Number(diameter_min)) return
      if (diameter_max && specValue && specValue > Number(diameter_max)) return
      
      // 构建层级键
      const level1Key = material_type
      const level2Key = `${material_type}|${specValue}${specUnit}`
      const level3Key = `${material_type}|${specValue}${specUnit}|${quality}`
      
      // 初始化层级结构
      if (!hierarchicalData.has(level1Key)) {
        hierarchicalData.set(level1Key, {
          material_type: material_type,
          total_quantity: 0,
          total_variants: 0,
          has_low_stock: false,
          specifications: new Map()
        })
      }
      
      const level1 = hierarchicalData.get(level1Key)
      
      if (!level1.specifications.has(level2Key)) {
        level1.specifications.set(level2Key, {
          specification_value: specValue,
          specification_unit: specUnit,
          total_quantity: 0,
          total_variants: 0,
          has_low_stock: false,
          qualities: new Map()
        })
      }
      
      const level2 = level1.specifications.get(level2Key)
      
      if (!level2.qualities.has(level3Key)) {
        level2.qualities.set(level3Key, {
          quality: quality,
          remaining_quantity: 0,
          is_low_stock: false,
          weighted_price_per_unit: 0,
          weighted_price_per_gram: 0,
          batches: []
        })
      }
      
      const level3 = level2.qualities.get(level3Key)
      
      // 累加数据
      const remainingQuantity = Number(item.remaining_quantity)
      const originalQuantity = Number(item.original_quantity)
      const is_low_stock = Number(item.is_low_stock) === 1
      
      level3.remaining_quantity += remainingQuantity
      level3.is_low_stock = level3.is_low_stock || is_low_stock
      
      // 处理photos字段的JSON解析
      let photos = []
      if (item.photos) {
        try {
          photos = typeof item.photos === 'string' ? JSON.parse(item.photos) : item.photos
          if (!Array.isArray(photos)) {
            photos = []
          }
        } catch (error) {
          console.warn('解析photos字段失败:', error)
          photos = []
        }
      }

      level3.batches.push({
        material_id: item.material_id,
        material_code: item.material_code,
        material_name: item.material_name,
        material_type: item.material_type,
        material_date: item.material_date,
        supplier_name: item.supplier_name,
        original_quantity: originalQuantity,
        used_quantity: Number(item.used_quantity),
        remaining_quantity: remainingQuantity,
        // 统一的规格字段
        specification: specValue,
        specification_unit: specUnit,
        // 保留原始字段用于调试和兼容性
        bead_diameter: item.bead_diameter ? Number(item.bead_diameter) : null,
        bracelet_inner_diameter: item.bracelet_inner_diameter ? Number(item.bracelet_inner_diameter) : null,
        bracelet_bead_count: item.bracelet_bead_count ? Number(item.bracelet_bead_count) : null,
        accessory_specification: item.accessory_specification,
        finished_material_specification: item.finished_material_specification,
        price_per_unit: (req.user?.role || "USER") === 'BOSS' ? Number(item.price_per_unit) : null,
        price_per_gram: (req.user?.role || "USER") === 'BOSS' ? Number(item.price_per_gram) : null,
        stock_status: item.stock_status,
        photos: photos
      })
      
      // 向上累加统计
      level2.total_quantity += remainingQuantity
      level2.has_low_stock = level2.has_low_stock || is_low_stock
      
      level1.total_quantity += remainingQuantity
      level1.has_low_stock = level1.has_low_stock || is_low_stock
    })
    
    // 计算加权平均价格并转换为数组结构
    const processedData = Array.from(hierarchicalData.values()).map((level1: any) => {
      const specificationsArray = Array.from(level1.specifications.values()).map((level2: any) => {
        const qualitiesArray = Array.from(level2.qualities.values()).map((level3: any) => {
          // 计算加权平均价格
          let totalWeightedPriceUnit = 0
          let totalWeightedPriceGram = 0
          let totalWeightForUnit = 0
          let totalWeightForGram = 0
          
          level3.batches.forEach((batch: any) => {
            if (batch.price_per_unit && batch.original_quantity > 0) {
              totalWeightedPriceUnit += batch.price_per_unit * batch.original_quantity
              totalWeightForUnit += batch.original_quantity
            }
            if (batch.price_per_gram && batch.original_quantity > 0) {
              totalWeightedPriceGram += batch.price_per_gram * batch.original_quantity
              totalWeightForGram += batch.original_quantity
            }
          })
          
          return {
            quality: level3.quality,
            remaining_quantity: level3.remaining_quantity,
            is_low_stock: level3.is_low_stock,
            price_per_unit: (req.user?.role || "USER") === 'BOSS' && totalWeightForUnit > 0
              ? Math.round((totalWeightedPriceUnit / totalWeightForUnit) * 100) / 100 
              : null,
            price_per_gram: (req.user?.role || "USER") === 'BOSS' && totalWeightForGram > 0
              ? Math.round((totalWeightedPriceGram / totalWeightForGram) * 100) / 100 
              : null,
            batch_count: level3.batches.length,
            batches: level3.batches
          }
        })
        
        level2.total_variants = qualitiesArray.length
        return {
          specification_value: level2.specification_value,
          specification_unit: level2.specification_unit,
          total_quantity: level2.total_quantity,
          total_variants: level2.total_variants,
          has_low_stock: level2.has_low_stock,
          qualities: qualitiesArray
        }
      })
      
      level1.total_variants = specificationsArray.reduce((sum, spec) => sum + spec.total_variants, 0)
      return {
        material_type: level1.material_type,
        total_quantity: level1.total_quantity,
        total_variants: level1.total_variants,
        has_low_stock: level1.has_low_stock,
        specifications: specificationsArray
      }
    })
    
    // 排序
    const sortField = sort_by === 'material_type' ? 'material_type' : 'total_quantity'
    processedData.sort((a, b) => {
      if (sortField === 'material_type') {
        return sort === 'asc' ? a.material_type.localeCompare(b.material_type) : b.material_type.localeCompare(a.material_type)
      } else {
        return sort === 'asc' ? a.total_quantity - b.total_quantity : b.total_quantity - a.total_quantity
      }
    })
    
    console.log('✅ [层级式库存查询] 处理完成:', {
      processedDataLength: processedData.length,
      firstProcessedItem: processedData[0]
    })
    
    // 分页
    const total = processedData.length
    const paginatedData = processedData.slice(offset, offset + limitNum)
    
    // 数据已经是material表格式，无需映射
    const mappedData = paginatedData
    
    return res.json({
      success: true,
      message: '获取层级式库存列表成功',
      data: {
        hierarchy: mappedData,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total,
          pages: Math.ceil(total / limitNum)
        }
      }
    })
  } catch (error) {
    console.error('❌ [层级式库存查询] 发生错误:', error)
    return res.status(500).json({
      success: false,
      message: '获取层级式库存列表失败',
      error: (error as Error).message
    })
  }
}))

// 获取分组库存列表（按产品名称分组）
router.get('/grouped', authenticateToken, asyncHandler(async (req, res) => {
  // 验证查询参数
  const validatedQuery = inventoryQuerySchema.parse(req.query)
  const {
    page = 1,
    limit = 10,
    search,
    quality,
    low_stock_only,
    sort = 'desc',
    sort_by = 'purchase_name'
  } = validatedQuery

  const pageNum = parseInt(String(page))
  const limitNum = Math.min(parseInt(String(limit)), 100)
  const offset = (pageNum - 1) * limitNum

  // 构建查询条件
  let whereClause = 'WHERE 1=1'
  const params: any[] = []

  if (search) {
    whereClause += ' AND p.purchase_name LIKE ?'
    params.push(`%${search}%`)
  }

  if (quality) {
    whereClause += ' AND p.quality = ?'
    params.push(quality)
  }

  if (String(low_stock_only) === 'true') {
    whereClause += ' AND (CASE WHEN p.purchase_type = "LOOSE_BEADS" THEN COALESCE(p.piece_count, 0) WHEN p.purchase_type = "BRACELET" THEN COALESCE(p.quantity, 0) WHEN p.purchase_type = "ACCESSORIES" THEN COALESCE(p.piece_count, 0) WHEN p.purchase_type = "FINISHED" THEN COALESCE(p.piece_count, 0) ELSE COALESCE(p.quantity, 0) END - COALESCE(mu.used_beads, 0)) <= p.min_stock_alert'
  }
  
  console.log('🔍 [分组库存查询] 请求参数:', {
    page: pageNum,
    limit: limitNum,
    search,
    quality,
    low_stock_only,
    whereClause,
    params
  })

  try {
    // 查询分组库存数据 - 使用两步查询避免JSON_ARRAYAGG兼容性问题
    const groupedQuery = `
      SELECT 
        p.purchase_name as purchase_name,
        COUNT(DISTINCT CONCAT(
          COALESCE(p.bead_diameter, p.specification, 0), 
          '-', 
          COALESCE(p.quality, '')
        )) as variant_count,
        SUM(
          CASE 
            WHEN p.purchase_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
            WHEN p.purchase_type = 'BRACELET' THEN COALESCE(p.quantity, 0)
            WHEN p.purchase_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
            WHEN p.purchase_type = 'FINISHED_MATERIAL' THEN COALESCE(p.piece_count, 0)
            ELSE COALESCE(p.quantity, 0)
          END - COALESCE(mu.used_beads, 0)
        ) as total_remaining_beads,
        MAX(CASE WHEN p.min_stock_alert IS NOT NULL AND 
                     (CASE 
                       WHEN p.purchase_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
                       WHEN p.purchase_type = 'BRACELET' THEN COALESCE(p.quantity, 0)
                       WHEN p.purchase_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
                       WHEN p.purchase_type = 'FINISHED_MATERIAL' THEN COALESCE(p.piece_count, 0)
                       ELSE COALESCE(p.quantity, 0)
                     END - COALESCE(mu.used_beads, 0)) <= p.min_stock_alert 
                THEN 1 ELSE 0 END) as has_low_stock
      FROM purchases p
      LEFT JOIN (
        SELECT purchase_id, SUM(quantity_used_beads) as used_beads
        FROM material_usage
        GROUP BY purchase_id
      ) mu ON p.id = mu.purchase_id
      ${whereClause}
      GROUP BY p.purchase_name
      ORDER BY ${sort_by === 'purchase_name' ? 'p.purchase_name' : 'total_remaining_beads'} ${sort === 'asc' ? 'ASC' : 'DESC'}
      LIMIT ? OFFSET ?
    `

    // 计算总数
    const countQuery = `
      SELECT COUNT(DISTINCT p.purchase_name) as total
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id
      ${whereClause}
    `

    console.log('🔍 [分组库存查询] SQL查询参数:', { params, limitNum, offset })
    const [groupedResult, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(groupedQuery, ...params, limitNum, offset),
      prisma.$queryRawUnsafe(countQuery, ...params)
    ])

    const groupedInventory = groupedResult as any[]
    const total = (countResult as any[])[0].total
    
    console.log('📊 [分组库存查询] 原始查询结果:', {
      groupedInventoryLength: groupedInventory.length,
      total: total,
      firstGroup: groupedInventory[0]
    })

    // 为每个产品组查询变体数据
    const processedGroups = await Promise.all(
      groupedInventory.map(async (group) => {
        // 查询该产品的所有采购记录（用于合并相同规格品相的变体）
        const purchaseQuery = `
          SELECT 
            p.id as purchase_id,
            p.bead_diameter as bead_diameter,
            p.specification,
            p.quality,
            CASE 
              WHEN p.purchase_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
              WHEN p.purchase_type = 'BRACELET' THEN COALESCE(p.quantity, 0)
              WHEN p.purchase_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
              WHEN p.purchase_type = 'FINISHED_MATERIAL' THEN COALESCE(p.piece_count, 0)
              ELSE COALESCE(p.quantity, 0)
            END as original_beads,
            COALESCE(mu.used_beads, 0) as used_beads,
            (CASE 
                WHEN p.purchase_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
                WHEN p.purchase_type = 'BRACELET' THEN COALESCE(p.quantity, 0)
                WHEN p.purchase_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
                WHEN p.purchase_type = 'FINISHED_MATERIAL' THEN COALESCE(p.piece_count, 0)
                ELSE COALESCE(p.quantity, 0)
              END - COALESCE(mu.used_beads, 0)) as remaining_beads,
            CASE WHEN p.min_stock_alert IS NOT NULL AND 
                     (CASE 
                         WHEN p.purchase_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
                         WHEN p.purchase_type = 'BRACELET' THEN COALESCE(p.quantity, 0)
                         WHEN p.purchase_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
                         WHEN p.purchase_type = 'FINISHED_MATERIAL' THEN COALESCE(p.piece_count, 0)
                         ELSE COALESCE(p.quantity, 0)
                       END - COALESCE(mu.used_beads, 0)) <= p.min_stock_alert 
                THEN 1 ELSE 0 END as is_low_stock,
            p.price_per_bead as price_per_bead,
            p.price_per_gram as price_per_gram,
            p.purchase_date as purchase_date,
            s.name as supplier_name
          FROM purchases p
          LEFT JOIN (
            SELECT purchase_id, SUM(quantity_used_beads) as used_beads
            FROM material_usage
            GROUP BY purchase_id
          ) mu ON p.id = mu.purchase_id
          LEFT JOIN suppliers s ON p.supplier_id = s.id
          WHERE p.bead_diameter IS NOT NULL AND p.purchase_name = ?
          ORDER BY p.bead_diameter, p.quality, p.purchase_date
        `
        
        const purchases = await prisma.$queryRawUnsafe(purchaseQuery, group.purchase_name) as any[]
        console.log(`🔍 [采购记录查询] 产品"${group.purchase_name}"的采购记录:`, purchases)
        
        // 按规格和品相分组合并变体
        const variantMap = new Map()
        
        purchases.forEach((purchase: any) => {
          const specValue = purchase.bead_diameter || purchase.specification || 0
          const variantKey = `${specValue}-${purchase.quality || 'unknown'}`
          
          if (!variantMap.has(variantKey)) {
            variantMap.set(variantKey, {
              bead_diameter: purchase.bead_diameter ? Number(purchase.bead_diameter) : null,
              specification: purchase.specification ? Number(purchase.specification) : null,
              quality: purchase.quality,
              remaining_beads: 0,
              total_original_beads: 0,
              is_low_stock: false,
              weighted_price_per_bead: 0,
              weighted_price_per_gram: 0,
              batches: []
            })
          }
          
          const variant = variantMap.get(variantKey)
          const remainingBeads = Number(purchase.remaining_beads)
          const originalBeads = Number(purchase.original_beads)
          
          // 累加库存数量
          variant.remaining_beads += remainingBeads
          variant.total_original_beads += originalBeads
          
          // 检查低库存状态
          if (Number(purchase.is_low_stock) === 1) {
            variant.is_low_stock = true
          }
          
          // 添加批次信息
          variant.batches.push({
            purchase_id: purchase.purchase_id,
            purchase_date: purchase.purchase_date,
            supplier_name: purchase.supplier_name,
            original_beads: originalBeads,
            used_beads: Number(purchase.used_beads),
            remaining_beads: remainingBeads,
            price_per_bead: (req.user?.role || "USER") === 'BOSS' ? Number(purchase.price_per_bead) : null,
            price_per_gram: (req.user?.role || "USER") === 'BOSS' ? Number(purchase.price_per_gram) : null
          })
        })
        
        // 计算加权平均价格并转换为数组
        const filteredVariants = Array.from(variantMap.values()).map((variant: any) => {
          let totalWeightedPriceBead = 0
          let totalWeightedPriceGram = 0
          let totalWeightForBead = 0
          let totalWeightForGram = 0
          
          // 计算加权平均价格（按原始库存数量加权）
          variant.batches.forEach((batch: any) => {
            if (batch.price_per_bead && batch.original_beads > 0) {
              totalWeightedPriceBead += batch.price_per_bead * batch.original_beads
              totalWeightForBead += batch.original_beads
            }
            if (batch.price_per_gram && batch.original_beads > 0) {
              totalWeightedPriceGram += batch.price_per_gram * batch.original_beads
              totalWeightForGram += batch.original_beads
            }
          })
          
          return {
            bead_diameter: variant.bead_diameter,
            quality: variant.quality,
            remaining_beads: variant.remaining_beads,
            is_low_stock: variant.is_low_stock,
            price_per_bead: (req.user?.role || "USER") === 'BOSS' && totalWeightForBead > 0 
              ? Math.round((totalWeightedPriceBead / totalWeightForBead) * 100) / 100 
              : null,
            price_per_gram: (req.user?.role || "USER") === 'BOSS' && totalWeightForGram > 0 
              ? Math.round((totalWeightedPriceGram / totalWeightForGram) * 100) / 100 
              : null,
            batch_count: variant.batches.length,
            batches: variant.batches
          }
        })
        
        console.log(`✅ [变体合并] 产品"${group.purchase_name}"合并后的变体:`, {
          originalPurchases: purchases.length,
          mergedVariants: filteredVariants.length,
          variants: filteredVariants.map(v => ({
            key: `${v.bead_diameter}mm-${v.quality}`,
            remaining_beads: v.remaining_beads,
            batch_count: v.batch_count,
            avg_price_per_bead: v.price_per_bead
          }))
        })

        return {
          purchase_name: group.purchase_name,
          variant_count: Number(group.variant_count),
          total_remaining_beads: Number(group.total_remaining_beads),
          has_low_stock: Number(group.has_low_stock) === 1,
          variants: filteredVariants
        }
      })
    )

    console.log('✅ [分组库存查询] 最终处理结果:', {
      groupsCount: processedGroups.length,
      firstGroupData: processedGroups[0]
    })

    const responseData = {
      success: true,
      message: '获取分组库存列表成功',
      data: {
        groups: processedGroups,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(total),
          pages: Math.ceil(Number(total) / limitNum)
        }
      }
    }
    
    console.log('📤 [分组库存查询] 即将发送的响应数据:', {
      success: responseData.success,
      message: responseData.message,
      dataKeys: Object.keys(responseData.data),
      groupsLength: responseData.data.groups.length,
      paginationInfo: responseData.data.pagination,
      timestamp: new Date().toISOString()
    })
    
    res.json(responseData)
  } catch (error) {
    console.error('❌ [分组库存查询] 发生错误:', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      params,
      whereClause,
      timestamp: new Date().toISOString()
    })
    res.status(500).json({
      success: false,
      message: '获取分组库存列表失败',
      error: (error as Error).message
    })
  }
  // 函数结束
  // 函数结束
}))

// 获取库存列表（原有接口保持兼容）
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    quality,
    low_stock_only,
    min_stock,
    max_stock,
    sort = 'desc',
    sort_by = 'purchase_date'
  } = req.query

  const pageNum = parseInt(String(page))
  const limitNum = Math.min(parseInt(String(limit)), 100)
  const offset = (pageNum - 1) * limitNum

  // 构建查询条件
  let whereClause = 'WHERE p.bead_diameter IS NOT NULL'
  const params: any[] = []

  if (search) {
    whereClause += ' AND p.purchase_name LIKE ?'
    params.push(`%${search}%`)
  }

  if (quality) {
    whereClause += ' AND p.quality = ?'
    params.push(quality)
  }

  if (String(low_stock_only) === 'true') {
    whereClause += ' AND (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) <= p.min_stock_alert'
  }

  if (min_stock) {
    whereClause += ' AND (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) >= ?'
    params.push(parseInt(String(min_stock)))
  }

  if (max_stock) {
    whereClause += ' AND (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) <= ?'
    params.push(parseInt(String(max_stock)))
  }

  // 排序
  const validSortFields = ['purchase_date', 'created_at', 'remaining_beads', 'purchase_name']
  const sortField = validSortFields.includes(sort_by as string) ? sort_by : 'purchase_date'
  const sortDirection = sort === 'asc' ? 'ASC' : 'DESC'

  try {
    // 查询库存数据
    const inventoryQuery = `
      SELECT 
        p.id as purchase_id,
        p.purchase_name as purchase_name,
        CONCAT(p.purchase_name, ' ', p.bead_diameter, 'mm ', COALESCE(p.quality, ''), '级') as bead_type,
        p.bead_diameter as bead_diameter,
        p.quality,
        p.min_stock_alert as min_stock_alert,
        p.total_beads as original_beads,
        COALESCE(SUM(mu.quantity_used), 0) as used_beads,
        (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) as remaining_beads,
        CASE 
          WHEN p.min_stock_alert IS NOT NULL AND 
               (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) <= p.min_stock_alert 
          THEN 1 
          ELSE 0 
        END as is_low_stock,
        p.price_per_bead as price_per_bead,
        p.price_per_gram as price_per_gram,
        s.name as supplier_name,
        p.purchase_date as purchase_date,
        p.photos,
        p.notes,
        p.created_at as created_at,
        p.updated_at as updated_at
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ${whereClause}
      GROUP BY p.id, p.purchase_name, p.bead_diameter, p.quality, p.min_stock_alert, 
               p.total_beads, p.price_per_bead, p.price_per_gram, s.name, 
               p.purchase_date, p.photos, p.notes, p.created_at, p.updated_at
      ORDER BY ${sortField} ${sortDirection}
      LIMIT ? OFFSET ?
    `

    // 计算总数
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ${whereClause}
    `

    const [inventoryResult, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(inventoryQuery, ...params, limitNum, offset),
      prisma.$queryRawUnsafe(countQuery, ...params)
    ])

    const inventory = inventoryResult as any[]
    const total = (countResult as any[])[0].total

    // 权限过滤
    const filteredInventory = filterInventoryData(inventory, req.user?.role || "USER")

    res.json({
      success: true,
      message: '获取库存列表成功',
      data: {
        items: filteredInventory,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(total),
          pages: Math.ceil(Number(total) / limitNum)
        }
      }
    })
  } catch (error) {
    console.error('获取库存列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取库存列表失败'
    })
  }
  // 函数结束
  // 函数结束
}))

// 库存搜索
router.get('/search', authenticateToken, asyncHandler(async (req, res) => {
  const { q: query, limit = 20 } = req.query

  if (!query) {
    res.status(400).json({
      success: false,
      message: '搜索关键词不能为空'
    })
    return
  }

  const limitNum = Math.min(parseInt(String(limit)), 50)

  try {
    const searchQuery = `
      SELECT 
        p.id as purchase_id,
        p.purchase_name as purchase_name,
        CONCAT(p.purchase_name, ' ', p.bead_diameter, 'mm ', COALESCE(p.quality, ''), '级') as bead_type,
        p.bead_diameter as bead_diameter,
        p.quality,
        (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) as remaining_beads,
        CASE 
          WHEN p.min_stock_alert IS NOT NULL AND 
               (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) <= p.min_stock_alert 
          THEN 1 
          ELSE 0 
        END as is_low_stock,
        p.price_per_bead as price_per_bead,
        s.name as supplier_name,
        p.purchase_date as purchase_date
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.bead_diameter IS NOT NULL 
        AND (p.purchase_name LIKE ? OR s.name LIKE ?)
      GROUP BY p.id, p.purchase_name, p.bead_diameter, p.quality, p.min_stock_alert, 
               p.total_beads, p.price_per_bead, s.name, p.purchase_date
      ORDER BY remaining_beads DESC
      LIMIT ?
    `

    const searchPattern = `%${query}%`
    const results = await prisma.$queryRawUnsafe(
      searchQuery,
      searchPattern,
      searchPattern,
      limitNum
    ) as any[]

    // 权限过滤
    const filteredResults = filterInventoryData(results, req.user?.role || "USER")

    res.json({
      success: true,
      message: '搜索成功',
      data: {
        items: filteredResults,
        total: filteredResults.length
      }
    })
  } catch (error) {
    console.error('库存搜索失败:', error)
    res.status(500).json({
      success: false,
      message: '搜索失败'
    })
  }
  // 函数结束
  // 函数结束
}))

// 成品查询参数验证schema
const finishedProductQuerySchema = z.object({
  page: z.string().regex(/^\d+$/, '页码必须是数字').transform(Number).refine(n => n >= 1, '页码必须大于0').optional(),
  limit: z.string().regex(/^\d+$/, '每页数量必须是数字').transform(Number).refine(n => n >= 1 && n <= 100, '每页数量必须在1-100之间').optional(),
  search: z.string().max(100, '搜索关键词不能超过100字符').optional(),
  quality: qualitySchema.optional(),
  low_stock_only: z.string().transform(s => s === 'true').optional(),
  specification_min: z.string().regex(/^\d+(\.\d+)?$/, '最小规格必须是数字').transform(Number).optional(),
  specification_max: z.string().regex(/^\d+(\.\d+)?$/, '最大规格必须是数字').transform(Number).optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  sort_by: z.enum(['purchase_date', 'purchase_name', 'specification', 'remaining_quantity']).optional()
}).refine((data) => {
  if (data.specification_min && data.specification_max && data.specification_min > data.specification_max) {
    throw new Error('最小规格不能大于最大规格')
  }
  return true
})

// 获取成品卡片数据（专用于成品展示）
router.get('/finished-products-cards', authenticateToken, asyncHandler(async (req, res) => {
  // 验证查询参数
  const validatedQuery = finishedProductQuerySchema.parse(req.query)
  const {
    page = 1,
    limit = 20,
    search,
    quality,
    low_stock_only,
    specification_min,
    specification_max,
    sort = 'desc',
    sort_by = 'purchase_date'
  } = validatedQuery

  const pageNum = parseInt(String(page))
  const limitNum = Math.min(parseInt(String(limit)), 100)
  const offset = (pageNum - 1) * limitNum

  console.log('🎯 [成品卡片查询] 请求参数:', {
    page: pageNum,
    limit: limitNum,
    search,
    quality,
    low_stock_only,
    specification_min,
    specification_max
  })

  try {
    // 构建查询条件
    let whereConditions = ['p.purchase_type = "FINISHED"']
    let queryParams: any[] = []

    // 搜索条件
    if (search) {
      whereConditions.push('(p.purchase_name LIKE ? OR s.name LIKE ?)')
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern)
    }

    // 品相筛选
    if (quality && quality && quality.trim() !== '') {
      whereConditions.push('p.quality = ?')
      queryParams.push(quality)
    }

    // 规格范围筛选
    if (specification_min) {
      whereConditions.push('p.specification >= ?')
      queryParams.push(Number(specification_min))
    }
    if (specification_max) {
      whereConditions.push('p.specification <= ?')
      queryParams.push(Number(specification_max))
    }

    // 构建排序条件
    let orderBy = 'p.purchase_date DESC'
    if (sort_by === 'purchase_name') {
      orderBy = `p.purchase_name ${sort === 'asc' ? 'ASC' : 'DESC'}`
    } else if (sort_by === 'specification') {
      orderBy = `p.specification ${sort === 'asc' ? 'ASC' : 'DESC'}`
    } else if (sort_by === 'remaining_quantity') {
      orderBy = `remaining_quantity ${sort === 'asc' ? 'ASC' : 'DESC'}`
    }

    // 主查询SQL
    const finishedProductsQuery = `
      SELECT 
        p.id as purchase_id,
        p.purchase_code as purchase_code,
        p.purchase_name as purchase_name,
        p.specification,
        p.piece_count as piece_count,
        p.quality,
        p.photos,
        CASE 
          WHEN ${(req.user?.role || "USER") === 'BOSS' ? 'TRUE' : 'FALSE'} THEN 
            CASE 
              WHEN p.purchase_type = 'FINISHED_MATERIAL' AND p.piece_count > 0 AND p.total_price IS NOT NULL 
              THEN ROUND(p.total_price / p.piece_count, 2)
              ELSE p.unit_price
            END
          ELSE NULL
        END as price_per_unit,
        CASE 
          WHEN ${(req.user?.role || "USER") === 'BOSS' ? 'TRUE' : 'FALSE'} THEN p.total_price
          ELSE NULL
        END as total_price,
        s.name as supplier_name,
        p.purchase_date as purchase_date,
        COALESCE(p.piece_count, 0) as original_quantity,
        COALESCE(mu.used_quantity, 0) as used_quantity,
        (COALESCE(p.piece_count, 0) - COALESCE(mu.used_quantity, 0)) as remaining_quantity,
        CASE 
          WHEN p.min_stock_alert IS NOT NULL AND 
               (COALESCE(p.piece_count, 0) - COALESCE(mu.used_quantity, 0)) <= p.min_stock_alert 
          THEN 1 
          ELSE 0 
        END as is_low_stock,
        p.created_at as created_at,
        p.updated_at as updated_at
      FROM purchases p
      LEFT JOIN (
        SELECT purchase_id, SUM(quantity_used) as used_quantity
        FROM material_usage
        GROUP BY purchase_id
      ) mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE ${whereConditions.join(' AND ')}
      ${String(low_stock_only) === 'true' ? 'HAVING is_low_stock = 1' : ''}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `

    // 计数查询SQL
    const countQuery = `
      SELECT COUNT(*) as total
      FROM purchases p
      LEFT JOIN (
        SELECT purchase_id, SUM(quantity_used) as used_quantity
        FROM material_usage
        GROUP BY purchase_id
      ) mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE ${whereConditions.join(' AND ')}
      ${String(low_stock_only) === 'true' ? 'HAVING (COALESCE(p.piece_count, 0) - COALESCE(mu.used_quantity, 0)) <= COALESCE(p.min_stock_alert, 0)' : ''}
    `

    console.log('🔍 [成品卡片查询] SQL查询参数:', { queryParams, limitNum, offset })

    // 执行查询
    const [products, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(finishedProductsQuery, ...queryParams, limitNum, offset),
      prisma.$queryRawUnsafe(countQuery, ...queryParams)
    ])

    const total = Number((countResult as any[])[0]?.total || 0)
    const totalPages = Math.ceil(total / limitNum)

    // 转换数据格式
    const convertedProducts = (products as any[]).map(item => {
      const converted = { ...item }
      
      // 转换BigInt字段（但不转换purchase_id，因为它是字符串UUID）
      const bigIntFields = [
        'specification', 'piece_count', 'original_quantity',
        'used_quantity', 'remaining_quantity', 'is_low_stock'
      ]
      
      bigIntFields.forEach(field => {
        if (converted[field] !== null && converted[field] !== undefined) {
          converted[field] = Number(converted[field])
        }
      })
      
      // purchase_id保持原始字符串格式，不进行数字转换
      // 因为它是UUID字符串，转换为Number会变成NaN
      
      // 转换价格字段
      const priceFields = ['price_per_unit', 'total_price']
      priceFields.forEach(field => {
        if (converted[field] !== null && converted[field] !== undefined) {
          converted[field] = Number(converted[field])
        }
      })
      
      // 处理photos字段
      if (converted.photos) {
        try {
          converted.photos = typeof converted.photos === 'string' 
            ? JSON.parse(converted.photos) 
            : converted.photos
        } catch (e) {
          converted.photos = []
        }
      } else {
        converted.photos = []
      }
      
      return converted
    })

    console.log('📊 [成品卡片查询] 查询结果:', {
      productsLength: convertedProducts.length,
      total,
      totalPages,
      currentPage: pageNum
    })
    
    console.log('🔍 [成品卡片查询] 原始查询数据（前3个）:', (products as any[]).slice(0, 3).map(item => ({
      purchase_id: item.purchase_id,
      purchase_name: item.purchase_name,
      purchase_date: item.purchase_date,
      purchase_id_type: typeof item.purchase_id
    })))
    
    console.log('🔍 [成品卡片查询] 转换后数据（前3个）:', convertedProducts.slice(0, 3).map(item => ({
      purchase_id: item.purchase_id,
      purchase_name: item.purchase_name,
      purchase_date: item.purchase_date,
      purchase_id_type: typeof item.purchase_id
    })))

    res.json({
      success: true,
      message: '获取成品数据成功',
      data: {
        products: convertedProducts,
        pagination: {
          current_page: pageNum,
          per_page: limitNum,
          total: total,
          total_pages: totalPages,
          has_next: pageNum < totalPages,
          has_prev: pageNum > 1
        }
      }
    })
  } catch (error) {
    console.error('❌ [成品卡片查询] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('获取成品数据失败', (error as Error).message)
    )
  }
  // 函数结束
  // 函数结束
}))

// 获取库存统计数据（仪表盘）- 修复四种material类型的正确处理
router.get('/statistics', authenticateToken, asyncHandler(async (req, res) => {
  console.log('🔍 [库存统计] 接收到statistics请求:', {
    method: req.method,
    path: req.path,
    user: req.user?.user_name,
    timestamp: new Date().toISOString()
  })
  
  try {
    // 修复的统计查询，正确处理四种material类型的单位计算
    const basicStatsQuery = `
      SELECT 
        p.purchase_type as purchase_type,
        COUNT(DISTINCT p.id) as total_items,
        SUM(CASE 
          WHEN p.purchase_type = 'LOOSE_BEADS' THEN (COALESCE(p.piece_count, 0) - COALESCE(mu.used_quantity, 0))
          WHEN p.purchase_type = 'BRACELET' THEN (COALESCE(p.total_beads, p.piece_count, 0) - COALESCE(mu.used_quantity, 0))
          WHEN p.purchase_type = 'ACCESSORIES' THEN (COALESCE(p.piece_count, 0) - COALESCE(mu.used_quantity, 0))
          WHEN p.purchase_type = 'FINISHED_MATERIAL' THEN (COALESCE(p.piece_count, 0) - COALESCE(mu.used_quantity, 0))
          ELSE 0
        END) as total_remaining_quantity
      FROM purchases p
      LEFT JOIN (
        SELECT purchase_id, SUM(quantity_used) as used_quantity
        FROM material_usage
        GROUP BY purchase_id
      ) mu ON p.id = mu.purchase_id
      WHERE p.purchase_type IN ('LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED_MATERIAL')
      GROUP BY p.purchase_type
      ORDER BY p.purchase_type
    `

    // 执行基础统计查询
    console.log('🔍 [库存统计] 执行SQL查询...')
    const typeStats = await prisma.$queryRawUnsafe(basicStatsQuery)
    console.log('📊 [库存统计] 查询结果:', {
      length: (typeStats as any[]).length,
      data: typeStats
    })
    
    // 转换BigInt字段并应用purchase到material的映射
    const convertAndMapData = (data: any[]) => {
      return data.map(item => {
        // 先转换BigInt为Number
        const converted = { ...item }
        Object.keys(converted).forEach(key => {
          if (typeof converted[key] === 'bigint') {
            converted[key] = Number(converted[key])
          }
        })
        console.log('🔧 [库存统计] BigInt转换后的项目:', converted)
        
        // 应用purchase到material的字段映射
        const mapped = mapPurchaseToMaterial(converted)
        
        // 添加单位信息
        if (mapped.material_type) {
          mapped.inventory_unit = getUnit(mapped.material_type)
        }
        
        return mapped
      })
    }

    // 计算总体统计
    const rawTypeStats = typeStats as any[]
    const total_stats = {
      total_items: rawTypeStats.reduce((sum, item) => sum + Number(item.total_items), 0),
      total_quantity: rawTypeStats.reduce((sum, item) => sum + Number(item.total_remaining_quantity), 0)
    }
    console.log('📊 [库存统计] 总体统计:', total_stats)

    // 应用映射并构建响应数据
    const mappedTypeStats = convertAndMapData(rawTypeStats)
    const responseData = {
      total_stats: total_stats,
      type_statistics: mappedTypeStats
    }
    console.log('📊 [库存统计] 映射后响应数据:', responseData)

    res.json({
      success: true,
      message: '获取库存统计数据成功',
      data: responseData
    })
  } catch (error) {
    console.error('❌ [库存统计] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('获取库存统计数据失败', (error as Error).message)
    )
  }
  // 函数结束
  // 函数结束
}))

// 获取产品分布数据（用于饼图）
router.get('/product-distribution', authenticateToken, asyncHandler(async (req, res) => {
  console.log('🔍 [产品分布] 接收到product-distribution请求:', {
    method: req.method,
    path: req.path,
    query: req.query,
    user: req.user?.user_name,
    timestamp: new Date().toISOString()
  })
  
  try {
    const { purchase_type, limit = 20 } = req.query
    
    // 构建查询条件
    let whereClause = ''
    if (purchase_type && purchase_type !== 'ALL') {
      whereClause = `WHERE p.purchase_type = '${purchase_type}'`
    }
    
    // 查询产品分布数据（前N名 + 其他）- 修复字段名和使用剩余数量
    const distributionQuery = `
      SELECT 
        p.purchase_name as purchase_name,
        p.purchase_type as purchase_type,
        SUM(CASE 
          WHEN p.purchase_type = 'LOOSE_BEADS' THEN (COALESCE(p.piece_count, 0) - COALESCE(mu.used_quantity, 0))
          WHEN p.purchase_type = 'BRACELET' THEN (COALESCE(p.total_beads, p.piece_count, 0) - COALESCE(mu.used_quantity, 0))
          WHEN p.purchase_type = 'ACCESSORIES' THEN (COALESCE(p.piece_count, 0) - COALESCE(mu.used_quantity, 0))
          WHEN p.purchase_type = 'FINISHED_MATERIAL' THEN (COALESCE(p.piece_count, 0) - COALESCE(mu.used_quantity, 0))
          ELSE 0
        END) as total_remaining_quantity
      FROM purchases p
      LEFT JOIN (
        SELECT purchase_id, SUM(quantity_used) as used_quantity
        FROM material_usage
        GROUP BY purchase_id
      ) mu ON p.id = mu.purchase_id
      ${whereClause}
      GROUP BY p.purchase_name, p.purchase_type
      HAVING total_remaining_quantity > 0
      ORDER BY total_remaining_quantity DESC
    `

    console.log('🔍 [产品分布] 执行SQL查询:', distributionQuery)
    const allProducts = await prisma.$queryRawUnsafe(distributionQuery) as any[]
    console.log('📊 [产品分布] 查询结果:', {
      length: allProducts.length,
      sample: allProducts.slice(0, 3)
    })
    
    // 转换BigInt字段并应用purchase到material映射
    const convertedProducts = allProducts.map(item => {
      const converted = { ...item }
      Object.keys(converted).forEach(key => {
        if (typeof converted[key] === 'bigint') {
          converted[key] = Number(converted[key])
        }
      })
      // 应用purchase到material的字段映射
      return mapPurchaseToMaterial(converted)
    })
    
    // 计算该产品类型的总剩余数量（确保数字相加而不是字符串拼接）
    const total_remaining_quantity = convertedProducts.reduce((sum, item) => {
      const quantity = Number(item.total_remaining_quantity) || 0
      return sum + quantity
    }, 0)
    
    // 获取前N名产品
    const topProducts = convertedProducts.slice(0, parseInt(String(limit)))
    const topQuantity = topProducts.reduce((sum, item) => sum + (Number(item.total_remaining_quantity) || 0), 0)
    
    // 计算其他产品的数量
    const othersQuantity = total_remaining_quantity - topQuantity
    
    // 构建饼图数据 - 百分比基于该产品类型的总剩余量计算，使用material字段
    const pieChartData = topProducts.map(item => ({
      name: item.material_name || item.purchase_name, // 优先使用映射后的字段
      value: Number(item.total_remaining_quantity) || 0,
      percentage: total_remaining_quantity > 0 ? ((Number(item.total_remaining_quantity) || 0) / total_remaining_quantity * 100).toFixed(1) : '0.0',
      material_type: item.material_type || item.purchase_type
    }))
    
    // 如果有其他产品，添加到数据中
    if (othersQuantity > 0) {
      pieChartData.push({
        name: '其他',
        value: othersQuantity,
        percentage: total_remaining_quantity > 0 ? (othersQuantity / total_remaining_quantity * 100).toFixed(1) : '0.0',
        material_type: 'OTHER'
      })
    }
    
    const responseData = {
      total_remaining_quantity: total_remaining_quantity,
      top_products_count: topProducts.length,
      others_count: convertedProducts.length - topProducts.length,
      items: pieChartData // 修改字段名以保持一致性
    }
    
    console.log('📊 [产品分布] 响应数据:', responseData)
    
    // 应用完整的字段映射
    const convertedData = responseData
    
    res.json({
      success: true,
      message: '获取产品分布数据成功',
      data: convertedData
    })
  } catch (error) {
    console.error('❌ [产品分布] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('获取产品分布数据失败', (error as Error).message)
    )
  }
  // 函数结束
  // 函数结束
}))

// 获取原材料分布数据（用于饼图）
router.get('/material-distribution', authenticateToken, asyncHandler(async (req, res) => {
  console.log('🔍 [原材料分布] 接收到material-distribution请求:', {
    method: req.method,
    path: req.path,
    query: req.query,
    user: req.user?.user_name,
    timestamp: new Date().toISOString()
  })
  
  try {
    const { purchase_type, limit = 10 } = req.query
    
    // 构建查询条件
    let whereClause = "WHERE p.status = 'ACTIVE'"
    if (purchase_type && purchase_type !== 'ALL') {
      whereClause += ` AND p.purchase_type = '${purchase_type}'`
    }
    
    // 查询原材料分布数据 - 从materials表获取数据
    const distributionQuery = `
      SELECT 
        m.material_name as purchase_name,
        SUM(m.remaining_quantity) as total_remaining_quantity,
        COUNT(DISTINCT m.id) as count
      FROM materials m
      INNER JOIN purchases p ON m.purchase_id = p.id
      WHERE m.remaining_quantity > 0
        AND p.status = 'ACTIVE'
        ${purchase_type && purchase_type !== 'ALL' ? `AND p.purchase_type = '${purchase_type}'` : ''}
      GROUP BY m.material_name
      ORDER BY total_remaining_quantity DESC
      LIMIT ?
    `

    console.log('🔍 [原材料分布] 执行SQL查询:', distributionQuery)
    const materials = await prisma.$queryRawUnsafe(distributionQuery, parseInt(String(limit))) as any[]
    console.log('📊 [原材料分布] 查询结果:', {
      length: materials.length,
      sample: materials.slice(0, 3)
    })
    
    // 转换BigInt字段
    const convertedMaterials = materials.map(item => {
      const converted = { ...item }
      Object.keys(converted).forEach(key => {
        if (typeof converted[key] === 'bigint') {
          converted[key] = Number(converted[key])
        }
      })
      return converted
    })
    
    // 计算总量用于百分比计算
    const totalQuantity = convertedMaterials.reduce((sum, item) => sum + Number(item.total_remaining_quantity), 0)
    
    // 转换为前端期望的格式，添加百分比计算和字段映射
    const formattedItems = convertedMaterials.map(item => ({
      name: item.purchase_name,
      value: Number(item.total_remaining_quantity),
      percentage: totalQuantity > 0 ? Number(((Number(item.total_remaining_quantity) / totalQuantity) * 100).toFixed(2)) : 0,
      count: Number(item.count)
    }))
    
    const responseData = {
      purchase_type: purchase_type || 'ALL',
      total_items: formattedItems.length,
      total_remaining_quantity: totalQuantity,
      items: formattedItems
    }
    
    console.log('📊 [原材料分布] 响应数据:', responseData)
    
    res.json({
      success: true,
      message: '获取原材料分布数据成功',
      data: responseData
    })
  } catch (error) {
    console.error('❌ [原材料分布] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('获取原材料分布数据失败', (error as Error).message)
    )
  }
  // 函数结束
  // 函数结束
}))

// 获取库存消耗分析
router.get('/consumption-analysis', authenticateToken, asyncHandler(async (req, res) => {
  const { time_range = 'all', limit = 10 } = req.query

  console.log('🔍 [库存消耗分析] 请求参数:', {
    time_range,
    limit,
    userRole: req.user?.role || "USER"
  })

  try {
    // 构建时间筛选条件
    let timeCondition = ''
    const now = new Date()
    
    switch (time_range) {
      case '7d':
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        timeCondition = `AND mu.created_at >= '${sevenDaysAgo.toISOString()}'`
        break
      case '30d':
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        timeCondition = `AND mu.created_at >= '${thirtyDaysAgo.toISOString()}'`
        break
      case '90d':
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        timeCondition = `AND mu.created_at >= '${ninetyDaysAgo.toISOString()}'`
        break
      case '6m':
        const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
        timeCondition = `AND mu.created_at >= '${sixMonthsAgo.toISOString()}'`
        break
      case '1y':
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        timeCondition = `AND mu.created_at >= '${oneYearAgo.toISOString()}'`
        break
      case 'all':
      default:
        timeCondition = ''
        break
    }

    // 查询库存消耗统计数据（修复：使用materials表作为主表）
    const consumptionQuery = `
      SELECT 
        m.id as material_id,
        m.material_name as material_name,
        m.material_type as material_type,
        m.bead_diameter as bead_diameter,
        CASE 
          WHEN m.material_type = 'ACCESSORIES' THEN m.accessory_specification
          WHEN m.material_type = 'FINISHED_MATERIAL' THEN m.finished_material_specification
          ELSE NULL
        END as specification,
        m.quality,
        s.name as supplier_name,
        SUM(
          CASE 
            WHEN m.material_type IN ('LOOSE_BEADS', 'BRACELET') THEN mu.quantity_used
            WHEN m.material_type IN ('ACCESSORIES', 'FINISHED_MATERIAL') THEN mu.quantity_used
            ELSE 0
          END
        ) as total_consumed,
        COUNT(mu.id) as consumption_count,
        AVG(
          CASE 
            WHEN m.material_type IN ('LOOSE_BEADS', 'BRACELET') THEN mu.quantity_used
            WHEN m.material_type IN ('ACCESSORIES', 'FINISHED_MATERIAL') THEN mu.quantity_used
            ELSE 0
          END
        ) as avg_consumption,
        MAX(mu.created_at) as last_consumption_date,
        MIN(mu.created_at) as first_consumption_date,
        CASE 
          WHEN m.material_type IN ('LOOSE_BEADS', 'BRACELET') THEN '颗'
          WHEN m.material_type IN ('ACCESSORIES', 'FINISHED_MATERIAL') THEN '件'
          ELSE '个'
        END as unit_type
      FROM material_usage mu
      INNER JOIN materials m ON mu.material_id = m.id
      LEFT JOIN purchases p ON m.purchase_id = p.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1 ${timeCondition}
        AND (
          (m.material_type IN ('LOOSE_BEADS', 'BRACELET') AND mu.quantity_used > 0) OR
          (m.material_type IN ('ACCESSORIES', 'FINISHED_MATERIAL') AND mu.quantity_used > 0)
        )
      GROUP BY m.id, m.material_name, m.material_type, m.bead_diameter, m.quality, s.name, 
               CASE 
                 WHEN m.material_type = 'ACCESSORIES' THEN m.accessory_specification
                 WHEN m.material_type = 'FINISHED_MATERIAL' THEN m.finished_material_specification
                 ELSE NULL
               END
      ORDER BY total_consumed DESC
      LIMIT ?
    `

    console.log('🔍 [库存消耗分析] 执行SQL查询:', consumptionQuery)
    const consumptionData = await prisma.$queryRawUnsafe(consumptionQuery, parseInt(String(limit))) as any[]
    
    console.log('📊 [库存消耗分析] 查询结果:', {
      length: consumptionData.length,
      sample: consumptionData.slice(0, 3)
    })

    // 转换BigInt字段
    const convertedData = consumptionData.map(item => {
      const converted = { ...item }
      Object.keys(converted).forEach(key => {
        if (typeof converted[key] === 'bigint') {
          converted[key] = Number(converted[key])
        }
      })
      return converted
    })

    // 计算总体统计
    const totalConsumption = convertedData.reduce((sum, item) => sum + Number(item.total_consumed), 0)
    const totalConsumptionCount = convertedData.reduce((sum, item) => sum + Number(item.consumption_count), 0)

    const responseData = {
      time_range,
      total_consumption: totalConsumption,
      total_consumption_count: totalConsumptionCount,
      top_consumed_products: convertedData,
      analysis_date: new Date().toISOString()
    }

    console.log('📊 [库存消耗分析] 响应数据:', responseData)

    // 权限过滤（雇员不能查看供应商和价格信息）
    if ((req.user?.role || "USER") === 'EMPLOYEE') {
      responseData.top_consumed_products = responseData.top_consumed_products.map(item => ({
        ...item,
        supplier_name: null
      }))
    }

    res.json({
      success: true,
      message: '获取库存消耗分析成功',
      data: responseData
    })
  } catch (error) {
    console.error('❌ [库存消耗分析] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('获取库存消耗分析失败', (error as Error).message)
    )
  }
  // 函数结束
  // 函数结束
}))

// 获取产品价格分布
router.get('/price-distribution', authenticateToken, asyncHandler(async (req, res) => {
  const { 
    material_type = 'LOOSE_BEADS', 
    price_type = 'unit_price', 
    limit = 10 
  } = req.query

  console.log('🔍 [产品价格分布] 请求参数:', {
    material_type,
    price_type,
    limit,
    userRole: req.user?.role || "USER"
  })

  try {
    // 构建产品类型筛选条件
    let productTypeCondition = ''
    if (material_type && material_type !== 'ALL') {
      productTypeCondition = `AND p.purchase_type = '${material_type}'`
    }

    // 根据价格类型选择不同的处理逻辑
    if (price_type === 'unit_price') {
      // 单价分布 - 返回价格区间统计（修复：使用materials表而不是purchases表）
      const priceRangeQuery = `
        SELECT 
           CASE 
             -- 成品类型使用专门的价格区间
             WHEN material_type = 'FINISHED_MATERIAL' AND calculated_price >= 0 AND calculated_price <= 50 THEN '0-50元（含）'
             WHEN material_type = 'FINISHED_MATERIAL' AND calculated_price > 50 AND calculated_price <= 100 THEN '50-100元（含）'
             WHEN material_type = 'FINISHED_MATERIAL' AND calculated_price > 100 AND calculated_price <= 200 THEN '100-200元（含）'
             WHEN material_type = 'FINISHED_MATERIAL' AND calculated_price > 200 AND calculated_price <= 500 THEN '200-500元（含）'
             WHEN material_type = 'FINISHED_MATERIAL' AND calculated_price > 500 THEN '500元以上'
             -- 其他产品类型使用原有价格区间
             WHEN material_type != 'FINISHED_MATERIAL' AND calculated_price >= 0 AND calculated_price <= 3 THEN '0-3元（含）'
             WHEN material_type != 'FINISHED_MATERIAL' AND calculated_price > 3 AND calculated_price <= 10 THEN '3-10元（含）'
             WHEN material_type != 'FINISHED_MATERIAL' AND calculated_price > 10 AND calculated_price <= 20 THEN '10-20元（含）'
             WHEN material_type != 'FINISHED_MATERIAL' AND calculated_price > 20 AND calculated_price <= 50 THEN '20-50元（含）'
             WHEN material_type != 'FINISHED_MATERIAL' AND calculated_price > 50 THEN '50元以上'
             ELSE '未知'
           END as price_range,
          SUM(remaining_quantity) as count
        FROM (
          SELECT 
            m.material_type,
            m.unit_cost as calculated_price,
            m.remaining_quantity
          FROM materials m
          WHERE m.remaining_quantity > 0
            AND m.unit_cost IS NOT NULL
            AND m.unit_cost > 0
            ${productTypeCondition.replace('p.purchase_type', 'm.material_type')}
        ) as price_data
        WHERE calculated_price IS NOT NULL
          AND remaining_quantity > 0
        GROUP BY price_range
        ORDER BY 
           CASE price_range
             -- 成品类型排序
             WHEN '0-50元（含）' THEN 1
             WHEN '50-100元（含）' THEN 2
             WHEN '100-200元（含）' THEN 3
             WHEN '200-500元（含）' THEN 4
             WHEN '500元以上' THEN 5
             -- 其他产品类型排序
             WHEN '0-3元（含）' THEN 6
             WHEN '3-10元（含）' THEN 7
             WHEN '10-20元（含）' THEN 8
             WHEN '20-50元（含）' THEN 9
             WHEN '50元以上' THEN 10
             ELSE 11
           END
      `
      
      const rangeData = await prisma.$queryRawUnsafe(priceRangeQuery) as any[]
      const total_count = rangeData.reduce((sum, item) => sum + Number(item.count), 0)
      
      const priceRanges = rangeData.map(item => ({
        name: item.price_range,
        value: Number(item.count),
        percentage: total_count > 0 ? (Number(item.count) / total_count * 100).toFixed(1) : '0'
      }))
      
      const responseData = {
        material_type,
        price_type,
        price_label: '单价区间分布',
        total_units: total_count, // 改为最小单位总数
        price_ranges: priceRanges,
        analysis_date: new Date().toISOString()
      }
      
      console.log('📊 [单价区间分布] 响应数据:', responseData)
      
      res.json({
        success: true,
        message: '获取单价区间分布成功',
        data: responseData
      })
      return
    }
    
    // 总价分布 - 返回总价最高的产品列表
    let priceField = 'p.total_price'
    let priceLabel = '总价'

    // 查询价格分布数据
     const priceQuery = `
       SELECT 
         p.id as purchase_id,
         p.purchase_name as purchase_name,
         p.purchase_type as purchase_type,
         p.bead_diameter as bead_diameter,
         p.specification,
         p.quality,
         p.quantity,
         p.piece_count as piece_count,
         p.total_beads as total_beads,
         p.unit_price as unit_price,
         p.total_price as total_price,
         p.price_per_bead as price_per_bead,
         p.price_per_piece as price_per_piece,
         p.price_per_gram as price_per_gram,
         p.weight,
         s.name as supplier_name,
         p.purchase_date as purchase_date,
         p.created_at as created_at,
         COALESCE(SUM(mu.quantity_used), 0) as used_beads,
         CASE 
           WHEN p.purchase_type = 'LOOSE_BEADS' THEN p.total_beads - COALESCE(SUM(mu.quantity_used), 0)
           WHEN p.purchase_type = 'BRACELET' THEN p.quantity - COALESCE(SUM(mu.quantity_used), 0)
           WHEN p.purchase_type IN ('ACCESSORIES', 'FINISHED_MATERIAL') THEN p.piece_count - COALESCE(SUM(mu.quantity_used), 0)
           ELSE 0
         END as remaining_quantity,
         ${priceField} as calculated_price
       FROM purchases p
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       LEFT JOIN material_usage mu ON p.id = mu.purchase_id
       WHERE p.status IN ('ACTIVE', 'USED') 
         AND p.total_price IS NOT NULL 
         AND p.total_price > 0
         AND (
           (p.purchase_type IN ('LOOSE_BEADS', 'BRACELET') AND (p.total_beads IS NOT NULL AND p.total_beads > 0 OR p.piece_count IS NOT NULL AND p.piece_count > 0)) OR
           (p.purchase_type = 'ACCESSORIES' AND p.piece_count IS NOT NULL AND p.piece_count > 0) OR
           (p.purchase_type = 'FINISHED_MATERIAL' AND p.piece_count IS NOT NULL AND p.piece_count > 0)
         )
         ${productTypeCondition}
       GROUP BY p.id, p.purchase_name, p.purchase_type, p.bead_diameter, p.specification, 
                p.quality, p.quantity, p.piece_count, p.total_beads, p.unit_price, 
                p.total_price, p.price_per_bead, p.price_per_piece, p.price_per_gram, p.weight, 
                s.name, p.purchase_date, p.created_at
       HAVING remaining_quantity > 0
       ORDER BY calculated_price DESC
       LIMIT ?
     `

    console.log('🔍 [产品价格分布] 执行SQL查询:', priceQuery)
    const priceData = await prisma.$queryRawUnsafe(priceQuery, parseInt(String(limit))) as any[]
    
    console.log('📊 [产品价格分布] 查询结果:', {
      length: priceData.length,
      sample: priceData.slice(0, 3)
    })

    // 转换BigInt字段
    const convertedData = priceData.map(item => {
      const converted = { ...item }
      Object.keys(converted).forEach(key => {
        if (typeof converted[key] === 'bigint') {
          converted[key] = Number(converted[key])
        }
        // 转换Decimal字段为数字
        if (converted[key] && typeof converted[key] === 'object' && converted[key].constructor.name === 'Decimal') {
          converted[key] = parseFloat(converted[key].toString())
        }
      })
      return converted
    })

    // 计算统计信息
     const totalProducts = convertedData.length
     const avgPrice = totalProducts > 0 ? 
       convertedData.reduce((sum, item) => sum + (item.calculated_price || 0), 0) / totalProducts : 0
     const maxPrice = totalProducts > 0 ? 
       Math.max(...convertedData.map(item => item.calculated_price || 0)) : 0
     const minPrice = totalProducts > 0 ? 
       Math.min(...convertedData.map(item => item.calculated_price || 0)) : 0

    const responseData = {
      material_type,
      price_type,
      price_label: priceLabel,
      total_products: totalProducts,
      avg_price: avgPrice,
      max_price: maxPrice,
      min_price: minPrice,
      top_price_products: convertedData,
      analysis_date: new Date().toISOString()
    }

    console.log('📊 [产品价格分布] 响应数据:', responseData)

    // 权限过滤（雇员不能查看供应商和价格信息）
    if ((req.user?.role || "USER") === 'EMPLOYEE') {
      responseData.top_price_products = responseData.top_price_products.map(item => ({
        ...item,
        supplier_name: null,
        unit_price: null,
        total_price: null,
        price_per_bead: null,
        price_per_gram: null
      }))
      responseData.avg_price = 0
      responseData.max_price = 0
      responseData.min_price = 0
    }

    res.json({
      success: true,
      message: '获取产品价格分布成功',
      data: responseData
    })
  } catch (error) {
    console.error('❌ [产品价格分布] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('获取产品价格分布失败', (error as Error).message)
    )
  }
  // 函数结束
  // 函数结束
}))

// 获取库存详情
router.get('/:purchase_id', authenticateToken, asyncHandler(async (req, res) => {
  const { purchase_id } = req.params

  try {
    const detailQuery = `
      SELECT 
        p.id as purchase_id,
        p.purchase_name as purchase_name,
        CONCAT(p.purchase_name, ' ', p.bead_diameter, 'mm ', COALESCE(p.quality, ''), '级') as bead_type,
        p.bead_diameter as bead_diameter,
        p.quality,
        p.min_stock_alert as min_stock_alert,
        p.total_beads as original_beads,
        COALESCE(SUM(mu.quantity_used), 0) as used_beads,
        (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) as remaining_beads,
        CASE 
          WHEN p.min_stock_alert IS NOT NULL AND 
               (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) <= p.min_stock_alert 
          THEN 1 
          ELSE 0 
        END as is_low_stock,
        p.price_per_bead as price_per_bead,
        p.price_per_gram as price_per_gram,
        p.total_price as total_price,
        p.weight,
        s.name as supplier_name,
        s.contact as supplier_contact,
        s.phone as supplier_phone,
        p.purchase_date as purchase_date,
        p.photos,
        p.notes,
        p.created_at as created_at,
        p.updated_at as updated_at
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
      GROUP BY p.id, p.purchase_name, p.bead_diameter, p.quality, p.min_stock_alert, 
               p.total_beads, p.price_per_bead, p.price_per_gram, p.total_price, p.weight,
               s.name, s.contact, s.phone, p.purchase_date, p.photos, p.notes, 
               p.created_at, p.updated_at
    `

    const result = await prisma.$queryRawUnsafe(detailQuery, purchase_id) as any[]

    if (result.length === 0) {
      res.status(404).json({
        success: false,
        message: '库存记录不存在'
      })
      return
    }

    // 权限过滤
    const filteredResult = filterInventoryData(result, req.user?.role || "USER")

    res.json({
      success: true,
      message: '获取库存详情成功',
      data: filteredResult[0]
    })
  } catch (error) {
    console.error('获取库存详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取库存详情失败'
    })
  }
  // 函数结束
  // 函数结束
}))

// 获取低库存预警
router.get('/alerts/low-stock', authenticateToken, asyncHandler(async (_req, res) => {
  try {
    const alertQuery = `
      SELECT 
        p.id as purchase_id,
        p.purchase_name as purchase_name,
        CONCAT(p.purchase_name, ' ', p.bead_diameter, 'mm ', COALESCE(p.quality, ''), '级') as bead_type,
        p.bead_diameter as bead_diameter,
        p.quality,
        p.min_stock_alert as min_stock_alert,
        (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) as remaining_beads,
        p.purchase_date as purchase_date
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id
      WHERE p.bead_diameter IS NOT NULL 
        AND p.min_stock_alert IS NOT NULL
      GROUP BY p.id, p.purchase_name, p.bead_diameter, p.quality, p.min_stock_alert, 
               p.total_beads, p.purchase_date
      HAVING remaining_beads <= p.min_stock_alert
      ORDER BY remaining_beads ASC
    `

    const alerts = await prisma.$queryRawUnsafe(alertQuery) as any[]

    // 转换BigInt字段
    const convertedAlerts = alerts.map(item => {
      const converted = { ...item }
      Object.keys(converted).forEach(key => {
        if (typeof converted[key] === 'bigint') {
          converted[key] = Number(converted[key])
        }
      })
      return converted
    })

    res.json({
      success: true,
      message: '获取低库存预警成功',
      data: {
        items: convertedAlerts,
        total: convertedAlerts.length
      }
    })
  } catch (error) {
    console.error('获取低库存预警失败:', error)
    res.status(500).json({
      success: false,
      message: '获取低库存预警失败'
    })
  }
  // 函数结束
  // 函数结束
}))



// 导出库存数据
router.get('/export/excel', authenticateToken, asyncHandler(async (req, res) => {
  try {
    let exportQuery = `
      SELECT 
        p.purchase_name as '产品名称',
        CONCAT(p.bead_diameter, 'mm') as '珠子直径',
        p.quality as '品相等级',
        p.total_beads as '采购总颗数',
        COALESCE(SUM(mu.quantity_used), 0) as '已使用颗数',
        (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) as '剩余颗数',
        CASE 
          WHEN p.min_stock_alert IS NOT NULL AND 
               (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) <= p.min_stock_alert 
          THEN '是' 
          ELSE '否' 
        END as '低库存预警'`
    
    if ((req.user?.role || "USER") === 'BOSS') {
      exportQuery += `,
        s.name as '供应商',
        p.price_per_gram as '克价',
        p.price_per_bead as '每颗单价'`
    }
    
    exportQuery += `,
        DATE_FORMAT(p.purchase_date, '%Y-%m-%d') as '采购日期'
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id`
    
    if ((req.user?.role || "USER") === 'BOSS') {
      exportQuery += `
      LEFT JOIN suppliers s ON p.supplier_id = s.id`
    }
    
    exportQuery += `
      WHERE p.bead_diameter IS NOT NULL
      GROUP BY p.id, p.purchase_name, p.bead_diameter, p.quality, p.min_stock_alert, 
               p.total_beads, p.price_per_gram, p.price_per_bead, p.purchase_date`
    
    if ((req.user?.role || "USER") === 'BOSS') {
      exportQuery += `, s.name`
    }
    
    exportQuery += `
      ORDER BY p.purchase_date DESC`

    const exportData = await prisma.$queryRawUnsafe(exportQuery) as any[]

    // 转换BigInt字段
    const convertedExportData = exportData.map(item => {
      const converted = { ...item }
      Object.keys(converted).forEach(key => {
        if (typeof converted[key] === 'bigint') {
          converted[key] = Number(converted[key])
        }
      })
      return converted
    })

    res.json({
      success: true,
      message: '导出数据获取成功',
      data: {
        items: convertedExportData,
        total: convertedExportData.length,
        filename: `库存数据_${new Date().toISOString().split('T')[0]}.xlsx`
      }
    })
  } catch (error) {
    console.error('导出库存数据失败:', error)
    res.status(500).json({
      success: false,
      message: '导出数据失败'
    })
  }
  // 函数结束
  // 函数结束
}))



export default router