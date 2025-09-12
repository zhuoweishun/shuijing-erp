const fs = require('fs');
const path = require('path');

// 字段映射表：驼峰 -> 蛇形
const fieldMappings = {
  // 采购相关
  purchaseCode: 'purchase_code',
  purchaseDate: 'purchase_date',
  totalAmount: 'total_amount',
  totalQuantity: 'total_quantity',
  supplierId: 'supplier_id',
  supplierName: 'supplier_name',
  supplierContact: 'supplier_contact',
  supplierPhone: 'supplier_phone',
  supplierAddress: 'supplier_address',
  
  // 产品相关
  productName: 'product_name',
  productCode: 'product_code',
  productType: 'product_type',
  materialCode: 'material_code',
  materialName: 'material_name',
  materialType: 'material_type',
  skuCode: 'sku_code',
  skuName: 'sku_name',
  
  // 通用字段
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  createdBy: 'created_by',
  updatedBy: 'updated_by',
  userId: 'user_id',
  userName: 'user_name',
  userRole: 'user_role',
  
  // 数量和金额
  unitPrice: 'unit_price',
  totalPrice: 'total_price',
  originalQuantity: 'original_quantity',
  currentQuantity: 'current_quantity',
  usedQuantity: 'used_quantity',
  
  // 状态和类型
  isActive: 'is_active',
  isDeleted: 'is_deleted',
  orderStatus: 'order_status',
  paymentStatus: 'payment_status',
  
  // 其他常用字段
  phoneNumber: 'phone_number',
  emailAddress: 'email_address',
  companyName: 'company_name',
  contactPerson: 'contact_person',
  businessLicense: 'business_license',
  taxNumber: 'tax_number'
};

// 反向映射：蛇形 -> 驼峰
const reverseFieldMappings = {};
Object.entries(fieldMappings).forEach(([camel, snake]) => {
  reverseFieldMappings[snake] = camel;
});

class FieldRenamer {
  constructor() {
    this.modificationReport = [];
    this.processedFiles = 0;
    this.totalReplacements = 0;
  }

  // 记录修改
  logModification(filePath, oldField, newField, lineNumber = null) {
    this.modificationReport.push({
      file: filePath,
      oldField,
      newField,
      line: lineNumber,
      timestamp: new Date().toISOString()
    });
    this.totalReplacements++;
  }

