import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { ErrorResponses, createSuccessResponse } from '../utils/errorResponse.js'

const router = Router()

// 验证用户创建请求
const createUserSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(20, '用户名最多20个字符'),
  email: z.string().email('邮箱格式不正确').optional(),
  password: z.string().min(6, '密码至少6个字符'),
  name: z.string().min(1, '姓名不能为空'),
  phone: z.string().optional(),
  role: z.enum(['BOSS', 'EMPLOYEE']).default('EMPLOYEE')
})

// 验证用户更新请求
const updateUserSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(20, '用户名最多20个字符').optional(),
  email: z.string().email('邮箱格式不正确').optional(),
  name: z.string().min(1, '姓名不能为空').optional(),
  phone: z.string().optional(),
  role: z.enum(['BOSS', 'EMPLOYEE']).optional(),
  is_active: z.boolean().optional()
})

// 验证资料更新请求
const updateProfileSchema = z.object({
  name: z.string().min(1, '姓名不能为空').optional(),
  phone: z.string().optional(),
  email: z.string().email('邮箱格式不正确').optional(),
  avatar: z.string().optional()
})

import { convertToApiFormat, convertFromApiFormat, filterSensitiveFields } from '../utils/fieldConverter'

// 获取用户列表（仅老板权限）
router.get('/', authenticateToken, requireRole('BOSS'), asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, role, active } = req.query
    
    const pageNum = Math.max(1, parseInt(page as string))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)))
    const skip = (pageNum - 1) * limitNum

    // 构建查询条件
    const where: any = {}
    if (role && ['BOSS', 'EMPLOYEE'].includes(role as string)) {
      where.role = role
    }
    if (active !== undefined) {
      where.isActive = active === 'true'
    }

    // 获取用户列表
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          avatar: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.user.count({ where })
    ])

    const convertedUsers = users.map(convertToApiFormat)

    res.json({
      success: true,
      message: '获取用户列表成功',
      data: {
        users: convertedUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    })
  } catch (error: any) {
    res.status(500).json(
      ErrorResponses.internal('获取用户列表失败', error.message)
    )
  }
}))

// 获取用户资料
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json(
        ErrorResponses.unauthorized('用户未认证')
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatar: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return res.status(404).json(
        ErrorResponses.recordNotFound('用户不存在')
      )
    }

    res.json({
      success: true,
      message: '获取用户资料成功',
      data: {
        user: convertToApiFormat(user)
      }
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: '获取用户资料失败',
      error: {
        code: 'PROFILE_ERROR',
        details: error.message
      }
    })
  }
}))

// 更新用户资料
router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '用户未认证',
        error: {
          code: 'UNAUTHORIZED'
        }
      })
    }

    const validatedData = updateProfileSchema.parse(req.body)

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
        ...(validatedData.email !== undefined && { email: validatedData.email }),
        ...(validatedData.avatar !== undefined && { avatar: validatedData.avatar })
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatar: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json({
      success: true,
      message: '更新用户资料成功',
      data: {
        user: convertToApiFormat(updatedUser)
      }
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        message: '请求参数验证失败',
        error: {
          code: 'VALIDATION_ERROR',
          details: error.errors
        }
      })
    } else if (error.code === 'P2002') {
      res.status(400).json({
        success: false,
        message: '邮箱已被使用',
        error: {
          code: 'EMAIL_EXISTS'
        }
      })
    } else {
      res.status(500).json({
        success: false,
        message: '更新用户资料失败',
        error: {
          code: 'UPDATE_PROFILE_ERROR',
          details: error.message
        }
      })
    }
  }
}))

// 创建用户（仅老板权限）
router.post('/', authenticateToken, requireRole('BOSS'), asyncHandler(async (req, res) => {
  try {
    const validatedData = createUserSchema.parse(req.body)

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username: validatedData.username }
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在',
        error: {
          code: 'USERNAME_EXISTS'
        }
      })
    }

    // 检查邮箱是否已存在
    if (validatedData.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: validatedData.email }
      })

      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: '邮箱已被使用',
          error: {
            code: 'EMAIL_EXISTS'
          }
        })
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // 创建用户
    const newUser = await prisma.user.create({
      data: {
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        phone: validatedData.phone,
        role: validatedData.role
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatar: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.status(201).json({
      success: true,
      message: '创建用户成功',
      data: {
        user: convertToApiFormat(newUser)
      }
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        message: '请求参数验证失败',
        error: {
          code: 'VALIDATION_ERROR',
          details: error.errors
        }
      })
    } else {
      res.status(500).json({
        success: false,
        message: '创建用户失败',
        error: {
          code: 'CREATE_USER_ERROR',
          details: error.message
        }
      })
    }
  }
}))

// 更新用户（仅老板权限）
router.put('/:id', authenticateToken, requireRole('BOSS'), asyncHandler(async (req, res) => {
  try {
    const { id } = req.params
    const validatedData = updateUserSchema.parse(req.body)

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        error: {
          code: 'USER_NOT_FOUND'
        }
      })
    }

    // 检查用户名是否已被其他用户使用
    if (validatedData.username) {
      const usernameExists = await prisma.user.findFirst({
        where: {
          username: validatedData.username,
          id: { not: id }
        }
      })

      if (usernameExists) {
        return res.status(400).json({
          success: false,
          message: '用户名已被使用',
          error: {
            code: 'USERNAME_EXISTS'
          }
        })
      }
    }

    // 检查邮箱是否已被其他用户使用
    if (validatedData.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: validatedData.email,
          id: { not: id }
        }
      })

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: '邮箱已被使用',
          error: {
            code: 'EMAIL_EXISTS'
          }
        })
      }
    }

    // 更新用户
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(validatedData.username && { username: validatedData.username }),
        ...(validatedData.email !== undefined && { email: validatedData.email }),
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
        ...(validatedData.role && { role: validatedData.role }),
        ...(validatedData.is_active !== undefined && { isActive: validatedData.is_active })
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatar: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json({
      success: true,
      message: '更新用户成功',
      data: {
        user: convertToApiFormat(updatedUser)
      }
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        message: '请求参数验证失败',
        error: {
          code: 'VALIDATION_ERROR',
          details: error.errors
        }
      })
    } else {
      res.status(500).json({
        success: false,
        message: '更新用户失败',
        error: {
          code: 'UPDATE_USER_ERROR',
          details: error.message
        }
      })
    }
  }
}))

// 删除用户（仅老板权限）
router.delete('/:id', authenticateToken, requireRole('BOSS'), asyncHandler(async (req, res) => {
  try {
    const { id } = req.params
    const currentUserId = req.user?.id

    // 不能删除自己
    if (id === currentUserId) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账户',
        error: {
          code: 'CANNOT_DELETE_SELF'
        }
      })
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        error: {
          code: 'USER_NOT_FOUND'
        }
      })
    }

    // 检查用户是否有关联数据
    const [purchaseCount, productCount] = await Promise.all([
      prisma.purchase.count({ where: { userId: id } }),
      prisma.product.count({ where: { userId: id } })
    ])

    if (purchaseCount > 0 || productCount > 0) {
      return res.status(400).json({
        success: false,
        message: '该用户有关联的采购或产品记录，无法删除',
        error: {
          code: 'USER_HAS_RELATED_DATA',
          details: {
            purchases: purchaseCount,
            products: productCount
          }
        }
      })
    }

    // 删除用户
    await prisma.user.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: '删除用户成功',
      data: {
        deleted_user_id: id
      }
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: '删除用户失败',
      error: {
        code: 'DELETE_USER_ERROR',
        details: error.message
      }
    })
  }
}))

export default router