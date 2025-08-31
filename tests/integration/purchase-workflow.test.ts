import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// 导入路由
import authRoutes from '../../backend/src/routes/auth';
import supplierRoutes from '../../backend/src/routes/suppliers';
import purchaseRoutes from '../../backend/src/routes/purchases';
import inventoryRoutes from '../../backend/src/routes/inventory';

// 创建测试应用（模拟完整的后端服务）
const createTestApp = () => {
  const app = express();
  
  // 中间件
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // 速率限制（测试环境放宽限制）
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 1000, // 测试环境允许更多请求
    message: { success: false, message: '请求过于频繁，请稍后再试' }
  });
  app.use('/api/', limiter);
  
  // 路由
  app.use('/api/auth', authRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/purchases', purchaseRoutes);
  app.use('/api/inventory', inventoryRoutes);
  
  return app;
};

// 测试数据库连接
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'mysql://root:password@localhost:3306/crystal_erp_test'
    }
  }
});

// 测试用户数据
const testUsers = {
  boss: {
    username: 'test_boss',
    password: 'test_password_123',
    role: 'BOSS'
  },
  employee: {
    username: 'test_employee',
    password: 'test_password_456',
    role: 'EMPLOYEE'
  }
};

// 测试供应商数据
const testSuppliers = [
  { name: '集成测试供应商A' },
  { name: '集成测试供应商B' },
  { name: '集成测试供应商C' }
];

// 测试采购数据
const testPurchases = [
  {
    supplier_name: '集成测试供应商A',
    product_name: '紫水晶手串',
    product_type: '手串',
    bead_diameter: 8,
    quantity: 100,
    unit_price: 25.5,
    purchase_date: '2024-01-15'
  },
  {
    supplier_name: '集成测试供应商B',
    product_name: '玫瑰石英项链',
    product_type: '项链',
    bead_diameter: 6,
    quantity: 50,
    unit_price: 35.0,
    purchase_date: '2024-01-14'
  }
];

