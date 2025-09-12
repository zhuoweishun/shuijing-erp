const fs = require('fs');
const path = require('path');

console.log('=== 批量修复命名规范问题 ===\n');

let fixedFiles = 0;
let totalFixes = 0;

// 前端需要修复的camelCase到snake_case映射
const frontendFieldMappings = {
  // 常见的业务字段
  'skuCode': 'sku_code',
  'skuName': 'sku_name',
  'skuId': 'sku_id',
  'availableQuantity': 'available_quantity',
  'totalQuantity': 'total_quantity',
  'unitPrice': 'unit_price',
  'totalPrice': 'total_price',
  'sellingPrice': 'selling_price',
  'materialCost': 'material_cost',
  'laborCost': 'labor_cost',
  'craftCost': 'craft_cost',
  'totalCost': 'total_cost',
  'lastSaleDate': 'last_sale_date',
  'customerId': 'customer_id',
  'customerName': 'customer_name',
  'customerPhone': 'customer_phone',
  'customerAddress': 'customer_address',
  'purchaseId': 'purchase_id',
  'purchaseCode': 'purchase_code',
  'purchaseDate': 'purchase_date',
  'supplierId': 'supplier_id',
  'supplierName': 'supplier_name',
  'materialId': 'material_id',
  'materialName': 'material_name',
  'materialType': 'material_type',
  'productId': 'product_id',
  'productName': 'product_name',
  'productCode': 'product_code',
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  'userId': 'user_id',
  'isActive': 'is_active',
  'totalValue': 'total_value',
  'pricePerGram': 'price_per_gram',
  'pricePerBead': 'price_per_bead',
  'pricePerPiece': 'price_per_piece',
  'beadDiameter': 'bead_diameter',
  'beadsPerString': 'beads_per_string',
  'totalBeads': 'total_beads',
  'pieceCount': 'piece_count',
  'minStockAlert': 'min_stock_alert',
  'naturalLanguageInput': 'natural_language_input',
  'aiRecognitionResult': 'ai_recognition_result',
  'lastEditedBy': 'last_edited_by',
  'lastEditedById': 'last_edited_by_id',
  'materialSignature': 'material_signature',
  'materialSignatureHash': 'material_signature_hash',
  'saleChannel': 'sale_channel',
  'saleSource': 'sale_source',
  'totalPurchases': 'total_purchases',
  'totalOrders': 'total_orders',
  'refundCount': 'refund_count',
  'refundRate': 'refund_rate',
  'averageOrderValue': 'average_order_value',
  'firstPurchaseDate': 'first_purchase_date',
  'lastPurchaseDate': 'last_purchase_date',
  'customerLabels': 'customer_labels',
  'primaryLabel': 'primary_label',
  'actualTotalPrice': 'actual_total_price',
  'operationType': 'operation_type',
  'quantityChange': 'quantity_change',
  'quantityBefore': 'quantity_before',
  'quantityAfter': 'quantity_after',
  'referenceType': 'reference_type',
  'referenceId': 'reference_id',
  'transactionDate': 'transaction_date',
  'recordType': 'record_type',
  'sortBy': 'sort_by',
  'sortOrder': 'sort_order',
  'pageSize': 'page_size',
  'pageNumber': 'page_number',
  'searchTerm': 'search_term',
  'selectedQuality': 'selected_quality',
  'selectedType': 'selected_type',
  'selectedStatus': 'selected_status',
  'lowStockOnly': 'low_stock_only',
  'specificationMin': 'specification_min',
  'specificationMax': 'specification_max',
  'priceMin': 'price_min',
  'priceMax': 'price_max',
  'totalCount': 'total_count',
  'currentPage': 'current_page',
  'totalPages': 'total_pages',
  'hasNextPage': 'has_next_page',
  'hasPrevPage': 'has_prev_page'
};

// 后端需要修复的snake_case到camelCase映射（排除数据库字段）
const backendFieldMappings = {
  'quality_issue': 'qualityIssue',
  'customer_dissatisfied': 'customerDissatisfied',
  'wrong_item': 'wrongItem',
  'damaged_shipping': 'damagedShipping',
  'customer_change_mind': 'customerChangeMind',
  'time_period': 'timePeriod',
  'search_term': 'searchTerm',
  'sort_by': 'sortBy',
  'sort_order': 'sortOrder',
  'page_size': 'pageSize',
  'page_number': 'pageNumber',
  'low_stock_only': 'lowStockOnly',
  'available_only': 'availableOnly',
  'specification_min': 'specificationMin',
  'specification_max': 'specificationMax',
  'price_min': 'priceMin',
  'price_max': 'priceMax',
  'total_count': 'totalCount',
  'current_page': 'currentPage',
  'total_pages': 'totalPages',
  'has_next_page': 'hasNextPage',
  'has_prev_page': 'hasPrevPage',
  'time_zone': 'timeZone',
  'snake_case': 'snakeCase'
};

// Prisma schema需要添加@map映射的字段
const schemaMappings = {
  'isActive': 'is_active',
  'lastLoginAt': 'last_login_at',
  'createdBy': 'created_by',
  'userId': 'user_id',
  'resourceId': 'resource_id',
  'ipAddress': 'ip_address',
  'userAgent': 'user_agent'
};

function fixFrontendFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let fileFixCount = 0;
    
    // 替换字段名
    Object.entries(frontendFieldMappings).forEach(([camelCase, snakeCase]) => {
      // 匹配对象属性访问：obj.camelCase
      const propertyRegex = new RegExp(`\\b([a-zA-Z_$][a-zA-Z0-9_$]*)\\.${camelCase}\\b`, 'g');
      const propertyMatches = content.match(propertyRegex);
      if (propertyMatches) {
        content = content.replace(propertyRegex, `$1.${snakeCase}`);
        fileFixCount += propertyMatches.length;
        modified = true;
      }
      
      // 匹配对象字面量：{ camelCase: value }
      const objectLiteralRegex = new RegExp(`\\b${camelCase}\\s*:`, 'g');
      const objectMatches = content.match(objectLiteralRegex);
      if (objectMatches) {
        content = content.replace(objectLiteralRegex, `${snakeCase}:`);
        fileFixCount += objectMatches.length;
        modified = true;
      }
      
      // 匹配解构赋值：{ camelCase } = obj
      const destructureRegex = new RegExp(`\\{([^}]*\\b)${camelCase}(\\b[^}]*)\\}`, 'g');
      const destructureMatches = content.match(destructureRegex);
      if (destructureMatches) {
        content = content.replace(destructureRegex, `{$1${snakeCase}$2}`);
        fileFixCount += destructureMatches.length;
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 修复前端文件: ${filePath} (${fileFixCount}个修复)`);
      fixedFiles++;
      totalFixes += fileFixCount;
    }
  } catch (error) {
    console.log(`❌ 修复前端文件失败: ${filePath} - ${error.message}`);
  }
}

function fixBackendFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let fileFixCount = 0;
    
    // 替换字段名（排除@map映射行）
    Object.entries(backendFieldMappings).forEach(([snakeCase, camelCase]) => {
      const lines = content.split('\n');
      const newLines = lines.map(line => {
        if (line.includes('@map') || line.includes('//') || line.includes('import') || line.includes('export')) {
          return line;
        }
        
        // 匹配对象属性访问：obj.snake_case
        const propertyRegex = new RegExp(`\\b([a-zA-Z_$][a-zA-Z0-9_$]*)\\.${snakeCase}\\b`, 'g');
        const propertyMatches = line.match(propertyRegex);
        if (propertyMatches) {
          line = line.replace(propertyRegex, `$1.${camelCase}`);
          fileFixCount += propertyMatches.length;
          modified = true;
        }
        
        // 匹配对象字面量：{ snake_case: value }
        const objectLiteralRegex = new RegExp(`\\b${snakeCase}\\s*:`, 'g');
        const objectMatches = line.match(objectLiteralRegex);
        if (objectMatches) {
          line = line.replace(objectLiteralRegex, `${camelCase}:`);
          fileFixCount += objectMatches.length;
          modified = true;
        }
        
        return line;
      });
      
      content = newLines.join('\n');
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 修复后端文件: ${filePath} (${fileFixCount}个修复)`);
      fixedFiles++;
      totalFixes += fileFixCount;
    }
  } catch (error) {
    console.log(`❌ 修复后端文件失败: ${filePath} - ${error.message}`);
  }
}

function fixSchemaFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let fileFixCount = 0;
    
    const lines = content.split('\n');
    const newLines = lines.map(line => {
      // 检查是否是字段定义行
      Object.entries(schemaMappings).forEach(([camelCase, snakeCase]) => {
        const fieldRegex = new RegExp(`^\\s*${camelCase}\\s+`, 'g');
        if (fieldRegex.test(line) && !line.includes('@map')) {
          // 在行末添加@map映射
          const trimmedLine = line.trimEnd();
          line = `${trimmedLine} @map("${snakeCase}")`;
          fileFixCount++;
          modified = true;
        }
      });
      return line;
    });
    
    if (modified) {
      content = newLines.join('\n');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 修复Schema文件: ${filePath} (${fileFixCount}个修复)`);
      fixedFiles++;
      totalFixes += fileFixCount;
    }
  } catch (error) {
    console.log(`❌ 修复Schema文件失败: ${filePath} - ${error.message}`);
  }
}

function scanAndFixDirectory(dir, fileType, extensions) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && 
          !['node_modules', 'dist', 'build', 'coverage', '__tests__', 'tests'].includes(file)) {
        scanAndFixDirectory(filePath, fileType, extensions);
      } else if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
        if (fileType === 'frontend') {
          fixFrontendFile(filePath);
        } else if (fileType === 'backend') {
          fixBackendFile(filePath);
        }
      }
    });
  } catch (error) {
    console.log(`无法扫描目录: ${dir}`);
  }
}

// 修复前端文件
console.log('1. 修复前端文件 (camelCase → snake_case)...');
if (fs.existsSync('./src')) {
  scanAndFixDirectory('./src', 'frontend', ['.tsx', '.ts', '.js', '.jsx']);
}

// 修复后端文件
console.log('\n2. 修复后端文件 (snake_case → camelCase)...');
if (fs.existsSync('./backend/src')) {
  scanAndFixDirectory('./backend/src', 'backend', ['.ts', '.js']);
}

// 修复Prisma schema
console.log('\n3. 修复Prisma schema (@map映射)...');
if (fs.existsSync('./backend/prisma/schema.prisma')) {
  fixSchemaFile('./backend/prisma/schema.prisma');
}

console.log('\n=== 修复完成 ===');
console.log(`✅ 修复了 ${fixedFiles} 个文件`);
console.log(`✅ 总共进行了 ${totalFixes} 个字段修复`);
console.log('\n建议接下来：');
console.log('1. 运行 npm run dev 检查是否有编译错误');
console.log('2. 运行 node scripts/naming-standards-checker.cjs 验证修复效果');
console.log('3. 测试应用功能确保修复没有破坏业务逻辑');

process.exit(0);