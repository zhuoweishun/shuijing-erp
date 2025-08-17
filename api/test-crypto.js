#!/usr/bin/env node

/**
 * 水晶ERP系统 - Crypto功能测试脚本
 * 测试原生crypto模块的密码哈希和验证功能
 */

const crypto = require('crypto');
const path = require('path');

// 导入crypto工具函数
const cryptoUtils = require('./utils/crypto');

console.log('🔐 水晶ERP系统 - Crypto功能测试');
console.log('=' .repeat(50));

// 测试数据
const testPasswords = [
  'admin123',
  'user123456',
  'test@password!',
  '中文密码测试123'
];

async function runTests() {
  let passedTests = 0;
  let totalTests = 0;

  console.log('\n📋 开始测试...');
  
  for (const password of testPasswords) {
    console.log(`\n🔍 测试密码: "${password}"`);
    
    try {
      // 测试1: 密码哈希
      totalTests++;
      console.log('  ├─ 测试哈希生成...');
      const startTime = Date.now();
      const hashedPassword = await cryptoUtils.hashPassword(password);
      const hashTime = Date.now() - startTime;
      
      if (hashedPassword && hashedPassword.length > 0) {
        console.log(`  ├─ ✅ 哈希生成成功 (${hashTime}ms)`);
        console.log(`  ├─ 哈希值: ${hashedPassword.substring(0, 50)}...`);
        passedTests++;
      } else {
        console.log('  ├─ ❌ 哈希生成失败');
      }
      
      // 测试2: 密码验证 (正确密码)
      totalTests++;
      console.log('  ├─ 测试密码验证 (正确密码)...');
      const verifyStartTime = Date.now();
      const isValid = await cryptoUtils.verifyPassword(password, hashedPassword);
      const verifyTime = Date.now() - verifyStartTime;
      
      if (isValid === true) {
        console.log(`  ├─ ✅ 密码验证成功 (${verifyTime}ms)`);
        passedTests++;
      } else {
        console.log('  ├─ ❌ 密码验证失败');
      }
      
      // 测试3: 密码验证 (错误密码)
      totalTests++;
      console.log('  ├─ 测试密码验证 (错误密码)...');
      const wrongPassword = password + '_wrong';
      const isInvalid = await cryptoUtils.verifyPassword(wrongPassword, hashedPassword);
      
      if (isInvalid === false) {
        console.log('  ├─ ✅ 错误密码正确被拒绝');
        passedTests++;
      } else {
        console.log('  ├─ ❌ 错误密码验证异常');
      }
      
    } catch (error) {
      console.log(`  ├─ ❌ 测试出错: ${error.message}`);
    }
  }
  
  // 性能测试
  console.log('\n⚡ 性能测试...');
  totalTests++;
  
  try {
    const perfStartTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
      promises.push(cryptoUtils.hashPassword('performance_test_' + i));
    }
    
    await Promise.all(promises);
    const perfTime = Date.now() - perfStartTime;
    
    console.log(`  ├─ ✅ 10次并发哈希完成: ${perfTime}ms (平均 ${(perfTime/10).toFixed(1)}ms/次)`);
    passedTests++;
  } catch (error) {
    console.log(`  ├─ ❌ 性能测试失败: ${error.message}`);
  }
  
  // 测试结果汇总
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总:');
  console.log(`  ├─ 总测试数: ${totalTests}`);
  console.log(`  ├─ 通过测试: ${passedTests}`);
  console.log(`  ├─ 失败测试: ${totalTests - passedTests}`);
  console.log(`  └─ 成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试通过！Crypto功能正常工作。');
    console.log('✅ 系统已准备好进行部署。');
    process.exit(0);
  } else {
    console.log('\n❌ 部分测试失败，请检查crypto配置。');
    process.exit(1);
  }
}

// 检查crypto工具是否存在
const cryptoUtilsPath = path.join(__dirname, 'utils', 'crypto.js');
const fs = require('fs');

if (!fs.existsSync(cryptoUtilsPath)) {
  console.log('❌ 错误: crypto.js工具文件不存在');
  console.log(`   期望路径: ${cryptoUtilsPath}`);
  console.log('   请确保crypto工具文件已正确创建。');
  process.exit(1);
}

// 运行测试
runTests().catch(error => {
  console.log('\n❌ 测试运行出错:');
  console.log(error.message);
  console.log(error.stack);
  process.exit(1);
});