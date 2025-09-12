import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getUserId() {
  try {
    const user = await prisma.user.find_first()
    if (user) {
      console.log('找到用户ID:', user.id)
      console.log('用户名:', user.username)
    } else {
      console.log('没有找到用户')
    }
  } catch (error) {
    console.error('查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

getUserId()