const fs = require('fs');
const path = require('path');

// 常见的驼峰变量名映射表（基于之前的字段重命名）
const camelToSnakeMap = {
  // 常见变量名
  'isActive': 'is_active',
  'hasPermission': 'has_permission',
  'isLoading': 'is_loading',
  'isVisible': 'is_visible',
  'isDisabled': 'is_disabled',
  'isSelected': 'is_selected',
  'isOpen': 'is_open',
  'isClosed': 'is_closed',
  'isValid': 'is_valid',
  'isRequired': 'is_required',
  'isEditing': 'is_editing',
  'isDeleting': 'is_deleting',
  'isSaving': 'is_saving',
  'isSubmitting': 'is_submitting',
  'showModal': 'show_modal',
  'showDialog': 'show_dialog',
  'showDetails': 'show_details',
  'currentUser': 'current_user',
  'currentPage': 'current_page',
  'currentItem': 'current_item',
  'selectedItem': 'selected_item',
  'selectedItems': 'selected_items',
  'totalCount': 'total_count',
  'pageSize': 'page_size',
  'pageNumber': 'page_number',
  'sortBy': 'sort_by',
  'sortOrder': 'sort_order',
  'searchTerm': 'search_term',
  'searchQuery': 'search_query',
  'filterBy': 'filter_by',
  'filterValue': 'filter_value',
  'startDate': 'start_date',
  'endDate': 'end_date',
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  'deletedAt': 'deleted_at',
  'userId': 'user_id',
  'userName': 'user_name',
  'userRole': 'user_role',
  'userEmail': 'user_email',
  'userPhone': 'user_phone',
  'supplierId': 'supplier_id',
  'supplierName': 'supplier_name',
  'supplierCode': 'supplier_code',
  'purchaseId': 'purchase_id',
  'purchaseCode': 'purchase_code',
  'purchaseDate': 'purchase_date',
  'purchaseAmount': 'purchase_amount',
  'materialId': 'material_id',
  'materialCode': 'material_code',
  'materialName': 'material_name',
  'materialType': 'material_type',
  'productId': 'product_id',
  'productName': 'product_name',
  'productCode': 'product_code',
  'skuId': 'sku_id',
  'skuCode': 'sku_code',
  'skuName': 'sku_name',
  'customerId': 'customer_id',
  'customerName': 'customer_name',
  'customerCode': 'customer_code',
  'orderDate': 'order_date',
  'orderAmount': 'order_amount',
  'orderStatus': 'order_status',
  'paymentMethod': 'payment_method',
  'paymentStatus': 'payment_status',
  'shippingAddress': 'shipping_address',
  'contactInfo': 'contact_info',
  'phoneNumber': 'phone_number',
  'emailAddress': 'email_address',
  'companyName': 'company_name',
  'businessType': 'business_type',
  'taxNumber': 'tax_number',
  'bankAccount': 'bank_account',
  'creditLimit': 'credit_limit',
  'qualityGrade': 'quality_grade',
  'qualityLevel': 'quality_level',
  'inventoryCount': 'inventory_count',
  'stockLevel': 'stock_level',
  'unitPrice': 'unit_price',
  'totalPrice': 'total_price',
  'discountRate': 'discount_rate',
  'taxRate': 'tax_rate',
  'netAmount': 'net_amount',
  'grossAmount': 'gross_amount'
};

// 需要处理的文件扩展名
const targetExtensions = ['.tsx', '.ts', '.jsx', '.js'];

// 排除的目录
const excludeDirs = ['node_modules', 'dist', 'build', '.git', 'scripts'];

// 修复报告
const fixReport = {
  totalFiles: 0,
  modifiedFiles: 0,
  totalReplacements: 0,
  replacements: {},
  errors: []
};

// 递归获取所有需要处理的文件
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      const ext = path.extname(file);
      if (targetExtensions.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// 处理单个文件
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let fileReplacements = 0;
    
    // 遍历所有映射规则
    Object.entries(camelToSnakeMap).forEach(([camelCase, snakeCase]) => {
      // 创建正则表达式，匹配变量名（避免匹配字符串内容）
      const patterns = [
        // 变量声明: const isActive = ...
        new RegExp(`\\b(const|let|var)\\s+${camelCase}\\b`, 'g'),
        // 对象属性: { isActive: ... } 或 { isActive, ... }
        new RegExp(`\\{([^}]*\\s+)?${camelCase}(\\s*[,:}])`, 'g'),
        // 函数参数: function(isActive) 或 (isActive) =>
        new RegExp(`\\(([^)]*)\\b${camelCase}\\b([^)]*)\\)`, 'g'),
        // 变量使用: 单独的变量名（不在字符串中）
        new RegExp(`\\b${camelCase}\\b`, 'g')
      ];
      
      patterns.forEach((pattern, index) => {
        const matches = content.match(pattern);
        if (matches) {
          let replacement;
          switch (index) {
            case 0: // 变量声明
              replacement = content.replace(pattern, (match) => 
                match.replace(camelCase, snakeCase)
              );
              break;
            case 1: // 对象属性
              replacement = content.replace(pattern, (match, before, after) => 
                `{${before || ''}${snakeCase}${after}`
              );
              break;
            case 2: // 函数参数
              replacement = content.replace(pattern, (match, before, after) => 
                `(${before.replace(camelCase, snakeCase)}${after})`
              );
              break;
            case 3: // 变量使用
              replacement = content.replace(pattern, snakeCase);
              break;
          }
          
          if (replacement !== content) {
            content = replacement;
            modified = true;
            fileReplacements += matches.length;
            
            if (!fixReport.replacements[camelCase]) {
              fixReport.replacements[camelCase] = 0;
            }
            fixReport.replacements[camelCase] += matches.length;
          }
        }
      });
    });
    
    // 如果文件被修改，写回文件
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      fixReport.modifiedFiles++;
      fixReport.totalReplacements += fileReplacements;
      console.log(`✅ 修复文件: ${filePath} (${fileReplacements} 处替换)`);
    }
    
  } catch (error) {
    fixReport.errors.push({
      file: filePath,
      error: error.message
    });
    console.error(`❌ 处理文件失败: ${filePath}`, error.message);
  }
}

// 主函数
function main() {
  console.log('🚀 开始批量修复驼峰命名变量...');
  
  const projectRoot = path.resolve(__dirname, '..');
  const srcDir = path.join(projectRoot, 'src');
  
  // 获取所有需要处理的文件
  const files = getAllFiles(srcDir);
  fixReport.totalFiles = files.length;
  
  console.log(`📁 找到 ${files.length} 个文件需要处理`);
  
  // 处理每个文件
  files.forEach(processFile);
  
  // 生成报告
  console.log('\n📊 修复报告:');
  console.log(`总文件数: ${fixReport.totalFiles}`);
  console.log(`修改文件数: ${fixReport.modifiedFiles}`);
  console.log(`总替换次数: ${fixReport.totalReplacements}`);
  
  if (Object.keys(fixReport.replacements).length > 0) {
    console.log('\n🔄 替换详情:');
    Object.entries(fixReport.replacements).forEach(([from, count]) => {
      console.log(`  ${from} → ${camelToSnakeMap[from]}: ${count} 次`);
    });
  }
  
  if (fixReport.errors.length > 0) {
    console.log('\n❌ 错误列表:');
    fixReport.errors.forEach(error => {
      console.log(`  ${error.file}: ${error.error}`);
    });
  }
  
  // 保存详细报告
  const reportPath = path.join(__dirname, 'camelcase-fix-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(fixReport, null, 2));
  console.log(`\n📄 详细报告已保存到: ${reportPath}`);
  
  console.log('\n✅ 批量修复完成!');
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { main, camelToSnakeMap };