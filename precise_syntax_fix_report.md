# 精确语法错误修复报告

**修复时间**: 2025-09-12T18:10:48.195359

## 修复统计

- 处理文件数: 97
- 修改文件数: 19
- 总修复数: 180

## 修复详情

### src\utils\format.ts (1 处修复)

**第 103 行** - API修复:
- 修复前: `const diff_in_seconds = Math.floor((now.get_time() - date.get_time()) / 1000);`
- 修复后: `const diff_in_seconds = Math.floor((now.getTime() - date.getTime()) / 1000);`

### src\components\CustomerDetailModal.tsx (2 处修复)

**第 249 行** - API修复:
- 修复前: `return Math.floor((now.get_time() - last_purchase.get_time()) / (1000 * 60 * 60 * 24))`
- 修复后: `return Math.floor((now.getTime() - last_purchase.getTime()) / (1000 * 60 * 60 * 24))`

**第 283 行** - API修复:
- 修复前: `const days_since_last_purchase = Math.floor((now.get_time() - last_purchase.get_time()) / (1000 * 60 * 60 * 24));`
- 修复后: `const days_since_last_purchase = Math.floor((now.getTime() - last_purchase.getTime()) / (1000 * 60 * 60 * 24));`

### src\components\SkuHistoryView.tsx (6 处修复)

**第 162 行** - API修复:
- 修复前: `start_date = new Date(now.get_full_year(), now.get_month(), now.get_date());`
- 修复后: `start_date = new Date(now.getFullYear(), now.get_month(), now.get_date());`

**第 162 行** - API修复:
- 修复前: `start_date = new Date(now.getFullYear(), now.get_month(), now.get_date());`
- 修复后: `start_date = new Date(now.getFullYear(), now.getMonth(), now.get_date());`

**第 162 行** - API修复:
- 修复前: `start_date = new Date(now.getFullYear(), now.getMonth(), now.get_date());`
- 修复后: `start_date = new Date(now.getFullYear(), now.getMonth(), now.getDate());`

**第 165 行** - API修复:
- 修复前: `start_date = new Date(now.get_time() - 7 * 24 * 60 * 60 * 1000);`
- 修复后: `start_date = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);`

**第 168 行** - API修复:
- 修复前: `start_date = new Date(now.get_full_year(), now.get_month(), 1);`
- 修复后: `start_date = new Date(now.getFullYear(), now.get_month(), 1);`

**第 168 行** - API修复:
- 修复前: `start_date = new Date(now.getFullYear(), now.get_month(), 1);`
- 修复后: `start_date = new Date(now.getFullYear(), now.getMonth(), 1);`

### src\pages\CustomerManagement.tsx (2 处修复)

**第 229 行** - API修复:
- 修复前: `return Math.floor((now.get_time() - last_purchase.get_time()) / (1000 * 60 * 60 * 24))`
- 修复后: `return Math.floor((now.getTime() - last_purchase.getTime()) / (1000 * 60 * 60 * 24))`

**第 263 行** - API修复:
- 修复前: `const days_since_last_purchase = Math.floor((now.get_time() - last_purchase.get_time()) / (1000 * 60 * 60 * 24));`
- 修复后: `const days_since_last_purchase = Math.floor((now.getTime() - last_purchase.getTime()) / (1000 * 60 * 60 * 24));`

### backend\src\middleware\auth.ts (1 处修复)

**第 41 行** - API修复:
- 修复前: `const user = await prisma.user.find_unique({`
- 修复后: `const user = await prisma.user.findUnique({`

### backend\src\routes\auth.ts (2 处修复)

**第 31 行** - API修复:
- 修复前: `const user = await prisma.user.find_unique({`
- 修复后: `const user = await prisma.user.findUnique({`

**第 145 行** - API修复:
- 修复前: `const user = await prisma.user.find_unique({`
- 修复后: `const user = await prisma.user.findUnique({`

### backend\src\routes\customers.ts (24 处修复)

**第 85 行** - API修复:
- 修复前: `gte: new Date(now.get_time() - 7 * 24 * 60 * 60 * 1000)`
- 修复后: `gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)`

**第 92 行** - API修复:
- 修复前: `gte: new Date(now.get_time() - 30 * 24 * 60 * 60 * 1000)`
- 修复后: `gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)`

**第 99 行** - API修复:
- 修复前: `gte: new Date(now.get_time() - 180 * 24 * 60 * 60 * 1000)`
- 修复后: `gte: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)`

