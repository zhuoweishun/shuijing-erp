import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('开始初始化数据库数据...')

  // 检查是否已存在boss用户
  const existingBoss = await prisma.user.findUnique({
    where: { user_name: 'boss' }
  })

  if (!existingBoss) {
    // 创建默认boss用户
    const hashedBossPassword = await bcrypt.hash('123456', 10)
    
    const bossUser = await prisma.user.create({
      data: {
        user_name: 'boss',
        password: hashedBossPassword,
        email: 'boss@crystal-erp.com',
        name: '系统管理员',
        role: 'BOSS',
        is_active: true
      }
    })

    console.log('Boss用户创建成功:', bossUser)
  } else {
    console.log('Boss用户已存在，跳过创建')
  }

  // 检查是否已存在employee用户
  const existingEmployee = await prisma.user.findUnique({
    where: { user_name: 'employee' }
  })

  if (!existingEmployee) {
    // 创建默认employee用户
    const hashedEmployeePassword = await bcrypt.hash('123456', 10)
    
    const employeeUser = await prisma.user.create({
      data: {
        user_name: 'employee',
        password: hashedEmployeePassword,
        email: 'employee@crystal-erp.com',
        name: '普通员工',
        role: 'EMPLOYEE',
        is_active: true
      }
    })

    console.log('Employee用户创建成功:', employeeUser)
  } else {
    console.log('Employee用户已存在，跳过创建')
  }

  console.log('数据库初始化完成!')
}

main()
  .catch((e) => {
    console.error('数据库初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })