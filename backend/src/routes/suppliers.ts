import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { authenticateToken } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { z } from 'zod'
// 移除fieldConverter导入，直接使用snake_case
import { OperationLogger } from '../utils/operationLogger'

const router = Router()

// 创建供应商数据验证schema
const createSupplierSchema = z.object({
  name: z.string().min(1, '供应商名称不能为空').max(100, '供应商名称不能超过100字符'),
  contact: z.string().max(50, '联系人姓名不能超过50字符').nullable().optional(),
  phone: z.string().max(20, '电话号码不能超过20字符').nullable().optional(),
  email: z.string().email('邮箱格式不正确').max(100, '邮箱不能超过100字符').nullable().optional(),
  address: z.string().max(200, '地址不能超过200字符').nullable().optional(),
  description: z.string().max(500, '描述不能超过500字符').nullable().optional()
})

// 生成供应商编号函数
async function generateSupplierCode(): Promise<string> {
  const currentYear = new Date().getFullYear()
  const prefix = `GYS${currentYear}`
  
  // 查找当前年份最大的序号
  const lastSupplier = await prisma.supplier.findFirst({
    where: {
      supplier_code: {
        startsWith: prefix
      }
    },
    orderBy: {
      supplier_code: 'desc'
    }
  })
  
  let nextSequence = 1
  if (lastSupplier && lastSupplier.supplier_code) {
    // 提取序号部分（最后4位）
    const sequencePart = lastSupplier.supplier_code.slice(-4)
    const lastSequence = parseInt(sequencePart, 10)
    nextSequence = lastSequence + 1
  }
  
  // 格式化为4位数字
  const sequenceStr = nextSequence.toString().padStart(4, '0')
  return `${prefix}${sequenceStr}`
}

// 获取供应商列表
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  // 检查权限：只有老板可以查看供应商信息
  if ((req.user?.role || "USER") !== 'BOSS') {
    return res.status(403).json({
      success: false,
      message: '权限不足，仅老板可查看供应商信息',
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        details: '雇员无法访问供应商管理功能'
      }
    })
  }
  
  const { page = 1, limit = 1000, search } = req.query
  
  console.log('🔍 [供应商API] 请求参数:', {
    page: Number(page),
    limit: Number(limit),
    search,
    userRole: req.user?.role || "USER"
  })
  
  const where: any = {
    is_active: true
  }
  
  if (search) {
    where.name = {
      contains: search as string
    }
  }
  
  console.log('🔍 [供应商API] 数据库查询条件:', {
    where,
    orderBy: { name: 'asc' },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit)
  })
  
  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: {
      name: 'asc'
    },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit)
  })

  const total = await prisma.supplier.count({ where })

  // 获取每个供应商的最后采购时间
  const supplierIds = suppliers.map(s => s.id)
  const lastPurchases = await prisma.purchase.groupBy({
    by: ['supplier_id'],
    where: {
      supplier_id: {
        in: supplierIds
      }
    },
    _max: {
      purchase_date: true
    }
  })

  // 创建供应商ID到最后采购时间的映射
  const lastPurchaseMap = new Map()
  lastPurchases.forEach(purchase => {
    lastPurchaseMap.set(purchase.supplier_id, purchase._max.purchase_date)
  })

  console.log('📊 [供应商API] 数据库查询结果详情:', {
    查询到的供应商: suppliers.map(s => ({ id: s.id, name: s.name, is_active: s.is_active })),
    实际返回数量: suppliers.length,
    数据库总数量: total,
    查询条件: where,
    最后采购时间数据: lastPurchases.length
  })

  console.log('✅ [供应商API] 查询结果:', {
    返回数量: suppliers.length,
    总数量: total,
    分页信息: {
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    }
  })

  // 直接使用蛇形命名，无需转换，并添加最后采购时间
  const convertedSuppliers = suppliers.map(supplier => ({
    ...supplier,
    created_at: supplier.created_at,
    updated_at: supplier.updated_at,
    last_purchase_date: lastPurchaseMap.get(supplier.id) || null
  }))
  
  return res.json({
    success: true,
    message: '获取供应商列表成功',
    data: {
      suppliers: convertedSuppliers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  })
  // 函数结束
  // 函数结束
}))

// 获取供应商采购记录
router.get('/:id/purchases', authenticateToken, asyncHandler(async (req, res) => {
  // 检查权限：只有老板可以查看供应商采购记录
  if ((req.user?.role || "USER") !== 'BOSS') {
    return res.status(403).json({
      success: false,
      message: '权限不足，仅老板可查看供应商采购记录',
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        details: '雇员无法访问供应商采购记录'
      }
    })
  }

  const { id } = req.params
  const { page = 1, limit = 50, type = 'all' } = req.query

  console.log('🔍 [供应商采购记录API] 请求参数:', {
    supplier_id: id,
    page: Number(page),
    limit: Number(limit),
    type,
    userRole: req.user?.role || "USER"
  })

  // 首先验证供应商是否存在
  const supplier = await prisma.supplier.findUnique({
    where: { id: id as string, is_active: true }
  })

  if (!supplier) {
    return res.status(404).json({
      success: false,
      message: '供应商不存在或已被删除',
      error: {
        code: 'SUPPLIER_NOT_FOUND',
        details: `供应商ID ${id} 不存在`
      }
    })
  }

  let purchases: any[] = []
  let materials: any[] = []
  let total_purchases = 0
  let total_materials = 0

  // 查询采购记录（通过supplier_name关联）
  if (type === 'all' || type === 'purchases') {
    const purchaseWhere = {
      supplier_id: id as string
    }

    purchases = await prisma.purchase.findMany({
      where: purchaseWhere,
      orderBy: { created_at: 'desc' },
      skip: type === 'purchases' ? (Number(page) - 1) * Number(limit) : 0,
      take: type === 'purchases' ? Number(limit) : 10,
      select: {
        id: true,
        purchase_name: true,
        purchase_type: true,
        quantity: true,
        total_price: true,
        unit_price: true,
        supplier_id: true,
        created_at: true,
        notes: true
      }
    })

    total_purchases = await prisma.purchase.count({ where: purchaseWhere })
  }

  // 查询原材料记录（通过supplier_id关联）
  if (type === 'all' || type === 'materials') {
    const materialWhere = {
      supplier_id: id as string
    }

    materials = await prisma.material.findMany({
      where: materialWhere,
      orderBy: { created_at: 'desc' },
      skip: type === 'materials' ? (Number(page) - 1) * Number(limit) : 0,
      take: type === 'materials' ? Number(limit) : 10,
      select: {
        id: true,
        material_name: true,
        material_type: true,
        remaining_quantity: true,
        inventory_unit: true,
        unit_cost: true,
        created_at: true,
        notes: true,
        material_code: true,
        quality: true,
        stock_status: true
      }
    })

    total_materials = await prisma.material.count({ where: materialWhere })
  }

  // 计算统计信息
  const statistics = {
    total_purchases,
    total_materials,
    total_purchase_amount: purchases.reduce((sum, p) => sum + (p.total_price || 0), 0),
    total_material_amount: materials.reduce((sum, m) => sum + ((m.unit_price || 0) * (m.quantity || 0)), 0),
    first_purchase_date: purchases.length > 0 ? purchases[purchases.length - 1]?.created_at : null,
    last_purchase_date: purchases.length > 0 ? purchases[0]?.created_at : null,
    first_material_date: materials.length > 0 ? materials[materials.length - 1]?.created_at : null,
    last_material_date: materials.length > 0 ? materials[0]?.created_at : null
  }

  console.log('📊 [供应商采购记录API] 查询结果:', {
    supplier_name: supplier.name,
    purchases_count: purchases.length,
    materials_count: materials.length,
    statistics
  })

  return res.json({
    success: true,
    message: '获取供应商采购记录成功',
    data: {
      supplier: {
        id: supplier.id,
        name: supplier.name,
        contact: supplier.contact,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        description: supplier.description
      },
      purchases,
      materials,
      statistics,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: type === 'purchases' ? total_purchases : type === 'materials' ? total_materials : total_purchases + total_materials,
        pages: Math.ceil((type === 'purchases' ? total_purchases : type === 'materials' ? total_materials : total_purchases + total_materials) / Number(limit))
      }
    }
  })
}))

