import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { prisma } from '../lib/prisma'

// 扩展Request类型以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        user_name: string
        role: 'BOSS' | 'EMPLOYEE'
        name: string
      }
    }
  }
}

// JWT密钥
const jwt_secret = process.env.jwt_secret || 'crystal-erp-secret-key'

// 认证中间件
export const authenticate_token = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth_header = req.headers.authorization
    const token = auth_header && auth_header.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问令牌缺失'
      })
    }

    // 验证JWT token
    const decoded = jwt.verify(token, jwt_secret) as any
    
    // 从数据库获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.user_id },
      select: {
        id: true,
        user_name: true,
        role: true,
        name: true,
        is_active: true
      }
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      })
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: '用户账户已被禁用'
      })
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: user.id,
      user_name: user.user_name,
      role: user.role,
      name: user.name
    }

    next()
    return
  } catch (error) {
    logger.error('Token验证失败:', error)
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的访问令牌'
      })
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '访问令牌已过期'
      })
    }

    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

// 角色权限中间件
export const require_role = (roles: ('BOSS' | 'EMPLOYEE')[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      })
    }

    next()
    return
  }
}

// 生成JWT token
export const generate_token = (user_id: string): string => {
  return jwt.sign(
    { user_id },
    jwt_secret,
    { expiresIn: '24h' }
  )
}

// 验证JWT token（不抛出异常）
export const verify_token = (token: string): any => {
  try {
    return jwt.verify(token, jwt_secret)
  } catch (error) {
    return null
  }
}