  // 处理 Prisma Schema 文件
  processPrismaSchema(filePath) {
    console.log(`处理 Prisma Schema: ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 跳过注释和空行
      if (line.trim().startsWith('//') || line.trim() === '') continue;
      
      // 处理字段定义行
      Object.entries(fieldMappings).forEach(([camelField, snakeField]) => {
        // 匹配字段定义模式：fieldName Type
        const fieldPattern = new RegExp(`\\b${camelField}\\s+`, 'g');
        if (fieldPattern.test(line)) {
          // 检查是否已经有 @map 映射
          if (!line.includes('@map')) {
            // 添加 @map 映射
            const updatedLine = line.replace(fieldPattern, `${camelField} `) + ` @map("${snakeField}")`;
            lines[i] = updatedLine;
            this.logModification(filePath, `${camelField} (添加@map)`, `${camelField} @map("${snakeField}")`, i + 1);
            modified = true;
          }
        }
      });
    }
    
    if (modified) {
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      console.log(`✅ 已更新 Prisma Schema: ${filePath}`);
    }
    
    return modified;
  }

  // 处理前端 TypeScript 文件（驼峰 -> 蛇形）
  processFrontendFile(filePath) {
    console.log(`处理前端文件: ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    Object.entries(fieldMappings).forEach(([camelField, snakeField]) => {
      // 匹配对象属性、接口字段等
      const patterns = [
        new RegExp(`\\b${camelField}\\s*:`, 'g'), // 对象属性
        new RegExp(`\\.${camelField}\\b`, 'g'), // 属性访问
        new RegExp(`\\[\\s*['"]${camelField}['"]\\s*\\]`, 'g'), // 数组访问
        new RegExp(`\\b${camelField}\\s*=`, 'g'), // 变量赋值
      ];
      
      patterns.forEach(pattern => {
        if (pattern.test(content)) {
          const oldContent = content;
          content = content.replace(pattern, (match) => {
            return match.replace(camelField, snakeField);
          });
          if (content !== oldContent) {
            this.logModification(filePath, camelField, snakeField);
            modified = true;
          }
        }
      });
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 已更新前端文件: ${filePath}`);
    }
    
    return modified;
  }

  // 处理后端 TypeScript 文件（蛇形 -> 驼峰）
  processBackendFile(filePath) {
    console.log(`处理后端文件: ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    Object.entries(reverseFieldMappings).forEach(([snakeField, camelField]) => {
      // 匹配对象属性、接口字段等
      const patterns = [
        new RegExp(`\\b${snakeField}\\s*:`, 'g'), // 对象属性
        new RegExp(`\\.${snakeField}\\b`, 'g'), // 属性访问
        new RegExp(`\\[\\s*['"]${snakeField}['"]\\s*\\]`, 'g'), // 数组访问
        new RegExp(`\\b${snakeField}\\s*=`, 'g'), // 变量赋值
      ];
      
      patterns.forEach(pattern => {
        if (pattern.test(content)) {
          const oldContent = content;
          content = content.replace(pattern, (match) => {
            return match.replace(snakeField, camelField);
          });
          if (content !== oldContent) {
            this.logModification(filePath, snakeField, camelField);
            modified = true;
          }
        }
      });
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 已更新后端文件: ${filePath}`);
    }
    
    return modified;
  }

  // 递归处理目录
  processDirectory(dirPath, fileProcessor, extensions) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // 跳过 node_modules 和 .git 目录
        if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
          this.processDirectory(fullPath, fileProcessor, extensions);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath);
        if (extensions.includes(ext)) {
          const wasModified = fileProcessor(fullPath);
          if (wasModified) {
            this.processedFiles++;
          }
        }
      }
    }
  }

  // 生成修改报告
  generateReport() {
    const reportPath = path.join(__dirname, 'field-rename-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        processedFiles: this.processedFiles,
        totalReplacements: this.totalReplacements,
        fieldMappingsUsed: Object.keys(fieldMappings).length
      },
      modifications: this.modificationReport
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n📊 修改报告已生成: ${reportPath}`);
    
    return report;
  }

  // 主执行函数
  async execute() {
    console.log('🚀 开始批量字段重命名...');
    console.log(`📋 将处理 ${Object.keys(fieldMappings).length} 个字段映射`);
    
    const projectRoot = path.resolve(__dirname, '..');
    
    try {
      // 1. 处理 Prisma Schema
      const prismaSchemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
      if (fs.existsSync(prismaSchemaPath)) {
        this.processPrismaSchema(prismaSchemaPath);
      }
      
      // 2. 处理前端文件（src 目录）
      const srcPath = path.join(projectRoot, 'src');
      if (fs.existsSync(srcPath)) {
        console.log('\n📁 处理前端文件...');
        this.processDirectory(srcPath, this.processFrontendFile.bind(this), ['.ts', '.tsx']);
      }
      
      // 3. 处理后端文件（backend 目录）
      const backendPath = path.join(projectRoot, 'backend');
      if (fs.existsSync(backendPath)) {
        console.log('\n📁 处理后端文件...');
        this.processDirectory(backendPath, this.processBackendFile.bind(this), ['.ts', '.js']);
      }
      
      // 4. 生成报告
      const report = this.generateReport();
      
      console.log('\n✅ 批量字段重命名完成!');
      console.log(`📊 处理了 ${report.summary.processedFiles} 个文件`);
      console.log(`🔄 完成了 ${report.summary.totalReplacements} 次替换`);
      
      // 5. 提示后续操作
      console.log('\n📝 后续操作建议:');
      console.log('1. 运行 npx prisma generate 重新生成 Prisma 客户端');
      console.log('2. 检查数据库连接是否正常');
      console.log('3. 运行测试确保功能正常');
      
    } catch (error) {
      console.error('❌ 执行过程中出现错误:', error);
      throw error;
    }
  }
}

// 执行脚本
if (require.main === module) {
  const renamer = new FieldRenamer();
  renamer.execute().catch(console.error);
}

module.exports = FieldRenamer;