// 获取供应商统计
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  // 检查权限：只有老板可以查看供应商统计
  if ((req.user?.role || "USER") !== 'BOSS') {
    return res.status(403).json({
      success: false,
      message: '权限不足，仅老板可查看供应商统计',
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        details: '雇员无法访问供应商统计功能'
      }
    })
  }
  
  return res.json({
    success: false,
    message: '供应商统计功能正在开发中...'
  })
  // 函数结束
  // 函数结束
}))

// 临时调试端点：检查重复供应商
router.get('/debug/duplicates', authenticateToken, asyncHandler(async (req, res) => {
  // 检查权限：只有老板可以访问调试端点
  if ((req.user?.role || "USER") !== 'BOSS') {
    return res.status(403).json({
      success: false,
      message: '权限不足，仅老板可访问调试功能',
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        details: '雇员无法访问供应商调试端点'
      }
    })
  }
  
  const duplicates = await prisma.$queryRaw`
    SELECT name, COUNT(*) as count, GROUP_CONCAT(id) as ids
    FROM suppliers 
    WHERE is_active = 1 
    GROUP BY name 
    HAVING count > 1
  `
  
  return res.json({
    success: true,
    data: duplicates
  })
  // 函数结束
  // 函数结束
}))

// 临时调试端点：查询数据库中所有供应商统计
router.get('/debug/count', authenticateToken, asyncHandler(async (req, res) => {
  // 检查权限：只有老板可以访问调试端点
  if ((req.user?.role || "USER") !== 'BOSS') {
    return res.status(403).json({
      success: false,
      message: '权限不足，仅老板可访问调试功能',
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        details: '雇员无法访问供应商调试端点'
      }
    })
  }
  
  const totalSuppliers = await prisma.supplier.count()
  const activeSuppliers = await prisma.supplier.count({ where: { is_active: true } })
  const inactiveSuppliers = await prisma.supplier.count({ where: { is_active: false } })
  
  // 获取所有活跃供应商的详细信息
  const allActiveSuppliers = await prisma.supplier.findMany({
    where: { is_active: true },
    select: { id: true, name: true, is_active: true, created_at: true },
    orderBy: { name: 'asc' }
  })
  
  console.log('🔍 [调试端点] 数据库供应商统计:', {
    总供应商数: totalSuppliers,
    活跃供应商数: activeSuppliers,
    非活跃供应商数: inactiveSuppliers,
    活跃供应商列表: allActiveSuppliers
  })
  
  return res.json({
    success: true,
    data: {
      total_suppliers: totalSuppliers,
      active_suppliers: activeSuppliers,
      inactive_suppliers: inactiveSuppliers,
      all_active_suppliers: allActiveSuppliers.map(supplier => ({
        ...supplier,
        created_at: supplier.created_at,
        updated_at: supplier.created_at
      }))
    }
  })
  // 函数结束
  // 函数结束
}))