describe('采购工作流集成测试', () => {
  let app: express.Application;
  let bossToken: string;
  let employeeToken: string;
  let createdSuppliers: any[] = [];
  let createdPurchases: any[] = [];

  beforeAll(async () => {
    app = createTestApp();
    
    // 连接测试数据库
    await prisma.$connect();
    
    // 清理测试数据
    await cleanupTestData();
    
    // 创建测试用户
    await createTestUsers();
    
    // 获取认证Token
    bossToken = await loginUser(testUsers.boss);
    employeeToken = await loginUser(testUsers.employee);
  });

  afterAll(async () => {
    // 清理测试数据
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('完整采购流程测试', () => {
    test('BOSS用户完整采购流程', async () => {
      // 1. 创建供应商
      console.log('🔄 步骤1: 创建供应商');
      for (const supplierData of testSuppliers) {
        const response = await request(app)
          .post('/api/suppliers')
          .set('Authorization', `Bearer ${bossToken}`)
          .send(supplierData);
        
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        createdSuppliers.push(response.body.data);
      }
      
      // 2. 验证供应商列表
      console.log('🔄 步骤2: 验证供应商列表');
      const suppliersResponse = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${bossToken}`);
      
      expect(suppliersResponse.status).toBe(200);
      expect(suppliersResponse.body.data.length).toBeGreaterThanOrEqual(3);
      
      // 3. 创建采购记录
      console.log('🔄 步骤3: 创建采购记录');
      for (const purchaseData of testPurchases) {
        const response = await request(app)
          .post('/api/purchases')
          .set('Authorization', `Bearer ${bossToken}`)
          .send(purchaseData);
        
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.total_amount).toBe(
          purchaseData.quantity * purchaseData.unit_price
        );
        createdPurchases.push(response.body.data);
      }
      
      // 4. 验证采购列表
      console.log('🔄 步骤4: 验证采购列表');
      const purchasesResponse = await request(app)
        .get('/api/purchases')
        .set('Authorization', `Bearer ${bossToken}`);
      
      expect(purchasesResponse.status).toBe(200);
      expect(purchasesResponse.body.data.length).toBeGreaterThanOrEqual(2);
      
      // 5. 查询库存（采购后应该有库存）
      console.log('🔄 步骤5: 查询库存');
      const inventoryResponse = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${bossToken}`);
      
      expect(inventoryResponse.status).toBe(200);
      expect(inventoryResponse.body.success).toBe(true);
      
      // 6. 验证库存数据正确性
      const inventoryData = inventoryResponse.body.data;
      const handStringInventory = inventoryData.find(
        (item: any) => item.product_type === '手串'
      );
      expect(handStringInventory).toBeDefined();
      expect(handStringInventory.variants.length).toBeGreaterThan(0);
    });

    test('EMPLOYEE用户权限限制测试', async () => {
      // 1. EMPLOYEE不能创建供应商
      console.log('🔄 权限测试1: EMPLOYEE创建供应商应该被拒绝');
      const supplierResponse = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'EMPLOYEE测试供应商' });
      
      expect(supplierResponse.status).toBe(403);
      expect(supplierResponse.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      
      // 2. EMPLOYEE不能查看供应商列表
      console.log('🔄 权限测试2: EMPLOYEE查看供应商列表应该被拒绝');
      const suppliersListResponse = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${employeeToken}`);
      
      expect(suppliersListResponse.status).toBe(403);
      
      // 3. EMPLOYEE可以创建采购记录（使用现有供应商）
      console.log('🔄 权限测试3: EMPLOYEE创建采购记录应该成功');
      const purchaseResponse = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          supplier_name: '集成测试供应商A',
          product_name: 'EMPLOYEE测试产品',
          product_type: '手串',
          bead_diameter: 10,
          quantity: 20,
          unit_price: 15.0,
          purchase_date: '2024-01-16'
        });
      
      expect(purchaseResponse.status).toBe(201);
      expect(purchaseResponse.body.success).toBe(true);
      
      // 4. EMPLOYEE可以查看采购列表
      console.log('🔄 权限测试4: EMPLOYEE查看采购列表应该成功');
      const purchasesResponse = await request(app)
        .get('/api/purchases')
        .set('Authorization', `Bearer ${employeeToken}`);
      
      expect(purchasesResponse.status).toBe(200);
      
      // 5. EMPLOYEE查看库存时应该过滤敏感信息
      console.log('🔄 权限测试5: EMPLOYEE查看库存应该过滤敏感信息');
      const inventoryResponse = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${employeeToken}`);
      
      expect(inventoryResponse.status).toBe(200);
      // 验证敏感字段被过滤（具体实现取决于后端逻辑）
      const inventoryItem = inventoryResponse.body.data[0];
      if (inventoryItem && inventoryItem.variants[0]) {
        // EMPLOYEE不应该看到成本价和供应商信息
        expect(inventoryItem.variants[0].cost_price).toBeUndefined();
        expect(inventoryItem.variants[0].supplier_name).toBeUndefined();
      }
    });
  });

  describe('数据一致性测试', () => {
    test('采购数据与库存数据一致性', async () => {
      // 1. 创建特定的采购记录
      const specificPurchase = {
        supplier_name: '一致性测试供应商',
        product_name: '一致性测试产品',
        product_type: '手串',
        bead_diameter: 12,
        quantity: 75,
        unit_price: 20.0,
        purchase_date: '2024-01-17'
      };
      
      const purchaseResponse = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${bossToken}`)
        .send(specificPurchase);
      
      expect(purchaseResponse.status).toBe(201);
      
      // 2. 查询库存，验证数据一致性
      const inventoryResponse = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${bossToken}`);
      
      expect(inventoryResponse.status).toBe(200);
      
      // 3. 在库存中找到对应的产品
      const inventoryData = inventoryResponse.body.data;
      const targetProductType = inventoryData.find(
        (item: any) => item.product_type === '手串'
      );
      
      expect(targetProductType).toBeDefined();
      
      const targetVariant = targetProductType.variants.find(
        (variant: any) => 
          variant.product_name === '一致性测试产品' &&
          variant.bead_diameter === 12
      );
      
      expect(targetVariant).toBeDefined();
      expect(targetVariant.total_quantity).toBe(75);
      expect(targetVariant.available_quantity).toBe(75);
    });
  });

  describe('错误处理和恢复测试', () => {
    test('网络中断模拟测试', async () => {
      // 模拟网络超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 100);
      });
      
      try {
        await Promise.race([
          request(app)
            .get('/api/purchases')
            .set('Authorization', `Bearer ${bossToken}`)
            .timeout(50), // 设置很短的超时时间
          timeoutPromise
        ]);
      } catch (error: any) {
        expect(error.message).toContain('timeout');
      }
    });

    test('无效数据处理测试', async () => {
      // 测试各种无效数据
      const invalidPurchases = [
        {
          // 缺少必填字段
          product_name: '无效测试产品1',
          quantity: 10
        },
        {
          // 无效的珠子直径
          supplier_name: '测试供应商',
          product_name: '无效测试产品2',
          bead_diameter: 25,
          quantity: 10,
          unit_price: 10
        },
        {
          // 负数量
          supplier_name: '测试供应商',
          product_name: '无效测试产品3',
          bead_diameter: 8,
          quantity: -5,
          unit_price: 10
        }
      ];
      
      for (const invalidPurchase of invalidPurchases) {
        const response = await request(app)
          .post('/api/purchases')
          .set('Authorization', `Bearer ${bossToken}`)
          .send(invalidPurchase);
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('性能测试', () => {
    test('并发请求处理测试', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
        request(app)
          .post('/api/purchases')
          .set('Authorization', `Bearer ${bossToken}`)
          .send({
            supplier_name: '并发测试供应商',
            product_name: `并发测试产品${i}`,
            product_type: '手串',
            bead_diameter: 8,
            quantity: 10,
            unit_price: 15.0,
            purchase_date: '2024-01-18'
          })
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();
      
      // 所有请求都应该成功
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
      
      // 性能要求：10个并发请求应该在5秒内完成
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  // 辅助函数
  async function cleanupTestData() {
    try {
      await prisma.purchase.deleteMany({
        where: {
          OR: [
            { supplier_name: { contains: '集成测试' } },
            { supplier_name: { contains: '一致性测试' } },
            { supplier_name: { contains: '并发测试' } },
            { product_name: { contains: 'EMPLOYEE测试' } }
          ]
        }
      });
      
      await prisma.supplier.deleteMany({
        where: {
          name: {
            contains: '测试'
          }
        }
      });
      
      await prisma.user.deleteMany({
        where: {
          username: {
            startsWith: 'test_'
          }
        }
      });
    } catch (error) {
      console.warn('清理测试数据时出错:', error);
    }
  }

  async function createTestUsers() {
    for (const userData of Object.values(testUsers)) {
      await request(app)
        .post('/api/auth/register')
        .send(userData);
    }
  }

  async function loginUser(userData: any): Promise<string> {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: userData.username,
        password: userData.password
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    return response.body.data.token;
  }
});