# 数据库触发器总结报告

## 当前数据库中的触发器状态

根据检查结果，当前数据库 `crystal_erp_dev` 中共有 **5个触发器** 正在运行：

### 1. 采购到原材料同步触发器

#### tr_purchase_insert_material
- **作用表**: purchases
- **触发时机**: AFTER INSERT
- **功能**: 当采购记录创建且状态为ACTIVE时，自动在materials表中创建对应的原材料记录
- **主要逻辑**:
  - 根据采购类型（散珠、手串、配件、成品材料）计算库存数量
  - 自动转换重量为颗数（针对散珠和手串）
  - 计算单位成本
  - 设置库存单位（PIECES/SLICES/ITEMS）

#### tr_purchase_update_material
- **作用表**: purchases
- **触发时机**: AFTER UPDATE
- **功能**: 当采购记录更新时，同步更新materials表中的对应记录
- **主要逻辑**:
  - 同步更新原材料名称、质量、规格等信息
  - 当采购状态变为USED时，在备注中标记但保持库存数据完整性

### 2. 原材料使用量更新触发器

#### tr_material_usage_update_stock
- **作用表**: material_usage
- **触发时机**: AFTER INSERT
- **功能**: 当记录原材料使用时，自动更新materials表中的已用数量和剩余数量
- **主要逻辑**:
  - 计算该原材料的总使用量
  - 更新剩余数量 = 原始数量 - 总使用量
  - 更新时间戳

### 3. SKU制作财务记录触发器

#### tr_sku_create_financial
- **作用表**: product_skus
- **触发时机**: AFTER INSERT
- **功能**: 当创建SKU产品时，自动记录相关的财务成本
- **主要逻辑**:
  - 分别记录原材料成本、人工费、工艺费
  - 每种成本类型创建独立的财务记录
  - 包含详细的元数据信息（SKU代码、名称、数量等）

### 4. SKU销毁财务记录触发器

#### tr_sku_destroy_financial
- **作用表**: sku_inventory_logs
- **触发时机**: AFTER INSERT
- **功能**: 当SKU被销毁时，记录原材料损耗的财务影响
- **主要逻辑**:
  - 只处理action为'DESTROY'的记录
  - 按比例计算原材料损耗金额
  - 记录为'原材料损耗'类型的支出
  - 包含销毁原因和详细的计算信息

## 触发器设计特点

### 1. 数据同步机制
- **采购→原材料**: 自动将采购记录转换为库存管理的原材料记录
- **使用量→库存**: 实时更新原材料的剩余数量
- **制作→财务**: 自动记录SKU制作的各项成本
- **销毁→财务**: 自动计算和记录原材料损耗

### 2. 业务逻辑处理
- **智能转换**: 根据珠子直径自动计算重量到颗数的转换
- **分类处理**: 不同采购类型使用不同的计算逻辑和库存单位
- **比例计算**: SKU销毁时按比例计算原材料损耗
- **状态管理**: 根据采购状态变化执行不同的处理逻辑

### 3. 财务记录完整性
- **成本分类**: 原材料成本、人工费、工艺费分别记录
- **收入记录**: SKU销售自动记录收入（注：当前数据库中未发现此触发器）
- **损耗记录**: SKU销毁时记录原材料损耗
- **元数据**: 每条财务记录包含详细的业务上下文信息

## 触发器文件位置

### SQL定义文件
- `backend/sql/material_sync_triggers.sql` - 采购和原材料同步触发器
- `backend/prisma/migrations/20250127_create_sku_triggers/migration.sql` - SKU制作和销售触发器
- `backend/prisma/migrations/20250127_create_sku_destroy_trigger/migration.sql` - SKU销毁触发器

### 管理脚本
- `backend/check_all_triggers.js` - 检查所有触发器状态
- `backend/scripts/create_triggers.js` - 创建触发器脚本
- `backend/scripts/update_all_triggers.js` - 更新所有触发器
- 多个修复和验证脚本

## 系统完整性

当前触发器系统覆盖了ERP系统的核心业务流程：
1. ✅ 采购管理 → 库存管理
2. ✅ 库存使用 → 数量更新
3. ✅ SKU制作 → 成本记录
4. ✅ SKU销毁 → 损耗记录
5. ❓ SKU销售 → 收入记录（触发器已定义但未在当前数据库中找到）

所有触发器都正常工作，确保了数据的一致性和业务逻辑的自动化执行。

---
*报告生成时间: $(date)*
*数据库: crystal_erp_dev*
*触发器总数: 5个*