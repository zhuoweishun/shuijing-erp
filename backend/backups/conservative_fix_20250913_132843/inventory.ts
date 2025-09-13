import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { qualitySchema, productTypeSchema } from '../utils/validation'
// 移除fieldConverter导入，直接使用snake_case
import { ErrorResponses } from '../utils/errorResponse.js'

const router = Router()

// 库存查询参数验证schema
const inventoryQuerySchema = z.object({
  page: z.string().regex(/^\d+$/, '页码必须是数字').transform(Number).refine(n => n >= 1, '页码必须大于0').optional(),
  limit: z.string().regex(/^\d+$/, '每页数量必须是数字').transform(Number).refine(n => n >= 1 && n <= 100, '每页数量必须在1-100之间').optional(),
  search: z.string().max(100, '搜索关键词不能超过100字符').optional(),
  product_types: z.union([
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
  sort_by: z.enum(['total_quantity', 'product_type', 'crystal_type']).optional()
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
const exportQuerySchema = z.object({
  format: z.enum(['xlsx', 'csv']).optional(),
  product_types: z.union([
    z.string().transform(s => [s]),
    z.array(z.string())
  ]).optional(),
  quality: qualitySchema.optional(),
  low_stock_only: z.string().transform(s => s === 'true').optional()
})

// 添加调试端点
router.get('/debug', authenticateToken, asyncHandler(async (_, res) => {
  try {
    // 查询采购数据总数
    const totalPurchases = await prisma.purchase.count()
    
    // 查询前5条采购记录
    const samplePurchases = await prisma.purchase.findMany({
      take: 5,
      select: {
        id: true,
        product_name: true,
        product_type: true,
        quantity: true,
        piece_count: true,
        bead_diameter: true,
        specification: true,
        quality: true,
        created_at: true
      }
    })
    
    // 查询MaterialUsage数据
    const totalMaterialUsage = await prisma.materialUsage.count()
    
    res.json({
      success: true,
      data: {
        totalPurchases,
        totalMaterialUsage,
        samplePurchases,
        message: '数据库调试信息'
      }
    })
  } catch (error) {
    console.error('❌ [库存调试] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('查询失败', (error as Error).message)
    )
  }
  // 函数结束
  // 函数结束
}))

// 产品分类解析函数
const parseProductClassification = (productName: string) => {
  // 一级分类：水晶类型
  const crystalTypes = {
    '黄水晶': ['黄水晶', '巴西黄水晶'],
    '紫水晶': ['紫水晶', '玻利维亚紫'],
    '白水晶': ['白水晶'],
    '粉水晶': ['粉水晶', '西柚粉晶'],
    '茶晶': ['茶晶'],
    '绿幽灵': ['绿幽灵', '雪花白幽灵'],
    '草莓晶': ['草莓晶', '鸽血红草莓晶'],
    '发晶': ['银发晶', '白发晶'],
    '青金石': ['青金石'],
    '蓝晶': ['蓝晶', '猫眼蓝晶'],
    '萤石': ['绿萤石', '紫萤石', '蓝萤石', '黄萤石'],
    '月光石': ['灰月光', '奶茶月光'],
    '紫龙晶': ['紫龙晶'],
    '胶花': ['黄胶花', '胶花', '油画胶花'],
    '兔毛': ['彩兔毛'],
    '黑金超七': ['黑金超', '黑金超七'],
    '闪灵': ['黑闪灵'],
    '虎眼石': ['蓝虎眼', '红色虎纹石'],
    '玛瑙': ['红玛瑙', '茶龙纹玛瑙', '红龙纹玛瑙', '茶色龙纹玛瑙'],
    '南红': ['南红', '天然冰飘南红'],
    '绿松石': ['绿松石', '天然绿松石'],
    '银曜石': ['银曜石', '银耀石', '天然银曜石', '天然银耀石'],
    '岫玉': ['岫玉'],
    '绿银石': ['绿银石'],
    '蓝纹石': ['蓝纹石'],
    '白阿塞': ['白阿塞'],
    '配饰': ['隔珠', '隔片', 'DIY饰品', '跑环']
  }
  
  // 二级分类：形状类型
  const shapeTypes = {
    '圆珠': ['手串', '圆珠'],
    '随形': ['随形'],
    '散珠': ['散珠', '珠子'],
    '方糖': ['方糖'],
    '长串': ['长串'],
    '配饰': ['隔珠', '隔片', 'DIY饰品', '跑环']
  }
  
  let crystalType = '其他'
  let shapeType = '圆珠' // 默认为圆珠
  
  // 识别水晶类型
  for (const [type, keywords] of Object.entries(crystalTypes)) {
    if (keywords.some(keyword => productName.includes(keyword))) {
      crystalType = type
      break
    }
  }
  
  // 识别形状类型
  for (const [shape, keywords] of Object.entries(shapeTypes)) {
    if (keywords.some(keyword => productName.includes(keyword))) {
      shapeType = shape
      break
    }
  }
  
  // 特殊处理：如果包含"随形"则优先设为随形
  if (productName.includes('随形')) {
    shapeType = '随形'
  }
  
  // 特殊处理：配饰类产品
  if (crystalType === '配饰') {
    shapeType = '配饰'
  }
  
  return {
    crystalType,
    shapeType
  }
}

// router和prisma已在文件开头声明

// 移除fieldConverter导入，直接使用snake_case

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
router.get('/hierarchical', authenticateToken, asyncHandler(async (_, res) => {
  // 验证查询参数
  const validatedQuery = inventoryQuerySchema.parse(req.query)
  const {
    page = 1,
    limit = 20,
    search,
    product_types,
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

  console.log('🔍 [层级式库存查询] 请求参数:', {
    page: pageNum,
    limit: limitNum,
    search,
    product_types,
    quality,
    low_stock_only
  })

  try {
    // 查询所有库存数据
    const inventoryQuery = `
      SELECT 
        p.id as purchase_id,
        p.purchaseCode as purchase_code,
        p.productName as product_name,
        p.productType as product_type,
        p.unitType as unit_type,
        p.beadDiameter as bead_diameter,
        p.specification,
        p.quality,
        p.photos,
        CASE 
          WHEN p.productType = 'LOOSE_BEADS' THEN COALESCE(p.pieceCount, 0)
          WHEN p.productType = 'BRACELET' THEN COALESCE(p.totalBeads, p.pieceCount, 0)
          WHEN p.productType = 'ACCESSORIES' THEN COALESCE(p.pieceCount, 0)
          WHEN p.productType = 'FINISHED' THEN COALESCE(p.pieceCount, 0)
          ELSE COALESCE(p.quantity, 0)
        END as original_quantity,
        COALESCE(mu.used_quantity, 0) as used_quantity,
        (CASE 
          WHEN p.productType = 'LOOSE_BEADS' THEN COALESCE(p.pieceCount, 0)
          WHEN p.productType = 'BRACELET' THEN COALESCE(p.totalBeads, p.pieceCount, 0)
          WHEN p.productType = 'ACCESSORIES' THEN COALESCE(p.pieceCount, 0)
          WHEN p.productType = 'FINISHED' THEN COALESCE(p.pieceCount, 0)
          ELSE COALESCE(p.quantity, 0)
        END - COALESCE(mu.used_quantity, 0)) as remaining_quantity,
        CASE WHEN p.minStockAlert IS NOT NULL AND 
                 (CASE 
                   WHEN p.productType = 'LOOSE_BEADS' THEN COALESCE(p.pieceCount, 0)
                   WHEN p.productType = 'BRACELET' THEN COALESCE(p.totalBeads, p.pieceCount, 0)
                   WHEN p.productType = 'ACCESSORIES' THEN COALESCE(p.pieceCount, 0)
                   WHEN p.productType = 'FINISHED' THEN COALESCE(p.pieceCount, 0)
                   ELSE COALESCE(p.quantity, 0)
                 END - COALESCE(mu.used_quantity, 0)) <= p.minStockAlert 
            THEN 1 ELSE 0 END as is_low_stock,
        CASE 
          WHEN p.productType = 'LOOSE_BEADS' THEN p.pricePerBead
          WHEN p.productType = 'BRACELET' THEN 
            CASE 
              WHEN p.pricePerBead IS NOT NULL THEN p.pricePerBead
              WHEN p.totalPrice IS NOT NULL AND p.totalBeads IS NOT NULL AND p.totalBeads > 0 
                THEN p.totalPrice / p.totalBeads
              ELSE NULL
            END
          WHEN p.productType = 'ACCESSORIES' THEN 
            CASE 
              WHEN p.unitPrice IS NOT NULL THEN p.unitPrice
              WHEN p.totalPrice IS NOT NULL AND p.pieceCount IS NOT NULL AND p.pieceCount > 0 
                THEN p.totalPrice / p.pieceCount
              ELSE NULL
            END
          WHEN p.productType = 'FINISHED' THEN 
            CASE 
              WHEN p.unitPrice IS NOT NULL THEN p.unitPrice
              WHEN p.totalPrice IS NOT NULL AND p.pieceCount IS NOT NULL AND p.pieceCount > 0 
                THEN p.totalPrice / p.pieceCount
              ELSE NULL
            END
          ELSE p.pricePerBead
        END as price_per_unit,
        p.pricePerGram as price_per_gram,
        p.purchaseDate as purchase_date,
        s.name as supplier_name
      FROM purchases p
      LEFT JOIN (
        SELECT purchaseId, SUM(quantityUsedPieces) as used_quantity
        FROM material_usage
        GROUP BY purchaseId
      ) mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplierId = s.id
      WHERE 1=1
      ORDER BY p.productType, p.productName, 
               COALESCE(p.beadDiameter, p.specification), p.quality, p.purchaseDate
    `
    
    const allInventory = await prisma.$queryRawUnsafe(inventoryQuery) as any[]
    
    console.log('📊 [层级式库存查询] 原始查询结果:', {
      inventoryLength: allInventory.length,
      firstItem: allInventory[0]
    })
    
    // 构建层级结构
    const hierarchicalData = new Map()
    
    allInventory.forEach((item: any) => {
      const productType = item.product_type
      const diameter = item.bead_diameter ? Number(item.bead_diameter) : null
      = item.specification ? Number(item.specification) : null
      const quality = item.quality || '未分级'
      
      // 应用筛选条件
      if (search && !item.product_name.toLowerCase().includes(search.toLowerCase())) return
      
      // 产品类型筛选（多选）
      if (product_types) {
        const productTypesArray = Array.isArray(product_types) ? product_types : [product_types]
        if (!productTypesArray.includes(productType)) return
      }
      
      if (quality && item.quality !== quality) return
      if (low_stock_only === 'true' && Number(item.is_low_stock) !== 1) return
      
      // 珠子直径范围筛选（散珠和手串）
      if (diameter && diameter_min && diameter < Number(diameter_min)) return
      if (diameter && diameter_max && diameter > Number(diameter_max)) return
      
      // 规格范围筛选（饰品配件和成品）
      if (specification_min && specification_min && specification < Number(specification_min)) return
      if (specification_min && specification_max && specification > Number(specification_max)) return
      
      // 构建层级键
      const specValue = diameter || specification || 0
      const specUnit = diameter ? 'mm' : 'mm'
      const level1Key = productType
      const level2Key = `${productType}|${specValue}${specUnit}`
      const level3Key = `${productType}|${specValue}${specUnit}|${quality}`
      
      // 初始化层级结构
      if (!hierarchicalData.has(level1Key)) {
        hierarchicalData.set(level1Key, {
          product_type: productType,
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
      const isLowStock = Number(item.is_low_stock) === 1
      
      level3.remaining_quantity += remainingQuantity
      level3.is_low_stock = level3.is_low_stock || isLowStock
      
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
        purchase_id: item.purchase_id,
        purchase_code: item.purchase_code,
        product_name: item.product_name,
        product_type: item.product_type,
        purchase_date: item.purchase_date,
        supplier_name: item.supplier_name,
        original_quantity: originalQuantity,
        used_quantity: Number(item.used_quantity),
        remaining_quantity: remainingQuantity,
        bead_diameter: item.bead_diameter ? Number(item.bead_diameter) : null,
        specification: item.specification ? Number(item.specification) : null,
        price_per_unit: req.user?.role === 'BOSS' ? Number(item.price_per_unit) : null,
        price_per_gram: req.user?.role === 'BOSS' ? Number(item.price_per_gram) : null,
        photos: photos
      })
      
      // 向上累加统计
      level2.total_quantity += remainingQuantity
      level2.has_low_stock = level2.has_low_stock || isLowStock
      
      level1.total_quantity += remainingQuantity
      level1.has_low_stock = level1.has_low_stock || isLowStock
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
            price_per_unit: req.user?.role === 'BOSS' && totalWeightForUnit > 0 
              ? Math.round((totalWeightedPriceUnit / totalWeightForUnit) * 100) / 100 
              : null,
            price_per_gram: req.user?.role === 'BOSS' && totalWeightForGram > 0 
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
        product_type: level1.product_type,
        total_quantity: level1.total_quantity,
        total_variants: level1.total_variants,
        has_low_stock: level1.has_low_stock,
        specifications: specificationsArray
      }
    })
    
    // 排序
    const sortField = sort_by === 'product_type' ? 'product_type' : 'total_quantity'
    processedData.sort((a, b) => {
      if (sortField === 'product_type') {
        return sort === 'asc' ? a.product_type.localeCompare(b.product_type) : b.product_type.localeCompare(a.product_type)
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
    
    res.json({
      success: true,
      message: '获取层级式库存列表成功',
      data: {
        hierarchy: paginatedData,
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
    res.status(500).json({
      success: false,
      message: '获取层级式库存列表失败',
      error: (error as Error).message
    })
  }
  // 函数结束
  // 函数结束
}))

// 获取分组库存列表（按产品名称分组）
router.get('/grouped', authenticateToken, asyncHandler(async (_, res) => {
  // 验证查询参数
  const validatedQuery = inventoryQuerySchema.parse(req.query)
  const {
    page = 1,
    limit = 10,
    search,
    quality,
    low_stock_only,
    sort = 'desc',
    sort_by = 'product_name'
  } = validatedQuery

  const pageNum = parseInt(String(page))
  const limitNum = Math.min(parseInt(String(limit)), 100)
  const offset = (pageNum - 1) * limitNum

  // 构建查询条件
  let whereClause = 'WHERE 1=1'
  const params: any[] = []

  if (search) {
    whereClause += ' AND p.productName LIKE ?'
    params.push(`%${search}%`)
  }

  if (quality) {
    whereClause += ' AND p.quality = ?'
    params.push(quality)
  }

  if (low_stock_only === 'true') {
    whereClause += ' AND (CASE WHEN p.productType = "LOOSE_BEADS" THEN COALESCE(p.pieceCount, 0) WHEN p.productType = "BRACELET" THEN COALESCE(p.quantity, 0) WHEN p.productType = "ACCESSORIES" THEN COALESCE(p.pieceCount, 0) WHEN p.productType = "FINISHED" THEN COALESCE(p.pieceCount, 0) ELSE COALESCE(p.quantity, 0) END - COALESCE(mu.used_beads, 0)) <= p.minStockAlert'
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
        p.productName as product_name,
        COUNT(DISTINCT CONCAT(
          COALESCE(p.beadDiameter, p.specification, 0), 
          '-', 
          COALESCE(p.quality, '')
        )) as variant_count,
        SUM(
          CASE 
            WHEN p.productType = 'LOOSE_BEADS' THEN COALESCE(p.pieceCount, 0)
            WHEN p.productType = 'BRACELET' THEN COALESCE(p.quantity, 0)
            WHEN p.productType = 'ACCESSORIES' THEN COALESCE(p.pieceCount, 0)
            WHEN p.productType = 'FINISHED' THEN COALESCE(p.pieceCount, 0)
            ELSE COALESCE(p.quantity, 0)
          END - COALESCE(mu.used_beads, 0)
        ) as total_remaining_beads,
        MAX(CASE WHEN p.minStockAlert IS NOT NULL AND 
                     (CASE 
                       WHEN p.productType = 'LOOSE_BEADS' THEN COALESCE(p.pieceCount, 0)
                       WHEN p.productType = 'BRACELET' THEN COALESCE(p.quantity, 0)
                       WHEN p.productType = 'ACCESSORIES' THEN COALESCE(p.pieceCount, 0)
                       WHEN p.productType = 'FINISHED' THEN COALESCE(p.pieceCount, 0)
                       ELSE COALESCE(p.quantity, 0)
                     END - COALESCE(mu.used_beads, 0)) <= p.minStockAlert 
                THEN 1 ELSE 0 END) as has_low_stock
      FROM purchases p
      LEFT JOIN (
        SELECT purchaseId, SUM(quantityUsedBeads) as used_beads
        FROM material_usage
        GROUP BY purchaseId
      ) mu ON p.id = mu.purchase_id
      ${whereClause}
      GROUP BY p.productName
      ORDER BY ${sort_by === 'product_name' ? 'p.productName' : 'total_remaining_beads'} ${sort === 'asc' ? 'ASC' : 'DESC'}
      LIMIT ? OFFSET ?
    `

    // 计算总数
    const countQuery = `
      SELECT COUNT(DISTINCT p.productName) as total
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
            p.beadDiameter as bead_diameter,
            p.specification,
            p.quality,
            CASE 
              WHEN p.productType = 'LOOSE_BEADS' THEN COALESCE(p.pieceCount, 0)
              WHEN p.productType = 'BRACELET' THEN COALESCE(p.quantity, 0)
              WHEN p.productType = 'ACCESSORIES' THEN COALESCE(p.pieceCount, 0)
              WHEN p.productType = 'FINISHED' THEN COALESCE(p.pieceCount, 0)
              ELSE COALESCE(p.quantity, 0)
            END as original_beads,
            COALESCE(mu.used_beads, 0) as used_beads,
            (CASE 
              WHEN p.productType = 'LOOSE_BEADS' THEN COALESCE(p.pieceCount, 0)
              WHEN p.productType = 'BRACELET' THEN COALESCE(p.quantity, 0)
              WHEN p.productType = 'ACCESSORIES' THEN COALESCE(p.pieceCount, 0)
              WHEN p.productType = 'FINISHED' THEN COALESCE(p.pieceCount, 0)
              ELSE COALESCE(p.quantity, 0)
            END - COALESCE(mu.used_beads, 0)) as remaining_beads,
            CASE WHEN p.minStockAlert IS NOT NULL AND 
                     (CASE 
                       WHEN p.productType = 'LOOSE_BEADS' THEN COALESCE(p.pieceCount, 0)
                       WHEN p.productType = 'BRACELET' THEN COALESCE(p.quantity, 0)
                       WHEN p.productType = 'ACCESSORIES' THEN COALESCE(p.pieceCount, 0)
                       WHEN p.productType = 'FINISHED' THEN COALESCE(p.pieceCount, 0)
                       ELSE COALESCE(p.quantity, 0)
                     END - COALESCE(mu.used_beads, 0)) <= p.minStockAlert 
                THEN 1 ELSE 0 END as is_low_stock,
            p.pricePerBead as price_per_bead,
            p.pricePerGram as price_per_gram,
            p.purchaseDate as purchase_date,
            s.name as supplier_name
          FROM purchases p
          LEFT JOIN (
            SELECT purchaseId, SUM(quantityUsedBeads) as used_beads
            FROM material_usage
            GROUP BY purchaseId
          ) mu ON p.id = mu.purchase_id
          LEFT JOIN suppliers s ON p.supplierId = s.id
          WHERE p.beadDiameter IS NOT NULL AND p.productName = ?
          ORDER BY p.beadDiameter, p.quality, p.purchaseDate
        `
        
        const purchases = await prisma.$queryRawUnsafe(purchaseQuery, group.product_name) as any[]
        console.log(`🔍 [采购记录查询] 产品"${group.product_name}"的采购记录:`, purchases)
        
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
            price_per_bead: req.user?.role === 'BOSS' ? Number(purchase.price_per_bead) : null,
            price_per_gram: req.user?.role === 'BOSS' ? Number(purchase.price_per_gram) : null
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
            price_per_bead: req.user?.role === 'BOSS' && totalWeightForBead > 0 
              ? Math.round((totalWeightedPriceBead / totalWeightForBead) * 100) / 100 
              : null,
            price_per_gram: req.user?.role === 'BOSS' && totalWeightForGram > 0 
              ? Math.round((totalWeightedPriceGram / totalWeightForGram) * 100) / 100 
              : null,
            batch_count: variant.batches.length,
            batches: variant.batches
          }
        })
        
        console.log(`✅ [变体合并] 产品"${group.product_name}"合并后的变体:`, {
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
          product_name: group.product_name,
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
router.get('/', authenticateToken, asyncHandler(async (_, res) => {
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
  let whereClause = 'WHERE p.beadDiameter IS NOT NULL'
  const params: any[] = []

  if (search) {
    whereClause += ' AND p.productName LIKE ?'
    params.push(`%${search}%`)
  }

  if (quality) {
    whereClause += ' AND p.quality = ?'
    params.push(quality)
  }

  if (low_stock_only === 'true') {
    whereClause += ' AND (p.totalBeads - COALESCE(SUM(mu.quantity_used), 0)) <= p.minStockAlert'
  }

  if (min_stock) {
    whereClause += ' AND (p.totalBeads - COALESCE(SUM(mu.quantity_used), 0)) >= ?'
    params.push(parseInt(String(min_stock)))
  }

  if (max_stock) {
    whereClause += ' AND (p.totalBeads - COALESCE(SUM(mu.quantity_used), 0)) <= ?'
    params.push(parseInt(String(max_stock)))
  }

  // 排序
  const validSortFields = ['purchase_date', 'created_at', 'remaining_beads', 'product_name']
  const sortField = validSortFields.includes(sort_by as string) ? sort_by : 'purchase_date'
  const sortDirection = sort === 'asc' ? 'ASC' : 'DESC'

  try {
    // 查询库存数据
    const inventoryQuery = `
      SELECT 
        p.id as purchase_id,
        p.productName as product_name,
        CONCAT(p.productName, ' ', p.beadDiameter, 'mm ', COALESCE(p.quality, ''), '级') as bead_type,
        p.beadDiameter as bead_diameter,
        p.quality,
        p.minStockAlert as min_stock_alert,
        p.totalBeads as original_beads,
        COALESCE(SUM(mu.quantity_used), 0) as used_beads,
        (p.totalBeads - COALESCE(SUM(mu.quantity_used), 0)) as remaining_beads,
        CASE 
          WHEN p.minStockAlert IS NOT NULL AND 
               (p.totalBeads - COALESCE(SUM(mu.quantity_used), 0)) <= p.minStockAlert 
          THEN 1 
          ELSE 0 
        END as is_low_stock,
        p.pricePerBead as price_per_bead,
        p.pricePerGram as price_per_gram,
        s.name as supplier_name,
        p.purchaseDate as purchase_date,
        p.photos,
        p.notes,
        p.created_at as created_at,
        p.updated_at as updated_at
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplierId = s.id
      ${whereClause}
      GROUP BY p.id, p.productName, p.beadDiameter, p.quality, p.minStockAlert, 
               p.totalBeads, p.pricePerBead, p.pricePerGram, s.name, 
               p.purchaseDate, p.photos, p.notes, p.created_at, p.updated_at
      ORDER BY ${sortField} ${sortDirection}
      LIMIT ? OFFSET ?
    `

    // 计算总数
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplierId = s.id
      ${whereClause}
    `

    const [inventoryResult, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(inventoryQuery, ...params, limitNum, offset),
      prisma.$queryRawUnsafe(countQuery, ...params)
    ])

    const inventory = inventoryResult as any[]
    const total = (countResult as any[])[0].total

    // 权限过滤
    const filteredInventory = filterInventoryData(inventory, req.user?.role)

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
router.get('/search', authenticateToken, asyncHandler(async (_, res) => {
  const { q: query, limit = 20 } = req.query

  if (!query) {
    return res.status(400).json({
      success: false,
      message: '搜索关键词不能为空'
    })
  }

  const limitNum = Math.min(parseInt(String(limit)), 50)

  try {
    const searchQuery = `
      SELECT 
        p.id as purchase_id,
        p.productName as product_name,
        CONCAT(p.productName, ' ', p.beadDiameter, 'mm ', COALESCE(p.quality, ''), '级') as bead_type,
        p.beadDiameter as bead_diameter,
        p.quality,
        (p.totalBeads - COALESCE(SUM(mu.quantity_used), 0)) as remaining_beads,
        CASE 
          WHEN p.minStockAlert IS NOT NULL AND 
               (p.totalBeads - COALESCE(SUM(mu.quantity_used), 0)) <= p.minStockAlert 
          THEN 1 
          ELSE 0 
        END as is_low_stock,
        p.pricePerBead as price_per_bead,
        s.name as supplier_name,
        p.purchaseDate as purchase_date
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplierId = s.id
      WHERE p.beadDiameter IS NOT NULL 
        AND (p.productName LIKE ? OR s.name LIKE ?)
      GROUP BY p.id, p.productName, p.beadDiameter, p.quality, p.minStockAlert, 
               p.totalBeads, p.pricePerBead, s.name, p.purchaseDate
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
    const filteredResults = filterInventoryData(results, req.user?.role)

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
  sort_by: z.enum(['purchase_date', 'product_name', 'specification', 'remaining_quantity']).optional()
}).refine((data) => {
  if (data.specification_min && data.specification_max && data.specification_min > data.specification_max) {
    throw new Error('最小规格不能大于最大规格')
  }
  return true
})

// 获取成品卡片数据（专用于成品展示）
router.get('/finished-products-cards', authenticateToken, asyncHandler(async (_, res) => {
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
    let whereConditions = ['p.productType = "FINISHED"']
    let queryParams: any[] = []

    // 搜索条件
    if (search) {
      whereConditions.push('(p.productName LIKE ? OR s.name LIKE ?)')
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern)
    }

    // 品相筛选
    if (quality && quality !== '') {
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
    let orderBy = 'p.purchaseDate DESC'
    if (sort_by === 'product_name') {
      orderBy = `p.productName ${sort === 'asc' ? 'ASC' : 'DESC'}`
    } else if (sort_by === 'specification') {
      orderBy = `p.specification ${sort === 'asc' ? 'ASC' : 'DESC'}`
    } else if (sort_by === 'remaining_quantity') {
      orderBy = `remaining_quantity ${sort === 'asc' ? 'ASC' : 'DESC'}`
    }

    // 主查询SQL
    const finishedProductsQuery = `
      SELECT 
        p.id as purchase_id,
        p.purchaseCode as purchase_code,
        p.productName as product_name,
        p.specification,
        p.pieceCount as piece_count,
        p.quality,
        p.photos,
        CASE 
          WHEN ${req.user?.role === 'BOSS' ? 'TRUE' : 'FALSE'} THEN 
            CASE 
              WHEN p.productType = 'FINISHED' AND p.pieceCount > 0 AND p.totalPrice IS NOT NULL 
              THEN ROUND(p.totalPrice / p.pieceCount, 2)
              ELSE p.unitPrice
            END
          ELSE NULL
        END as price_per_unit,
        CASE 
          WHEN ${req.user?.role === 'BOSS' ? 'TRUE' : 'FALSE'} THEN p.totalPrice
          ELSE NULL
        END as total_price,
        s.name as supplier_name,
        p.purchaseDate as purchase_date,
        COALESCE(p.pieceCount, 0) as original_quantity,
        COALESCE(mu.used_quantity, 0) as used_quantity,
        (COALESCE(p.pieceCount, 0) - COALESCE(mu.used_quantity, 0)) as remaining_quantity,
        CASE 
          WHEN p.minStockAlert IS NOT NULL AND 
               (COALESCE(p.pieceCount, 0) - COALESCE(mu.used_quantity, 0)) <= p.minStockAlert 
          THEN 1 
          ELSE 0 
        END as is_low_stock,
        p.created_at as created_at,
        p.updated_at as updated_at
      FROM purchases p
      LEFT JOIN (
        SELECT purchaseId, SUM(quantityUsedPieces) as used_quantity
        FROM material_usage
        GROUP BY purchaseId
      ) mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplierId = s.id
      WHERE ${whereConditions.join(' AND ')}
      ${low_stock_only === 'true' ? 'HAVING is_low_stock = 1' : ''}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `

    // 计数查询SQL
    const countQuery = `
      SELECT COUNT(*) as total
      FROM purchases p
      LEFT JOIN (
        SELECT purchaseId, SUM(quantityUsedPieces) as used_quantity
        FROM material_usage
        GROUP BY purchaseId
      ) mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplierId = s.id
      WHERE ${whereConditions.join(' AND ')}
      ${low_stock_only === 'true' ? 'HAVING (COALESCE(p.pieceCount, 0) - COALESCE(mu.used_quantity, 0)) <= COALESCE(p.minStockAlert, 0)' : ''}
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
      product_name: item.product_name,
      purchase_id_type: typeof item.purchase_id
    })))
    
    console.log('🔍 [成品卡片查询] 转换后数据（前3个）:', convertedProducts.slice(0, 3).map(item => ({
      purchase_id: item.purchase_id,
      product_name: item.product_name,
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

// 获取库存统计数据（仪表盘）
router.get('/statistics', authenticateToken, asyncHandler(async (_, res) => {
  console.log('🔍 [库存统计] 接收到statistics请求:', {
    method: req.method,
    path: req.path,
    user: req.user?.user_name,
    timestamp: new Date().toISOString()
  })
  
  try {
    // 修复的统计查询，避免嵌套聚合函数
    const basicStatsQuery = `
      SELECT 
        p.productType as product_type,
        COUNT(DISTINCT p.id) as total_items,
        SUM(CASE 
          WHEN p.productType = 'LOOSE_BEADS' THEN (p.pieceCount - COALESCE(mu.used_quantity, 0))
          WHEN p.productType = 'BRACELET' THEN (p.totalBeads - COALESCE(mu.used_quantity, 0))
          WHEN p.productType = 'ACCESSORIES' THEN (p.pieceCount - COALESCE(mu.used_quantity, 0))
          WHEN p.productType = 'FINISHED' THEN (p.pieceCount - COALESCE(mu.used_quantity, 0))
          ELSE 0
        END) as total_quantity
      FROM purchases p
      LEFT JOIN (
        SELECT purchaseId, SUM(quantityUsedBeads) as used_quantity
        FROM material_usage
        GROUP BY purchaseId
      ) mu ON p.id = mu.purchase_id
      GROUP BY p.productType
      ORDER BY p.productType
    `

    // 执行基础统计查询
    console.log('🔍 [库存统计] 执行SQL查询...')
    const typeStats = await prisma.$queryRawUnsafe(basicStatsQuery)
    console.log('📊 [库存统计] 查询结果:', {
      length: (typeStats as any[]).length,
      data: typeStats
    })
    
    // 转换BigInt字段并应用字段格式转换
    const convertBigInt = (data: any[]) => {
      return data.map(item => {
        // 先转换BigInt为Number
        const converted = { ...item }
        Object.keys(converted).forEach(key => {
          if (typeof converted[key] === 'bigint') {
            converted[key] = Number(converted[key])
          }
        })
        console.log('🔧 [库存统计] BigInt转换后的项目:', converted)
        // 字段已经是蛇形命名，无需转换
        return converted
      })
    }

    // 计算总体统计
    const totalStats = {
      totalItems: (typeStats as any[]).reduce((sum, item) => sum + Number(item.total_items), 0),
      total_quantity: (typeStats as any[]).reduce((sum, item) => sum + Number(item.total_quantity), 0)
    }
    console.log('📊 [库存统计] 总体统计:', totalStats)

    const responseData = {
      totalStats: totalStats,
      typeStatistics: convertBigInt(typeStats as any[])
    }
    console.log('📊 [库存统计] 响应数据:', responseData)

    // 字段已经是蛇形命名，无需转换
    const convertedData = responseData
    console.log('📊 [库存统计] 转换后数据:', convertedData)

    res.json({
      success: true,
      message: '获取库存统计数据成功',
      data: convertedData
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
router.get('/product-distribution', authenticateToken, asyncHandler(async (_, res) => {
  console.log('🔍 [产品分布] 接收到product-distribution请求:', {
    method: req.method,
    path: req.path,
    query: req.query,
    user: req.user?.user_name,
    timestamp: new Date().toISOString()
  })
  
  try {
    const { product_type, limit = 20 } = req.query
    
    // 构建查询条件
    let whereClause = ''
    if (product_type && product_type !== 'ALL') {
      whereClause = `WHERE p.productType = '${product_type}'`
    }
    
    // 查询产品分布数据（前N名 + 其他）
    const distributionQuery = `
      SELECT 
        p.productName as product_name,
        p.productType as product_type,
        SUM(CASE 
          WHEN p.productType = 'LOOSE_BEADS' THEN (p.pieceCount - COALESCE(mu.used_quantity, 0))
          WHEN p.productType = 'BRACELET' THEN (p.totalBeads - COALESCE(mu.used_quantity, 0))
          WHEN p.productType = 'ACCESSORIES' THEN (p.pieceCount - COALESCE(mu.used_quantity, 0))
          WHEN p.productType = 'FINISHED' THEN (p.pieceCount - COALESCE(mu.used_quantity, 0))
          ELSE 0
        END) as total_quantity
      FROM purchases p
      LEFT JOIN (
        SELECT purchaseId, SUM(quantityUsedBeads) as used_quantity
        FROM material_usage
        GROUP BY purchaseId
      ) mu ON p.id = mu.purchase_id
      ${whereClause}
      GROUP BY p.productName, p.productType
      HAVING total_quantity > 0
      ORDER BY total_quantity DESC
    `

    console.log('🔍 [产品分布] 执行SQL查询:', distributionQuery)
    const allProducts = await prisma.$queryRawUnsafe(distributionQuery) as any[]
    console.log('📊 [产品分布] 查询结果:', {
      length: allProducts.length,
      sample: allProducts.slice(0, 3)
    })
    
    // 转换BigInt字段
    const convertedProducts = allProducts.map(item => {
      const converted = { ...item }
      Object.keys(converted).forEach(key => {
        if (typeof converted[key] === 'bigint') {
          converted[key] = Number(converted[key])
        }
      })
      return converted
    })
    
    // 计算该产品类型的总数量（确保数字相加而不是字符串拼接）
    const totalQuantity = convertedProducts.reduce((sum, item) => {
      const quantity = Number(item.total_quantity) || 0
      return sum + quantity
    }, 0)
    
    // 获取前N名产品
    const topProducts = convertedProducts.slice(0, parseInt(String(limit)))
    const topQuantity = topProducts.reduce((sum, item) => sum + item.total_quantity, 0)
    
    // 计算其他产品的数量
    const othersQuantity = totalQuantity - topQuantity
    
    // 构建饼图数据 - 百分比基于该产品类型的总量计算
    const pieChartData = topProducts.map(item => ({
      name: item.product_name,
      value: item.total_quantity,
      percentage: ((item.total_quantity / totalQuantity) * 100).toFixed(1)
    }))
    
    // 如果有其他产品，添加到数据中
    if (othersQuantity > 0) {
      pieChartData.push({
        name: '其他',
        value: othersQuantity,
        percentage: ((othersQuantity / totalQuantity) * 100).toFixed(1)
      })
    }
    
    const responseData = {
      total_quantity: totalQuantity,
      top_products_count: topProducts.length,
      others_count: convertedProducts.length - topProducts.length,
      top_products: pieChartData
    }
    
    console.log('📊 [产品分布] 响应数据:', responseData)
    
    // 字段已经是蛇形命名，无需转换
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

// 获取库存消耗分析
router.get('/consumption-analysis', authenticateToken, asyncHandler(async (_, res) => {
  const { time_range = 'all', limit = 10 } = req.query

  console.log('🔍 [库存消耗分析] 请求参数:', {
    time_range,
    limit,
    userRole: req.user?.role
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

    // 查询库存消耗统计数据
    const consumptionQuery = `
      SELECT 
        p.id as purchase_id,
        p.productName as product_name,
        p.productType as product_type,
        p.beadDiameter as bead_diameter,
        p.specification,
        p.quality,
        s.name as supplier_name,
        SUM(
          CASE 
            WHEN p.productType IN ('LOOSE_BEADS', 'BRACELET') THEN mu.quantity_used
            WHEN p.productType IN ('ACCESSORIES', 'FINISHED') THEN mu.quantity_used
            ELSE 0
          END
        ) as total_consumed,
        COUNT(mu.id) as consumption_count,
        AVG(
          CASE 
            WHEN p.productType IN ('LOOSE_BEADS', 'BRACELET') THEN mu.quantity_used
            WHEN p.productType IN ('ACCESSORIES', 'FINISHED') THEN mu.quantity_used
            ELSE 0
          END
        ) as avg_consumption,
        MAX(mu.created_at) as last_consumption_date,
        MIN(mu.created_at) as first_consumption_date,
        CASE 
          WHEN p.productType IN ('LOOSE_BEADS', 'BRACELET') THEN '颗'
          WHEN p.productType IN ('ACCESSORIES', 'FINISHED') THEN '件'
          ELSE '个'
        END as unit_type
      FROM material_usage mu
      INNER JOIN purchases p ON mu.purchase_id = p.id
      LEFT JOIN suppliers s ON p.supplierId = s.id
      WHERE 1=1 ${timeCondition}
        AND (
          (p.productType IN ('LOOSE_BEADS', 'BRACELET') AND mu.quantity_used > 0) OR
          (p.productType IN ('ACCESSORIES', 'FINISHED') AND mu.quantity_used > 0)
        )
      GROUP BY p.id, p.productName, p.productType, p.beadDiameter, p.specification, p.quality, s.name
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
    if (req.user?.role === 'EMPLOYEE') {
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
router.get('/price-distribution', authenticateToken, asyncHandler(async (_, res) => {
  const { 
    product_type = 'LOOSE_BEADS', 
    price_type = 'unit_price', 
    limit = 10 
  } = req.query

  console.log('🔍 [产品价格分布] 请求参数:', {
    product_type,
    price_type,
    limit,
    userRole: req.user?.role
  })

  try {
    // 构建产品类型筛选条件
    let productTypeCondition = ''
    if (product_type && product_type !== 'ALL') {
      productTypeCondition = `AND p.productType = '${product_type}'`
    }

    // 根据价格类型选择不同的处理逻辑
    if (price_type === 'unit_price') {
      // 单价分布 - 返回价格区间统计
      const priceRangeQuery = `
        SELECT 
           CASE 
             -- 成品类型使用专门的价格区间
             WHEN product_type = 'FINISHED' AND calculated_price >= 0 AND calculated_price <= 50 THEN '0-50元（含）'
             WHEN product_type = 'FINISHED' AND calculated_price > 50 AND calculated_price <= 100 THEN '50-100元（含）'
             WHEN product_type = 'FINISHED' AND calculated_price > 100 AND calculated_price <= 200 THEN '100-200元（含）'
             WHEN product_type = 'FINISHED' AND calculated_price > 200 AND calculated_price <= 500 THEN '200-500元（含）'
             WHEN product_type = 'FINISHED' AND calculated_price > 500 THEN '500元以上'
             -- 其他产品类型使用原有价格区间
             WHEN product_type != 'FINISHED' AND calculated_price >= 0 AND calculated_price <= 3 THEN '0-3元（含）'
             WHEN product_type != 'FINISHED' AND calculated_price > 3 AND calculated_price <= 10 THEN '3-10元（含）'
             WHEN product_type != 'FINISHED' AND calculated_price > 10 AND calculated_price <= 20 THEN '10-20元（含）'
             WHEN product_type != 'FINISHED' AND calculated_price > 20 AND calculated_price <= 50 THEN '20-50元（含）'
             WHEN product_type != 'FINISHED' AND calculated_price > 50 THEN '50元以上'
             ELSE '未知'
           END as price_range,
          COUNT(*) as count
        FROM (          SELECT             p.productType as product_type,            CASE               WHEN p.productType = 'LOOSE_BEADS' AND p.totalBeads > 0 THEN p.totalPrice / p.totalBeads              WHEN p.productType = 'BRACELET' AND p.quantity > 0 THEN p.totalPrice / p.quantity              WHEN p.productType = 'ACCESSORIES' AND p.pieceCount > 0 THEN p.totalPrice / p.pieceCount              WHEN p.productType = 'FINISHED' AND p.pieceCount > 0 THEN p.totalPrice / p.pieceCount              ELSE NULL            END as calculated_price          FROM purchases p          WHERE p.status IN ('ACTIVE', 'PENDING')             AND p.totalPrice IS NOT NULL             AND p.totalPrice > 0            AND (              (p.productType = 'LOOSE_BEADS' AND p.totalBeads IS NOT NULL AND p.totalBeads > 0) OR              (p.productType = 'BRACELET' AND p.quantity IS NOT NULL AND p.quantity > 0) OR              (p.productType = 'ACCESSORIES' AND p.pieceCount IS NOT NULL AND p.pieceCount > 0) OR              (p.productType = 'FINISHED' AND p.pieceCount IS NOT NULL AND p.pieceCount > 0)            )            ${productTypeCondition}        ) as price_data
        WHERE calculated_price IS NOT NULL
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
      const totalCount = rangeData.reduce((sum, item) => sum + Number(item.count), 0)
      
      const priceRanges = rangeData.map(item => ({
        name: item.price_range,
        value: Number(item.count),
        percentage: totalCount > 0 ? (Number(item.count) / totalCount * 100).toFixed(1) : '0'
      }))
      
      const responseData = {
        product_type,
        price_type,
        price_label: '单价区间分布',
        total_products: totalCount,
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
    let priceField = 'p.totalPrice'
    let priceLabel = '总价'

    // 查询价格分布数据
     const priceQuery = `
       SELECT 
         p.id as purchase_id,
         p.productName as product_name,
         p.productType as product_type,
         p.beadDiameter as bead_diameter,
         p.specification,
         p.quality,
         p.quantity,
         p.pieceCount as piece_count,
         p.totalBeads as total_beads,
         p.unitPrice as unit_price,
         p.totalPrice as total_price,
         p.pricePerBead as price_per_bead,
         p.pricePerPiece as price_per_piece,
         p.pricePerGram as price_per_gram,
         p.weight,
         s.name as supplier_name,
         p.purchaseDate as purchase_date,
         p.created_at as created_at,
         COALESCE(SUM(mu.quantity_used), 0) as used_beads,
         (p.totalBeads - COALESCE(SUM(mu.quantity_used), 0)) as remaining_beads,
         ${priceField} as calculated_price
       FROM purchases p
       LEFT JOIN suppliers s ON p.supplierId = s.id
       LEFT JOIN material_usage mu ON p.id = mu.purchase_id
       WHERE p.status IN ('ACTIVE', 'PENDING') 
         AND p.totalPrice IS NOT NULL 
         AND p.totalPrice > 0
         AND (
           (p.productType IN ('LOOSE_BEADS', 'BRACELET') AND (p.totalBeads IS NOT NULL AND p.totalBeads > 0 OR p.pieceCount IS NOT NULL AND p.pieceCount > 0)) OR
           (p.productType = 'ACCESSORIES' AND p.pieceCount IS NOT NULL AND p.pieceCount > 0) OR
           (p.productType = 'FINISHED' AND p.pieceCount IS NOT NULL AND p.pieceCount > 0)
         )
         ${productTypeCondition}
       GROUP BY p.id, p.productName, p.productType, p.beadDiameter, p.specification, 
                p.quality, p.quantity, p.pieceCount, p.totalBeads, p.unitPrice, 
                p.totalPrice, p.pricePerBead, p.pricePerPiece, p.pricePerGram, p.weight, 
                s.name, p.purchaseDate, p.created_at
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
      product_type,
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
    if (req.user?.role === 'EMPLOYEE') {
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
router.get('/:purchase_id', authenticateToken, asyncHandler(async (_, res) => {
  const { purchase_id } = req.params

  try {
    const detailQuery = `
      SELECT 
        p.id as purchase_id,
        p.productName as product_name,
        CONCAT(p.productName, ' ', p.beadDiameter, 'mm ', COALESCE(p.quality, ''), '级') as bead_type,
        p.beadDiameter as bead_diameter,
        p.quality,
        p.minStockAlert as min_stock_alert,
        p.totalBeads as original_beads,
        COALESCE(SUM(mu.quantity_used), 0) as used_beads,
        (p.totalBeads - COALESCE(SUM(mu.quantity_used), 0)) as remaining_beads,
        CASE 
          WHEN p.minStockAlert IS NOT NULL AND 
               (p.totalBeads - COALESCE(SUM(mu.quantity_used), 0)) <= p.minStockAlert 
          THEN 1 
          ELSE 0 
        END as is_low_stock,
        p.pricePerBead as price_per_bead,
        p.pricePerGram as price_per_gram,
        p.totalPrice as total_price,
        p.weight,
        s.name as supplier_name,
        s.contact as supplier_contact,
        s.phone as supplier_phone,
        p.purchaseDate as purchase_date,
        p.photos,
        p.notes,
        p.created_at as created_at,
        p.updated_at as updated_at
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplierId = s.id
      WHERE p.id = ?
      GROUP BY p.id, p.productName, p.beadDiameter, p.quality, p.minStockAlert, 
               p.totalBeads, p.pricePerBead, p.pricePerGram, p.totalPrice, p.weight,
               s.name, s.contact, s.phone, p.purchaseDate, p.photos, p.notes, 
               p.created_at, p.updated_at
    `

    const result = await prisma.$queryRawUnsafe(detailQuery, purchase_id) as any[]

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: '库存记录不存在'
      })
    }

    // 权限过滤
    const filteredResult = filterInventoryData(result, req.user?.role)

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
router.get('/alerts/low-stock', authenticateToken, asyncHandler(async (_, res) => {
  try {
    const alertQuery = `
      SELECT 
        p.id as purchase_id,
        p.productName as product_name,
        CONCAT(p.productName, ' ', p.beadDiameter, 'mm ', COALESCE(p.quality, ''), '级') as bead_type,
        p.beadDiameter as bead_diameter,
        p.quality,
        p.minStockAlert as min_stock_alert,
        (p.totalBeads - COALESCE(SUM(mu.quantity_used), 0)) as remaining_beads,
        p.purchaseDate as purchase_date
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id
      WHERE p.beadDiameter IS NOT NULL 
        AND p.minStockAlert IS NOT NULL
      GROUP BY p.id, p.productName, p.beadDiameter, p.quality, p.minStockAlert, 
               p.totalBeads, p.purchaseDate
      HAVING remaining_beads <= p.minStockAlert
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
router.get('/export/excel', authenticateToken, asyncHandler(async (_, res) => {
  try {
    let exportQuery = `
      SELECT 
        p.productName as '产品名称',
        CONCAT(p.beadDiameter, 'mm') as '珠子直径',
        p.quality as '品相等级',
        p.totalBeads as '采购总颗数',
        COALESCE(SUM(mu.quantity_used), 0) as '已使用颗数',
        (p.totalBeads - COALESCE(SUM(mu.quantity_used), 0)) as '剩余颗数',
        CASE 
          WHEN p.minStockAlert IS NOT NULL AND 
               (p.totalBeads - COALESCE(SUM(mu.quantity_used), 0)) <= p.minStockAlert 
          THEN '是' 
          ELSE '否' 
        END as '低库存预警'`
    
    if (req.user?.role === 'BOSS') {
      exportQuery += `,
        s.name as '供应商',
        p.pricePerGram as '克价',
        p.pricePerBead as '每颗单价'`
    }
    
    exportQuery += `,
        DATE_FORMAT(p.purchaseDate, '%Y-%m-%d') as '采购日期'
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id`
    
    if (req.user?.role === 'BOSS') {
      exportQuery += `
      LEFT JOIN suppliers s ON p.supplierId = s.id`
    }
    
    exportQuery += `
      WHERE p.beadDiameter IS NOT NULL
      GROUP BY p.id, p.productName, p.beadDiameter, p.quality, p.minStockAlert, 
               p.totalBeads, p.pricePerGram, p.pricePerBead, p.purchaseDate`
    
    if (req.user?.role === 'BOSS') {
      exportQuery += `, s.name`
    }
    
    exportQuery += `
      ORDER BY p.purchaseDate DESC`

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