import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// 加载测试环境变量
dotenv.config({ path: '.env.test' });

// 创建测试数据库连接
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    }
  }
});

// 全局测试设置
beforeAll(async () => {
  // 连接测试数据库
  await prisma.$connect();
  
  // 清理测试数据
  await cleanupTestData();
});

// 每个测试后清理
afterEach(async () => {
  await cleanupTestData();
});

// 全局测试清理
afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

// 清理测试数据函数
async function cleanupTestData() {
  try {
    // 按依赖关系顺序删除数据
    await prisma.purchase.deleteMany({
      where: {
        supplier_name: {
          contains: 'test'
        }
      }
    });
    
    await prisma.product.deleteMany({
      where: {
        product_name: {
          contains: 'test'
        }
      }
    });
    
    await prisma.supplier.deleteMany({
      where: {
        name: {
          contains: 'test'
        }
      }
    });
    
    await prisma.user.deleteMany({
      where: {
        username: {
          contains: 'test'
        }
      }
    });
  } catch (error) {
    console.warn('清理测试数据时出错:', error);
  }
}

// 导出测试工具
export { prisma, cleanupTestData };

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.PORT = '3001';

// 模拟外部服务
jest.mock('node-fetch', () => jest.fn());

// 全局测试超时
jest.setTimeout(30000);