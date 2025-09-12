import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

// 创建Prisma客户端实例
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
})

// 监听Prisma日志事件
prisma.$on('query', (e) => {
  logger.debug('Query executed', {
    query: e.query,
    params: e.params,
    duration: `${e.duration}ms`,
    target: e.target
  })
})

prisma.$on('error', (e) => {
  logger.error('Database error', {
    message: e.message,
    target: e.target
  })
})

prisma.$on('info', (e) => {
  logger.info('Database info', {
    message: e.message,
    target: e.target
  })
})

prisma.$on('warn', (e) => {
  logger.warn('Database warning', {
    message: e.message,
    target: e.target
  })
})

// 数据库连接测试
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    logger.info('数据库连接测试成功')
    return true
  } catch (error) {
    logger.error('数据库连接测试失败', { error })
    return false
  }
}

// 优雅关闭数据库连接
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    await prisma.$disconnect()
    logger.info('数据库连接已关闭')
  } catch (error) {
    logger.error('关闭数据库连接时出错', { error })
  }
}

// 数据库健康检查
export const checkDatabaseHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy'
  message: string
  details?: any
}> => {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1 as health_check`
    const duration = Date.now() - start
    
    return {
      status: 'healthy',
      message: '数据库连接正常',
      details: {
        responseTime: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: '数据库连接异常',
      details: {
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString()
      }
    }
  }
}

// 获取数据库统计信息
export const get_database_stats = async () => {
  try {
    const [userCount, supplierCount, purchaseCount, productCount] = await Promise.all([
      prisma.user.count(),
      prisma.supplier.count(),
      prisma.purchase.count(),
      prisma.product.count()
    ])

    return {
      users: userCount,
      suppliers: supplierCount,
      purchases: purchaseCount,
      products: productCount,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error('获取数据库统计信息失败', { error })
    throw error
  }
}

export { prisma }
export default prisma