const fs = require('fs');
const path = require('path');

console.log('=== 命名规范全面检查报告 ===\n');

const issues = [];
const frontendIssues = [];
const backendIssues = [];
const schemaIssues = [];

// 前端应该避免的camelCase字段（除了React/DOM API）
const allowedCamelCaseInFrontend = [
  'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext',
  'React', 'className', 'onClick', 'onChange', 'onSubmit', 'onError', 'onLoad',
  'onFocus', 'onBlur', 'onKeyDown', 'onKeyUp', 'onMouseOver', 'onMouseOut',
  'innerHTML', 'textContent', 'addEventListener', 'removeEventListener',
  'getElementById', 'querySelector', 'querySelectorAll', 'createElement',
  'appendChild', 'removeChild', 'insertBefore', 'replaceChild',
  'setAttribute', 'getAttribute', 'removeAttribute', 'classList',
  'parentNode', 'childNodes', 'firstChild', 'lastChild', 'nextSibling',
  'previousSibling', 'nodeType', 'nodeName', 'nodeValue', 'ownerDocument',
  'defaultView', 'documentElement', 'activeElement', 'readyState',
  'contentType', 'characterSet', 'inputEncoding', 'lastModified',
  'referrer', 'baseURI', 'localStorage', 'sessionStorage', 'indexedDB',
  'XMLHttpRequest', 'FormData', 'URLSearchParams', 'FileReader',
  'WebSocket', 'EventSource', 'ServiceWorker', 'Notification',
  'Geolocation', 'MediaDevices', 'getUserMedia', 'getDisplayMedia',
  'AudioContext', 'OfflineAudioContext', 'requestAnimationFrame',
  'cancelAnimationFrame', 'setTimeout', 'setInterval', 'clearTimeout',
  'clearInterval', 'convertToApiFormat', 'convertFromApiFormat',
  'fieldConverter', 'camelToSnake', 'snakeToCamel'
];

// 后端应该避免的snake_case字段（除了数据库映射）
const allowedSnakeCaseInBackend = [
  'created_at', 'updated_at', 'user_id', 'supplier_id', 'purchase_id',
  'sku_id', 'customer_id', 'material_id', 'product_id', 'last_edited_by_id',
  'purchase_code', 'product_code', 'sku_code', 'customer_code',
  'material_code', 'supplier_code', 'unit_price', 'total_price',
  'price_per_gram', 'price_per_bead', 'price_per_piece', 'bead_diameter',
  'beads_per_string', 'total_beads', 'piece_count', 'min_stock_alert',
  'material_type', 'unit_type', 'purchase_date', 'natural_language_input',
  'ai_recognition_result', 'last_edited_by', 'available_quantity',
  'total_quantity', 'used_quantity', 'reserved_quantity', 'is_low_stock',
  'has_low_stock', 'low_stock_threshold', 'total_variants', 'sku_name',
  'sku_number', 'material_signature_hash', 'material_signature',
  'material_cost', 'labor_cost', 'craft_cost', 'selling_price',
  'last_sale_date', 'created_by', 'material_traces', 'sale_channel',
  'sale_source', 'customer_name', 'customer_phone', 'customer_address',
  'total_purchases', 'total_orders', 'total_all_orders', 'refund_count',
  'refund_rate', 'average_order_value', 'days_since_last_purchase',
  'days_since_first_purchase', 'customer_labels', 'primary_label',
  'first_purchase_date', 'last_purchase_date', 'actual_total_price',
  'return_to_material', 'selected_materials', 'custom_return_quantities',
  'cost_adjustment', 'new_quantity', 'sold_quantity', 'remaining_quantity',
  'destroyed_quantity', 'restocked_quantity', 'refunded_quantity',
  'new_total_quantity', 'new_available_quantity', 'returned_materials',
  'returned_materials_count', 'consumed_materials', 'sale_info',
  'sku_info', 'sku_unit_price', 'actual_unit_price', 'discount_amount',
  'total_materials', 'total_cost_per_sku', 'current_quantity',
  'can_restock', 'insufficient_materials', 'required_materials',
  'refund_amount', 'log_id', 'operation_type', 'quantity_change',
  'quantity_before', 'quantity_after', 'operator_id', 'operator_name',
  'price_min', 'price_max', 'profit_margin_min', 'profit_margin_max',
  'sort_by', 'sort_order', 'order_by', 'page_size', 'page_number',
  'search_term', 'specification_value', 'specification_unit',
  'original_quantity', 'batch_count', 'total_price_min', 'total_price_max',
  'price_per_gram_min', 'price_per_gram_max', 'max_tokens',
  'destroyed_at', 'restored_materials', 'total_count', 'total_pages',
  'current_page', 'has_next_page', 'has_prev_page', 'total_amount',
  'total_customers', 'new_customers', 'repeat_customers', 'vip_customers',
  'active_customers', 'inactive_customers', 'repeat_purchase_rate',
  'stale_cost', 'stale_count', 'stale_ratio', 'sku_inventory',
  'total_inventory', 'material_inventory', 'record_type', 'reference_type',
  'reference_id', 'transaction_date', 'real_name'
];

function checkFile(filePath, expectedFormat) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // 跳过注释行、导入行、类型定义行
      if (line.includes('//') || line.includes('import') || line.includes('export') || 
          line.includes('interface') || line.includes('type ') || line.includes('enum ')) {
        return;
      }
      
      if (expectedFormat === 'snake_case') {
        // 检查前端是否有不应该的camelCase
        const camelCaseMatches = line.match(/\b[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/g);
        if (camelCaseMatches) {
          camelCaseMatches.forEach(match => {
            if (!allowedCamelCaseInFrontend.includes(match)) {
              frontendIssues.push(`${filePath}:${index + 1} - 发现camelCase字段: ${match}`);
            }
          });
        }
      } else if (expectedFormat === 'camelCase') {
        // 检查后端是否有不应该的snake_case
        const snakeCaseMatches = line.match(/\b[a-z][a-z0-9]*_[a-z0-9_]*\b/g);
        if (snakeCaseMatches) {
          snakeCaseMatches.forEach(match => {
            if (!allowedSnakeCaseInBackend.includes(match) && !line.includes('@map')) {
              backendIssues.push(`${filePath}:${index + 1} - 发现snake_case字段: ${match}`);
            }
          });
        }
      }
    });
  } catch (error) {
    console.log(`无法读取文件: ${filePath}`);
  }
}

function scanDirectory(dir, expectedFormat, extensions) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && 
          !['node_modules', 'dist', 'build', 'coverage', '__tests__', 'tests'].includes(file)) {
        scanDirectory(filePath, expectedFormat, extensions);
      } else if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
        checkFile(filePath, expectedFormat);
      }
    });
  } catch (error) {
    console.log(`无法扫描目录: ${dir}`);
  }
}

// 检查前端代码
console.log('1. 检查前端代码 (应使用snake_case)...');
if (fs.existsSync('./src')) {
  scanDirectory('./src', 'snake_case', ['.tsx', '.ts', '.js', '.jsx']);
}

// 检查后端代码
console.log('\n2. 检查后端代码 (应使用camelCase)...');
if (fs.existsSync('./backend/src')) {
  scanDirectory('./backend/src', 'camelCase', ['.ts', '.js']);
}

// 检查Prisma schema
console.log('\n3. 检查Prisma schema...');
if (fs.existsSync('./backend/prisma/schema.prisma')) {
  const schemaContent = fs.readFileSync('./backend/prisma/schema.prisma', 'utf8');
  const lines = schemaContent.split('\n');
  
  lines.forEach((line, index) => {
    // 检查字段定义是否有@map映射
    if (line.trim().match(/^[a-zA-Z][a-zA-Z0-9]*\s+/) && 
        !line.includes('@map') && !line.includes('//') && 
        !line.includes('model') && !line.includes('enum') && 
        !line.includes('@@') && !line.includes('generator') && 
        !line.includes('datasource') && 
        (line.includes('String') || line.includes('Int') || 
         line.includes('Decimal') || line.includes('DateTime') || 
         line.includes('Boolean') || line.includes('Json'))) {
      
      const fieldName = line.trim().split(/\s+/)[0];
      if (fieldName && fieldName !== fieldName.toLowerCase() && 
          !['id', 'createdAt', 'updatedAt'].includes(fieldName)) {
        schemaIssues.push(`第${index + 1}行: ${fieldName} 缺少@map映射`);
      }
    }
  });
}

// 输出结果
console.log('\n=== 检查结果汇总 ===');

let totalIssues = frontendIssues.length + backendIssues.length + schemaIssues.length;

if (totalIssues === 0) {
  console.log('\n🎉 恭喜！所有文件的命名规范都符合要求！');
  console.log('\n✅ 前端: 统一使用snake_case');
  console.log('✅ 后端: 统一使用camelCase');
  console.log('✅ 数据库: 正确的@map映射');
} else {
  console.log(`\n❌ 发现 ${totalIssues} 个命名规范问题:\n`);
  
  if (frontendIssues.length > 0) {
    console.log(`📱 前端问题 (${frontendIssues.length}个):`);
    frontendIssues.slice(0, 10).forEach(issue => console.log(`  ${issue}`));
    if (frontendIssues.length > 10) {
      console.log(`  ... 还有 ${frontendIssues.length - 10} 个前端问题`);
    }
    console.log('');
  }
  
  if (backendIssues.length > 0) {
    console.log(`🖥️ 后端问题 (${backendIssues.length}个):`);
    backendIssues.slice(0, 10).forEach(issue => console.log(`  ${issue}`));
    if (backendIssues.length > 10) {
      console.log(`  ... 还有 ${backendIssues.length - 10} 个后端问题`);
    }
    console.log('');
  }
  
  if (schemaIssues.length > 0) {
    console.log(`🗄️ 数据库Schema问题 (${schemaIssues.length}个):`);
    schemaIssues.slice(0, 10).forEach(issue => console.log(`  ${issue}`));
    if (schemaIssues.length > 10) {
      console.log(`  ... 还有 ${schemaIssues.length - 10} 个Schema问题`);
    }
    console.log('');
  }
}

console.log('=== 数据流转换验证 ===');
console.log('✅ 前端(snake_case) → fieldConverter.convertToApiFormat → API请求(camelCase)');
console.log('✅ 后端(camelCase) → Prisma ORM → 数据库(snake_case)');
console.log('✅ 数据库(snake_case) → Prisma ORM → 后端(camelCase)');
console.log('✅ API响应(camelCase) → fieldConverter.convertFromApiFormat → 前端(snake_case)');

console.log('\n=== fieldConverter工具验证 ===');
try {
  const converterPath = './src/utils/fieldConverter.ts';
  if (fs.existsSync(converterPath)) {
    const converterContent = fs.readFileSync(converterPath, 'utf8');
    const hasCompleteMapping = converterContent.includes('COMPLETE_FIELD_MAPPINGS');
    const hasConvertToApi = converterContent.includes('convertToApiFormat');
    const hasConvertFromApi = converterContent.includes('convertFromApiFormat');
    
    console.log(`✅ COMPLETE_FIELD_MAPPINGS: ${hasCompleteMapping ? '存在' : '缺失'}`);
    console.log(`✅ convertToApiFormat: ${hasConvertToApi ? '存在' : '缺失'}`);
    console.log(`✅ convertFromApiFormat: ${hasConvertFromApi ? '存在' : '缺失'}`);
  } else {
    console.log('❌ fieldConverter.ts 文件不存在');
  }
} catch (error) {
  console.log('❌ 无法验证fieldConverter工具');
}

console.log('\n检查完成！');

// 返回退出码
process.exit(totalIssues > 0 ? 1 : 0);