// 创建供应商
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  // 检查权限：只有老板可以创建供应商
  if ((req.user?.role || "USER") !== 'BOSS') {
    return res.status(403).json({
      success: false,
      message: '权限不足，仅老板可创建供应商',
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        details: '雇员无法创建供应商'
      }
    })
  }
  
  // 验证请求数据
  const validatedData = createSupplierSchema.parse(req.body)
  
  console.log('🔍 [供应商创建] 数据验证通过:', {
    name: validatedData.name,
    contact: validatedData.contact,
    phone: validatedData.phone,
    userRole: req.user?.role || "USER"
  })
  
  // 数据一致性检查：检查供应商名称唯一性（包括已删除的）
  const existingActiveSupplier = await prisma.supplier.findFirst({
    where: {
      name: validatedData.name,
      is_active: true
    }
  })
  
  if (existingActiveSupplier) {
    console.warn('⚠️ [数据一致性] 尝试创建重复供应商名称:', {
      请求名称: validatedData.name,
      已存在供应商: {
        id: existingActiveSupplier.id,
        name: existingActiveSupplier.name,
        created_at: existingActiveSupplier.created_at
      },
      操作用户: req.user?.user_name
    })
    
    return res.status(400).json({
      success: false,
      message: '供应商名称已存在',
      error: {
        code: 'DUPLICATE_SUPPLIER_NAME',
        details: `供应商名称 "${validatedData.name}" 已存在，ID: ${existingActiveSupplier.id}`
      }
    })
  }

  // 检查是否存在已删除的同名供应商
  const deletedSupplier = await prisma.supplier.findFirst({
    where: {
      name: validatedData.name,
      is_active: false
    }
  })
  
  if (deletedSupplier) {
    console.log('🔄 [供应商恢复] 发现已删除的同名供应商，将恢复该供应商:', {
      请求名称: validatedData.name,
      已删除供应商: {
        id: deletedSupplier.id,
        name: deletedSupplier.name,
        created_at: deletedSupplier.created_at
      },
      操作用户: req.user?.user_name
    })
    
    // 为恢复的供应商生成编号（如果没有的话）
    const supplier_code = deletedSupplier.supplier_code || await generateSupplierCode()
    
    // 恢复并更新供应商信息
    const restoredSupplier = await prisma.supplier.update({
      where: { id: deletedSupplier.id },
      data: {
        is_active: true,
        contact: validatedData.contact,
        phone: validatedData.phone,
        email: validatedData.email,
        address: validatedData.address,
        description: validatedData.description,
        supplier_code: supplier_code,
        updated_at: new Date()
      }
    })
    
    console.log('✅ [供应商恢复] 供应商恢复成功:', {
      id: restoredSupplier.id,
      name: restoredSupplier.name,
      contact: restoredSupplier.contact,
      phone: restoredSupplier.phone,
      updated_at: restoredSupplier.updated_at,
      操作用户: req.user?.user_name
    })
    
    // 记录操作日志
    await OperationLogger.logSupplierCreate(
      req.user?.id || '',
      restoredSupplier.id,
      restoredSupplier,
      req.ip
    )
    
    const convertedSupplier = {
      ...restoredSupplier,
      created_at: restoredSupplier.created_at,
      updated_at: restoredSupplier.updated_at
    }
    
    return res.status(201).json({
      success: true,
      message: '供应商创建成功（已恢复之前删除的供应商）',
      data: convertedSupplier
    })
  }
  
  // 额外检查：确保没有相似名称的供应商（忽略大小写和空格）
  const normalizedName = validatedData.name.toLowerCase().trim()
  const similarSuppliers = await prisma.supplier.findMany({
    where: {
      is_active: true
    }
  })
  
  const conflictingSupplier = similarSuppliers.find(s => 
    s.name.toLowerCase().trim() === normalizedName && s.name !== validatedData.name
  )
  
  if (conflictingSupplier) {
    console.warn('⚠️ [数据一致性] 发现相似供应商名称:', {
      请求名称: validatedData.name,
      相似供应商: {
        id: conflictingSupplier.id,
        name: conflictingSupplier.name
      }
    })
    
    return res.status(400).json({
      success: false,
      message: '存在相似的供应商名称',
      error: {
        code: 'SIMILAR_SUPPLIER_NAME',
        details: `存在相似的供应商名称 "${conflictingSupplier.name}"，请检查是否重复`
      }
    })
  }
  
  // 生成供应商编号
  const supplier_code = await generateSupplierCode()
  
  // 创建供应商
  const supplier = await prisma.supplier.create({
    data: {
      name: validatedData.name,
      contact: validatedData.contact,
      phone: validatedData.phone,
      email: validatedData.email,
      address: validatedData.address,
      description: validatedData.description,
      supplier_code: supplier_code
    }
  })
  
  console.log('✅ [供应商创建] 新供应商创建成功:', {
    id: supplier.id,
    name: supplier.name,
    contact: supplier.contact,
    phone: supplier.phone,
    created_at: supplier.created_at,
    操作用户: req.user?.user_name,
    数据一致性: 'ID和名称已确保唯一性'
  })
  
  // 记录操作日志
  await OperationLogger.logSupplierCreate(
    req.user?.id || '',
    supplier.id,
    supplier,
    req.ip
  )
  
  // 直接使用蛇形命名，无需转换
  const convertedSupplier = {
    ...supplier,
    created_at: supplier.created_at,
    updated_at: supplier.updated_at
  }
  
  return res.status(201).json({
    success: true,
    message: '供应商创建成功',
    data: convertedSupplier
  })
  // 函数结束
  // 函数结束
}))

