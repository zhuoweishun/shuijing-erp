# Prisma Schema 字段分析

## user 模型
- id: String @id @default(cuid())
- username: String @unique [驼峰命名]
- email: String? @unique
- password: String
- role: user_role @default(EMPLOYEE)
- name: String
- phone: String?
- avatar: String?
- is_active: Boolean @default(true) [蛇形命名]
- last_login_at: DateTime? [蛇形命名]
- created_at: DateTime @default(now()) [蛇形命名]
- updated_at: DateTime @updatedAt [蛇形命名]

## supplier 模型
- id: String @id @default(cuid())
- name: String @unique
- contact: String?
- phone: String?
- email: String?
- address: String?
- description: String? @db.Text
- is_active: Boolean @default(true) [蛇形命名]
- created_at: DateTime @default(now()) [蛇形命名]
- updated_at: DateTime @updatedAt [蛇形命名]

## purchase 模型
- id: String @id @default(cuid())
- purchase_code: String @unique [蛇形命名]
- product_name: String [蛇形命名]
- quantity: Int?
- min_stock_alert: Int? [蛇形命名]
- price_per_gram: Decimal? @db.Decimal(10, 1) [蛇形命名]
- unit_price: Decimal? @db.Decimal(10, 1) [蛇形命名]
- total_price: Decimal? @db.Decimal(10, 1) [蛇形命名]
- weight: Decimal? @db.Decimal(10, 1)
- bead_diameter: Decimal? @db.Decimal(10, 1) [蛇形命名]
- beads_per_string: Int? [蛇形命名]
- total_beads: Int? [蛇形命名]
- price_per_bead: Decimal? @db.Decimal(10, 4) [蛇形命名]
- price_per_piece: Decimal? @db.Decimal(10, 4) [蛇形命名]
- quality: quality?
- material_type: product_type @default(BRACELET) [蛇形命名]
- unit_type: unit_type @default(STRINGS) [蛇形命名]
- specification: Decimal? @db.Decimal(10, 1)
- piece_count: Int? [蛇形命名]
- purchase_date: DateTime [蛇形命名]
- natural_language_input: String? @db.Text [蛇形命名]
- photos: Json
- notes: String? @db.Text
- ai_recognition_result: Json? [蛇形命名]
- status: purchase_status @default(ACTIVE)
- created_at: DateTime @default(now()) [蛇形命名]
- updated_at: DateTime @updatedAt [蛇形命名]
- supplier_id: String? [蛇形命名]
- user_id: String [蛇形命名]
- last_edited_by_id: String? [蛇形命名]

## product 模型
- id: String @id @default(cuid())
- product_code: String? [蛇形命名]
- name: String
- description: String? @db.Text
- category: String?
- quantity: Int @default(0)
- unit: String
- unit_price: Decimal @db.Decimal(10, 2) [蛇形命名]
- total_value: Decimal @db.Decimal(10, 2) [蛇形命名]
- status: product_status @default(AVAILABLE)
- location: String?
- notes: String? @db.Text
- images: String? @db.Text
- created_at: DateTime @default(now()) [蛇形命名]
- updated_at: DateTime @updatedAt [蛇形命名]
- sku_id: String? [蛇形命名]
- user_id: String [蛇形命名]

## system_config 模型
- id: String @id @default(cuid())
- key: String @unique
- value: String @db.Text
- description: String?
- created_at: DateTime @default(now()) [蛇形命名]
- updated_at: DateTime @updatedAt [蛇形命名]

## edit_log 模型
- id: String @id @default(cuid())
- purchase_id: String [蛇形命名]
- user_id: String [蛇形命名]
- action: String
- details: String? @db.Text
- changed_fields: Json? [蛇形命名]
- created_at: DateTime @default(now()) [蛇形命名]

## material 模型
- id: String @id @default(cuid())
- material_code: String @unique [蛇形命名]
- material_name: String [蛇形命名]
- material_type: material_type [蛇形命名]
- specification: String?
- unit: String
- total_quantity: Int @default(0) [蛇形命名]
- available_quantity: Int @default(0) [蛇形命名]
- used_quantity: Int @default(0) [蛇形命名]
- unit_cost: Decimal @db.Decimal(10, 4) [蛇形命名]
- total_cost: Decimal @db.Decimal(10, 2) [蛇形命名]
- quality: quality?
- photos: Json?
- notes: String? @db.Text
- status: material_status @default(ACTIVE)
- created_at: DateTime @default(now()) [蛇形命名]
- updated_at: DateTime @updatedAt [蛇形命名]
- purchase_id: String [蛇形命名]
- created_by: String [蛇形命名]

## material_usage 模型
- id: String @id @default(cuid())
- material_id: String [蛇形命名]
- sku_id: String? [蛇形命名]
- product_id: String? [蛇形命名]
- quantity_used: Int [蛇形命名]
- unit_cost: Decimal? @db.Decimal(10, 4) [蛇形命名]
- total_cost: Decimal? @db.Decimal(10, 2) [蛇形命名]
- action: material_action @default(CREATE)
- notes: String? @db.Text
- created_at: DateTime @default(now()) [蛇形命名]
- updated_at: DateTime @updatedAt [蛇形命名]
- purchase_id: String? [蛇形命名]

## product_sku 模型
- id: String @id @default(cuid())
- sku_code: String @unique [蛇形命名]
- sku_name: String [蛇形命名]
- material_signature_hash: String [蛇形命名]
- material_signature: Json [蛇形命名]
- total_quantity: Int @default(0) [蛇形命名]
- available_quantity: Int @default(0) [蛇形命名]
- unit_price: Decimal @db.Decimal(10, 2) [蛇形命名]
- total_value: Decimal @db.Decimal(10, 2) [蛇形命名]
- photos: Json?
- description: String? @db.Text
- specification: String?
- material_cost: Decimal? @db.Decimal(10, 2) [蛇形命名]
- labor_cost: Decimal? @db.Decimal(10, 2) [蛇形命名]
- craft_cost: Decimal? @db.Decimal(10, 2) [蛇形命名]
- total_cost: Decimal? @db.Decimal(10, 2) [蛇形命名]
- selling_price: Decimal @db.Decimal(10, 2) [蛇形命名]
- profit_margin: Decimal? @db.Decimal(5, 2) [蛇形命名]
- status: sku_status @default(ACTIVE)
- created_at: DateTime @default(now()) [蛇形命名]
- updated_at: DateTime @updatedAt [蛇形命名]
- created_by: String [蛇形命名]

## sku_inventory_log 模型
- id: String @id @default(cuid())
- sku_id: String [蛇形命名]
- action: sku_action
- quantity_change: Int [蛇形命名]
- quantity_before: Int [蛇形命名]
- quantity_after: Int [蛇形命名]
- reference_type: reference_type [蛇形命名]
- reference_id: String? [蛇形命名]
- notes: String? @db.Text
- created_at: DateTime @default(now()) [蛇形命名]
- user_id: String [蛇形命名]

## audit_log 模型
- id: String @id @default(cuid())
- user_id: String? [蛇形命名]
- action: String
- resource: String
- resource_id: String? [蛇形命名]
- details: String? @db.Text
- ip_address: String? [蛇形命名]
- user_agent: String? [蛇形命名]
- created_at: DateTime @default(now()) [蛇形命名]

## customer 模型
- id: String @id @default(cuid())
- name: String
- phone: String @unique
- address: String? @db.Text
- wechat: String?
- birthday: DateTime?
- notes: String? @db.Text
- total_purchases: Decimal @default(0) @db.Decimal(10, 2) [蛇形命名]
- total_orders: Int @default(0) [蛇形命名]
- total_all_orders: Int @default(0) [蛇形命名]
- refund_count: Int @default(0) [蛇形命名]
- refund_rate: Decimal @default(0) @db.Decimal(5, 2) [蛇形命名]
- average_order_value: Decimal @default(0) @db.Decimal(10, 2) [蛇形命名]
- days_since_last_purchase: Int? [蛇形命名]
- days_since_first_purchase: Int? [蛇形命名]
- customer_labels: Json? [蛇形命名]
- primary_label: String? [蛇形命名]
- city: String?
- province: String?
- first_purchase_date: DateTime? [蛇形命名]
- last_purchase_date: DateTime? [蛇形命名]
- created_at: DateTime @default(now()) [蛇形命名]
- updated_at: DateTime @updatedAt [蛇形命名]

## customer_note 模型
- id: String @id @default(cuid())
- customer_id: String [蛇形命名]
- category: customer_note_category
- content: String @db.Text
- created_at: DateTime @default(now()) [蛇形命名]
- updated_at: DateTime @updatedAt [蛇形命名]
- created_by: String [蛇形命名]

## customer_purchase 模型
- id: String @id @default(cuid())
- customer_id: String [蛇形命名]
- sku_id: String [蛇形命名]
- sku_name: String [蛇形命名]
- quantity: Int
- unit_price: Decimal @db.Decimal(10, 2) [蛇形命名]
- original_price: Decimal? @db.Decimal(10, 2) [蛇形命名]
- total_price: Decimal @db.Decimal(10, 2) [蛇形命名]
- status: customer_purchase_status
- refund_date: DateTime? [蛇形命名]
- refund_reason: String? [蛇形命名]
- refund_notes: String? @db.Text [蛇形命名]
- sale_channel: String? [蛇形命名]
- notes: String? @db.Text
- purchase_date: DateTime @default(now()) [蛇形命名]
- created_at: DateTime @default(now()) [蛇形命名]
- updated_at: DateTime @updatedAt [蛇形命名]

## financial_record 模型
- id: String @id @default(cuid())
- record_type: financial_record_type [蛇形命名]
- amount: Decimal @db.Decimal(10, 2)
- description: String
- reference_type: financial_reference_type [蛇形命名]
- reference_id: String? [蛇形命名]
- category: String?
- transaction_date: DateTime [蛇形命名]
- notes: String? @db.Text
- created_at: DateTime @default(now()) [蛇形命名]
- updated_at: DateTime @updatedAt [蛇形命名]
- user_id: String [蛇形命名]

## 命名分析总结

### 驼峰命名字段 (需要修改为蛇形)
- user.username → user_name

### 蛇形命名字段 (符合标准)
- 绝大多数字段已使用蛇形命名
- 包括所有时间戳字段：created_at, updated_at, last_login_at
- 包括所有复合字段：purchase_code, product_name, material_type 等

### 建议
将 user.username 修改为 user_name 以保持全蛇形命名一致性。