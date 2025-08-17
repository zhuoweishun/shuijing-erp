# 产品API调试指南

## 问题现象
GET /api/products 返回 "获取产品列表失败" 错误

## 可能原因分析

### 1. 数据库查询问题
- products表可能为空
- user_profiles表关联查询失败
- 用户权限检查问题

### 2. 用户权限问题
- admin用户的user_id可能与products表中的user_id不匹配
- 非管理员权限限制导致查询结果为空

## 调试步骤

### 1. 检查products表数据
```sql
-- 登录MySQL
mysql -h 127.0.0.1 -P 3307 -u erp_user -p

-- 使用数据库
USE shuijing_erp;

-- 检查products表结构
DESCRIBE products;

-- 检查products表数据
SELECT * FROM products;

-- 检查products表记录数
SELECT COUNT(*) FROM products;
```

### 2. 检查user_profiles表
```sql
-- 检查user_profiles表结构
DESCRIBE user_profiles;

-- 检查admin用户信息
SELECT * FROM user_profiles WHERE username = 'admin';

-- 检查所有用户
SELECT id, username, role FROM user_profiles;
```

### 3. 测试关联查询
```sql
-- 测试products和user_profiles的关联查询
SELECT p.*, u.username as creator_name
FROM products p
LEFT JOIN user_profiles u ON p.user_id = u.id;
```

### 4. 创建测试数据
如果products表为空，创建测试数据：
```sql
-- 获取admin用户ID
SET @admin_id = (SELECT id FROM user_profiles WHERE username = 'admin' LIMIT 1);

-- 插入测试产品
INSERT INTO products (
  id, product_name, category, raw_material, weight, 
  cost, selling_price, description, status, user_id, created_at
) VALUES (
  UUID(), '测试产品1', '电子产品', '塑料', 0.5, 
  100.00, 199.99, '这是一个测试产品', '制作中', @admin_id, NOW()
);
```

### 5. 重新测试API
```bash
# 测试GET API
curl -X GET http://127.0.0.1:3001/api/products \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -H "Content-Type: application/json"
```

## 预期解决方案
1. 如果products表为空，添加测试数据
2. 如果用户权限问题，检查admin用户的role和id
3. 如果关联查询失败，检查表结构和外键关系