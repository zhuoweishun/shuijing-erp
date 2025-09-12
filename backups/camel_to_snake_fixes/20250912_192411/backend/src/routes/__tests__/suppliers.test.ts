import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import supplierRoutes from '../suppliers';
import { authenticate_token } from '../../middleware/auth';

// 模拟Prisma客户端
jest.mock('@prisma/client');
const mockPrisma = {
  supplier: {
    find_many: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    find_unique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
};

// 创建测试应用
const app = express();
app.use(express.json());
app.use('/api/suppliers', supplierRoutes);

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

// 模拟供应商数据
const mockSuppliers = [
  {
    id: '1',
    name: '测试供应商1',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  {
    id: '2',
    name: '测试供应商2',
    is_active: true,
    created_at: new Date('2024-01-02'),
    updated_at: new Date('2024-01-02')
  }
];

describe('Suppliers API 测试', () => {
  beforeEach(() => {
    jest.clear_all_mocks();
    
    // 重置Prisma模拟
    mockPrisma.supplier.find_many.mock_resolved_value(mockSuppliers);
    mockPrisma.supplier.count.mock_resolved_value(2);
    mockPrisma.supplier.create.mock_resolved_value({
      id: '3',
      name: '新供应商',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  });

  describe('GET /api/suppliers - 获取供应商列表', () => {
    test('BOSS角色应该能够获取供应商列表', async () => {
      const token = generate_token(mockBossUser);
      
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(200);
      expect(response.body.success).to_be(true);
      expect(response.body.data).to_equal(mockSuppliers);
      expect(mockPrisma.supplier.find_many).to_have_been_called_with({
        where: { is_active: true },
        : { name: 'asc' }
      });
    });

    test('EMPLOYEE角色应该被拒绝访问', async () => {
      const token = generate_token(mockEmployeeUser);
      
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(403);
      expect(response.body.success).to_be(false);
      expect(response.body.error.code).to_be('insufficient_permissions');
      expect(response.body.message).to_contain('权限不足');
    });

    test('无Token应该返回401错误', async () => {
      const response = await request(app)
        .get('/api/suppliers');
      
      expect(response.status).to_be(401);
      expect(response.body.success).to_be(false);
      expect(response.body.message).to_contain('未提供认证令牌');
    });

    test('无效Token应该返回401错误', async () => {
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).to_be(401);
      expect(response.body.success).to_be(false);
      expect(response.body.message).to_contain('无效的认证令牌');
    });

    test('数据库错误应该返回500错误', async () => {
      const token = generate_token(mockBossUser);
      mockPrisma.supplier.find_many.mock_rejected_value(new Error('Database connection failed'));
      
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(500);
      expect(response.body.success).to_be(false);
      expect(response.body.error.code).to_be('DATABASE_ERROR');
    });
  });

  describe('POST /api/suppliers - 创建供应商', () => {
    test('BOSS角色应该能够创建供应商', async () => {
      const token = generate_token(mockBossUser);
      const newSupplier = { name: '新供应商' };
      
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send(newSupplier);
      
      expect(response.status).to_be(201);
      expect(response.body.success).to_be(true);
      expect(response.body.data.name).to_be('新供应商');
      expect(mockPrisma.supplier.create).to_have_been_called_with({
        data: {
          name: '新供应商',
          is_active: true
        }
      });
    });

    test('EMPLOYEE角色应该被拒绝创建供应商', async () => {
      const token = generate_token(mockEmployeeUser);
      const newSupplier = { name: '新供应商' };
      
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send(newSupplier);
      
      expect(response.status).to_be(403);
      expect(response.body.success).to_be(false);
      expect(response.body.error.code).to_be('insufficient_permissions');
    });

    test('缺少供应商名称应该返回400错误', async () => {
      const token = generate_token(mockBossUser);
      
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      
      expect(response.status).to_be(400);
      expect(response.body.success).to_be(false);
      expect(response.body.error.code).to_be('VALIDATION_ERROR');
      expect(response.body.message).to_contain('供应商名称为必填项');
    });

    test('供应商名称为空字符串应该返回400错误', async () => {
      const token = generate_token(mockBossUser);
      
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' });
      
      expect(response.status).to_be(400);
      expect(response.body.success).to_be(false);
      expect(response.body.error.code).to_be('VALIDATION_ERROR');
    });

    test('供应商名称过长应该返回400错误', async () => {
      const token = generate_token(mockBossUser);
      const longName = 'a'.repeat(101); // 超过100字符限制
      
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: longName });
      
      expect(response.status).to_be(400);
      expect(response.body.success).to_be(false);
      expect(response.body.error.code).to_be('VALIDATION_ERROR');
      expect(response.body.message).to_contain('供应商名称不能超过100个字符');
    });

    test('重复供应商名称应该返回409错误', async () => {
      const token = generate_token(mockBossUser);
      mockPrisma.supplier.create.mock_rejected_value({
        code: 'P2002', // Prisma唯一约束错误
        meta: { target: ['name'] }
      });
      
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '重复供应商' });
      
      expect(response.status).to_be(409);
      expect(response.body.success).to_be(false);
      expect(response.body.error.code).to_be('DUPLICATE_SUPPLIER');
      expect(response.body.message).to_contain('供应商名称已存在');
    });
  });

  describe('GET /api/suppliers/debug/count - 调试统计端点', () => {
    test('BOSS角色应该能够访问调试统计', async () => {
      const token = generate_token(mockBossUser);
      mockPrisma.supplier.count.mock_resolved_value_once(5);
      mockPrisma.supplier.count.mock_resolved_value_once(4);
      mockPrisma.supplier.count.mock_resolved_value_once(1);
      mockPrisma.supplier.find_many.mock_resolved_value(mockSuppliers);
      
      const response = await request(app)
        .get('/api/suppliers/debug/count')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(200);
      expect(response.body.success).to_be(true);
      expect(response.body.data).to_have_property('total_suppliers');
      expect(response.body.data).to_have_property('active_suppliers');
    });
    
    test('EMPLOYEE角色应该被拒绝访问', async () => {
      const token = generate_token(mockEmployeeUser);
      
      const response = await request(app)
        .get('/api/suppliers/debug/count')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(403);
      expect(response.body.success).to_be(false);
      expect(response.body.error.code).to_be('insufficient_permissions');
      expect(response.body.message).to_contain('权限不足');
    });
  });

  describe('GET /api/suppliers/debug/duplicates - 重复检查端点', () => {
    test('BOSS角色应该能够访问重复检查', async () => {
      const token = generate_token(mockBossUser);
      const mockDuplicates = [
        { name: '重复供应商', count: 2, ids: '1,2' }
      ];
      
      mockPrisma.$queryRaw.mock_resolved_value(mockDuplicates);
      
      const response = await request(app)
        .get('/api/suppliers/debug/duplicates')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(200);
      expect(response.body.success).to_be(true);
      expect(response.body.data).to_equal(mockDuplicates);
    });
    
    test('EMPLOYEE角色应该被拒绝访问', async () => {
      const token = generate_token(mockEmployeeUser);
      
      const response = await request(app)
        .get('/api/suppliers/debug/duplicates')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(403);
      expect(response.body.success).to_be(false);
      expect(response.body.error.code).to_be('insufficient_permissions');
      expect(response.body.message).to_contain('权限不足');
    });
  });

  describe('错误处理测试', () => {
    test('JWT过期应该返回401错误', async () => {
      const expiredToken = jwt.sign(
        mockBossUser, 
        process.env.jwt_secret!, 
        { expiresIn: '-1h' } // 已过期
      );
      
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(response.status).to_be(401);
      expect(response.body.success).to_be(false);
      expect(response.body.message).to_contain('令牌已过期');
    });

    test('恶意JWT应该返回401错误', async () => {
      const maliciousToken = jwt.sign(
        { ...mockEmployeeUser, role: 'BOSS' }, // 尝试提升权限
        'wrong-secret'
      );
      
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${maliciousToken}`);
      
      expect(response.status).to_be(401);
      expect(response.body.success).to_be(false);
    });

    test('数据库连接失败应该返回500错误', async () => {
      const token = generate_token(mockBossUser);
      mockPrisma.supplier.find_many.mock_rejected_value(
        new Error('ECONNREFUSED: Connection refused')
      );
      
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(500);
      expect(response.body.success).to_be(false);
      expect(response.body.error.code).to_be('DATABASE_ERROR');
    });
  });

  describe('性能测试', () => {
    test('大量供应商查询应该在合理时间内完成', async () => {
      const token = generate_token(mockBossUser);
      const largeSupplierList = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        name: `供应商${i + 1}`,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }));
      
      mockPrisma.supplier.find_many.mock_resolved_value(largeSupplierList);
      
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${token}`);
      const endTime = Date.now();
      
      expect(response.status).to_be(200);
      expect(response.body.data).to_have_length(1000);
      expect(endTime - startTime).to_be_less_than(1000); // 应该在1秒内完成
    });
  });

  describe('输入清理测试', () => {
    test('应该清理供应商名称中的特殊字符', async () => {
      const token = generate_token(mockBossUser);
      const supplierWithSpecialChars = {
        name: '  测试供应商<script>alert("xss")</script>  '
      };
      
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send(supplierWithSpecialChars);
      
      expect(mockPrisma.supplier.create).to_have_been_called_with({
        data: {
          name: '测试供应商', // 应该清理掉HTML标签和前后空格
          is_active: true
        }
      });
    });
  });
  
  describe('GET /api/suppliers/stats - 供应商统计端点', () => {
    test('BOSS角色应该能够访问统计功能（开发中）', async () => {
      const token = generate_token(mockBossUser);
      
      const response = await request(app)
        .get('/api/suppliers/stats')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(200);
      expect(response.body.success).to_be(false);
      expect(response.body.message).to_contain('正在开发中');
    });
    
    test('EMPLOYEE角色应该被拒绝访问', async () => {
      const token = generate_token(mockEmployeeUser);
      
      const response = await request(app)
        .get('/api/suppliers/stats')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to_be(403);
      expect(response.body.success).to_be(false);
      expect(response.body.error.code).to_be('insufficient_permissions');
      expect(response.body.message).to_contain('权限不足');
    });
    
    test('未认证用户应该被拒绝访问', async () => {
      const response = await request(app)
        .get('/api/suppliers/stats');
      
      expect(response.status).to_be(401);
      expect(response.body.success).to_be(false);
    });
  });
});