import { Router } from 'express'
import { authenticate_token } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { quality_schema, material_typeSchema } from '../utils/validation.js'

import { ErrorResponses, createSuccessResponse } from '../utils/errorResponse.js'

const router = Router()

// 库存查询参数验证schema
const inventoryQuerySchema = z.object({
  page: z.string().regex(/^\d+$/, '页码必须是数字').transform(Number).refine(n => n >= 1, '页码必须大于0').optional(),
  limit: z.string().regex(/^\d+$/, '每页数量必须是数字').transform(Number).refine(n => n >= 1 && n <= 100, '每页数量必须在1-100之间').optional(),
  search: z.string().max(100, '搜索关键词不能超过100字符').optional(),
  material_types: z.union([
    z.string().transform(s => s.includes(',') ? s.split(',').map(t => t.trim()) : [s]),
    z.array(z.string())
  ]).optional(),
  quality: quality_schema.optional(),
  low_stock_only: z.string().transform(s => s === 'true').optional(),
  diameter_min: z.string().regex(/^\d+(\.\d+)?$/, '最小直径必须是数字').transform(Number).optional(),
  diameter_max: z.string().regex(/^\d+(\.\d+)?$/, '最大直径必须是数字').transform(Number).optional(),
  specification_min: z.string().regex(/^\d+(\.\d+)?$/, '最小规格必须是数字').transform(Number).optional(),
  specification_max: z.string().regex(/^\d+(\.\d+)?$/, '最大规格必须是数字').transform(Number).optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  sort_by: z.enum(['total_quantity', 'material_type', 'crystalType']).optional()
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
  material_types: z.union([
    z.string().transform(s => [s]),
    z.array(z.string())
  ]).optional(),
  quality: quality_schema.optional(),
  low_stock_only: z.string().transform(s => s === 'true').optional()
})

// 添加调试端点
router.get('/debug', authenticate_token, asyncHandler(async (req, res) => {
  try {
    // 查询采购数据总数
    const total_purchases = await prisma.purchase.count()
    
    // 查询前5条采购记录
    const samplePurchases = await prisma.purchase.findMany({
      take: 5,
      select: {
        id: true,
        product_name: true,
        material_type: true,
        quantity: true,
        piece_count: true,
        bead_diameter: true,
        specification: true,
        quality: true,
        created_at: true
      }
    })
    
    // 查询MaterialUsage数据
    const totalMaterialUsage = await prisma.material_usage.count()
    
    res.json({
      success: true,
      data: {total_purchases,
        totalMaterialUsage,
        samplePurchases,
        message: '数据库调试信息'
      }
    })
  } catch (error) {
    console.error('❌ [库存调试] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('查询失败', error instanceof Error ? error.message : '未知错误')
    )
  }
}))

