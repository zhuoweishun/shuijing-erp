import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import purchaseRoutes from '../purchases';
import { authenticateToken } from '../../middleware/auth';

// 模拟Prisma客户端
jest.mock('@prisma/client');
const mockPrisma = {
  purchase: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  supplier: {
    findUnique: jest.fn(),
    create: jest.fn()
  }
};

// 创建测试应用
const app = express();
app.use(express.json());
app.use('/api/purchases', purchaseRoutes);

// 模拟JWT密钥
process.env.JWT_SECRET = 'test-jwt-secret';

// 测试用户数据
const mockBossUser = {
  id: '1',
  username: 'boss',
  role: 'BOSS'
};

const mockEmployeeUser = {
  id: '2',
  username: 'employee',
  role: 'EMPLOYEE'
};

// 生成测试Token
const generateToken = (user: any) => {
  return jwt.sign(user, process.env.JWT_SECRET!, { expiresIn: '1h' });
};

// 模拟采购数据
const mockPurchases = [
  {
    id: '1',
    supplier_name: '测试供应商1',
    product_name: '紫水晶手串',
    product_type: '手串',
    bead_diameter: 8,
    quantity: 100,
    unit_price: 25.5,
    total_amount: 2550,
    purchase_date: new Date('2024-01-15'),
    created_by: '1',
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-15')
  },
  {
    id: '2',
    supplier_name: '测试供应商2',
    product_name: '玫瑰石英项链',
    product_type: '项链',
    bead_diameter: 6,
    quantity: 50,
    unit_price: 35.0,
    total_amount: 1750,
    purchase_date: new Date('2024-01-14'),
    created_by: '1',
    created_at: new Date('2024-01-14'),
    updated_at: new Date('2024-01-14')
  }
];

// 有效的采购数据
const validPurchaseData = {
  supplier_name: '测试供应商',
  product_name: '紫水晶手串',
  product_type: '手串',
  bead_diameter: 8,
  quantity: 100,
  unit_price: 25.5,
  purchase_date: '2024-01-15'
};

