import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { ErrorResponses, createSuccessResponse } from '../utils/errorResponse.js'
import { OperationLogger } from '../utils/operationLogger.js'

const router = Router()
const prisma = new PrismaClient()

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'crystal-erp-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'

// 用户登录
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body

  // 验证输入
  if (!username || !password) {
    return res.status(400).json(
      ErrorResponses.badRequest('用户名和密码不能为空')
    )
  }

  try {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      return res.status(401).json(
        ErrorResponses.unauthorized('用户名或密码错误')
      )
    }

    // 检查用户状态
    if (!user.isActive) {
      return res.status(401).json(
        ErrorResponses.unauthorized('账户已被禁用')
      )
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json(
        ErrorResponses.unauthorized('用户名或密码错误')
      )
    }

    // 生成JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // 记录登录日志
    logger.info(`用户登录成功: ${username}`, {
      userId: user.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })
    
    // 记录操作日志
    await OperationLogger.logUserLogin(
      user.id,
      req.ip,
      req.get('User-Agent')
    )

    // 返回成功响应
    res.json(
      createSuccessResponse('登录成功', {
        token,
        user: {
          id: user.id,
          username: user.username,
          real_name: user.name,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          status: user.isActive ? 'active' : 'inactive',
          created_at: user.createdAt.toISOString(),
          updated_at: user.updatedAt.toISOString()
        }
      })
    )
  } catch (error) {
    logger.error('登录失败:', error)
    res.status(500).json(
      ErrorResponses.internal('登录失败，请稍后重试')
    )
  }
}))

// 用户注册
router.post('/register', asyncHandler(async (req, res) => {
  // TODO: 实现用户注册逻辑
  res.json(
    ErrorResponses.badRequest('注册功能正在开发中...')
  )
}))

// 验证token
router.get('/verify', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json(
      ErrorResponses.unauthorized('未提供认证token')
    )
  }

  try {
    // 验证token
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user || !user.isActive) {
      return res.status(401).json(
        ErrorResponses.unauthorized('用户不存在或已被禁用')
      )
    }

    // 返回用户信息
    res.json(
      createSuccessResponse('Token验证成功', {
        id: user.id,
        username: user.username,
        real_name: user.name,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status: user.isActive ? 'active' : 'inactive',
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString()
      })
    )
  } catch (error) {
    logger.error('Token验证失败:', error)
    res.status(401).json(
      ErrorResponses.invalidToken('Token无效或已过期')
    )
  }
}))

// 刷新token
router.post('/refresh', asyncHandler(async (req, res) => {
  // TODO: 实现token刷新逻辑
  res.json(
    ErrorResponses.badRequest('Token刷新功能正在开发中...')
  )
}))

// 用户登出
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // 记录登出操作日志
  await OperationLogger.logUserLogout(
    req.user.id,
    req.ip
  )
  
  // TODO: 实现token黑名单逻辑
  res.json(
    createSuccessResponse('登出成功')
  )
}))

export default router