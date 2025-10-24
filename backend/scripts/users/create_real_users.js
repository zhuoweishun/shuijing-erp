import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createRealUsers() {
  try {
    console.log('🚀 开始创建真实用户...')
    
    // 先删除现有用户
    await prisma.user.deleteMany({
      where: {
        user_name: {
          in: ['boss', 'employee']
        }
      }
    })
    console.log('🗑️ 已删除现有用户')
    
    // 创建boss用户
    const bossPassword = await bcrypt.hash('123456', 10)
    console.log('🔐 Boss密码哈希:', bossPassword)
    
    const boss = await prisma.user.create({
      data: {
        user_name: 'boss',
        password: bossPassword,
        role: 'BOSS',
        name: '老板',
        email: 'boss@company.com',
        is_active: true
      }
    })
    
    console.log('✅ Boss用户创建成功:', {
      id: boss.id,
      user_name: boss.user_name,
      role: boss.role
    })
    
    // 验证boss密码
    const bossPasswordCheck = await bcrypt.compare('123456', boss.password)
    console.log('🔍 Boss密码验证:', bossPasswordCheck)
    
    // 创建employee用户
    const employeePassword = await bcrypt.hash('123456', 10)
    console.log('🔐 Employee密码哈希:', employeePassword)
    
    const employee = await prisma.user.create({
      data: {
        user_name: 'employee',
        password: employeePassword,
        role: 'EMPLOYEE',
        name: '员工',
        email: 'employee@company.com',
        is_active: true
      }
    })
    
    console.log('✅ Employee用户创建成功:', {
      id: employee.id,
      user_name: employee.user_name,
      role: employee.role
    })
    
    // 验证employee密码
    const employeePasswordCheck = await bcrypt.compare('123456', employee.password)
    console.log('🔍 Employee密码验证:', employeePasswordCheck)
    
    console.log('\n🎉 所有用户创建完成！')
    console.log('\n📋 登录信息:')
    console.log('Boss账户: 用户名=boss, 密码=123456')
    console.log('Employee账户: 用户名=employee, 密码=123456')
    
  } catch (error) {
    console.error('❌ 创建用户失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createRealUsers().catch(console.error)