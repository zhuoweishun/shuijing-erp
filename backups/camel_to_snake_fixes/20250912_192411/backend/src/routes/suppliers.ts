import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { authenticate_token } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { z } from 'zod'
import { convertToApiFormat, convertFromApiFormat, filterSensitiveFields } from '../utils/fieldConverter.js'
import { operation_logger } from '../utils/operationLogger.js'

const router = Router()

// 创建供应商数据验证schema
const createSupplierSchema = z.object({
  name: z.string().min(1, '供应商名称不能为空').max(100, '供应商名称不能超过100字符'),
  contact: z.string().max(50, '联系人姓名不能超过50字符').optional(),
  phone: z.string().max(20, '电话号码不能超过20字符').optional(),
  email: z.string().email('邮箱格式不正确').max(100, '邮箱不能超过100字符').optional(),
  address: z.string().max(200, '地址不能超过200字符').optional(),
  description: z.string().max(500, '描述不能超过500字符').optional()
})

// 获取供应商列表
router.get('/', authenticate_token, asyncHandler(async (req, res) => {
  // 检查权限：只有老板可以查看供应商信息
  if (req.user!.role !== 'BOSS') {
    return res.status(403).json({
      success: false,
      message: '权限不足，仅老板可查看供应商信息',
      error: {
        code: 'insufficient_permissions',
        details: '雇员无法访问供应商管理功能'
      }
    })
  }
  
  const { page = 1, limit = 1000, search } = req.query
  
  console.log('🔍 [供应商API] 请求参数:', {
    page: Number(page),
    limit: Number(limit),
    search,
    user_role: req.user!.role
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
  
  console.log('📊 [供应商API] 数据库查询结果详情:', {
    查询到的供应商: suppliers.map(s => ({ id: s.id, name: s.name, is_active: s.is_active })),
    实际返回数量: suppliers.length,
    数据库总数量: total,
    查询条件: where
  })
  
  console.log('✅ [供应商API] 查询结果:', {
    返回数量: suppliers.length,
    总数量: total,
    分页信息: {
      page: Number(page),
      limit: Number(limit),
      total_pages: Math.ceil(total / Number(limit))
    }
  })
  
  // 转换字段命名
  const convertedSuppliers = suppliers.map(convertToApiFormat)
  
  res.json({
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
  return
}))

// 获取供应商统计
router.get('/stats', authenticate_token, asyncHandler(async (req, res) => {
  // 检查权限：只有老板可以查看供应商统计
  if (req.user!.role !== 'BOSS') {
    return res.status(403).json({
      success: false,
      message: '权限不足，仅老板可查看供应商统计',
      error: {
        code: 'insufficient_permissions',
        details: '雇员无法访问供应商统计功能'
      }
    })
  }
  
  res.json({
    success: false,
    message: '供应商统计功能正在开发中...'
  })
  return
}))

// 临时调试端点：检查重复供应商
router.get('/debug/duplicates', authenticate_token, asyncHandler(async (req, res) => {
  // 检查权限：只有老板可以访问调试端点
  if (req.user!.role !== 'BOSS') {
    return res.status(403).json({
      success: false,
      message: '权限不足，仅老板可访问调试功能',
      error: {
        code: 'insufficient_permissions',
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
  
  res.json({
    success: true,
    data: duplicates
  })
  return
}))

// 临时调试端点：查询数据库中所有供应商统计
router.get('/debug/count', authenticate_token, asyncHandler(async (req, res) => {
  // 检查权限：只有老板可以访问调试端点
  if (req.user!.role !== 'BOSS') {
    return res.status(403).json({
      success: false,
      message: '权限不足，仅老板可访问调试功能',
      error: {
        code: 'insufficient_permissions',
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
  
  res.json({
    success: true,
    data: {
      totalSuppliers: totalSuppliers,
      activeSuppliers: activeSuppliers,
      inactiveSuppliers: inactiveSuppliers,
      allActiveSuppliers: allActiveSuppliers.map(convertToApiFormat)
    }
  })
  return
}))

// 创建供应商
router.post('/', authenticate_token, asyncHandler(async (req, res) => {
  // 检查权限：只有老板可以创建供应商
  if (req.user!.role !== 'BOSS') {
    return res.status(403).json({
      success: false,
      message: '权限不足，仅老板可创建供应商',
      error: {
        code: 'insufficient_permissions',
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
    user_role: req.user!.role
  })
  
  // 数据一致性检查：确保供应商名称唯一性
  const existingSupplier = await prisma.supplier.findFirst({
    where: {
      name: validatedData.name,
      is_active: true
    }
  })
  
  if (existingSupplier) {
    console.warn('⚠️ [数据一致性] 尝试创建重复供应商名称:', {
      请求名称: validatedData.name,
      已存在供应商: {
        id: existingSupplier.id,
        name: existingSupplier.name,
        created_at: existingSupplier.created_at
      },
      操作用户: req.user!.user_name
    })
    
    return res.status(400).json({
      success: false,
      message: '供应商名称已存在',
      error: {
        code: 'DUPLICATE_SUPPLIER_NAME',
        details: `供应商名称 "${validatedData.name}" 已存在，ID: ${existingSupplier.id}`
      }
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
  
  // 创建供应商
  const supplier = await prisma.supplier.create({
    data: {
      name: validatedData.name,
      contact: validatedData.contact,
      phone: validatedData.phone,
      email: validatedData.email,
      address: validatedData.address,
      description: validatedData.description
    }
  })
  
  console.log('✅ [供应商创建] 新供应商创建成功:', {
    id: supplier.id,
    name: supplier.name,
    contact: supplier.contact,
    phone: supplier.phone,
    created_at: supplier.created_at,
    操作用户: req.user!.user_name,
    数据一致性: 'ID和名称已确保唯一性'
  })
  
  // 记录操作日志
  await operation_logger.log_supplier_create(
    req.user!.id,
    supplier.id,
    supplier,
    req.ip
  )
  
  // 转换字段命名
  const convertedSupplier = convertToApiFormat(supplier)
  
  res.status(201).json({
    success: true,
    message: '供应商创建成功',
    data: convertedSupplier
  })
  return
}))

// 更新供应商
router.put('/:id', authenticate_token, asyncHandler(async (req, res) => {
  // 检查权限：只有老板可以更新供应商
  if (req.user!.role !== 'BOSS') {
    return res.status(403).json({
      success: false,
      message: '权限不足，仅老板可更新供应商',
      error: {
        code: 'insufficient_permissions',
        details: '雇员无法更新供应商信息'
      }
    })
  }
  
  res.json({
    success: false,
    message: '更新供应商功能正在开发中...',
    error: {
      code: 'NOT_IMPLEMENTED',
      details: '该功能尚未实现'
    }
  })
  return
}))

export default router