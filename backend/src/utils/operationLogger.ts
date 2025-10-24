// 操作日志记录工具
import { PrismaClient } from '@prisma/client'
import { logger } from './logger'

const prisma = new PrismaClient()

// 操作类型枚举
export enum OperationType {
  // 用户操作
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  
  // 采购操作
  PURCHASE_CREATE = 'PURCHASE_CREATE',
  PURCHASE_UPDATE = 'PURCHASE_UPDATE',
  PURCHASE_DELETE = 'PURCHASE_DELETE',
  PURCHASE_VIEW = 'PURCHASE_VIEW',
  
  // 供应商操作
  SUPPLIER_CREATE = 'SUPPLIER_CREATE',
  SUPPLIER_UPDATE = 'SUPPLIER_UPDATE',
  SUPPLIER_DELETE = 'SUPPLIER_DELETE',
  
  // 库存操作
  INVENTORY_VIEW = 'INVENTORY_VIEW',
  INVENTORY_EXPORT = 'INVENTORY_EXPORT',
  INVENTORY_UPDATE = 'INVENTORY_UPDATE',
  
  // 系统操作
  SYSTEM_BACKUP = 'SYSTEM_BACKUP',
  SYSTEM_RESTORE = 'SYSTEM_RESTORE',
  SYSTEM_CONFIG_UPDATE = 'SYSTEM_CONFIG_UPDATE',
  
  // AI操作
  AI_CHAT = 'AI_CHAT',
  AI_INSIGHTS = 'AI_INSIGHTS',
  AI_RECOGNITION = 'AI_RECOGNITION',
  
  // 文件操作
  FILE_UPLOAD = 'FILE_UPLOAD',
  FILE_DELETE = 'FILE_DELETE'
}

// 操作日志接口
export interface OperationLogData {
  user_id: string
  operation: OperationType
  resource_type?: string // 资源类型（如 'purchase', 'supplier'）
  resource_id?: string   // 资源ID
  details?: any         // 操作详情
  changed_fields?: Record<string, { from: any; to: any }> // 变更字段
  ipAddress?: string    // IP地址
  userAgent?: string    // 用户代理
  metadata?: any        // 额外元数据
}

// 操作日志记录器类
export class OperationLogger {
  /**
   * 记录操作日志
   */
  static async log(data: OperationLogData): Promise<void> {
    try {
      // 记录到数据库（如果是采购相关操作且有resourceId）
      if (data.resource_type === 'purchase' && data.resource_id) {
        await prisma.editLog.create({
          data: {
            purchase_id: data.resource_id,
            user_id: data.user_id,
            action: data.operation,
            details: data.details ? JSON.stringify(data.details) : null,
            changed_fields: data.changed_fields ? JSON.stringify(data.changed_fields) : undefined
          }
        })
      }
      
      // 记录到文件日志
      logger.info('操作日志', {
        user_id: data.user_id,
        operation: data.operation,
        resource_type: data.resource_type,
        resource_id: data.resource_id,
        details: data.details,
        changed_fields: data.changed_fields,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata,
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      logger.error('记录操作日志失败:', {
        error: (error as Error).message,
        data
      })
    }
  }
  
  /**
   * 记录用户登录
   */
  static async logUserLogin(user_id: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      user_id,
      operation: OperationType.USER_LOGIN,
      ipAddress,
      userAgent,
      details: {
        loginTime: new Date().toISOString()
      }
    })
  }
  
  /**
   * 记录用户登出
   */
  static async logUserLogout(user_id: string, ipAddress?: string): Promise<void> {
    await this.log({
      user_id,
      operation: OperationType.USER_LOGOUT,
      ipAddress,
      details: {
        logoutTime: new Date().toISOString()
      }
    })
  }
  
