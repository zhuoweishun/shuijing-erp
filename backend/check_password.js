import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkPassword() {
  try {
    const user = await prisma.user.findUnique({ 
      where: { user_name: 'boss' },
      select: { password: true }
    });
    
    if (user) {
      console.log('Boss用户密码哈希:', user.password);
      
      // 测试几个常见密码
      const testPasswords = ['boss123', 'admin', 'password', '123456', 'boss'];
      
      for (const pwd of testPasswords) {
        const isValid = await bcrypt.compare(pwd, user.password);
        console.log(`密码 '${pwd}' 验证结果:`, isValid);
        if (isValid) {
          console.log(`✅ 正确密码是: ${pwd}`);
          break;
        }
      }
    }
  } catch (error) {
    console.error('检查密码失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPassword()