import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createBossUser() {
  try {
    // 检查boss用户是否已存在
    const existingBoss = await prisma.user.findUnique({
      where: { user_name: 'boss' }
    });
    
    if (existingBoss) {
      console.log('Boss用户已存在:', existingBoss.user_name);
      return;
    }
    
    // 创建boss用户
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const bossUser = await prisma.user.create({
      data: {
        user_name: 'boss',
        password: hashedPassword,
        name: '系统管理员',
        role: 'BOSS'
      }
    });
    
    console.log('Boss用户创建成功:');
    console.log(`- ID: ${bossUser.id}`);
    console.log(`- 用户名: ${bossUser.user_name}`);
    console.log(`- 真实姓名: ${bossUser.real_name}`);
    console.log(`- 角色: ${bossUser.role}`);
    console.log(`- 密码: 123456`);
    
  } catch (error) {
    console.error('创建Boss用户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createBossUser();