// 产品分类解析函数
const parseProductClassification = (product_name: string) => {
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
    if (keywords.some(keyword => product_name.includes(keyword))) {
      crystalType = type
      break
    }
  }
  
  // 识别形状类型
  for (const [shape, keywords] of Object.entries(shapeTypes)) {
    if (keywords.some(keyword => product_name.includes(keyword))) {
      shapeType = shape
      break
    }
  }
  
  // 特殊处理：如果包含"随形"则优先设为随形
  if (product_name.includes('随形')) {
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

import { convertToApiFormat, convertFromApiFormat, filterSensitiveFields } from '../utils/fieldConverter.js'

// 权限控制：过滤敏感数据并转换BigInt
const filterInventoryData = (inventory: any[], userRole: string) => {
  const convertBigIntToNumber = (item: any) => {
    const converted = convertToApiFormat({ ...item })
    
    // 转换所有可能的BigInt字段为Number
    const bigIntFields = [
      'purchase_id', 'originalBeads', 'usedBeads', 'remainingBeads',
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
router.get('/hierarchical', authenticate_token, asyncHandler(async (req, res) => {// 验证查询参数
  const validatedQuery = inventoryQuerySchema.parse(req.query)
  const {
    page = 1,
    limit = 20,
    search,
    material_types,
    quality,
    low_stock_only,
    diameter_min,
    diameter_max,
    specification_min,
    specification_max,
    sort = 'desc',
    sort_by = 'total_quantity'
  } = validatedQuery

  // 使用materialTypes作为筛选条件
  const finalMaterialTypes = material_types

  const page_num = parseInt(String(page))
  const limitNum = Math.min(parseInt(String(limit)), 100)
  const offset = (page_num - 1) * limitNum

  console.log('🔍 [层级式库存查询] 请求参数:', {page: page_num,
    limit: limitNum,
    search,
    material_types,
    finalMaterialTypes,
    quality,
    low_stock_only
  })

  try {// 查询所有库存数据
    const inventoryQuery = `
      SELECT 
        p.id as purchaseId,
        p.purchase_code as purchase_code,
    p.product_name as product_name,
        p.material_type as material_type,
        p.unit_type as unit_type,
        p.bead_diameter as bead_diameter,
        p.specification,
        p.quality,
        p.photos,
        CASE 
          WHEN p.material_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
          WHEN p.material_type = 'BRACELET' THEN COALESCE(p.total_beads, p.piece_count, 0)
          WHEN p.material_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
          WHEN p.material_type = 'FINISHED' THEN COALESCE(p.piece_count, 0)
          ELSE COALESCE(p.quantity, 0)
        END as original_quantity,
        COALESCE(mu.used_quantity, 0) as usedQuantity,
        (CASE 
          WHEN p.material_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
          WHEN p.material_type = 'BRACELET' THEN COALESCE(p.total_beads, p.piece_count, 0)
          WHEN p.material_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
          WHEN p.material_type = 'FINISHED' THEN COALESCE(p.piece_count, 0)
          ELSE COALESCE(p.quantity, 0)
        END - COALESCE(mu.used_quantity, 0)) as remaining_quantity,
        CASE WHEN p.min_stock_alert IS NOT NULL AND 
                 (CASE 
                   WHEN p.material_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
                   WHEN p.material_type = 'BRACELET' THEN COALESCE(p.total_beads, p.piece_count, 0)
                   WHEN p.material_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
                   WHEN p.material_type = 'FINISHED' THEN COALESCE(p.piece_count, 0)
                   ELSE COALESCE(p.quantity, 0)
                 END - COALESCE(mu.used_quantity, 0)) <= p.min_stock_alert 
            THEN 1 ELSE 0 END as is_low_stock,
        CASE 
          WHEN p.material_type = 'LOOSE_BEADS' THEN p.price_per_bead
          WHEN p.material_type = 'BRACELET' THEN 
            CASE 
              WHEN p.price_per_bead IS NOT NULL THEN p.price_per_bead
              WHEN p.total_price IS NOT NULL AND p.total_beads IS NOT NULL AND p.total_beads > 0 
                THEN p.total_price / p.total_beads
              ELSE NULL
            END
          WHEN p.material_type = 'ACCESSORIES' THEN 
            CASE 
              WHEN p.unit_price IS NOT NULL THEN p.unit_price
              WHEN p.total_price IS NOT NULL AND p.piece_count IS NOT NULL AND p.piece_count > 0 
                THEN p.total_price / p.piece_count
              ELSE NULL
            END
          WHEN p.material_type = 'FINISHED' THEN 
            CASE 
              WHEN p.unit_price IS NOT NULL THEN p.unit_price
              WHEN p.total_price IS NOT NULL AND p.piece_count IS NOT NULL AND p.piece_count > 0 
                THEN p.total_price / p.piece_count
              ELSE NULL
            END
          ELSE p.price_per_bead
        END as price_per_unit,
        p.price_per_gram as price_per_gram,
        p.purchase_date as purchase_date,
        s.name as supplier_name
      FROM purchases p
      LEFT JOIN (
        SELECT purchase_id, SUM(quantity_used) as used_quantity
        FROM material_usage
        GROUP BY purchase_id
      ) mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
      ORDER BY p.material_type, p.product_name, 
               COALESCE(p.bead_diameter, p.specification), p.quality, p.purchase_date
    `
    
    const allInventory = await prisma.$query_raw_unsafe(inventoryQuery) as any[]
    
    console.log('📊 [层级式库存查询] 原始查询结果:', {
      inventoryLength: allInventory.length,
      firstItem: allInventory[0]
    })
    
    // 构建层级结构
    const hierarchicalData = new Map()
    
    allInventory.forEach((item: any) => {
      const material_type = item.material_type
      const diameter = item.bead_diameter ? Number(item.bead_diameter) : null
      const specification = item.specification ? Number(item.specification) : null
      const quality = item.quality || '未知'
      
      // 应用筛选条件
      if (search && !item.product_name.toLowerCase().includes(search.toLowerCase())) return
      
      // 材料类型筛选（多选）
      if (finalMaterialTypes) {
        const materialTypesArray = Array.isArray(finalMaterialTypes) ? finalMaterialTypes : [finalMaterialTypes]
        if (!material_typesArray.includes(material_type)) return
      }
      
      // 品相筛选：如果指定了品相条件，则检查是否匹配
      if (quality) {
        const itemQuality = item.quality || '未知'
        if (itemQuality !== quality) return
      }
      if (lowStockOnly && Number(item.is_low_stock) !== 1) return
      
      // 珠子直径范围筛选（散珠和手串）
      if (diameter && diameter_min && diameter < Number(diameter_min)) return
      if (diameter && diameter_max && diameter > Number(diameter_max)) return
      
      // 规格范围筛选（饰品配件和成品）
      if (specification && validatedQuery.specification_min && specification < Number(validatedQuery.specification_min)) return
      if (specification && validatedQuery.specification_max && specification > Number(validatedQuery.specification_max)) return
      
      // 构建层级键
      const specValue = diameter || specification || 0
      const specUnit = diameter ? 'mm' : 'mm'
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
          weightedPricePerUnit: 0,
          weightedPricePerGram: 0,
          batches: []
        })
      }
      
      const level3 = level2.qualities.get(level3Key)
      
      // 累加数据
      const remaining_quantity = Number(item.remaining_quantity)
      const original_quantity = Number(item.original_quantity)
      const is_low_stock = Number(item.is_low_stock) === 1
      
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

      level3.batches.push({purchase_id: item.purchase_id,
        purchase_code: item.purchase_code,
        material_name: item.product_name, // 修改：product_name → material_name（概念统一）
        material_type: item.material_type,
        purchase_date: item.purchase_date,
        supplier_name: item.supplier_name,
        original_quantity: original_quantity,
        used_quantity: Number(item.used_quantity),
        remaining_quantity: remaining_quantity,
        bead_diameter: item.bead_diameter ? Number(item.bead_diameter) : null,
        specification: item.specification ? Number(item.specification) : null,
        price_per_unit: req.user!.role === 'BOSS' ? Number(item.price_per_unit) : null,
        price_per_gram: req.user!.role === 'BOSS' ? Number(item.price_per_gram) : null,
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
            price_per_unit: req.user!.role === 'BOSS' && totalWeightForUnit > 0 
              ? Math.round((totalWeightedPriceUnit / totalWeightForUnit) * 100) / 100 
              : null,
            price_per_gram: req.user!.role === 'BOSS' && totalWeightForGram > 0 
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
        return sort === 'asc' ? a.material_type.locale_compare(b.material_type) : b.material_type.locale_compare(a.material_type)
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
          page: page_num,
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
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
}))

// 获取分组库存列表（按产品名称分组）
router.get('/grouped', authenticate_token, asyncHandler(async (req, res) => {// 验证查询参数
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

  const page_num = parseInt(String(page))
  const limitNum = Math.min(parseInt(String(limit)), 100)
  const offset = (page_num - 1) * limitNum

  // 构建查询条件
  let whereClause = 'WHERE 1=1'
  const params: any[] = []

  if (search) {
    whereClause += ' AND p.product_name LIKE ?'
    params.push(`%${search}%`)
  }

  if (quality) {
    whereClause += ' AND p.quality = ?'
    params.push(quality)
  }

  if (lowStockOnly) {
    whereClause += ' AND (CASE WHEN p.material_type = "LOOSE_BEADS" THEN COALESCE(p.piece_count, 0) WHEN p.material_type = "BRACELET" THEN COALESCE(p.quantity, 0) WHEN p.material_type = "ACCESSORIES" THEN COALESCE(p.piece_count, 0) WHEN p.material_type = "FINISHED" THEN COALESCE(p.piece_count, 0) ELSE COALESCE(p.quantity, 0) END - COALESCE(mu.used_beads, 0)) <= p.min_stock_alert'
  }
  
  console.log('🔍 [分组库存查询] 请求参数:', {page: page_num,
    limit: limitNum,
    search,
    quality,
    low_stock_only,
    whereClause,
    params
  })

  try {// 查询分组库存数据 - 使用两步查询避免JSON_ARRAYAGG兼容性问题
    const groupedQuery = `
      SELECT 
        p.product_name as product_name,
        COUNT(DISTINCT CONCAT(
          COALESCE(p.bead_diameter, p.specification, 0), 
          '-', 
          COALESCE(p.quality, '')
        )) as variant_count,
        SUM(
          CASE 
            WHEN p.material_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
            WHEN p.material_type = 'BRACELET' THEN COALESCE(p.quantity, 0)
            WHEN p.material_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
            WHEN p.material_type = 'FINISHED' THEN COALESCE(p.piece_count, 0)
            ELSE COALESCE(p.quantity, 0)
          END - COALESCE(mu.used_beads, 0)
        ) as totalRemainingBeads,
        MAX(CASE WHEN p.min_stock_alert IS NOT NULL AND 
                     (CASE 
                       WHEN p.material_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
                       WHEN p.material_type = 'BRACELET' THEN COALESCE(p.quantity, 0)
                       WHEN p.material_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
                       WHEN p.material_type = 'FINISHED' THEN COALESCE(p.piece_count, 0)
                       ELSE COALESCE(p.quantity, 0)
                     END - COALESCE(mu.used_beads, 0)) <= p.min_stock_alert 
                THEN 1 ELSE 0 END) as hasLowStock
      FROM purchases p
      LEFT JOIN (
        SELECT purchase_id, SUM(quantity_used) as usedBeads
        FROM material_usage
        GROUP BY purchase_id
      ) mu ON p.id = mu.purchase_id
      ${whereClause}
      GROUP BY p.product_name
      ORDER BY ${sort_by === 'product_name' ? 'p.product_name' : 'totalRemainingBeads'} ${sort === 'asc' ? 'ASC' : 'DESC'}
      LIMIT ? OFFSET ?
    `

    // 计算总数
    const countQuery = `
      SELECT COUNT(DISTINCT p.product_name) as total
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id
      ${whereClause}
    `

    console.log('🔍 [分组库存查询] SQL查询参数:', { params, limitNum, offset })
    const [groupedResult, countResult] = await Promise.all([
      prisma.$query_raw_unsafe(groupedQuery, ...params, limitNum, offset),
      prisma.$query_raw_unsafe(countQuery, ...params)
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
      groupedInventory.map(async (group) => {// 查询该产品的所有采购记录（用于合并相同规格品相的变体）
        const purchaseQuery = `
          SELECT 
            p.id as purchaseId,
            p.bead_diameter as bead_diameter,
            p.specification,
            p.quality,
            CASE 
              WHEN p.material_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
              WHEN p.material_type = 'BRACELET' THEN COALESCE(p.quantity, 0)
              WHEN p.material_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
              WHEN p.material_type = 'FINISHED' THEN COALESCE(p.piece_count, 0)
              ELSE COALESCE(p.quantity, 0)
            END as originalBeads,
            COALESCE(mu.used_beads, 0) as usedBeads,
            (CASE 
              WHEN p.material_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
              WHEN p.material_type = 'BRACELET' THEN COALESCE(p.quantity, 0)
              WHEN p.material_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
              WHEN p.material_type = 'FINISHED' THEN COALESCE(p.piece_count, 0)
              ELSE COALESCE(p.quantity, 0)
            END - COALESCE(mu.used_beads, 0)) as remainingBeads,
            CASE WHEN p.min_stock_alert IS NOT NULL AND 
                     (CASE 
                       WHEN p.material_type = 'LOOSE_BEADS' THEN COALESCE(p.piece_count, 0)
                       WHEN p.material_type = 'BRACELET' THEN COALESCE(p.quantity, 0)
                       WHEN p.material_type = 'ACCESSORIES' THEN COALESCE(p.piece_count, 0)
                       WHEN p.material_type = 'FINISHED' THEN COALESCE(p.piece_count, 0)
                       ELSE COALESCE(p.quantity, 0)
                     END - COALESCE(mu.used_beads, 0)) <= p.min_stock_alert 
                THEN 1 ELSE 0 END as is_low_stock,
            p.price_per_bead as price_per_bead,
            p.price_per_gram as price_per_gram,
            p.purchase_date as purchase_date,
            s.name as supplier_name
          FROM purchases p
          LEFT JOIN (
            SELECT purchase_id, SUM(quantity_used) as usedBeads
        FROM material_usage
        GROUP BY purchase_id
          ) mu ON p.id = mu.purchase_id
          LEFT JOIN suppliers s ON p.supplier_id = s.id
          WHERE p.bead_diameter IS NOT NULL AND p.product_name = ?
          ORDER BY p.bead_diameter, p.quality, p.purchase_date
        `
        
        const purchases = await prisma.$query_raw_unsafe(purchaseQuery, group.product_name) as any[]
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
              totalOriginalBeads: 0,
              is_low_stock: false,
              weightedPricePerBead: 0,
              weightedPricePerGram: 0,
              batches: []
            })
          }
          
          const variant = variantMap.get(variantKey)
          const remaining_beads = Number(purchase.remaining_beads)
          const originalBeads = Number(purchase.originalBeads)
          
          // 累加库存数量
          variant.remaining_beads += remainingBeads
          variant.totalOriginalBeads += originalBeads
          
          // 检查低库存状态
          if (Number(purchase.is_low_stock) === 1) {
            variant.is_low_stock = true
          }
          
          // 添加批次信息
          variant.batches.push({
            purchase_id: purchase.purchase_id,
            purchase_date: purchase.purchase_date,
            supplier_name: purchase.supplier_name,
            originalBeads: originalBeads,
            used_beads: Number(purchase.used_beads),
            remaining_beads: remainingBeads,
            price_per_bead: req.user!.role === 'BOSS' ? Number(purchase.price_per_bead) : null,
            price_per_gram: req.user!.role === 'BOSS' ? Number(purchase.price_per_gram) : null
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
            if (batch.price_per_bead && batch.originalBeads > 0) {
              totalWeightedPriceBead += batch.price_per_bead * batch.originalBeads
              totalWeightForBead += batch.originalBeads
            }
            if (batch.price_per_gram && batch.originalBeads > 0) {
              totalWeightedPriceGram += batch.price_per_gram * batch.originalBeads
              totalWeightForGram += batch.originalBeads
            }
          })
          
          return {
            bead_diameter: variant.bead_diameter,
            quality: variant.quality,
            remaining_beads: variant.remaining_beads,
            is_low_stock: variant.is_low_stock,
            price_per_bead: req.user!.role === 'BOSS' && totalWeightForBead > 0 
              ? Math.round((totalWeightedPriceBead / totalWeightForBead) * 100) / 100 
              : null,
            price_per_gram: req.user!.role === 'BOSS' && totalWeightForGram > 0 
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
            avgPricePerBead: v.price_per_bead
          }))
        })

        return {
          product_name: group.product_name,
          variant_count: Number(group.variant_count),
          totalRemainingBeads: Number(group.totalRemainingBeads),
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
          page: page_num,
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
      error: error instanceof Error ? error.message : '未知错误',
      stack: error instanceof Error ? error.stack : undefined,
      params,
      whereClause,
      timestamp: new Date().toISOString()
    })
    res.status(500).json({
      success: false,
      message: '获取分组库存列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
}))

// 获取库存列表（原有接口保持兼容）
router.get('/', authenticate_token, asyncHandler(async (req, res) => {const {
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

  const page_num = parseInt(page as string)
  const limitNum = Math.min(parseInt(limit as string), 100)
  const offset = (page_num - 1) * limitNum

  // 构建查询条件
  let whereClause = 'WHERE p.bead_diameter IS NOT NULL'
  const params: any[] = []

  if (search) {
    whereClause += ' AND p.product_name LIKE ?'
    params.push(`%${search}%`)
  }

  if (quality) {
    whereClause += ' AND p.quality = ?'
    params.push(quality)
  }

  if (lowStockOnly) {
    whereClause += ' AND (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) <= p.min_stock_alert'
  }

  if (min_stock) {
    whereClause += ' AND (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) >= ?'
    params.push(parseInt(min_stock as string))
  }

  if (max_stock) {
    whereClause += ' AND (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) <= ?'
    params.push(parseInt(max_stock as string))
  }

  // 排序
  const validSortFields = ['purchase_date', 'created_at', 'remainingBeads', 'product_name']
  const sortField = validSortFields.includes(sort_by as string) ? sort_by : 'purchase_date'
  const sortDirection = sort === 'asc' ? 'ASC' : 'DESC'

  try {// 查询库存数据
    const inventoryQuery = `
      SELECT 
        p.id as purchase_id,
        p.product_name as product_name,
        CONCAT(p.product_name, ' ', p.bead_diameter, 'mm ', COALESCE(p.quality, ''), '级') as bead_type,
        p.bead_diameter as bead_diameter,
        p.quality,
        p.min_stock_alert as min_stock_alert,
        p.total_beads as originalBeads,
        COALESCE(SUM(mu.quantity_used), 0) as usedBeads,
        (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) as remainingBeads,
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
      GROUP BY p.id, p.product_name, p.bead_diameter, p.quality, p.min_stock_alert, 
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
      prisma.$query_raw_unsafe(inventoryQuery, ...params, limitNum, offset),
      prisma.$query_raw_unsafe(countQuery, ...params)
    ])

    const inventory = inventoryResult as any[]
    const total = (countResult as any[])[0].total

    // 权限过滤
    const filteredInventory = filterInventoryData(inventory, req.user!.role)

    res.json({
      success: true,
      message: '获取库存列表成功',
      data: {
        items: filteredInventory,
        pagination: {
          page: page_num,
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
}))

// 库存搜索
router.get('/search', authenticate_token, asyncHandler(async (req, res) => {
  const { q: query, limit = 20 } = req.query

  if (!query) {
    return res.status(400).json({
      success: false,
      message: '搜索关键词不能为空'
    })
  }

  const limitNum = Math.min(parseInt(limit as string), 50)

  try {const searchQuery = `
      SELECT 
        p.id as purchase_id,
        p.product_name as product_name,
        CONCAT(p.product_name, ' ', p.bead_diameter, 'mm ', COALESCE(p.quality, ''), '级') as bead_type,
        p.bead_diameter as bead_diameter,
        p.quality,
        (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) as remainingBeads,
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
        AND (p.product_name LIKE ? OR s.name LIKE ?)
      GROUP BY p.id, p.product_name, p.bead_diameter, p.quality, p.min_stock_alert, 
               p.total_beads, p.price_per_bead, s.name, p.purchase_date
      ORDER BY remainingBeads DESC
      LIMIT ?
    `

    const searchPattern = `%${query}%`
    const results = await prisma.$query_raw_unsafe(
      searchQuery,
      searchPattern,
      searchPattern,
      limitNum
    ) as any[]

    // 权限过滤
    const filteredResults = filterInventoryData(results, req.user!.role)

    res.json({
      success: true,
      message: '搜索成功',
      data: {
        items: filteredResults,
        total: filteredResults.length
      }
    })
    return
  } catch (error) {
    console.error('库存搜索失败:', error)
    res.status(500).json({
      success: false,
      message: '搜索失败'
    })
    return
  }
}))

// 成品查询参数验证schema
const finishedProductQuerySchema = z.object({page: z.string().regex(/^\d+$/, '页码必须是数字').transform(Number).refine(n => n >= 1, '页码必须大于0').optional(),
  limit: z.string().regex(/^\d+$/, '每页数量必须是数字').transform(Number).refine(n => n >= 1 && n <= 100, '每页数量必须在1-100之间').optional(),
  search: z.string().max(100, '搜索关键词不能超过100字符').optional(),
  quality: quality_schema.optional(),
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
router.get('/finished-products-cards', authenticate_token, asyncHandler(async (req, res) => {// 验证查询参数
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

  const page_num = parseInt(String(page))
  const limitNum = Math.min(parseInt(String(limit)), 100)
  const offset = (page_num - 1) * limitNum

  console.log('🎯 [成品卡片查询] 请求参数:', {page: page_num,
    limit: limitNum,
    search,
    quality,
    low_stock_only,
    specification_min,
    specification_max
  })

  try {
    // 构建查询条件
    let whereConditions = ['p.material_type = "FINISHED"']
    let queryParams: any[] = []

    // 搜索条件
    if (search) {
      whereConditions.push('(p.product_name LIKE ? OR s.name LIKE ?)')
      const searchPattern = `%${search}%`
      queryParams.push(searchPattern, searchPattern)
    }

    // 品相筛选
    if (quality) {
      whereConditions.push('p.quality = ?')
      queryParams.push(quality)
    }

    // 规格范围筛选
    if (specificationMin) {
      whereConditions.push('p.specification >= ?')
      queryParams.push(Number(specification_min))
    }
    if (specificationMax) {
      whereConditions.push('p.specification <= ?')
      queryParams.push(Number(specification_max))
    }

    // 构建排序条件
    let order_by = 'p.purchase_date DESC'
    if (sort_by === 'product_name') {
      order_by = `p.product_name ${sort === 'asc' ? 'ASC' : 'DESC'}`
    } else if (sort_by === 'specification') {
      order_by = `p.specification ${sort === 'asc' ? 'ASC' : 'DESC'}`
    } else if (sort_by === 'remaining_quantity') {order_by = `remaining_quantity ${sort === 'asc' ? 'ASC' : 'DESC'}`
    }

    // 主查询SQL
    const finishedProductsQuery = `
      SELECT 
        p.id as purchaseId,
        p.purchase_code as purchase_code,
        p.product_name as product_name,
        p.specification,
        p.piece_count as piece_count,
        p.quality,
        p.photos,
        CASE 
          WHEN ${req.user!.role === 'BOSS' ? 'TRUE' : 'FALSE'} THEN 
            CASE 
              WHEN p.material_type = 'FINISHED' AND p.piece_count > 0 AND p.total_price IS NOT NULL 
              THEN ROUND(p.total_price / p.piece_count, 2)
              ELSE p.unit_price
            END
          ELSE NULL
        END as pricePerUnit,
        CASE 
          WHEN ${req.user!.role === 'BOSS' ? 'TRUE' : 'FALSE'} THEN p.total_price
          ELSE NULL
        END as total_price,
        s.name as supplier_name,
        p.purchase_date as purchase_date,
        COALESCE(p.piece_count, 0) as originalQuantity,
        COALESCE(mu.used_quantity, 0) as usedQuantity,
        (COALESCE(p.piece_count, 0) - COALESCE(mu.used_quantity, 0)) as remainingQuantity,
        CASE 
          WHEN p.min_stock_alert IS NOT NULL AND 
               (COALESCE(p.piece_count, 0) - COALESCE(mu.used_quantity, 0)) <= p.min_stock_alert 
          THEN 1 
          ELSE 0 
        END as isLowStock,
        p.created_at as created_at,
        p.updated_at as updated_at
      FROM purchases p
      LEFT JOIN (
        SELECT purchaseId, SUM(quantity_used) as usedQuantity
        FROM material_usage
        GROUP BY purchaseId
      ) mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE ${whereConditions.join(' AND ')}
      ${low_stock_only ? 'HAVING is_low_stock = 1' : ''}
      ORDER BY ${order_by}
      LIMIT ? OFFSET ?
    `

    // 计数查询SQL
    const countQuery = `
      SELECT COUNT(*) as total
      FROM purchases p
      LEFT JOIN (
        SELECT purchaseId, SUM(quantity_used) as usedQuantity
        FROM material_usage
        GROUP BY purchaseId
      ) mu ON p.id = mu.purchase_id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE ${whereConditions.join(' AND ')}
      ${low_stock_only ? 'HAVING (COALESCE(p.piece_count, 0) - COALESCE(mu.used_quantity, 0)) <= COALESCE(p.min_stock_alert, 0)' : ''}
    `

    console.log('🔍 [成品卡片查询] SQL查询参数:', { queryParams, limitNum, offset })

    // 执行查询
    const [products, countResult] = await Promise.all([
      prisma.$query_raw_unsafe(finishedProductsQuery, ...queryParams, limitNum, offset),
      prisma.$query_raw_unsafe(countQuery, ...queryParams)
    ])

    const total = Number((countResult as any[])[0]?.total || 0)
    const total_pages = Math.ceil(total / limitNum)

    // 转换数据格式
    const convertedProducts = (products as any[]).map(item => {
      const converted = { ...item }
      
      // 转换BigInt字段（但不转换purchaseId，因为它是字符串UUID）
      const bigIntFields = [
        'specification', 'piece_count', 'original_quantity',
        'used_quantity', 'remaining_quantity', 'is_low_stock'
      ]
      
      bigIntFields.forEach(field => {
        if (converted[field] !== null && converted[field] !== undefined) {
          converted[field] = Number(converted[field])
        }
      })
      
      // purchaseId保持原始字符串格式，不进行数字转换
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
      total_pages,
      current_page: page_num
    })
    
    console.log('🔍 [成品卡片查询] 原始查询数据（前3个）:', (products as any[]).slice(0, 3).map(item => ({
      purchase_id: item.purchase_id,
      product_name: item.product_name,
      purchaseIdType: typeof item.purchase_id
    })))
    
    console.log('🔍 [成品卡片查询] 转换后数据（前3个）:', convertedProducts.slice(0, 3).map(item => ({
      purchase_id: item.purchase_id,
      product_name: item.product_name,
      purchaseIdType: typeof item.purchase_id
    })))

    res.json({
      success: true,
      message: '获取成品数据成功',
      data: {
        products: convertedProducts,
        pagination: {
          current_page: page_num,
          perPage: limitNum,
          total: total,
          total_pages: total_pages,
          hasNext: page_num < total_pages,
          hasPrev: page_num > 1
        }
      }
    })
  } catch (error) {
    console.error('❌ [成品卡片查询] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('获取成品数据失败', error instanceof Error ? error.message : '未知错误')
    )
  }
}))

// 获取库存统计数据（仪表盘）
router.get('/statistics', authenticate_token, asyncHandler(async (req, res) => {
  console.log('🔍 [库存统计] 接收到statistics请求:', {
    method: req.method,
    path: req.path,
    user: req.user?.user_name,
    timestamp: new Date().toISOString()
  })
  
  try {// 修复的统计查询，避免嵌套聚合函数
    const basicStatsQuery = `
      SELECT 
        p.material_type as material_type,
        COUNT(DISTINCT p.id) as totalItems,
        SUM(CASE 
          WHEN p.material_type = 'LOOSE_BEADS' THEN (p.piece_count - COALESCE(mu.used_quantity, 0))
          WHEN p.material_type = 'BRACELET' THEN (p.total_beads - COALESCE(mu.used_quantity, 0))
          WHEN p.material_type = 'ACCESSORIES' THEN (p.piece_count - COALESCE(mu.used_quantity, 0))
          WHEN p.material_type = 'FINISHED' THEN (p.piece_count - COALESCE(mu.used_quantity, 0))
          ELSE 0
        END) as total_quantity
      FROM purchases p
      LEFT JOIN (
        SELECT purchase_id, SUM(quantity_used) as used_quantity
        FROM material_usage
        GROUP BY purchase_id
      ) mu ON p.id = mu.purchase_id
      GROUP BY p.material_type
      ORDER BY p.material_type
    `

    // 执行基础统计查询
    console.log('🔍 [库存统计] 执行SQL查询...')
    const typeStats = await prisma.$query_raw_unsafe(basicStatsQuery)
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
        // 然后转换字段名为snake_case（API格式）
        return convertToApiFormat(converted)
      })
    }

    // 计算总体统计
    const totalStats = {
      totalItems: (typeStats as any[]).reduce((sum, item) => sum + Number(item.totalItems), 0),
      total_quantity: (typeStats as any[]).reduce((sum, item) => sum + Number(item.total_quantity), 0)
    }
    console.log('📊 [库存统计] 总体统计:', totalStats)

    const responseData = {
      totalStats: totalStats,
      typeStatistics: convertBigInt(typeStats as any[])
    }
    console.log('📊 [库存统计] 响应数据:', responseData)

    // 使用convertToApiFormat确保字段格式符合API规范
    const convertedData = convertToApiFormat(responseData)
    console.log('📊 [库存统计] 转换后数据:', convertedData)

    res.json({
      success: true,
      message: '获取库存统计数据成功',
      data: convertedData
    })
  } catch (error) {
    console.error('❌ [库存统计] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('获取库存统计数据失败', error instanceof Error ? error.message : '未知错误')
    )
  }
}))

// 获取产品分布数据（用于饼图）
router.get('/product-distribution', authenticate_token, asyncHandler(async (req, res) => {
  console.log('🔍 [产品分布] 接收到product-distribution请求:', {
    method: req.method,
    path: req.path,
    query: req.query,
    user: req.user?.user_name,
    timestamp: new Date().toISOString()
  })
  
  try {
    const { material_type, limit = 20 } = req.query
    
    // 构建查询条件
    let whereClause = ''
    if (material_type && material_type !== 'ALL') {
      whereClause = `WHERE p.material_type = '${material_type}'`
    }
    
    // 查询产品分布数据（前N名 + 其他）
    const distributionQuery = `
      SELECT 
        p.product_name as product_name,
        p.material_type as material_type,
        SUM(CASE 
          WHEN p.material_type = 'LOOSE_BEADS' THEN (p.piece_count - COALESCE(mu.used_quantity, 0))
          WHEN p.material_type = 'BRACELET' THEN (p.total_beads - COALESCE(mu.used_quantity, 0))
          WHEN p.material_type = 'ACCESSORIES' THEN (p.piece_count - COALESCE(mu.used_quantity, 0))
          WHEN p.material_type = 'FINISHED' THEN (p.piece_count - COALESCE(mu.used_quantity, 0))
          ELSE 0
        END) as total_quantity
      FROM purchases p
      LEFT JOIN (
        SELECT purchaseId, SUM(quantity_used) as usedQuantity
        FROM material_usage
        GROUP BY purchaseId
      ) mu ON p.id = mu.purchase_id
      ${whereClause}
      GROUP BY p.product_name, p.material_type
      HAVING total_quantity > 0
      ORDER BY total_quantity DESC
    `

    console.log('🔍 [产品分布] 执行SQL查询:', distributionQuery)
    const allProducts = await prisma.$query_raw_unsafe(distributionQuery) as any[]
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
    const total_quantity = convertedProducts.reduce((sum, item) => {
      const quantity = Number(item.total_quantity) || 0
      return sum + quantity
    }, 0)
    
    // 获取前N名产品
    const topProducts = convertedProducts.slice(0, parseInt(limit as string))
    const topQuantity = topProducts.reduce((sum, item) => sum + item.total_quantity, 0)
    
    // 计算其他产品的数量
    const othersQuantity = total_quantity - topQuantity
    
    // 构建饼图数据 - 百分比基于该产品类型的总量计算
    const pieChartData = topProducts.map(item => ({
      name: item.product_name,
      value: item.total_quantity,
      percentage: ((item.total_quantity / total_quantity) * 100).toFixed(1)
    }))
    
    // 如果有其他产品，添加到数据中
    if (othersQuantity > 0) {
      pieChartData.push({
        name: '其他',
        value: othersQuantity,
        percentage: ((othersQuantity / total_quantity) * 100).toFixed(1)
      })
    }
    
    const responseData = {
      total_quantity: total_quantity,
      topProductsCount: topProducts.length,
      othersCount: convertedProducts.length - topProducts.length,
      topProducts: pieChartData
    }
    
    console.log('📊 [产品分布] 响应数据:', responseData)
    
    // 使用convertToApiFormat确保字段格式符合API规范
    const convertedData = convertToApiFormat(responseData)
    
    res.json({
      success: true,
      message: '获取产品分布数据成功',
      data: convertedData
    })
  } catch (error) {
    console.error('❌ [产品分布] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('获取产品分布数据失败', error instanceof Error ? error.message : '未知错误')
    )
  }
}))

// 获取库存消耗分析
router.get('/consumption-analysis', authenticate_token, asyncHandler(async (req, res) => {
  const { time_range = 'all', limit = 10 } = req.query

  console.log('🔍 [库存消耗分析] 请求参数:', {
    time_range,
    limit,
    userRole: req.user!.role
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
        p.id as purchaseId,
        p.product_name as product_name,
        p.material_type as material_type,
        p.bead_diameter as bead_diameter,
        p.specification,
        p.quality,
        s.name as supplier_name,
        SUM(
          CASE 
            WHEN p.material_type IN ('LOOSE_BEADS', 'BRACELET') THEN mu.quantity_used
        WHEN p.material_type IN ('ACCESSORIES', 'FINISHED') THEN mu.quantity_used
            ELSE 0
          END
        ) as total_consumed,
        COUNT(mu.id) as consumption_count,
        AVG(
          CASE 
            WHEN p.material_type IN ('LOOSE_BEADS', 'BRACELET') THEN mu.quantity_used
        WHEN p.material_type IN ('ACCESSORIES', 'FINISHED') THEN mu.quantity_used
            ELSE 0
          END
        ) as avg_consumption,
        MAX(mu.created_at) as last_consumption_date,
        MIN(mu.created_at) as first_consumption_date,
        CASE 
          WHEN p.material_type IN ('LOOSE_BEADS', 'BRACELET') THEN '颗'
          WHEN p.material_type IN ('ACCESSORIES', 'FINISHED') THEN '件'
          ELSE '个'
        END as unit_type
      FROM material_usage mu
      INNER JOIN purchases p ON mu.purchase_id = p.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1 ${timeCondition}
        AND (
          (p.material_type IN ('LOOSE_BEADS', 'BRACELET') AND mu.quantity_used > 0) OR
      (p.material_type IN ('ACCESSORIES', 'FINISHED') AND mu.quantity_used > 0)
        )
      GROUP BY p.id, p.product_name, p.material_type, p.bead_diameter, p.specification, p.quality, s.name
      ORDER BY total_consumed DESC
      LIMIT ?
    `

    console.log('🔍 [库存消耗分析] 执行SQL查询:', consumptionQuery)
    const consumptionData = await prisma.$query_raw_unsafe(consumptionQuery, parseInt(limit as string)) as any[]
    
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
      totalConsumption: totalConsumption,
      totalConsumptionCount: totalConsumptionCount,
      topConsumedProducts: convertedData,
      analysisDate: new Date().toISOString()
    }

    console.log('📊 [库存消耗分析] 响应数据:', responseData)

    // 权限过滤（雇员不能查看供应商和价格信息）
    if (req.user!.role === 'EMPLOYEE') {
      responseData.topConsumedProducts = responseData.topConsumedProducts.map(item => ({
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
      ErrorResponses.internal('获取库存消耗分析失败', error instanceof Error ? error.message : '未知错误')
    )
  }
}))

// 获取产品价格分布
router.get('/price-distribution', authenticate_token, asyncHandler(async (req, res) => {
  const { 
    material_type = 'LOOSE_BEADS', 
    price_type = 'unit_price', 
    limit = 10 
  } = req.query

  console.log('🔍 [产品价格分布] 请求参数:', {
    material_type,
    price_type,
    limit,
    userRole: req.user!.role
  })

  try {
    // 构建产品类型筛选条件
    let materialTypeCondition = ''
    if (material_type && material_type !== 'ALL') {
      material_typeCondition = `AND p.material_type = '${material_type}'`
    }

    // 根据价格类型选择不同的处理逻辑
    if (price_type === 'unit_price') {
      // 单价分布 - 返回价格区间统计
      const priceRangeQuery = `
        SELECT 
           CASE 
             -- 成品类型使用专门的价格区间
             WHEN material_type = 'FINISHED' AND calculated_price >= 0 AND calculated_price <= 50 THEN '0-50元（含）'
             WHEN material_type = 'FINISHED' AND calculated_price > 50 AND calculated_price <= 100 THEN '50-100元（含）'
             WHEN material_type = 'FINISHED' AND calculated_price > 100 AND calculated_price <= 200 THEN '100-200元（含）'
             WHEN material_type = 'FINISHED' AND calculated_price > 200 AND calculated_price <= 500 THEN '200-500元（含）'
             WHEN material_type = 'FINISHED' AND calculated_price > 500 THEN '500元以上'
             -- 其他产品类型使用原有价格区间
             WHEN material_type != 'FINISHED' AND calculated_price >= 0 AND calculated_price <= 3 THEN '0-3元（含）'
             WHEN material_type != 'FINISHED' AND calculated_price > 3 AND calculated_price <= 10 THEN '3-10元（含）'
             WHEN material_type != 'FINISHED' AND calculated_price > 10 AND calculated_price <= 20 THEN '10-20元（含）'
             WHEN material_type != 'FINISHED' AND calculated_price > 20 AND calculated_price <= 50 THEN '20-50元（含）'
             WHEN material_type != 'FINISHED' AND calculated_price > 50 THEN '50元以上'
             ELSE '未知'
           END as price_range,
          COUNT(*) as count
        FROM (          SELECT             p.material_type as material_type,            CASE               WHEN p.material_type = 'LOOSE_BEADS' AND p.total_beads > 0 THEN p.total_price / p.total_beads              WHEN p.material_type = 'BRACELET' AND p.quantity > 0 THEN p.total_price / p.quantity              WHEN p.material_type = 'ACCESSORIES' AND p.piece_count > 0 THEN p.total_price / p.piece_count              WHEN p.material_type = 'FINISHED' AND p.piece_count > 0 THEN p.total_price / p.piece_count              ELSE NULL            END as calculated_price          FROM purchases p          WHERE p.status IN ('ACTIVE', 'PENDING')             AND p.total_price IS NOT NULL             AND p.total_price > 0            AND (              (p.material_type = 'LOOSE_BEADS' AND p.total_beads IS NOT NULL AND p.total_beads > 0) OR              (p.material_type = 'BRACELET' AND p.quantity IS NOT NULL AND p.quantity > 0) OR              (p.material_type = 'ACCESSORIES' AND p.piece_count IS NOT NULL AND p.piece_count > 0) OR              (p.material_type = 'FINISHED' AND p.piece_count IS NOT NULL AND p.piece_count > 0)            )            ${material_typeCondition}        ) as priceData
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
      
      const rangeData = await prisma.$query_raw_unsafe(priceRangeQuery) as any[]
      const total_count = rangeData.reduce((sum, item) => sum + Number(item.count), 0)
      
      const priceRanges = rangeData.map(item => ({
        name: item.price_range,
        value: Number(item.count),
        percentage: totalCount > 0 ? (Number(item.count) / total_count * 100).toFixed(1) : '0'
      }))
      
      const responseData = {
        material_type: material_type,
        price_type,
        priceLabel: '单价区间分布',
        totalProducts: total_count,
        priceRanges: priceRanges,
        analysisDate: new Date().toISOString()
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
         p.id as purchaseId,
         p.product_name as product_name,
         p.material_type as material_type,
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
         COALESCE(SUM(mu.quantity_used), 0) as usedBeads,
        (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) as remainingBeads,
         ${priceField} as calculated_price
       FROM purchases p
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       LEFT JOIN material_usage mu ON p.id = mu.purchase_id
       WHERE p.status IN ('ACTIVE', 'PENDING') 
         AND p.total_price IS NOT NULL 
         AND p.total_price > 0
         AND (
           (p.material_type IN ('LOOSE_BEADS', 'BRACELET') AND (p.total_beads IS NOT NULL AND p.total_beads > 0 OR p.piece_count IS NOT NULL AND p.piece_count > 0)) OR
         (p.material_type = 'ACCESSORIES' AND p.piece_count IS NOT NULL AND p.piece_count > 0) OR
         (p.material_type = 'FINISHED' AND p.piece_count IS NOT NULL AND p.piece_count > 0)
         )
         ${material_typeCondition}
       GROUP BY p.id, p.product_name, p.material_type, p.bead_diameter, p.specification, 
                p.quality, p.quantity, p.piece_count, p.total_beads, p.unit_price, 
                p.total_price, p.price_per_bead, p.price_per_piece, p.price_per_gram, p.weight, 
                s.name, p.purchase_date, p.created_at
       ORDER BY calculated_price DESC
       LIMIT ?
     `

    console.log('🔍 [产品价格分布] 执行SQL查询:', priceQuery)
    const priceData = await prisma.$query_raw_unsafe(priceQuery, parseInt(limit as string)) as any[]
    
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
     const avg_price = totalProducts > 0 ? 
       convertedData.reduce((sum, item) => sum + (item.calculated_price || 0), 0) / totalProducts : 0
     const maxPrice = totalProducts > 0 ? 
       Math.max(...convertedData.map(item => item.calculated_price || 0)) : 0
     const minPrice = totalProducts > 0 ? 
       Math.min(...convertedData.map(item => item.calculated_price || 0)) : 0

    const responseData = {
      material_type: material_type,
      price_type,
      priceLabel: priceLabel,
      totalProducts: totalProducts,
      avg_price: avg_price,
      maxPrice: maxPrice,
      minPrice: minPrice,
      topPriceProducts: convertedData,
      analysisDate: new Date().toISOString()
    }

    console.log('📊 [产品价格分布] 响应数据:', responseData)

    // 权限过滤（雇员不能查看供应商和价格信息）
    if (req.user!.role === 'EMPLOYEE') {
      responseData.topPriceProducts = responseData.topPriceProducts.map(item => ({
        ...item,
        supplier_name: null,
        unit_price: null,
        total_price: null,
        price_per_bead: null,
        price_per_gram: null
      }))
      responseData.avg_price = 0
      responseData.maxPrice = 0
      responseData.minPrice = 0
    }

    res.json({
      success: true,
      message: '获取产品价格分布成功',
      data: responseData
    })
  } catch (error) {
    console.error('❌ [产品价格分布] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('获取产品价格分布失败', error instanceof Error ? error.message : '未知错误')
    )
  }
}))

// 获取原材料分布数据（饼图）
router.get('/material-distribution', authenticate_token, asyncHandler(async (req, res) => {
  try {
    const { material_type, limit = 10 } = req.query
    
    console.log('📊 [原材料分布] 查询参数:', {
      material_type,
      limit,
      timestamp: new Date().toISOString()
    })
    
    let whereClause = 'WHERE p.material_type IS NOT NULL'
    const queryParams = []
    
    // 添加材料类型过滤
    if (material_type && material_type !== 'ALL') {
      whereClause += ' AND p.material_type = ?'
      queryParams.push(material_type)
    }
    
    const distributionQuery = `
      SELECT 
        p.material_type as material_type,
        COUNT(DISTINCT p.id) as count,
        SUM(p.total_beads - COALESCE(usage_summary.total_used, 0)) as total_remaining_quantity,
        AVG(p.price_per_gram) as avgPricePerGram,
        SUM(p.total_price) as total_value
      FROM purchases p
      LEFT JOIN (
        SELECT purchaseId, SUM(quantity_used) as total_used
        FROM material_usage
        GROUP BY purchaseId
      ) usage_summary ON p.id = usage_summary.purchase_id
      ${whereClause}
      GROUP BY p.material_type
      ORDER BY total_remaining_quantity DESC
      LIMIT ?
    `
    
    queryParams.push(parseInt(limit as string))
    
    console.log('📊 [原材料分布] 执行查询:', {
      query: distributionQuery,
      params: queryParams
    })
    
    const result = await prisma.$query_raw_unsafe(distributionQuery, ...queryParams) as any[]
    
    console.log('📊 [原材料分布] 查询结果:', {
      count: result.length,
      data: result
    })
    
    // 如果没有数据，返回空结果而不是错误
    if (result.length === 0) {
      console.log('📊 [原材料分布] 没有找到数据，返回空结果')
      return res.json({
        success: true,
        message: '暂无原材料分布数据',
        data: {
          items: [],
          total: 0
        }
      })
    }
    
    // 转换BigInt字段为Number
    const convertedResult = result.map(item => ({
      material_type: item.material_type,
      count: Number(item.count),
      total_remaining_quantity: Number(item.total_remaining_quantity),
      avgPricePerGram: item.avgPricePerGram ? Number(item.avgPricePerGram) : null,
      total_value: item.total_value ? Number(item.total_value) : null
    }))
    
    // 权限过滤（雇员不能查看价格信息）
    if (req.user!.role === 'EMPLOYEE') {
      convertedResult.forEach(item => {
        item.avgPricePerGram = null
        item.total_value = null
      })
    }
    
    res.json({
      success: true,
      message: '获取原材料分布数据成功',
      data: {
        items: convertedResult,
        total: convertedResult.length
      }
    })
    return
  } catch (error) {
    console.error('❌ [原材料分布] 查询失败:', error)
    res.status(500).json(
      ErrorResponses.internal('获取原材料分布数据失败', error instanceof Error ? error.message : '未知错误')
    )
    return
  }
}))

// 获取库存详情
router.get('/:purchaseId', authenticate_token, asyncHandler(async (req, res) => {
  const { purchase_id } = req.params

  try {const detailQuery = `
      SELECT 
        p.id as purchase_id,
        p.product_name as product_name,
        CONCAT(p.product_name, ' ', p.bead_diameter, 'mm ', COALESCE(p.quality, ''), '级') as bead_type,
        p.bead_diameter as bead_diameter,
        p.quality,
        p.min_stock_alert as min_stock_alert,
        p.total_beads as originalBeads,
        COALESCE(SUM(mu.quantity_used), 0) as usedBeads,
        (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) as remainingBeads,
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
      GROUP BY p.id, p.product_name, p.bead_diameter, p.quality, p.min_stock_alert, 
               p.total_beads, p.price_per_bead, p.price_per_gram, p.total_price, p.weight,
               s.name, s.contact, s.phone, p.purchase_date, p.photos, p.notes, 
               p.created_at, p.updated_at
    `

    const result = await prisma.$query_raw_unsafe(detailQuery, purchase_id) as any[]

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: '库存记录不存在'
      })
    }

    // 权限过滤
    const filteredResult = filterInventoryData(result, req.user!.role)

    res.json({
      success: true,
      message: '获取库存详情成功',
      data: filteredResult[0]
    })
    return
  } catch (error) {
    console.error('获取库存详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取库存详情失败'
    })
    return
  }
}))

// 获取低库存预警
router.get('/alerts/low-stock', authenticate_token, asyncHandler(async (req, res) => {try {
    const alertQuery = `
      SELECT 
        p.id as purchase_id,
        p.product_name as product_name,
        CONCAT(p.product_name, ' ', p.bead_diameter, 'mm ', COALESCE(p.quality, ''), '级') as bead_type,
        p.bead_diameter as bead_diameter,
        p.quality,
        p.min_stock_alert as min_stock_alert,
        (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) as remainingBeads,
        p.purchase_date as purchase_date
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id
      WHERE p.bead_diameter IS NOT NULL 
        AND p.min_stock_alert IS NOT NULL
      GROUP BY p.id, p.product_name, p.bead_diameter, p.quality, p.min_stock_alert, 
               p.total_beads, p.purchase_date
      HAVING remainingBeads <= p.min_stock_alert
      ORDER BY remainingBeads ASC
    `

    const alerts = await prisma.$query_raw_unsafe(alertQuery) as any[]

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
}))



// 导出库存数据
router.get('/export/excel', authenticate_token, asyncHandler(async (req, res) => {
  try {
    let exportQuery = `
      SELECT 
        p.product_name as '产品名称',
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
    
    if (req.user!.role === 'BOSS') {
      exportQuery += `,
        s.name as '供应商',
        p.price_per_gram as '克价',
        p.price_per_bead as '每颗单价'`
    }
    
    exportQuery += `,
        DATE_FORMAT(p.purchase_date, '%Y-%m-%d') as '采购日期'
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id`
    
    if (req.user!.role === 'BOSS') {
      exportQuery += `
      LEFT JOIN suppliers s ON p.supplier_id = s.id`
    }
    
    exportQuery += `
      WHERE p.bead_diameter IS NOT NULL
      GROUP BY p.id, p.product_name, p.bead_diameter, p.quality, p.min_stock_alert, 
               p.total_beads, p.price_per_gram, p.price_per_bead, p.purchase_date`
    
    if (req.user!.role === 'BOSS') {
      exportQuery += `, s.name`
    }
    
    exportQuery += `
      ORDER BY p.purchase_date DESC`

    const exportData = await prisma.$query_raw_unsafe(exportQuery) as any[]

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
}))



export default router