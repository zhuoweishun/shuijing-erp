import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({ 
      select: { 
        id: true, 
        user_name: true, 
        name: true, 
        role: true, 
        is_active: true 
      } 
    });
    console.log('数据库中的用户:', JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('查询用户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();