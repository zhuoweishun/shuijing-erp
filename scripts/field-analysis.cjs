#!/usr/bin/env node

const { scanDirectory, camelToSnake, isCamelCase, shouldExclude } = require('./convert-camel-to-snake.cjs');
const path = require('path');

// 分析字段统计
function analyzeFields() {
  const srcDir = path.join(process.cwd(), 'src');
  const results = scanDirectory(srcDir);
  
  // 统计字段出现频率
  const fieldStats = {};
  results.forEach(item => {
    if (!fieldStats[item.field]) {
      fieldStats[item.field] = {
        count: 0,
        suggested: item.suggested,
        types: new Set(),
        files: new Set()
      };
    }
    fieldStats[item.field].count++;
    fieldStats[item.field].types.add(item.type);
    fieldStats[item.field].files.add(path.relative(process.cwd(), item.file));
  });
  
  // 按出现频率排序
  const sortedFields = Object.entries(fieldStats)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 30); // 只显示前30个
  
  console.log('\n=== 字段转换分析报告 ===\n');
  console.log(`总计发现 ${results.length} 个驼峰字段需要转换`);
  console.log(`涉及 ${Object.keys(fieldStats).length} 个不同的字段名`);
  
  console.log('\n📊 出现频率最高的字段 (前30个):\n');
  
  sortedFields.forEach(([field, stats], index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${field.padEnd(20)} -> ${stats.suggested.padEnd(25)} (${stats.count}次)`);
    console.log(`    类型: ${Array.from(stats.types).join(', ')}`);
    console.log(`    文件: ${stats.files.size}个文件`);
    if (stats.files.size <= 3) {
      console.log(`    位置: ${Array.from(stats.files).join(', ')}`);
    }
    console.log('');
  });
  
  // 按类型分组统计
  const typeStats = {};
  results.forEach(item => {
    if (!typeStats[item.type]) typeStats[item.type] = 0;
    typeStats[item.type]++;
  });
  
  console.log('\n📋 按类型分组统计:\n');
  Object.entries(typeStats).forEach(([type, count]) => {
    const typeNames = {
      'field_definition': '字段定义',
      'property_access': '属性访问',
      'string_literal': '字符串字面量'
    };
    console.log(`${(typeNames[type] || type).padEnd(15)}: ${count}个`);
  });
  
  // 重点关注的API字段
  const apiFields = sortedFields.filter(([field]) => {
    return field.includes('Name') || field.includes('At') || field.includes('Id') || 
           field.includes('Type') || field.includes('Code') || field.includes('Date');
  });
  
  if (apiFields.length > 0) {
    console.log('\n🎯 重点关注的API相关字段:\n');
    apiFields.forEach(([field, stats]) => {
      console.log(`${field} -> ${stats.suggested} (${stats.count}次)`);
    });
  }
}

analyzeFields();