**第 106 行** - API修复:
- 修复前: `gte: new Date(now.get_time() - 365 * 24 * 60 * 60 * 1000)`
- 修复后: `gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)`

**第 180 行** - API修复:
- 修复前: `prisma.customer_purchase.find_many({`
- 修复后: `prisma.customer_purchase.findMany({`

**第 270 行** - API修复:
- 修复前: `prisma.customer.find_many({`
- 修复后: `prisma.customer.findMany({`

**第 315 行** - API修复:
- 修复前: `prisma.product_sku.find_many({`
- 修复后: `prisma.product_sku.findMany({`

**第 549 行** - API修复:
- 修复前: `prisma.customer.find_many({`
- 修复后: `prisma.customer.findMany({`

**第 617 行** - API修复:
- 修复前: `customer.customer_code.to_lower_case().includes(codeSearch)`
- 修复后: `customer.customer_code.toLowerCase().includes(codeSearch)`

**第 678 行** - API修复:
- 修复前: `const allCustomers = await prisma.customer.find_many({`
- 修复后: `const allCustomers = await prisma.customer.findMany({`

**第 735 行** - API修复:
- 修复前: `const customer = await prisma.customer.find_unique({`
- 修复后: `const customer = await prisma.customer.findUnique({`

**第 806 行** - API修复:
- 修复前: `const existingCustomer = await prisma.customer.find_unique({`
- 修复后: `const existingCustomer = await prisma.customer.findUnique({`

**第 879 行** - API修复:
- 修复前: `const existingCustomer = await prisma.customer.find_unique({`
- 修复后: `const existingCustomer = await prisma.customer.findUnique({`

**第 892 行** - API修复:
- 修复前: `const phoneExists = await prisma.customer.find_unique({`
- 修复后: `const phoneExists = await prisma.customer.findUnique({`

**第 943 行** - API修复:
- 修复前: `const customer = await prisma.customer.find_unique({`
- 修复后: `const customer = await prisma.customer.findUnique({`

**第 986 行** - API修复:
- 修复前: `const customer = await prisma.customer.find_unique({`
- 修复后: `const customer = await prisma.customer.findUnique({`

**第 998 行** - API修复:
- 修复前: `prisma.customer_purchase.find_many({`
- 修复后: `prisma.customer_purchase.findMany({`

**第 1078 行** - API修复:
- 修复前: `const customer = await prisma.customer.find_unique({`
- 修复后: `const customer = await prisma.customer.findUnique({`

**第 1090 行** - API修复:
- 修复前: `const sku = await prisma.product_sku.find_unique({`
- 修复后: `const sku = await prisma.product_sku.findUnique({`

**第 1132 行** - API修复:
- 修复前: `const customer = await prisma.customer.find_unique({`
- 修复后: `const customer = await prisma.customer.findUnique({`

**第 1143 行** - API修复:
- 修复前: `const notes = await prisma.customer_note.find_many({`
- 修复后: `const notes = await prisma.customer_note.findMany({`

**第 1184 行** - API修复:
- 修复前: `const customer = await prisma.customer.find_unique({`
- 修复后: `const customer = await prisma.customer.findUnique({`

**第 1243 行** - API修复:
- 修复前: `const customer = await tx.customer.find_unique({`
- 修复后: `const customer = await tx.customer.findUnique({`

**第 1252 行** - API修复:
- 修复前: `const purchase = await tx.customer_purchase.find_unique({`
- 修复后: `const purchase = await tx.customer_purchase.findUnique({`

### backend\src\routes\dashboard.ts (3 处修复)

**第 57 行** - API修复:
- 修复前: `const recentPurchasesData = await prisma.purchase.find_many({`
- 修复后: `const recentPurchasesData = await prisma.purchase.findMany({`

**第 81 行** - API修复:
- 修复前: `const recentMaterialsData = await prisma.material.find_many({`
- 修复后: `const recentMaterialsData = await prisma.material.findMany({`

**第 111 行** - API修复:
- 修复前: `const supplierStatsData = await prisma.supplier.find_many({`
- 修复后: `const supplierStatsData = await prisma.supplier.findMany({`

### backend\src\routes\financial.ts (63 处修复)

**第 49 行** - API修复:
- 修复前: `const purchases = await prisma.purchase.find_many({`
- 修复后: `const purchases = await prisma.purchase.findMany({`

**第 60 行** - API修复:
- 修复前: `const skuCreations = await prisma.product_sku.find_many({`
- 修复后: `const skuCreations = await prisma.product_sku.findMany({`

**第 70 行** - API修复:
- 修复前: `const restockLogs = await prisma.sku_inventory_log.find_many({`
- 修复后: `const restockLogs = await prisma.sku_inventory_log.findMany({`

**第 87 行** - API修复:
- 修复前: `const financial_records = await prisma.financial_record.find_many({`
- 修复后: `const financial_records = await prisma.financial_record.findMany({`

**第 100 行** - API修复:
- 修复前: `const customerPurchases = await prisma.customer_purchase.find_many({`
- 修复后: `const customerPurchases = await prisma.customer_purchase.findMany({`

**第 261 行** - API修复:
- 修复前: `const purchases = await prisma.purchase.find_many({`
- 修复后: `const purchases = await prisma.purchase.findMany({`

**第 272 行** - API修复:
- 修复前: `const skuCreations = await prisma.product_sku.find_many({`
- 修复后: `const skuCreations = await prisma.product_sku.findMany({`

**第 282 行** - API修复:
- 修复前: `const restockLogs = await prisma.sku_inventory_log.find_many({`
- 修复后: `const restockLogs = await prisma.sku_inventory_log.findMany({`

**第 299 行** - API修复:
- 修复前: `const financial_records = await prisma.financial_record.find_many({`
- 修复后: `const financial_records = await prisma.financial_record.findMany({`

**第 306 行** - API修复:
- 修复前: `const customerPurchases = await prisma.customer_purchase.find_many({`
- 修复后: `const customerPurchases = await prisma.customer_purchase.findMany({`

**第 574 行** - API修复:
- 修复前: `start_date = new Date(end_date.get_full_year(), 0, 1)`
- 修复后: `start_date = new Date(end_date.getFullYear(), 0, 1)`

**第 576 行** - API修复:
- 修复前: `start_date = new Date(end_date.get_full_year(), end_date.get_month(), 1)`
- 修复后: `start_date = new Date(end_date.getFullYear(), end_date.get_month(), 1)`

**第 576 行** - API修复:
- 修复前: `start_date = new Date(end_date.getFullYear(), end_date.get_month(), 1)`
- 修复后: `start_date = new Date(end_date.getFullYear(), end_date.getMonth(), 1)`

**第 593 行** - API修复:
- 修复前: `const productionCosts = await prisma.product_sku.find_many({`
- 修复后: `const productionCosts = await prisma.product_sku.findMany({`

**第 636 行** - API修复:
- 修复前: `const startOfMonth = new Date(now.get_full_year(), now.get_month(), 1)`
- 修复后: `const startOfMonth = new Date(now.getFullYear(), now.get_month(), 1)`

**第 636 行** - API修复:
- 修复前: `const startOfMonth = new Date(now.getFullYear(), now.get_month(), 1)`
- 修复后: `const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)`

**第 637 行** - API修复:
- 修复前: `const startOfYear = new Date(now.get_full_year(), 0, 1)`
- 修复后: `const startOfYear = new Date(now.getFullYear(), 0, 1)`

**第 664 行** - API修复:
- 修复前: `const monthlyProductionCosts = await prisma.product_sku.find_many({`
- 修复后: `const monthlyProductionCosts = await prisma.product_sku.findMany({`

**第 678 行** - API修复:
- 修复前: `const yearlyProductionCosts = await prisma.product_sku.find_many({`
- 修复后: `const yearlyProductionCosts = await prisma.product_sku.findMany({`

**第 774 行** - API修复:
- 修复前: `const startOfToday = new Date(now.get_full_year(), now.get_month(), now.get_date())`
- 修复后: `const startOfToday = new Date(now.getFullYear(), now.get_month(), now.get_date())`

**第 774 行** - API修复:
- 修复前: `const startOfToday = new Date(now.getFullYear(), now.get_month(), now.get_date())`
- 修复后: `const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.get_date())`

**第 774 行** - API修复:
- 修复前: `const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.get_date())`
- 修复后: `const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())`

**第 856 行** - API修复:
- 修复前: `const start_date = query.start_date ? new Date(query.start_date) : new Date(end_date.get_time() - 30 * 24 * 60 * 60 * 1000)`
- 修复后: `const start_date = query.start_date ? new Date(query.start_date) : new Date(end_date.getTime() - 30 * 24 * 60 * 60 * 1000)`

**第 860 行** - API修复:
- 修复前: `const purchases = await prisma.purchase.find_many({`
- 修复后: `const purchases = await prisma.purchase.findMany({`

**第 873 行** - API修复:
- 修复前: `const productionCosts = await prisma.product_sku.find_many({`
- 修复后: `const productionCosts = await prisma.product_sku.findMany({`

**第 889 行** - API修复:
- 修复前: `const destroyRefunds = await prisma.sku_inventory_log.find_many({`
- 修复后: `const destroyRefunds = await prisma.sku_inventory_log.findMany({`

**第 915 行** - API修复:
- 修复前: `key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}``

**第 915 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}``

**第 917 行** - API修复:
- 修复前: `key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``

**第 917 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``

**第 917 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}``

**第 942 行** - API修复:
- 修复前: `key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}``

**第 942 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}``

**第 944 行** - API修复:
- 修复前: `key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``

**第 944 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``

**第 944 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}``

**第 972 行** - API修复:
- 修复前: `key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}``

**第 972 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}``

**第 974 行** - API修复:
- 修复前: `key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``

**第 974 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``

**第 974 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}``

**第 1041 行** - API修复:
- 修复前: `const start_date = query.start_date ? new Date(query.start_date) : new Date(end_date.get_time() - 30 * 24 * 60 * 60 * 1000)`
- 修复后: `const start_date = query.start_date ? new Date(query.start_date) : new Date(end_date.getTime() - 30 * 24 * 60 * 60 * 1000)`

**第 1045 行** - API修复:
- 修复前: `const purchases = await prisma.purchase.find_many({`
- 修复后: `const purchases = await prisma.purchase.findMany({`

**第 1058 行** - API修复:
- 修复前: `const productionCosts = await prisma.product_sku.find_many({`
- 修复后: `const productionCosts = await prisma.product_sku.findMany({`

**第 1074 行** - API修复:
- 修复前: `const destroyRefunds = await prisma.sku_inventory_log.find_many({`
- 修复后: `const destroyRefunds = await prisma.sku_inventory_log.findMany({`

**第 1100 行** - API修复:
- 修复前: `key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}``

**第 1100 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}``

**第 1102 行** - API修复:
- 修复前: `key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``

**第 1102 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``

**第 1102 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}``

**第 1127 行** - API修复:
- 修复前: `key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}``

**第 1127 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}``

**第 1129 行** - API修复:
- 修复前: `key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``

**第 1129 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``

**第 1129 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}``

**第 1157 行** - API修复:
- 修复前: `key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}``

**第 1157 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}``

**第 1159 行** - API修复:
- 修复前: `key = `${date.get_full_year()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``

**第 1159 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.get_month() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``

**第 1159 行** - API修复:
- 修复前: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.get_date()).padStart(2, '0')}``
- 修复后: `key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}``

**第 1245 行** - API修复:
- 修复前: `stale_threshold_date.setMonth(stale_threshold_date.get_month() - stale_period_months)`
- 修复后: `stale_threshold_date.setMonth(stale_threshold_date.getMonth() - stale_period_months)`

**第 1248 行** - API修复:
- 修复前: `const material_inventory = await prisma.purchase.find_many({`
- 修复后: `const material_inventory = await prisma.purchase.findMany({`

**第 1281 行** - API修复:
- 修复前: `const sku_inventory = await prisma.product_sku.find_many({`
- 修复后: `const sku_inventory = await prisma.product_sku.findMany({`

### backend\src\routes\inventory.ts (7 处修复)

**第 58 行** - API修复:
- 修复前: `const samplePurchases = await prisma.purchase.find_many({`
- 修复后: `const samplePurchases = await prisma.purchase.findMany({`

**第 344 行** - API修复:
- 修复前: `if (search && !item.product_name.to_lower_case().includes(search.to_lower_case())) return`
- 修复后: `if (search && !item.product_name.toLowerCase().includes(search.toLowerCase())) return`

**第 1521 行** - API修复:
- 修复前: `const sevenDaysAgo = new Date(now.get_time() - 7 * 24 * 60 * 60 * 1000)`
- 修复后: `const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)`

**第 1525 行** - API修复:
- 修复前: `const thirtyDaysAgo = new Date(now.get_time() - 30 * 24 * 60 * 60 * 1000)`
- 修复后: `const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)`

**第 1529 行** - API修复:
- 修复前: `const ninetyDaysAgo = new Date(now.get_time() - 90 * 24 * 60 * 60 * 1000)`
- 修复后: `const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)`

**第 1533 行** - API修复:
- 修复前: `const sixMonthsAgo = new Date(now.get_time() - 6 * 30 * 24 * 60 * 60 * 1000)`
- 修复后: `const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)`

**第 1537 行** - API修复:
- 修复前: `const oneYearAgo = new Date(now.get_time() - 365 * 24 * 60 * 60 * 1000)`
- 修复后: `const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)`

### backend\src\routes\materials.ts (8 处修复)

**第 88 行** - API修复:
- 修复前: `prisma.material.find_many({`
- 修复后: `prisma.material.findMany({`

**第 147 行** - API修复:
- 修复前: `const material = await prisma.material.find_unique({`
- 修复后: `const material = await prisma.material.findUnique({`

**第 224 行** - API修复:
- 修复前: `const purchase = await prisma.purchase.find_unique({`
- 修复后: `const purchase = await prisma.purchase.findUnique({`

**第 236 行** - API修复:
- 修复前: `const existingMaterial = await prisma.material.find_first({`
- 修复后: `const existingMaterial = await prisma.material.findFirst({`

**第 254 行** - API修复:
- 修复前: `const existing = await prisma.material.find_unique({`
- 修复后: `const existing = await prisma.material.findUnique({`

**第 353 行** - API修复:
- 修复前: `const existingMaterial = await prisma.material.find_unique({`
- 修复后: `const existingMaterial = await prisma.material.findUnique({`

**第 418 行** - API修复:
- 修复前: `const material = await prisma.material.find_unique({`
- 修复后: `const material = await prisma.material.findUnique({`

**第 447 行** - API修复:
- 修复前: `await tx.material_usage.delete_many({`
- 修复后: `await tx.material_usage.deleteMany({`

### backend\src\routes\products.ts (8 处修复)

**第 261 行** - API修复:
- 修复前: `const products = await prisma.product.find_many({`
- 修复后: `const products = await prisma.product.findMany({`

**第 330 行** - API修复:
- 修复前: `const product = await prisma.product.find_unique({`
- 修复后: `const product = await prisma.product.findUnique({`

**第 387 行** - API修复:
- 修复前: `const product = await tx.product.find_unique({`
- 修复后: `const product = await tx.product.findUnique({`

**第 413 行** - API修复:
- 修复前: `await tx.material_usage.delete_many({`
- 修复后: `await tx.material_usage.deleteMany({`

**第 464 行** - API修复:
- 修复前: `const purchase = await prisma.purchase.find_unique({`
- 修复后: `const purchase = await prisma.purchase.findUnique({`

**第 559 行** - API修复:
- 修复前: `const purchase = await tx.purchase.find_unique({`
- 修复后: `const purchase = await tx.purchase.findUnique({`

**第 628 行** - API修复:
- 修复前: `const purchase = await tx.purchase.find_unique({`
- 修复后: `const purchase = await tx.purchase.findUnique({`

**第 801 行** - API修复:
- 修复前: `const purchase = await tx.purchase.find_unique({`
- 修复后: `const purchase = await tx.purchase.findUnique({`

### backend\src\routes\purchases.ts (16 处修复)

**第 33 行** - API修复:
- 修复前: `const purchases = await prisma.purchase.find_many({`
- 修复后: `const purchases = await prisma.purchase.findMany({`

**第 985 行** - API修复:
- 修复前: `const purchases = await prisma.purchase.find_many({`
- 修复后: `const purchases = await prisma.purchase.findMany({`

**第 1088 行** - API修复:
- 修复前: `const existing = await prisma.purchase.find_unique({`
- 修复后: `const existing = await prisma.purchase.findUnique({`

**第 1146 行** - API修复:
- 修复前: `let supplier = await prisma.supplier.find_first({`
- 修复后: `let supplier = await prisma.supplier.findFirst({`

**第 1245 行** - API修复:
- 修复前: `const purchase = await prisma.purchase.find_unique({`
- 修复后: `const purchase = await prisma.purchase.findUnique({`

**第 1330 行** - API修复:
- 修复前: `const existingPurchase = await prisma.purchase.find_unique({`
- 修复后: `const existingPurchase = await prisma.purchase.findUnique({`

