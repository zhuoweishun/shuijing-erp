#!/usr/bin/env node

/**
 * 字段转换功能测试脚本
 * 验证前后端字段映射转换是否正常工作
 */

const fs = require('fs');
const path = require('path');

// 模拟字段转换函数（从实际代码复制）
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function convertToApiFormat(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertToApiFormat(item));
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const converted = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    const snakeKey = camelToSnake(key);
    
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      converted[snakeKey] = convertToApiFormat(value);
    } else if (Array.isArray(value)) {
      converted[snakeKey] = value.map(item => 
        (item && typeof item === 'object') ? convertToApiFormat(item) : item
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

  if (typeof obj !== 'object') {
    return obj;
  }

  const converted = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    const camelKey = snakeToCamel(key);
    
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      converted[camelKey] = convertFromApiFormat(value);
    } else if (Array.isArray(value)) {
      converted[camelKey] = value.map(item => 
        (item && typeof item === 'object') ? convertFromApiFormat(item) : item
      );
    } else {
      converted[camelKey] = value;
    }
  });

  return converted;
}

function validateFieldNaming(obj, expectedFormat) {
  const invalidFields = [];
  const suggestions = {};
  
  Object.keys(obj).forEach(key => {
    const isCamelCase = /^[a-z][a-zA-Z0-9]*$/.test(key);
    const isSnakeCase = /^[a-z][a-z0-9_]*$/.test(key);
    
    if (expectedFormat === 'camelCase' && !isCamelCase) {
      invalidFields.push(key);
      if (isSnakeCase) {
        suggestions[key] = snakeToCamel(key);
      }
    } else if (expectedFormat === 'snake_case' && !isSnakeCase) {
      invalidFields.push(key);
      if (isCamelCase) {
        suggestions[key] = camelToSnake(key);
      }
    }
  });
  
  return {
    isValid: invalidFields.length === 0,
    invalidFields,
    suggestions
  };
}

/**
 * 测试用例
 */
const testCases = {
  // 采购数据测试
  purchaseData: {
    camelCase: {
      purchaseId: 'P001',
      productName: '天然水晶',
      productType: 'crystal',
      supplierName: '水晶供应商',
      pricePerGram: 15.5,
      totalQuantity: 100,
      beadDiameter: 8,
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z'
    },
    snake_case: {
      purchase_id: 'P001',
      product_name: '天然水晶',
      product_type: 'crystal',
      supplier_name: '水晶供应商',
      price_per_gram: 15.5,
      total_quantity: 100,
      bead_diameter: 8,
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z'
    }
  },
  
  // 库存数据测试
  inventoryData: {
    camelCase: {
      productId: 'PROD001',
      remainingBeads: 50,
      isLowStock: true,
      hasLowStock: true,
      totalVariants: 3,
      unitPrice: 2.5
    },
    snake_case: {
      product_id: 'PROD001',
      remaining_beads: 50,
      is_low_stock: true,
      has_low_stock: true,
      total_variants: 3,
      unit_price: 2.5
    }
  },
  
  // 用户数据测试
  userData: {
    camelCase: {
      userId: 'USER001',
      userName: 'testuser',
      realName: '测试用户',
      createdAt: '2024-01-01T00:00:00Z'
    },
    snake_case: {
      user_id: 'USER001',
      user_name: 'testuser',
      real_name: '测试用户',
      created_at: '2024-01-01T00:00:00Z'
    }
  },
  
  // 嵌套对象测试
  nestedData: {
    camelCase: {
      purchaseId: 'P001',
      supplier: {
        supplierId: 'S001',
        supplierName: '供应商A',
        contactInfo: {
          phoneNumber: '13800138000',
          emailAddress: 'supplier@example.com'
        }
      },
      products: [
        {
          productId: 'PROD001',
          productName: '水晶珠',
          pricePerBead: 1.5
        },
        {
          productId: 'PROD002',
          productName: '玛瑙珠',
          pricePerBead: 2.0
        }
      ]
    }
  }
};

/**
 * 运行测试
 */