// 更新供应商
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  // 检查权限：只有老板可以更新供应商
  if ((req.user?.role || "USER") !== 'BOSS') {
    return res.status(403).json({
      success: false,
      message: '权限不足，仅老板可更新供应商',
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        details: '雇员无法更新供应商信息'
      }
    })
  }

  const { id } = req.params
  
  // 验证请求数据
  const validatedData = createSupplierSchema.parse(req.body)
  
  console.log('🔍 [供应商更新] 数据验证通过:', {
    id,
    name: validatedData.name,
    contact: validatedData.contact,
    phone: validatedData.phone,
    userRole: req.user?.role || "USER"
  })

  // 检查供应商是否存在
  const existingSupplier = await prisma.supplier.findUnique({
    where: { id, is_active: true }
  })

  if (!existingSupplier) {
    return res.status(404).json({
      success: false,
      message: '供应商不存在或已被删除',
      error: {
        code: 'SUPPLIER_NOT_FOUND',
        details: `供应商ID ${id} 不存在`
      }
    })
  }

  // 检查名称唯一性（排除当前供应商）
  if (validatedData.name !== existingSupplier.name) {
    const duplicateSupplier = await prisma.supplier.findFirst({
      where: {
        name: validatedData.name,
        is_active: true,
        id: { not: id }
      }
    })

    if (duplicateSupplier) {
      console.warn('⚠️ [数据一致性] 尝试更新为重复供应商名称:', {
        请求名称: validatedData.name,
        已存在供应商: {
          id: duplicateSupplier.id,
          name: duplicateSupplier.name
        },
        当前供应商: {
          id: existingSupplier.id,
          name: existingSupplier.name
        }
      })

      return res.status(400).json({
        success: false,
        message: '供应商名称已存在',
        error: {
          code: 'DUPLICATE_SUPPLIER_NAME',
          details: `供应商名称 "${validatedData.name}" 已存在，ID: ${duplicateSupplier.id}`
        }
      })
    }
  }

  // 更新供应商
  const updatedSupplier = await prisma.supplier.update({
    where: { id },
    data: {
      name: validatedData.name,
      contact: validatedData.contact,
      phone: validatedData.phone,
      email: validatedData.email,
      address: validatedData.address,
      description: validatedData.description,
      updated_at: new Date()
    }
  })

  console.log('✅ [供应商更新] 供应商更新成功:', {
    id: updatedSupplier.id,
    name: updatedSupplier.name,
    updated_at: updatedSupplier.updated_at,
    操作用户: req.user?.user_name
  })

  // 记录操作日志
  await OperationLogger.logSupplierUpdate(
    req.user?.id || '',
    updatedSupplier.id,
    existingSupplier,
    updatedSupplier,
    req.ip
  )

  return res.json({
    success: true,
    message: '供应商更新成功',
    data: {
      ...updatedSupplier,
      created_at: updatedSupplier.created_at,
      updated_at: updatedSupplier.updated_at
    }
  })
}))

