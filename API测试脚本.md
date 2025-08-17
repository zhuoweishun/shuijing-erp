# 水晶ERP系统API测试脚本

## 认证信息
从登录API获得的JWT Token:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTAwMSIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTU0MjkyMTUsImV4cCI6MTc1NTUxNTYxNX0.JSUwqg3EosbWMfDGOHDTNTUp9jdIGYQ1Cdj1KO3IfSk
```

## 1. 测试产品管理API

### 获取产品列表
```bash
curl -X GET http://127.0.0.1:3001/api/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTAwMSIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTU0MjkyMTUsImV4cCI6MTc1NTUxNTYxNX0.JSUwqg3EosbWMfDGOHDTNTUp9jdIGYQ1Cdj1KO3IfSk" \
  -H "Content-Type: application/json"
```

### 创建新产品
```bash
curl -X POST http://127.0.0.1:3001/api/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTAwMSIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTU0MjkyMTUsImV4cCI6MTc1NTUxNTYxNX0.JSUwqg3EosbWMfDGOHDTNTUp9jdIGYQ1Cdj1KO3IfSk" \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "测试产品",
    "category": "电子产品",
    "raw_material": "测试材料",
    "weight": 25.5,
    "cost": 199.99,
    "selling_price": 299.99,
    "description": "这是一个测试产品",
    "status": "制作中"
  }'
```

## 2. 测试采购管理API

### 获取采购列表
```bash
curl -X GET http://127.0.0.1:3001/api/purchases \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTAwMSIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTU0MjkyMTUsImV4cCI6MTc1NTUxNTYxNX0.JSUwqg3EosbWMfDGOHDTNTUp9jdIGYQ1Cdj1KO3IfSk" \
  -H "Content-Type: application/json"
```

### 创建新采购记录
```bash
curl -X POST http://127.0.0.1:3001/api/purchases \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTAwMSIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTU0MjkyMTUsImV4cCI6MTc1NTUxNTYxNX0.JSUwqg3EosbWMfDGOHDTNTUp9jdIGYQ1Cdj1KO3IfSk" \
  -H "Content-Type: application/json" \
  -d '{
    "supplier": "测试供应商",
    "total_amount": 1999.99,
    "status": "pending",
    "notes": "测试采购订单",
    "items": [
      {
        "product_name": "测试产品",
        "quantity": 10,
        "unit_price": 199.99
      }
    ]
  }'
```

## 3. 测试用户管理API

### 获取用户列表
```bash
curl -X GET http://127.0.0.1:3001/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTAwMSIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTU0MjkyMTUsImV4cCI6MTc1NTUxNTYxNX0.JSUwqg3EosbWMfDGOHDTNTUp9jdIGYQ1Cdj1KO3IfSk" \
  -H "Content-Type: application/json"
```

## 执行说明
请在阿里云服务器上依次执行上述命令，测试所有API接口的功能。