**第 1382 行** - API修复:
- 修复前: `let supplier = await prisma.supplier.find_first({`
- 修复后: `let supplier = await prisma.supplier.findFirst({`

**第 1564 行** - API修复:
- 修复前: `const user = await prisma.user.find_unique({`
- 修复后: `const user = await prisma.user.findUnique({`

**第 1629 行** - API修复:
- 修复前: `const existingPurchase = await prisma.purchase.find_unique({`
- 修复后: `const existingPurchase = await prisma.purchase.findUnique({`

**第 1685 行** - API修复:
- 修复前: `const user = await prisma.user.find_unique({`
- 修复后: `const user = await prisma.user.findUnique({`

**第 1723 行** - API修复:
- 修复前: `await tx.financial_record.delete_many({`
- 修复后: `await tx.financial_record.deleteMany({`

**第 1771 行** - API修复:
- 修复前: `const purchase = await prisma.purchase.find_first({`
- 修复后: `const purchase = await prisma.purchase.findFirst({`

**第 1974 行** - API修复:
- 修复前: `const purchases = await prisma.purchase.find_many({`
- 修复后: `const purchases = await prisma.purchase.findMany({`

**第 2144 行** - API修复:
- 修复前: `const purchase = await prisma.purchase.find_unique({`
- 修复后: `const purchase = await prisma.purchase.findUnique({`

**第 2177 行** - API修复:
- 修复前: `const existing = await prisma.material.find_unique({`
- 修复后: `const existing = await prisma.material.findUnique({`

**第 2273 行** - API修复:
- 修复前: `const materialWithDetails = await prisma.material.find_unique({`
- 修复后: `const materialWithDetails = await prisma.material.findUnique({`

### backend\src\routes\skus.ts (19 处修复)

**第 196 行** - API修复:
- 修复前: `let customer = await tx.customer.find_unique({`
- 修复后: `let customer = await tx.customer.findUnique({`

**第 226 行** - API修复:
- 修复前: `const sku = await tx.product_sku.find_unique({`
- 修复后: `const sku = await tx.product_sku.findUnique({`

**第 331 行** - API修复:
- 修复前: `prisma.sku_inventory_log.find_many({`
- 修复后: `prisma.sku_inventory_log.findMany({`

**第 381 行** - API修复:
- 修复前: `const lowStockSkus = await prisma.product_sku.find_many({`
- 修复后: `const lowStockSkus = await prisma.product_sku.findMany({`

**第 416 行** - API修复:
- 修复前: `const sku = await prisma.product_sku.find_unique({`
- 修复后: `const sku = await prisma.product_sku.findUnique({`

**第 599 行** - API修复:
- 修复前: `const sku = await prisma.product_sku.find_unique({`
- 修复后: `const sku = await prisma.product_sku.findUnique({`

**第 632 行** - API修复:
- 修复前: `const firstMaterialUsage = await prisma.materialUsage.find_first({`
- 修复后: `const firstMaterialUsage = await prisma.materialUsage.findFirst({`

**第 795 行** - API修复:
- 修复前: `const sku = await tx.product_sku.find_unique({`
- 修复后: `const sku = await tx.product_sku.findUnique({`

**第 1034 行** - API修复:
- 修复前: `const sku = await prisma.product_sku.find_unique({`
- 修复后: `const sku = await prisma.product_sku.findUnique({`

**第 1086 行** - API修复:
- 修复前: `const currentMaterialUsage = await prisma.materialUsage.find_first({`
- 修复后: `const currentMaterialUsage = await prisma.materialUsage.findFirst({`

**第 1181 行** - API修复:
- 修复前: `const sku = await tx.product_sku.find_unique({`
- 修复后: `const sku = await tx.product_sku.findUnique({`

**第 1210 行** - API修复:
- 修复前: `const firstMaterialUsage = await tx.materialUsage.find_first({`
- 修复后: `const firstMaterialUsage = await tx.materialUsage.findFirst({`

**第 1272 行** - API修复:
- 修复前: `const purchase = await tx.purchase.find_unique({ where: { id: material.purchase_id } })`
- 修复后: `const purchase = await tx.purchase.findUnique({ where: { id: material.purchase_id } })`

**第 1406 行** - API修复:
- 修复前: `const sku = await tx.product_sku.find_unique({`
- 修复后: `const sku = await tx.product_sku.findUnique({`

