import { PrismaClient } from '@prisma/client'

// 创建全局 Prisma 客户端实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 创建Prisma客户端并设置时区
const createPrismaClient = () => {
  const client = new PrismaClient()
  
  // 在连接时设置时区为Asia/Shanghai
  client.$connect().then(async () => {
    await client.$executeRaw`SET time_zone = '+08:00'`
  }).catch(console.error)
  
  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}