  /**
   * 记录采购创建
   */
  static async logPurchaseCreate(
    user_id: string, 
    purchase_id: string, 
    purchaseData: any,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      user_id,
      operation: OperationType.PURCHASE_CREATE,
      resource_type: 'purchase',
      resource_id: purchase_id,
      ipAddress,
      details: {
        product_name: purchaseData.product_name,
        product_type: purchaseData.product_type,
        total_price: purchaseData.total_price,
        supplier_name: purchaseData.supplier?.name
      }
    })
  }
  
  /**
   * 记录采购更新
   */
  static async logPurchaseUpdate(
    user_id: string,
    purchase_id: string,
    changed_fields: Record<string, { from: any; to: any }>,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      user_id,
      operation: OperationType.PURCHASE_UPDATE,
      resource_type: 'purchase',
      resource_id: purchase_id,
      changed_fields,
      ipAddress,
      details: {
        fields_changed: Object.keys(changed_fields),
        change_count: Object.keys(changed_fields).length
      }
    })
  }
  
  /**
   * 记录供应商创建
   */
  static async logSupplierCreate(
    user_id: string,
    supplier_id: string,
    supplierData: any,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      user_id,
      operation: OperationType.SUPPLIER_CREATE,
      resource_type: 'supplier',
      resource_id: supplier_id,
      ipAddress,
      details: {
        supplier_name: supplierData.name,
        contact: supplierData.contact,
        phone: supplierData.phone
      }
    })
  }

  /**
   * 记录供应商更新
   */
  static async logSupplierUpdate(
    user_id: string,
    supplier_id: string,
    oldSupplierData: any,
    newSupplierData: any,
    ipAddress?: string
  ): Promise<void> {
    // 计算变更字段
    const changed_fields: Record<string, { from: any; to: any }> = {}
    
    const fieldsToCheck = ['name', 'contact', 'phone', 'email', 'address', 'description']
    fieldsToCheck.forEach(field => {
      if (oldSupplierData[field] !== newSupplierData[field]) {
        changed_fields[field] = {
          from: oldSupplierData[field],
          to: newSupplierData[field]
        }
      }
    })

    await this.log({
      user_id,
      operation: OperationType.SUPPLIER_UPDATE,
      resource_type: 'supplier',
      resource_id: supplier_id,
      changed_fields,
      ipAddress,
      details: {
        supplier_name: newSupplierData.name,
        fields_changed: Object.keys(changed_fields),
        change_count: Object.keys(changed_fields).length
      }
    })
  }

  /**
   * 记录供应商删除
   */
  static async logSupplierDelete(
    user_id: string,
    supplier_id: string,
    supplierData: any,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      user_id,
      operation: OperationType.SUPPLIER_DELETE,
      resource_type: 'supplier',
      resource_id: supplier_id,
      ipAddress,
      details: {
        supplier_name: supplierData.name,
        contact: supplierData.contact,
        phone: supplierData.phone,
        deleted_at: new Date().toISOString()
      }
    })
  }
  
  /**
   * 记录库存查看
   */
  static async logInventoryView(
    user_id: string,
    viewType: string,
    filters?: any,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      user_id,
      operation: OperationType.INVENTORY_VIEW,
      resource_type: 'inventory',
      ipAddress,
      details: {
        viewType,
        filters,
        timestamp: new Date().toISOString()
      }
    })
  }
  
  /**
   * 记录库存导出
   */
  static async logInventoryExport(
    user_id: string,
    exportType: string,
    recordCount: number,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      user_id,
      operation: OperationType.INVENTORY_EXPORT,
      resource_type: 'inventory',
      ipAddress,
      details: {
        exportType,
        recordCount,
        exportTime: new Date().toISOString()
      }
    })
  }
  
  /**
   * 记录AI操作
   */
  static async logAIOperation(
    user_id: string,
    aiOperation: OperationType,
    details: any,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      user_id,
      operation: aiOperation,
      resource_type: 'ai',
      ipAddress,
      details
    })
  }
  
  /**
   * 记录文件操作
   */
  static async logFileOperation(
    user_id: string,
    operation: OperationType.FILE_UPLOAD | OperationType.FILE_DELETE,
    file_name: string,
    fileSize?: number,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      user_id,
      operation,
      resource_type: 'file',
      ipAddress,
      details: {
        file_name,
        fileSize,
        timestamp: new Date().toISOString()
      }
    })
  }
  
  /**
   * 获取用户操作日志
   */
  static async getUserOperationLogs(
    _user_id: string,
    _limit: number = 50,
    _offset: number = 0
  ): Promise<any[]> {
    try {
      // 这里可以从数据库或日志文件中查询
      // 暂时返回空数组，实际实现需要根据具体需求
      return []
    } catch (error) {
      logger.error('获取用户操作日志失败:', error)
      return []
    }
  }
  
  /**
   * 获取资源操作日志
   */
  static async getResourceOperationLogs(
    resource_type: string,
    resource_id: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      if (resource_type === 'purchase') {
        const logs = await prisma.editLog.findMany({
          where: { purchase_id: resource_id },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                user_name: true
              }
            }
          },
          orderBy: { created_at: 'desc' },
          take: limit
        })
        
        return logs.map(log => ({
          id: log.id,
          operation: log.action,
          user: log.user,
          details: log.details ? JSON.parse(log.details as string) : null,
          changed_fields: log.changed_fields ? JSON.parse(log.changed_fields as string) : null,
          created_at: log.created_at
        }))
      }
      
      return []
    } catch (error) {
      logger.error('获取资源操作日志失败:', error)
      return []
    }
  }
}

// 导出默认实例
export default OperationLogger