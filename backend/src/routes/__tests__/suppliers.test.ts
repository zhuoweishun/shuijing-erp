import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import supplierRoutes from '../suppliers';
import { authenticateToken } from '../../middleware/auth';

// 模拟Prisma客户端
jest.mock('@prisma/client');
const mockPrisma = {
  supplier: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
};

// 创建测试应用
const app = express();
app.use(express.json());
app.use('/api/suppliers', supplierRoutes);

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

// 模拟供应商数据
const mockSuppliers = [
  {
    id: '1',
    name: '测试供应商1',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: '测试供应商2',
    isActive: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  }
];

describe('Suppliers API 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 重置Prisma模拟
    mockPrisma.supplier.findMany.mockResolvedValue(mockSuppliers);
    mockPrisma.supplier.count.mockResolvedValue(2);
    mockPrisma.supplier.create.mockResolvedValue({
      id: '3',
      name: '新供应商',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  describe('GET /api/suppliers - 获取供应商列表', () => {
    test('BOSS角色应该能够获取供应商列表', async () => {
      const token = generateToken(mockBossUser);
      
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSuppliers);
      expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
    });

    test('EMPLOYEE角色应该被拒绝访问', async () => {
      const token = generateToken(mockEmployeeUser);
      
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(response.body.message).toContain('权限不足');
    });

    test('无Token应该返回401错误', async () => {
      const response = await request(app)
        .get('/api/suppliers');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('未提供认证令牌');
    });

    test('无效Token应该返回401错误', async () => {
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('无效的认证令牌');
    });

    test('数据库错误应该返回500错误', async () => {
      const token = generateToken(mockBossUser);
      mockPrisma.supplier.findMany.mockRejectedValue(new Error('Database connection failed'));
      
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('POST /api/suppliers - 创建供应商', () => {
    test('BOSS角色应该能够创建供应商', async () => {
      const token = generateToken(mockBossUser);
      const newSupplier = { name: '新供应商' };
      
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send(newSupplier);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('新供应商');
      expect(mockPrisma.supplier.create).toHaveBeenCalledWith({
        data: {
          name: '新供应商',
          isActive: true
        }
      });
    });

    test('EMPLOYEE角色应该被拒绝创建供应商', async () => {
      const token = generateToken(mockEmployeeUser);
      const newSupplier = { name: '新供应商' };
      
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send(newSupplier);
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('缺少供应商名称应该返回400错误', async () => {
      const token = generateToken(mockBossUser);
      
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.message).toContain('供应商名称为必填项');
    });

    test('供应商名称为空字符串应该返回400错误', async () => {
      const token = generateToken(mockBossUser);
      
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('供应商名称过长应该返回400错误', async () => {
      const token = generateToken(mockBossUser);
      const longName = 'a'.repeat(101); // 超过100字符限制
      
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: longName });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.message).toContain('供应商名称不能超过100个字符');
    });

    test('重复供应商名称应该返回409错误', async () => {
      const token = generateToken(mockBossUser);
      mockPrisma.supplier.create.mockRejectedValue({
        code: 'P2002', // Prisma唯一约束错误
        meta: { target: ['name'] }
      });
      
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '重复供应商' });
      
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DUPLICATE_SUPPLIER');
      expect(response.body.message).toContain('供应商名称已存在');
    });
  });

  describe('GET /api/suppliers/debug/count - 调试统计端点', () => {
    test('BOSS角色应该能够访问调试统计', async () => {
      const token = generateToken(mockBossUser);
      mockPrisma.supplier.count.mockResolvedValueOnce(5);
      mockPrisma.supplier.count.mockResolvedValueOnce(4);
      mockPrisma.supplier.count.mockResolvedValueOnce(1);
      mockPrisma.supplier.findMany.mockResolvedValue(mockSuppliers);
      
      const response = await request(app)
        .get('/api/suppliers/debug/count')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_suppliers');
      expect(response.body.data).toHaveProperty('active_suppliers');
    });
    
    test('EMPLOYEE角色应该被拒绝访问', async () => {
      const token = generateToken(mockEmployeeUser);
      
      const response = await request(app)
        .get('/api/suppliers/debug/count')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(response.body.message).toContain('权限不足');
    });
  });

  describe('GET /api/suppliers/debug/duplicates - 重复检查端点', () => {
    test('BOSS角色应该能够访问重复检查', async () => {
      const token = generateToken(mockBossUser);
      const mockDuplicates = [
        { name: '重复供应商', count: 2, ids: '1,2' }
      ];
      
      mockPrisma.$queryRaw.mockResolvedValue(mockDuplicates);
      
      const response = await request(app)
        .get('/api/suppliers/debug/duplicates')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockDuplicates);
    });
    
    test('EMPLOYEE角色应该被拒绝访问', async () => {
      const token = generateToken(mockEmployeeUser);
      
      const response = await request(app)
        .get('/api/suppliers/debug/duplicates')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(response.body.message).toContain('权限不足');
    });
  });

  describe('错误处理测试', () => {
    test('JWT过期应该返回401错误', async () => {
      const expiredToken = jwt.sign(
        mockBossUser, 
        process.env.JWT_SECRET!, 
        { expiresIn: '-1h' } // 已过期
      );
      
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('令牌已过期');
    });

    test('恶意JWT应该返回401错误', async () => {
      const maliciousToken = jwt.sign(
        { ...mockEmployeeUser, role: 'BOSS' }, // 尝试提升权限
        'wrong-secret'
      );
      
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${maliciousToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('数据库连接失败应该返回500错误', async () => {
      const token = generateToken(mockBossUser);
      mockPrisma.supplier.findMany.mockRejectedValue(
        new Error('ECONNREFUSED: Connection refused')
      );
      
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('性能测试', () => {
    test('大量供应商查询应该在合理时间内完成', async () => {
      const token = generateToken(mockBossUser);
      const largeSupplierList = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        name: `供应商${i + 1}`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      mockPrisma.supplier.findMany.mockResolvedValue(largeSupplierList);
      
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${token}`);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });

  describe('输入清理测试', () => {
    test('应该清理供应商名称中的特殊字符', async () => {
      const token = generateToken(mockBossUser);
      const supplierWithSpecialChars = {
        name: '  测试供应商<script>alert("xss")</script>  '
      };
      
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send(supplierWithSpecialChars);
      
      expect(mockPrisma.supplier.create).toHaveBeenCalledWith({
        data: {
          name: '测试供应商', // 应该清理掉HTML标签和前后空格
          isActive: true
        }
      });
    });
  });
  
  describe('GET /api/suppliers/stats - 供应商统计端点', () => {
    test('BOSS角色应该能够访问统计功能（开发中）', async () => {
      const token = generateToken(mockBossUser);
      
      const response = await request(app)
        .get('/api/suppliers/stats')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('正在开发中');
    });
    
    test('EMPLOYEE角色应该被拒绝访问', async () => {
      const token = generateToken(mockEmployeeUser);
      
      const response = await request(app)
        .get('/api/suppliers/stats')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(response.body.message).toContain('权限不足');
    });
    
    test('未认证用户应该被拒绝访问', async () => {
      const response = await request(app)
        .get('/api/suppliers/stats');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});