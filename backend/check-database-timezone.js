import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDatabaseTimezone() {
  try {
    console.log('检查数据库时区设置...')
    
    // 检查全局时区
    const globalTimezone = await prisma.$queryRaw`SELECT @@global.time_zone as globalTimezone`
    console.log('全局时区:', globalTimezone)
    
    // 检查会话时区
    const sessionTimezone = await prisma.$queryRaw`SELECT @@session.time_zone as sessionTimezone`
    console.log('会话时区:', sessionTimezone)
    
    // 检查系统时区
    const systemTimezone = await prisma.$queryRaw`SELECT @@system_time_zone as systemTimezone`
    console.log('系统时区:', systemTimezone)
    
    // 检查当前时间
    const currentTime = await prisma.$queryRaw`SELECT NOW() as now_time`
    console.log('当前时间:', currentTime)
    
    // 设置会话时区为Asia/Shanghai
    await prisma.$executeRaw`SET time_zone = '+08:00'`
    console.log('已设置会话时区为 +08:00 (Asia/Shanghai)')
    
    // 再次检查会话时区
    const newSessionTimezone = await prisma.$queryRaw`SELECT @@session.time_zone as sessionTimezone`
    console.log('新的会话时区:', newSessionTimezone)
    
    // 检查设置后的当前时间
    const newCurrentTime = await prisma.$queryRaw`SELECT NOW() as now_time`
    console.log('设置时区后的当前时间:', newCurrentTime)
    
  } catch (error) {
    console.error('检查数据库时区失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabaseTimezone()