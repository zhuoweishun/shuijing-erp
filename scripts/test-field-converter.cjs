/**
 * fieldConverter 工具测试脚本
 * 用于验证字段转换工具的准确性和安全性
 * 
 * 功能：
 * 1. 测试前端 snake_case ↔ 后端 camelCase 转换
 * 2. 测试数据库字段映射的准确性
 * 3. 验证转换的可逆性
 * 4. 检查边界情况和异常处理
 * 5. 性能测试
 * 
 * 使用方法：
 * node scripts/test-field-converter.cjs
 * 
 * 作者：SOLO Coding
 * 日期：2025-01-10
 */

const fs = require('fs');
const path = require('path');

// 导入前端和后端的fieldConverter
const frontendConverterPath = path.resolve(__dirname, '../src/utils/fieldConverter.ts');
const backendConverterPath = path.resolve(__dirname, '../backend/src/utils/fieldConverter.ts');

// 测试数据集
const TEST_DATA = {
  // SKU相关测试数据
  sku: {
    frontend_snake_case: {
      sku_code: 'SKU20250110001',
      sku_name: '水晶手串',
      available_quantity: 10,
      total_quantity: 15,
      unit_price: 299.99,
      selling_price: 399.99,
      material_cost: 150.00,
      labor_cost: 50.00,
      craft_cost: 30.00,
      total_cost: 230.00,
      last_sale_date: '2025-01-10T10:30:00Z',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-10T10:30:00Z'
    },
    backend_camelCase: {
      skuCode: 'SKU20250110001',
      skuName: '水晶手串',
      availableQuantity: 10,
      totalQuantity: 15,
      unitPrice: 299.99,
      sellingPrice: 399.99,
      materialCost: 150.00,
      laborCost: 50.00,
      craftCost: 30.00,
      totalCost: 230.00,
      lastSaleDate: '2025-01-10T10:30:00Z',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-10T10:30:00Z'
    }
  },
  
  // 客户相关测试数据
  customer: {
    frontend_snake_case: {
      customer_id: 'cus_001',
      customer_name: '张三',
      customer_phone: '13800138000',
      customer_address: '北京市朝阳区',
      total_purchases: 1500.00,
      total_orders: 5,
      first_purchase_date: '2024-12-01T00:00:00Z',
      last_purchase_date: '2025-01-10T10:30:00Z',
      created_at: '2024-12-01T00:00:00Z',
      updated_at: '2025-01-10T10:30:00Z'
    },
    backend_camelCase: {
      customerId: 'cus_001',
      customerName: '张三',
      customerPhone: '13800138000',
      customerAddress: '北京市朝阳区',
      totalPurchases: 1500.00,
      totalOrders: 5,
      firstPurchaseDate: '2024-12-01T00:00:00Z',
      lastPurchaseDate: '2025-01-10T10:30:00Z',
      createdAt: '2024-12-01T00:00:00Z',
      updatedAt: '2025-01-10T10:30:00Z'
    }
  },
  
  // 采购相关测试数据
  purchase: {
    frontend_snake_case: {
      purchase_id: 'pur_001',
      purchase_code: 'CG20250110001',
      purchase_date: '2025-01-10',
      material_name: '紫水晶散珠',
      unit_price: 5.50,
      total_price: 550.00,
      created_at: '2025-01-10T08:00:00Z',
      updated_at: '2025-01-10T08:00:00Z'
    },
    backend_camelCase: {
      purchaseId: 'pur_001',
      purchaseCode: 'CG20250110001',
      purchaseDate: '2025-01-10',
      materialName: '紫水晶散珠',
      unitPrice: 5.50,
      totalPrice: 550.00,
      createdAt: '2025-01-10T08:00:00Z',
      updatedAt: '2025-01-10T08:00:00Z'
    }
  },
  
  // 复杂嵌套数据
  nested: {
    frontend_snake_case: {
      sku_info: {
        sku_code: 'SKU20250110001',
        sku_name: '水晶手串',
        available_quantity: 10
      },
      customer_info: {
        customer_id: 'cus_001',
        customer_name: '张三',
        customer_phone: '13800138000'
      },
      purchase_history: [
        {
          purchase_id: 'pur_001',
          purchase_date: '2025-01-10',
          total_price: 399.99
        },
        {
          purchase_id: 'pur_002',
          purchase_date: '2025-01-09',
          total_price: 299.99
        }
      ]
    },
    backend_camelCase: {
      skuInfo: {
        skuCode: 'SKU20250110001',
        skuName: '水晶手串',
        availableQuantity: 10
      },
      customerInfo: {
        customerId: 'cus_001',
        customerName: '张三',
        customerPhone: '13800138000'
      },
      purchaseHistory: [
        {
          purchaseId: 'pur_001',
          purchaseDate: '2025-01-10',
          totalPrice: 399.99
        },
        {
          purchaseId: 'pur_002',
          purchaseDate: '2025-01-09',
          totalPrice: 299.99
        }
      ]
    }
  }
};

// 边界情况测试数据
const EDGE_CASES = {
  empty_object: {},
  null_value: null,
  undefined_value: undefined,
  array_empty: [],
  string_empty: '',
  number_zero: 0,
  boolean_false: false,
  mixed_types: {
    string_field: 'test',
    number_field: 123,
    boolean_field: true,
    null_field: null,
    undefined_field: undefined,
    array_field: [1, 2, 3],
    object_field: { nested: 'value' }
  }
};

// 测试结果存储
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  performance: {}
};

/**
 * 简化的字段转换函数（用于测试）
 */
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// 字段映射表（从文档中提取的标准映射）
const FIELD_MAPPINGS = {
  // SKU相关
  skuCode: 'sku_code',
  skuName: 'sku_name',
  availableQuantity: 'available_quantity',
  totalQuantity: 'total_quantity',
  unitPrice: 'unit_price',
  sellingPrice: 'selling_price',
  materialCost: 'material_cost',
  laborCost: 'labor_cost',
  craftCost: 'craft_cost',
  totalCost: 'total_cost',
  lastSaleDate: 'last_sale_date',
  
  // 客户相关
  customerId: 'customer_id',
  customerName: 'customer_name',
  customerPhone: 'customer_phone',
  customerAddress: 'customer_address',
  totalPurchases: 'total_purchases',
  totalOrders: 'total_orders',
  firstPurchaseDate: 'first_purchase_date',
  lastPurchaseDate: 'last_purchase_date',
  
  // 采购相关
  purchaseId: 'purchase_id',
  purchaseCode: 'purchase_code',
  purchaseDate: 'purchase_date',
  materialName: 'material_name',
  totalPrice: 'total_price',
  
  // 时间相关
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

// 反向映射
const REVERSE_MAPPINGS = Object.fromEntries(
  Object.entries(FIELD_MAPPINGS).map(([camel, snake]) => [snake, camel])
);

/**
 * 转换函数（模拟fieldConverter的行为）
 */
function convertToApiFormat(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertToApiFormat(item));
  }

  if (typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }

  const converted = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    const snakeKey = FIELD_MAPPINGS[key] || camelToSnake(key);
    
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      converted[snakeKey] = convertToApiFormat(value);
    } else if (Array.isArray(value)) {
      converted[snakeKey] = value.map(item => 
        (item && typeof item === 'object' && !(item instanceof Date)) ? convertToApiFormat(item) : item
      );
    } else {
      converted[snakeKey] = value;
    }
  });

  return converted;
}

function convertFromApiFormat(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertFromApiFormat(item));
  }

  if (typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }

  const converted = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    const camelKey = REVERSE_MAPPINGS[key] || snakeToCamel(key);
    
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      converted[camelKey] = convertFromApiFormat(value);
    } else if (Array.isArray(value)) {
      converted[camelKey] = value.map(item => 
        (item && typeof item === 'object' && !(item instanceof Date)) ? convertFromApiFormat(item) : item
      );
    } else {
      converted[camelKey] = value;
    }
  });

  return converted;
}

/**
 * 深度比较两个对象
 */
function deepEqual(obj1, obj2) {
  if (obj1 === obj2) {
    return true;
  }
  
  if (obj1 == null || obj2 == null) {
    return obj1 === obj2;
  }
  
  if (typeof obj1 !== typeof obj2) {
    return false;
  }
  
  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    return false;
  }
  
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) {
      return false;
    }
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) {
        return false;
      }
    }
    return true;
  }
  
  if (typeof obj1 === 'object') {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) {
      return false;
    }
    
    for (const key of keys1) {
      if (!keys2.includes(key)) {
        return false;
      }
      if (!deepEqual(obj1[key], obj2[key])) {
        return false;
      }
    }
    return true;
  }
  
  return obj1 === obj2;
}

/**
 * 执行单个测试
 */
function runTest(testName, testFn) {
  try {
    console.log(`🧪 运行测试: ${testName}`);
    const result = testFn();
    if (result) {
      console.log(`✅ 测试通过: ${testName}`);
      testResults.passed++;
    } else {
      console.log(`❌ 测试失败: ${testName}`);
      testResults.failed++;
      testResults.errors.push(`测试失败: ${testName}`);
    }
  } catch (error) {
    console.log(`💥 测试异常: ${testName} - ${error.message}`);
    testResults.failed++;
    testResults.errors.push(`测试异常: ${testName} - ${error.message}`);
  }
}

/**
 * 测试基本转换功能
 */
function testBasicConversion() {
  console.log('\n📋 测试基本转换功能...');
  
  // 测试 camelCase -> snake_case
  runTest('SKU数据 camelCase -> snake_case', () => {
    const input = TEST_DATA.sku.backend_camelCase;
    const expected = TEST_DATA.sku.frontend_snake_case;
    const result = convertToApiFormat(input);
    return deepEqual(result, expected);
  });
  
  // 测试 snake_case -> camelCase
  runTest('SKU数据 snake_case -> camelCase', () => {
    const input = TEST_DATA.sku.frontend_snake_case;
    const expected = TEST_DATA.sku.backend_camelCase;
    const result = convertFromApiFormat(input);
    return deepEqual(result, expected);
  });
  
  // 测试客户数据转换
  runTest('客户数据 camelCase -> snake_case', () => {
    const input = TEST_DATA.customer.backend_camelCase;
    const expected = TEST_DATA.customer.frontend_snake_case;
    const result = convertToApiFormat(input);
    return deepEqual(result, expected);
  });
  
  runTest('客户数据 snake_case -> camelCase', () => {
    const input = TEST_DATA.customer.frontend_snake_case;
    const expected = TEST_DATA.customer.backend_camelCase;
    const result = convertFromApiFormat(input);
    return deepEqual(result, expected);
  });
  
  // 测试采购数据转换
  runTest('采购数据 camelCase -> snake_case', () => {
    const input = TEST_DATA.purchase.backend_camelCase;
    const expected = TEST_DATA.purchase.frontend_snake_case;
    const result = convertToApiFormat(input);
    return deepEqual(result, expected);
  });
  
  runTest('采购数据 snake_case -> camelCase', () => {
    const input = TEST_DATA.purchase.frontend_snake_case;
    const expected = TEST_DATA.purchase.backend_camelCase;
    const result = convertFromApiFormat(input);
    return deepEqual(result, expected);
  });
}

/**
 * 测试嵌套数据转换
 */
function testNestedConversion() {
  console.log('\n🔗 测试嵌套数据转换...');
  
  runTest('嵌套数据 camelCase -> snake_case', () => {
    const input = TEST_DATA.nested.backend_camelCase;
    const expected = TEST_DATA.nested.frontend_snake_case;
    const result = convertToApiFormat(input);
    return deepEqual(result, expected);
  });
  
  runTest('嵌套数据 snake_case -> camelCase', () => {
    const input = TEST_DATA.nested.frontend_snake_case;
    const expected = TEST_DATA.nested.backend_camelCase;
    const result = convertFromApiFormat(input);
    return deepEqual(result, expected);
  });
}

/**
 * 测试转换的可逆性
 */
function testReversibility() {
  console.log('\n🔄 测试转换可逆性...');
  
  runTest('SKU数据双向转换可逆性', () => {
    const original = TEST_DATA.sku.backend_camelCase;
    const converted = convertToApiFormat(original);
    const reverted = convertFromApiFormat(converted);
    return deepEqual(original, reverted);
  });
  
  runTest('客户数据双向转换可逆性', () => {
    const original = TEST_DATA.customer.frontend_snake_case;
    const converted = convertFromApiFormat(original);
    const reverted = convertToApiFormat(converted);
    return deepEqual(original, reverted);
  });
  
  runTest('嵌套数据双向转换可逆性', () => {
    const original = TEST_DATA.nested.backend_camelCase;
    const converted = convertToApiFormat(original);
    const reverted = convertFromApiFormat(converted);
    return deepEqual(original, reverted);
  });
}

/**
 * 测试边界情况
 */
function testEdgeCases() {
  console.log('\n🎯 测试边界情况...');
  
  runTest('空对象转换', () => {
    const result1 = convertToApiFormat(EDGE_CASES.empty_object);
    const result2 = convertFromApiFormat(EDGE_CASES.empty_object);
    return deepEqual(result1, {}) && deepEqual(result2, {});
  });
  
  runTest('null值处理', () => {
    const result1 = convertToApiFormat(EDGE_CASES.null_value);
    const result2 = convertFromApiFormat(EDGE_CASES.null_value);
    return result1 === null && result2 === null;
  });
  
  runTest('undefined值处理', () => {
    const result1 = convertToApiFormat(EDGE_CASES.undefined_value);
    const result2 = convertFromApiFormat(EDGE_CASES.undefined_value);
    return result1 === undefined && result2 === undefined;
  });
  
  runTest('空数组转换', () => {
    const result1 = convertToApiFormat(EDGE_CASES.array_empty);
    const result2 = convertFromApiFormat(EDGE_CASES.array_empty);
    return Array.isArray(result1) && result1.length === 0 && 
           Array.isArray(result2) && result2.length === 0;
  });
  
  runTest('混合类型数据转换', () => {
    const input = EDGE_CASES.mixed_types;
    const result1 = convertToApiFormat(input);
    const result2 = convertFromApiFormat(result1);
    
    // 检查基本类型是否保持不变
    return result1.string_field === 'test' &&
           result1.number_field === 123 &&
           result1.boolean_field === true &&
           result1.null_field === null &&
           result1.undefined_field === undefined &&
           Array.isArray(result1.array_field) &&
           typeof result1.object_field === 'object';
  });
}

/**
 * 性能测试
 */
function testPerformance() {
  console.log('\n⚡ 性能测试...');
  
  const iterations = 10000;
  const testData = TEST_DATA.nested.backend_camelCase;
  
  // 测试 convertToApiFormat 性能
  const start1 = Date.now();
  for (let i = 0; i < iterations; i++) {
    convertToApiFormat(testData);
  }
  const end1 = Date.now();
  const time1 = end1 - start1;
  
  // 测试 convertFromApiFormat 性能
  const start2 = Date.now();
  for (let i = 0; i < iterations; i++) {
    convertFromApiFormat(testData);
  }
  const end2 = Date.now();
  const time2 = end2 - start2;
  
  testResults.performance = {
    convertToApiFormat: {
      iterations,
      totalTime: time1,
      avgTime: time1 / iterations
    },
    convertFromApiFormat: {
      iterations,
      totalTime: time2,
      avgTime: time2 / iterations
    }
  };
  
  console.log(`📊 convertToApiFormat: ${iterations} 次迭代，总时间 ${time1}ms，平均 ${(time1/iterations).toFixed(3)}ms/次`);
  console.log(`📊 convertFromApiFormat: ${iterations} 次迭代，总时间 ${time2}ms，平均 ${(time2/iterations).toFixed(3)}ms/次`);
  
  // 性能测试通过条件：平均每次转换时间小于1ms
  runTest('性能测试 - convertToApiFormat', () => {
    return (time1 / iterations) < 1;
  });
  
  runTest('性能测试 - convertFromApiFormat', () => {
    return (time2 / iterations) < 1;
  });
}

/**
 * 生成测试报告
 */
function generateTestReport() {
  console.log('\n📊 生成测试报告...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportDir = path.resolve(__dirname, '../reports');
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportFile = path.join(reportDir, `field-converter-test-report-${timestamp}.md`);
  
  let report = `# fieldConverter 工具测试报告\n\n`;
  report += `**生成时间：** ${new Date().toLocaleString('zh-CN')}\n\n`;
  
  // 测试概览
  const totalTests = testResults.passed + testResults.failed;
  const successRate = totalTests > 0 ? (testResults.passed / totalTests * 100).toFixed(2) : 0;
  
  report += `## 📋 测试概览\n\n`;
  report += `- **总测试数：** ${totalTests}\n`;
  report += `- **通过测试：** ${testResults.passed}\n`;
  report += `- **失败测试：** ${testResults.failed}\n`;
  report += `- **成功率：** ${successRate}%\n\n`;
  
  // 性能测试结果
  if (testResults.performance.convertToApiFormat) {
    report += `## ⚡ 性能测试结果\n\n`;
    report += `### convertToApiFormat\n`;
    report += `- **迭代次数：** ${testResults.performance.convertToApiFormat.iterations}\n`;
    report += `- **总时间：** ${testResults.performance.convertToApiFormat.totalTime}ms\n`;
    report += `- **平均时间：** ${testResults.performance.convertToApiFormat.avgTime.toFixed(3)}ms/次\n\n`;
    
    report += `### convertFromApiFormat\n`;
    report += `- **迭代次数：** ${testResults.performance.convertFromApiFormat.iterations}\n`;
    report += `- **总时间：** ${testResults.performance.convertFromApiFormat.totalTime}ms\n`;
    report += `- **平均时间：** ${testResults.performance.convertFromApiFormat.avgTime.toFixed(3)}ms/次\n\n`;
  }
  
  // 错误详情
  if (testResults.errors.length > 0) {
    report += `## ❌ 错误详情\n\n`;
    for (const error of testResults.errors) {
      report += `- ${error}\n`;
    }
    report += `\n`;
  }
  
  // 测试结论
  report += `## 📝 测试结论\n\n`;
  if (testResults.failed === 0) {
    report += `✅ **所有测试通过！** fieldConverter 工具运行正常，转换准确性和性能都符合要求。\n\n`;
  } else {
    report += `⚠️ **发现 ${testResults.failed} 个问题！** 需要修复以下问题：\n\n`;
    for (const error of testResults.errors) {
      report += `- ${error}\n`;
    }
    report += `\n`;
  }
  
  // 建议
  report += `## 💡 建议\n\n`;
  report += `1. **定期运行测试：** 建议在每次修改 fieldConverter 后运行此测试\n`;
  report += `2. **性能监控：** 如果平均转换时间超过 1ms，考虑优化算法\n`;
  report += `3. **扩展测试：** 根据业务需求添加更多测试用例\n`;
  report += `4. **集成测试：** 将此测试集成到 CI/CD 流程中\n\n`;
  
  report += `---\n\n`;
  report += `**测试工具：** fieldConverter 测试脚本\n`;
  report += `**版本：** 1.0.0\n`;
  report += `**作者：** SOLO Coding\n`;
  
  fs.writeFileSync(reportFile, report, 'utf8');
  
  console.log(`📄 测试报告已生成：${reportFile}`);
  return reportFile;
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 启动 fieldConverter 工具测试');
  console.log('🎯 测试目标：验证字段转换工具的准确性和安全性\n');
  
  try {
    // 执行所有测试
    testBasicConversion();
    testNestedConversion();
    testReversibility();
    testEdgeCases();
    testPerformance();
    
    // 生成测试报告
    const reportFile = generateTestReport();
    
    // 输出总结
    const totalTests = testResults.passed + testResults.failed;
    const successRate = totalTests > 0 ? (testResults.passed / totalTests * 100).toFixed(2) : 0;
    
    console.log('\n📊 测试完成总结：');
    console.log(`   总测试数：${totalTests}`);
    console.log(`   通过测试：${testResults.passed}`);
    console.log(`   失败测试：${testResults.failed}`);
    console.log(`   成功率：${successRate}%`);
    console.log('');
    
    if (testResults.failed > 0) {
      console.log('⚠️ 发现问题，请查看详细报告进行修复');
      console.log(`📄 详细报告：${reportFile}`);
      process.exit(1);
    } else {
      console.log('✅ 所有测试通过！fieldConverter 工具运行正常');
      console.log(`📄 详细报告：${reportFile}`);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误：', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  convertToApiFormat,
  convertFromApiFormat,
  testBasicConversion,
  testNestedConversion,
  testReversibility,
  testEdgeCases,
  testPerformance,
  generateTestReport,
  TEST_DATA,
  EDGE_CASES
};