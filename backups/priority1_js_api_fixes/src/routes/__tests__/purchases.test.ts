import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import purchaseRoutes from '../purchases';
import { authenticate_token } from '../../middleware/auth';

// 模拟Prisma客户端
jest.mock('@prisma/client');
const mockPrisma = {
  purchase: {
    find_many: jest.fn(),
    create: jest.fn(),
    find_unique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  supplier: {
    find_unique: jest.fn(),
    create: jest.fn()
  }
};

// 创建测试应用
const app = express();
app.use(express.json());
app.use('/api/purchases', purchaseRoutes);

// 模拟JWT密钥
process.env.jwt_secret = 'test-jwt-secret';

// 测试用户数据
const mockBossUser = {
  id: '1',
  user_name: 'boss',
  role: 'BOSS'
};

const mockEmployeeUser = {
  id: '2',
  user_name: 'employee',
  role: 'EMPLOYEE'
};

// 生成测试Token
const generate_token = (user: any) => {
  return jwt.sign(user, process.env.jwt_secret!, { expiresIn: '1h' });
};

// 模拟采购数据
const mockPurchases = [
  {
    id: '1',
    supplier_name: '测试供应商1',
    product_name: '紫水晶手串',
    material_type: '手串',
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
    material_type: '项链',
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
  material_type: '手串',
  bead_diameter: 8,
  quantity: 100,
  unit_price: 25.5,
  purchase_date: '2024-01-15'
};

describe('Purchases API 测试', () => {
  beforeEach(() => {
    jest.clear_all_mocks();
    
    // 重置Prisma模拟
    mockPrisma.purchase.find_many.mock_resolved_value(mockPurchases);
    mockPrisma.purchase.create.mock_resolved_value({
      id: '3',
      ...validPurchaseData,
      total_amount: 2550,
      created_by: '1',
      created_at: new Date(),
      updated_at: new Date()
    });
    mockPrisma.supplier.find_unique.mock_resolved_value({
      id: '1',
      name: '测试供应商',
      is_active: true
    });
  });

  describe('GET /api/purchases - 获取采购列表', () => {
    test('BOSS角色应该能够获取完整采购列表', async () => {
      const token = generate_token(mockBossUser);
      
      const response = await request(app)
        .get('/api/purchases')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(200);
      expect(response.body.success).to_be(true);
      expect(response.body.data).to_equal(mockPurchases);
      expect(mockPrisma.purchase.find_many).to_have_been_called_with({
        : { created_at: 'desc' }
      });
    });

    test('EMPLOYEE角色应该能够获取采购列表', async () => {
      const token = generate_token(mockEmployeeUser);
      
      const response = await request(app)
        .get('/api/purchases')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(200);
      expect(response.body.success).to_be(true);
      expect(response.body.data).to_equal(mockPurchases);
    });

    test('分页查询应该正确工作', async () => {
      const token = generate_token(mockBossUser);
      
      const response = await request(app)
        .get('/api/purchases?page=2&limit=10')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(200);
      expect(mockPrisma.purchase.find_many).to_have_been_called_with({
        : { created_at: 'desc' },
        skip: 10,
        take: 10
      });
    });

    test('供应商筛选应该正确工作', async () => {
      const token = generate_token(mockBossUser);
      
      const response = await request(app)
        .get('/api/purchases?supplier=测试供应商1')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(200);
      expect(mockPrisma.purchase.find_many).to_have_been_called_with({
        where: {
          supplier_name: {
            contains: '测试供应商1'
          }
        },
        : { created_at: 'desc' }
      });
    });

    test('日期范围筛选应该正确工作', async () => {
      const token = generate_token(mockBossUser);
      
      const response = await request(app)
        .get('/api/purchases?start_date=2024-01-01&end_date=2024-01-31')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(200);
      expect(mockPrisma.purchase.find_many).to_have_been_called_with({
        where: {
          purchase_date: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31')
          }
        },
        order_by: { created_at: 'desc' }
      });
    });
  });

  describe('POST /api/purchases - 创建采购记录', () => {
    test('BOSS角色应该能够创建采购记录', async () => {
      const token = generate_token(mockBossUser);
      
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(validPurchaseData);
      
      expect(response.status).to_be(201);
      expect(response.body.success).to_be(true);
      expect(response.body.data.product_name).to_be('紫水晶手串');
      expect(mockPrisma.purchase.create).to_have_been_called_with({
        data: {
          ...validPurchaseData,
          total_amount: 2550, // quantity * unit_price
          created_by: '1'
        }
      });
    });

    test('EMPLOYEE角色应该能够创建采购记录', async () => {
      const token = generate_token(mockEmployeeUser);
      
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(validPurchaseData);
      
      expect(response.status).to_be(201);
      expect(response.body.success).to_be(true);
    });

    test('缺少必填字段应该返回400错误', async () => {
      const token = generate_token(mockBossUser);
      const invalidData = { ...validPurchaseData };
      delete invalidData.supplier_name;
      
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData);
      
      expect(response.status).to_be(400);
      expect(response.body.success).to_be(false);
      expect(response.body.error.code).to_be('VALIDATION_ERROR');
      expect(response.body.message).to_contain('供应商名称为必填项');
    });

    test('珠子直径验证应该正确工作', async () => {
      const token = generate_token(mockBossUser);
      
      // 测试直径过小
      const smallDiameterData = { ...validPurchaseData, bead_diameter: 3 };
      let response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(smallDiameterData);
      
      expect(response.status).to_be(400);
      expect(response.body.error.code).to_be('INVALID_DIAMETER');
      expect(response.body.message).to_contain('珠子直径必须在4-20mm之间');
      
      // 测试直径过大
      const largeDiameterData = { ...validPurchaseData, bead_diameter: 25 };
      response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(largeDiameterData);
      
      expect(response.status).to_be(400);
      expect(response.body.error.code).to_be('INVALID_DIAMETER');
    });

    test('数量验证应该正确工作', async () => {
      const token = generate_token(mockBossUser);
      
      // 测试负数量
      const negativeQuantityData = { ...validPurchaseData, quantity: -5 };
      let response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(negativeQuantityData);
      
      expect(response.status).to_be(400);
      expect(response.body.error.code).to_be('VALIDATION_ERROR');
      expect(response.body.message).to_contain('数量必须大于0');
      
      // 测试零数量
      const zeroQuantityData = { ...validPurchaseData, quantity: 0 };
      response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(zeroQuantityData);
      
      expect(response.status).to_be(400);
      expect(response.body.error.code).to_be('VALIDATION_ERROR');
    });

    test('单价验证应该正确工作', async () => {
      const token = generate_token(mockBossUser);
      
      // 测试负单价
      const negativePriceData = { ...validPurchaseData, unit_price: -10 };
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(negativePriceData);
      
      expect(response.status).to_be(400);
      expect(response.body.error.code).to_be('VALIDATION_ERROR');
      expect(response.body.message).to_contain('单价必须大于0');
    });

    test('日期验证应该正确工作', async () => {
      const token = generate_token(mockBossUser);
      
      // 测试未来日期
      const futureDate = new Date();
      futureDate.set_date(futureDate.get_date() + 1);
      const futureDateData = { 
        ...validPurchaseData, 
        purchase_date: futureDate.to_i_s_o_string().split('T')[0] 
      };
      
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(futureDateData);
      
      expect(response.status).to_be(400);
      expect(response.body.error.code).to_be('VALIDATION_ERROR');
      expect(response.body.message).to_contain('采购日期不能是未来日期');
    });

    test('总金额计算应该正确', async () => {
      const token = generate_token(mockBossUser);
      
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(validPurchaseData);
      
      expect(response.status).to_be(201);
      expect(mockPrisma.purchase.create).to_have_been_called_with({
        data: expect.object_containing({
          total_amount: 2550 // 100 * 25.5
        })
      });
    });

    test('自动创建新供应商应该正确工作', async () => {
      const token = generate_token(mockBossUser);
      
      // 模拟供应商不存在
      mockPrisma.supplier.find_unique.mock_resolved_value_once(null);
      mockPrisma.supplier.create.mock_resolved_value_once({
        id: '2',
        name: '新供应商',
        is_active: true
      });
      
      const newSupplierData = { ...validPurchaseData, supplier_name: '新供应商' };
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(newSupplierData);
      
      expect(response.status).to_be(201);
      expect(mockPrisma.supplier.create).to_have_been_called_with({
        data: {
          name: '新供应商',
          is_active: true
        }
      });
    });
  });

  describe('GET /api/purchases/:id - 获取单个采购记录', () => {
    test('应该能够获取指定采购记录', async () => {
      const token = generate_token(mockBossUser);
      mockPrisma.purchase.find_unique.mock_resolved_value(mockPurchases[0]);
      
      const response = await request(app)
        .get('/api/purchases/1')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(200);
      expect(response.body.success).to_be(true);
      expect(response.body.data).to_equal(mockPurchases[0]);
      expect(mockPrisma.purchase.find_unique).to_have_been_called_with({
        where: { id: '1' }
      });
    });

    test('不存在的采购记录应该返回404错误', async () => {
      const token = generate_token(mockBossUser);
      mockPrisma.purchase.find_unique.mock_resolved_value(null);
      
      const response = await request(app)
        .get('/api/purchases/999')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(404);
      expect(response.body.success).to_be(false);
      expect(response.body.error.code).to_be('NOT_FOUND');
      expect(response.body.message).to_contain('采购记录不存在');
    });
  });

  describe('错误处理测试', () => {
    test('数据库错误应该返回500错误', async () => {
      const token = generate_token(mockBossUser);
      mockPrisma.purchase.find_many.mock_rejected_value(new Error('Database connection failed'));
      
      const response = await request(app)
        .get('/api/purchases')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(500);
      expect(response.body.success).to_be(false);
      expect(response.body.error.code).to_be('DATABASE_ERROR');
    });

    test('无效的JSON数据应该返回400错误', async () => {
      const token = generate_token(mockBossUser);
      
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      expect(response.status).to_be(400);
    });
  });

  describe('安全性测试', () => {
    test('SQL注入防护', async () => {
      const token = generate_token(mockBossUser);
      const maliciousData = {
        ...validPurchaseData,
        supplier_name: "'; DROP TABLE purchases; --"
      };
      
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(maliciousData);
      
      // 应该正常处理，不会执行SQL注入
      expect(response.status).to_be(201);
      expect(mockPrisma.purchase.create).to_have_been_called_with({
        data: expect.object_containing({
          supplier_name: "'; DROP TABLE purchases; --"
        })
      });
    });

    test('XSS防护', async () => {
      const token = generate_token(mockBossUser);
      const xssData = {
        ...validPurchaseData,
        product_name: '<script>alert("xss")</script>'
      };
      
      const response = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${token}`)
        .send(xssData);
      
      expect(response.status).to_be(201);
      // 应该清理HTML标签
      expect(mockPrisma.purchase.create).to_have_been_called_with({
        data: expect.object_containing({
          product_name: 'alert("xss")' // HTML标签被清理
        })
      });
    });
  });

  describe('性能测试', () => {
    test('大量数据查询应该在合理时间内完成', async () => {
      const token = generate_token(mockBossUser);
      const largePurchaseList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockPurchases[0],
        id: `${i + 1}`,
        product_name: `产品${i + 1}`
      }));
      
      mockPrisma.purchase.find_many.mock_resolved_value(largePurchaseList);
      
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/purchases')
        .set('Authorization', `Bearer ${token}`);
      const endTime = Date.now();
      
      expect(response.status).to_be(200);
      expect(response.body.data).to_have_length(1000);
      expect(endTime - startTime).to_be_less_than(2000); // 应该在2秒内完成
    });
  });
});