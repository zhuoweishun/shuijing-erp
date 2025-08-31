import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
        isActive: true
      }
    })
    
    console.log('📋 用户列表:')
    users.forEach(user => {
      console.log(`  ID: ${user.id}`)
      console.log(`  用户名: ${user.username}`)
      console.log(`  角色: ${user.role}`)
      console.log(`  姓名: ${user.name}`)
      console.log(`  状态: ${user.isActive ? '激活' : '禁用'}`)
      console.log('  ---')
    })
    
  } catch (error) {
    console.error('❌ 查询用户失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()