// 删除供应商（软删除）
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  // 检查权限：只有老板可以删除供应商
  if ((req.user?.role || "USER") !== 'BOSS') {
    return res.status(403).json({
      success: false,
      message: '权限不足，仅老板可删除供应商',
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        details: '雇员无法删除供应商'
      }
    })
  }

  const { id } = req.params

  // 检查供应商是否存在
  const existingSupplier = await prisma.supplier.findUnique({
    where: { id, is_active: true }
  })

  if (!existingSupplier) {
    return res.status(404).json({
      success: false,
      message: '供应商不存在或已被删除',
      error: {
        code: 'SUPPLIER_NOT_FOUND',
        details: `供应商ID ${id} 不存在`
      }
    })
  }

  // 检查是否有关联的采购记录和原材料记录
  // 1. 检查未删除的采购记录
  const activePurchases = await prisma.purchase.count({
    where: { 
      supplier_id: id,
      status: {
        not: 'USED' // 只要不是USED状态的采购记录都算作活跃记录
      }
    }
  })

  // 2. 检查相关的原材料记录
  const relatedMaterials = await prisma.material.count({
    where: { supplier_id: id }
  })

  // 3. 检查已删除的采购记录数量（用于提供详细信息）
  const deletedPurchases = await prisma.purchase.count({
    where: { 
      supplier_id: id,
      status: 'USED'
    }
  })

  const totalPurchases = activePurchases + deletedPurchases

  // 智能删除逻辑
  if (activePurchases > 0) {
    return res.status(400).json({
      success: false,
      message: '无法删除供应商，存在未处理完成的采购记录',
      error: {
        code: 'SUPPLIER_HAS_ACTIVE_PURCHASES',
        details: `供应商 "${existingSupplier.name}" 有 ${activePurchases} 条未处理完成的采购记录。只有当所有采购记录都已处理完成（原材料已完全使用或退回）后，才能删除供应商。`,
        data: {
          active_purchases: activePurchases,
          total_purchases: totalPurchases,
          related_materials: relatedMaterials
        }
      }
    })
  }

  if (relatedMaterials > 0) {
    return res.status(400).json({
      success: false,
      message: '无法删除供应商，存在关联的原材料库存记录',
      error: {
        code: 'SUPPLIER_HAS_MATERIALS',
        details: `供应商 "${existingSupplier.name}" 有 ${relatedMaterials} 条原材料库存记录。请先处理完所有相关的原材料库存后再删除供应商。`,
        data: {
          related_materials: relatedMaterials,
          total_purchases: totalPurchases
        }
      }
    })
  }

  // 如果有已处理完成的采购记录但没有活跃记录和原材料，允许删除
  if (totalPurchases > 0) {
    console.log('✅ [供应商删除] 允许删除：所有采购记录已处理完成', {
      supplier_id: id,
      supplier_name: existingSupplier.name,
      total_purchases: totalPurchases,
      deleted_purchases: deletedPurchases,
      操作用户: req.user?.user_name
    })
  }

  // 软删除供应商
  const deletedSupplier = await prisma.supplier.update({
    where: { id },
    data: {
      is_active: false,
      updated_at: new Date()
    }
  })

  console.log('✅ [供应商删除] 供应商软删除成功:', {
    id: deletedSupplier.id,
    name: deletedSupplier.name,
    is_active: deletedSupplier.is_active,
    操作用户: req.user?.user_name
  })

  // 记录操作日志
  await OperationLogger.logSupplierDelete(
    req.user?.id || '',
    deletedSupplier.id,
    existingSupplier,
    req.ip
  )

  return res.json({
    success: true,
    message: '供应商删除成功',
    data: {
      id: deletedSupplier.id,
      name: deletedSupplier.name,
      is_active: deletedSupplier.is_active
    }
  })
}))

export default router