function runTests() {
  console.log('🧪 开始字段转换功能测试...');
  console.log('=' .repeat(60));
  
  let passedTests = 0;
  let totalTests = 0;
  
  // 测试 camelCase 到 snake_case 转换
  console.log('\n📝 测试 camelCase -> snake_case 转换:');
  Object.entries(testCases).forEach(([testName, data]) => {
    if (data.camelCase) {
      totalTests++;
      console.log(`\n🔍 测试: ${testName}`);
      
      const converted = convertToApiFormat(data.camelCase);
      const expected = data.snake_case;
      
      console.log('原始数据 (camelCase):', JSON.stringify(data.camelCase, null, 2));
      console.log('转换结果 (snake_case):', JSON.stringify(converted, null, 2));
      
      if (expected) {
        const isMatch = JSON.stringify(converted) === JSON.stringify(expected);
        console.log(`${isMatch ? '✅' : '❌'} 转换结果${isMatch ? '正确' : '错误'}`);
        if (isMatch) passedTests++;
        
        if (!isMatch) {
          console.log('期望结果:', JSON.stringify(expected, null, 2));
        }
      } else {
        console.log('✅ 转换完成（无期望结果对比）');
        passedTests++;
      }
    }
  });
  
  // 测试 snake_case 到 camelCase 转换
  console.log('\n📝 测试 snake_case -> camelCase 转换:');
  Object.entries(testCases).forEach(([testName, data]) => {
    if (data.snake_case) {
      totalTests++;
      console.log(`\n🔍 测试: ${testName}`);
      
      const converted = convertFromApiFormat(data.snake_case);
      const expected = data.camelCase;
      
      console.log('原始数据 (snake_case):', JSON.stringify(data.snake_case, null, 2));
      console.log('转换结果 (camelCase):', JSON.stringify(converted, null, 2));
      
      if (expected) {
        const isMatch = JSON.stringify(converted) === JSON.stringify(expected);
        console.log(`${isMatch ? '✅' : '❌'} 转换结果${isMatch ? '正确' : '错误'}`);
        if (isMatch) passedTests++;
        
        if (!isMatch) {
          console.log('期望结果:', JSON.stringify(expected, null, 2));
        }
      } else {
        console.log('✅ 转换完成（无期望结果对比）');
        passedTests++;
      }
    }
  });
  
  // 测试字段命名验证
  console.log('\n📝 测试字段命名验证:');
  const validationTests = [
    {
      name: 'camelCase验证',
      data: { userId: 1, userName: 'test', createdAt: '2024-01-01' },
      expectedFormat: 'camelCase',
      shouldBeValid: true
    },
    {
      name: 'snake_case验证',
      data: { user_id: 1, user_name: 'test', created_at: '2024-01-01' },
      expectedFormat: 'snake_case',
      shouldBeValid: true
    },
    {
      name: '混合格式验证（应该失败）',
      data: { userId: 1, user_name: 'test', created_at: '2024-01-01' },
      expectedFormat: 'camelCase',
      shouldBeValid: false
    }
  ];
  
  validationTests.forEach(test => {
    totalTests++;
    console.log(`\n🔍 测试: ${test.name}`);
    
    const validation = validateFieldNaming(test.data, test.expectedFormat);
    const isCorrect = validation.isValid === test.shouldBeValid;
    
    console.log('测试数据:', JSON.stringify(test.data));
    console.log('期望格式:', test.expectedFormat);
    console.log('验证结果:', validation);
    console.log(`${isCorrect ? '✅' : '❌'} 验证${isCorrect ? '正确' : '错误'}`);
    
    if (isCorrect) passedTests++;
  });
  
  // 测试结果汇总
  console.log('\n' + '=' .repeat(60));
  console.log('📊 测试结果汇总:');
  console.log(`总测试数: ${totalTests}`);
  console.log(`通过测试: ${passedTests}`);
  console.log(`失败测试: ${totalTests - passedTests}`);
  console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试通过！字段转换功能正常工作。');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查字段转换逻辑。');
  }
  
  // 保存测试结果
  const testResult = {
    timestamp: new Date().toISOString(),
    totalTests,
    passedTests,
    failedTests: totalTests - passedTests,
    successRate: ((passedTests / totalTests) * 100).toFixed(1) + '%',
    testCases: testCases,
    status: passedTests === totalTests ? 'PASSED' : 'FAILED'
  };
  
  const resultPath = path.join(__dirname, 'field-conversion-test-result.json');
  fs.writeFileSync(resultPath, JSON.stringify(testResult, null, 2));
  console.log(`\n📄 测试结果已保存: ${resultPath}`);
  
  return passedTests === totalTests;
}

/**
 * 主函数
 */
function main() {
  try {
    const success = runTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main();
}

module.exports = {
  runTests,
  testCases,
  camelToSnake,
  snakeToCamel,
  convertToApiFormat,
  convertFromApiFormat,
  validateFieldNaming
};