**第 1538 行** - API修复:
- 修复前: `const sku = await tx.product_sku.find_unique({`
- 修复后: `const sku = await tx.product_sku.findUnique({`

**第 1681 行** - API修复:
- 修复前: `const existing = await prisma.product_sku.find_unique({`
- 修复后: `const existing = await prisma.product_sku.findUnique({`

**第 1698 行** - API修复:
- 修复前: `const existing = await prisma.product_sku.find_unique({`
- 修复后: `const existing = await prisma.product_sku.findUnique({`

**第 1715 行** - API修复:
- 修复前: `const materialRecord = await tx.material.find_unique({`
- 修复后: `const materialRecord = await tx.material.findUnique({`

**第 1820 行** - API修复:
- 修复前: `const skuWithDetails = await prisma.product_sku.find_unique({`
- 修复后: `const skuWithDetails = await prisma.product_sku.findUnique({`

### backend\src\routes\suppliers.ts (6 处修复)

**第 61 行** - API修复:
- 修复前: `const suppliers = await prisma.supplier.find_many({`
- 修复后: `const suppliers = await prisma.supplier.findMany({`

**第 177 行** - API修复:
- 修复前: `const allActiveSuppliers = await prisma.supplier.find_many({`
- 修复后: `const allActiveSuppliers = await prisma.supplier.findMany({`

**第 227 行** - API修复:
- 修复前: `const existingSupplier = await prisma.supplier.find_first({`
- 修复后: `const existingSupplier = await prisma.supplier.findFirst({`

**第 256 行** - API修复:
- 修复前: `const normalizedName = validatedData.name.to_lower_case().trim()`
- 修复后: `const normalizedName = validatedData.name.toLowerCase().trim()`

**第 257 行** - API修复:
- 修复前: `const similarSuppliers = await prisma.supplier.find_many({`
- 修复后: `const similarSuppliers = await prisma.supplier.findMany({`

**第 264 行** - API修复:
- 修复前: `s.name.to_lower_case().trim() === normalizedName && s.name !== validatedData.name`
- 修复后: `s.name.toLowerCase().trim() === normalizedName && s.name !== validatedData.name`

### backend\src\routes\users.ts (8 处修复)

**第 61 行** - API修复:
- 修复前: `prisma.user.find_many({`
- 修复后: `prisma.user.findMany({`

**第 115 行** - API修复:
- 修复前: `const user = await prisma.user.find_unique({`
- 修复后: `const user = await prisma.user.findUnique({`

**第 246 行** - API修复:
- 修复前: `const existingUser = await prisma.user.find_unique({`
- 修复后: `const existingUser = await prisma.user.findUnique({`

**第 262 行** - API修复:
- 修复前: `const existingEmail = await prisma.user.find_unique({`
- 修复后: `const existingEmail = await prisma.user.findUnique({`

**第 345 行** - API修复:
- 修复前: `const existingUser = await prisma.user.find_unique({`
- 修复后: `const existingUser = await prisma.user.findUnique({`

**第 361 行** - API修复:
- 修复前: `const usernameExists = await prisma.user.find_first({`
- 修复后: `const usernameExists = await prisma.user.findFirst({`

**第 381 行** - API修复:
- 修复前: `const emailExists = await prisma.user.find_first({`
- 修复后: `const emailExists = await prisma.user.findFirst({`

**第 476 行** - API修复:
- 修复前: `const existingUser = await prisma.user.find_unique({`
- 修复后: `const existingUser = await prisma.user.findUnique({`

### backend\src\utils\fieldConverter.ts (2 处修复)

**第 16 行** - API修复:
- 修复前: `return str.replace(/[A-Z]/g, letter => `_${letter.to_lower_case()}`);`
- 修复后: `return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);`

**第 25 行** - API修复:
- 修复前: `return str.replace(/_([a-z])/g, (_, letter) => letter.to_upper_case());`
- 修复后: `return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());`

### backend\src\utils\operationLogger.ts (1 处修复)

**第 314 行** - API修复:
- 修复前: `const logs = await prisma.edit_log.find_many({`
- 修复后: `const logs = await prisma.edit_log.findMany({`

### backend\src\utils\updateImageUrls.ts (1 处修复)

**第 17 行** - API修复:
- 修复前: `const purchases = await prisma.purchase.find_many({`
- 修复后: `const purchases = await prisma.purchase.findMany({`