describe('Purchases API 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 重置Prisma模拟
    mockPrisma.purchase.findMany.mockResolvedValue(mockPurchases);
    mockPrisma.purchase.create.mockResolvedValue({
      id: '3',
      ...validPurchaseData,
      total_amount: 2550,
      created_by: '1',
      created_at: new Date(),
      updated_at: new Date()
    });
    mockPrisma.supplier.findUnique.mockResolvedValue({
      id: '1',
      name: '测试供应商',
      is_active: true
    });
  });

  describe('GET /api/purchases - 获取采购列表', () => {
    test('BOSS角色应该能够获取完整采购列表', async () => {
      const token = generateToken(mockBossUser);
      
      const response = await request(app)
        .get('/api/purchases')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPurchases);
      expect(mockPrisma.purchase.findMany).toHaveBeenCalledWith({
        orderBy: { created_at: 'desc' }
      });
    });

    test('EMPLOYEE角色应该能够获取采购列表', async () => {
      const token = generateToken(mockEmployeeUser);
      
      const response = await request(app)
        .get('/api/purchases')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPurchases);
    });

    test('分页查询应该正确工作', async () => {
      const token = generateToken(mockBossUser);
      
      const response = await request(app)
        .get('/api/purchases?page=2&limit=10')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(mockPrisma.purchase.findMany).toHaveBeenCalledWith({
        orderBy: { created_at: 'desc' },
        skip: 10,
        take: 10
      });
    });

    test('供应商筛选应该正确工作', async () => {
      const token = generateToken(mockBossUser);
      
      const response = await request(app)
        .get('/api/purchases?supplier=测试供应商1')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(mockPrisma.purchase.findMany).toHaveBeenCalledWith({
        where: {
          supplier_name: {
            contains: '测试供应商1'
          }
        },
        orderBy: { created_at: 'desc' }
      });
    });

    test('日期范围筛选应该正确工作', async () => {
      const token = generateToken(mockBossUser);
      
      const response = await request(app)
        .get('/api/purchases?startDate=2024-01-01&endDate=2024-01-31')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(mockPrisma.purchase.findMany).toHaveBeenCalledWith({
        where: {
          purchase_date: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31')
          }
        },
        orderBy: { created_at: 'desc' }
      });
    });
  });

  describe('POST /api/purchases - 创建采购记录', () => {
    test('BOSS角色应该能够创建采购记录', async () => {
      const token = generateToken(mockBossUser);
      
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(validPurchaseData);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.product_name).toBe('紫水晶手串');
      expect(mockPrisma.purchase.create).toHaveBeenCalledWith({
        data: {
          ...validPurchaseData,
          total_amount: 2550, // quantity * unit_price
          created_by: '1'
        }
      });
    });

    test('EMPLOYEE角色应该能够创建采购记录', async () => {
      const token = generateToken(mockEmployeeUser);
      
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(validPurchaseData);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('缺少必填字段应该返回400错误', async () => {
      const token = generateToken(mockBossUser);
      const invalidData = { ...validPurchaseData };
      delete invalidData.supplier_name;
      
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.message).toContain('供应商名称为必填项');
    });

    test('珠子直径验证应该正确工作', async () => {
      const token = generateToken(mockBossUser);
      
      // 测试直径过小
      const smallDiameterData = { ...validPurchaseData, bead_diameter: 3 };
      let response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(smallDiameterData);
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_DIAMETER');
      expect(response.body.message).toContain('珠子直径必须在4-20mm之间');
      
      // 测试直径过大
      const largeDiameterData = { ...validPurchaseData, bead_diameter: 25 };
      response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(largeDiameterData);
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_DIAMETER');
    });

    test('数量验证应该正确工作', async () => {
      const token = generateToken(mockBossUser);
      
      // 测试负数量
      const negativeQuantityData = { ...validPurchaseData, quantity: -5 };
      let response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(negativeQuantityData);
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.message).toContain('数量必须大于0');
      
      // 测试零数量
      const zeroQuantityData = { ...validPurchaseData, quantity: 0 };
      response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(zeroQuantityData);
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('单价验证应该正确工作', async () => {
      const token = generateToken(mockBossUser);
      
      // 测试负单价
      const negativePriceData = { ...validPurchaseData, unit_price: -10 };
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(negativePriceData);
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.message).toContain('单价必须大于0');
    });

    test('日期验证应该正确工作', async () => {
      const token = generateToken(mockBossUser);
      
      // 测试未来日期
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateData = { 
        ...validPurchaseData, 
        purchase_date: futureDate.toISOString().split('T')[0] 
      };
      
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(futureDateData);
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.message).toContain('采购日期不能是未来日期');
    });

    test('总金额计算应该正确', async () => {
      const token = generateToken(mockBossUser);
      
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(validPurchaseData);
      
      expect(response.status).toBe(201);
      expect(mockPrisma.purchase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          total_amount: 2550 // 100 * 25.5
        })
      });
    });

    test('自动创建新供应商应该正确工作', async () => {
      const token = generateToken(mockBossUser);
      
      // 模拟供应商不存在
      mockPrisma.supplier.findUnique.mockResolvedValueOnce(null);
      mockPrisma.supplier.create.mockResolvedValueOnce({
        id: '2',
        name: '新供应商',
        is_active: true
      });
      
      const newSupplierData = { ...validPurchaseData, supplier_name: '新供应商' };
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(newSupplierData);
      
      expect(response.status).toBe(201);
      expect(mockPrisma.supplier.create).toHaveBeenCalledWith({
        data: {
          name: '新供应商',
          is_active: true
        }
      });
    });
  });

  describe('GET /api/purchases/:id - 获取单个采购记录', () => {
    test('应该能够获取指定采购记录', async () => {
      const token = generateToken(mockBossUser);
      mockPrisma.purchase.findUnique.mockResolvedValue(mockPurchases[0]);
      
      const response = await request(app)
        .get('/api/purchases/1')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPurchases[0]);
      expect(mockPrisma.purchase.findUnique).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });

    test('不存在的采购记录应该返回404错误', async () => {
      const token = generateToken(mockBossUser);
      mockPrisma.purchase.findUnique.mockResolvedValue(null);
      
      const response = await request(app)
        .get('/api/purchases/999')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.message).toContain('采购记录不存在');
    });
  });

  describe('错误处理测试', () => {
    test('数据库错误应该返回500错误', async () => {
      const token = generateToken(mockBossUser);
      mockPrisma.purchase.findMany.mockRejectedValue(new Error('Database connection failed'));
      
      const response = await request(app)
        .get('/api/purchases')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DATABASE_ERROR');
    });

    test('无效的JSON数据应该返回400错误', async () => {
      const token = generateToken(mockBossUser);
      
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      expect(response.status).toBe(400);
    });
  });

  describe('安全性测试', () => {
    test('SQL注入防护', async () => {
      const token = generateToken(mockBossUser);
      const maliciousData = {
        ...validPurchaseData,
        supplier_name: "'; DROP TABLE purchases; --"
      };
      
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(maliciousData);
      
      // 应该正常处理，不会执行SQL注入
      expect(response.status).toBe(201);
      expect(mockPrisma.purchase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          supplier_name: "'; DROP TABLE purchases; --"
        })
      });
    });

    test('XSS防护', async () => {
      const token = generateToken(mockBossUser);
      const xssData = {
        ...validPurchaseData,
        product_name: '<script>alert("xss")</script>'
      };
      
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(xssData);
      
      expect(response.status).toBe(201);
      // 应该清理HTML标签
      expect(mockPrisma.purchase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          product_name: 'alert("xss")' // HTML标签被清理
        })
      });
    });
  });

  describe('性能测试', () => {
    test('大量数据查询应该在合理时间内完成', async () => {
      const token = generateToken(mockBossUser);
      const largePurchaseList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockPurchases[0],
        id: `${i + 1}`,
        product_name: `产品${i + 1}`
      }));
      
      mockPrisma.purchase.findMany.mockResolvedValue(largePurchaseList);
      
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/purchases')
        .set('Authorization', `Bearer ${token}`);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(2000); // 应该在2秒内完成
    });
  });
});