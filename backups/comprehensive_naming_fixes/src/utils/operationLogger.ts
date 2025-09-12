// 操作日志记录工具
import { PrismaClient } from '@prisma/client'
import { logger } from './logger.js'

const prisma = new PrismaClient()

// 操作类型枚举
export enum operation_type {
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
export interface operation_log_data {
  user_id: string
  operation: operation_type
  resourceType?: string // 资源类型（如 'purchase', 'supplier'）
  resourceId?: string   // 资源ID
  details?: any         // 操作详情
  changedFields?: Record<string, { from: any; to: any }> // 变更字段
  ip_address?: string    // IP地址
  user_agent?: string    // 用户代理
  metadata?: any        // 额外元数据
}

// 操作日志记录器类
export class operation_logger {
  /**
   * 记录操作日志
   */
  static async log(data: operation_log_data): Promise<void> {
    try {
      // 记录到数据库（如果是采购相关操作且有resourceId）
      if (data.resourceType === 'purchase' && data.resourceId) {
        await prisma.edit_log.create({
          data: {
            purchase_id: data.resourceId,
            user_id: data.user_id,
            action: data.operation,
            details: data.details ? JSON.stringify(data.details) : null,
            changed_fields: data.changedFields ? JSON.stringify(data.changedFields) : undefined
          }
        })
      }
      
      // 记录到文件日志
      logger.info('操作日志', {
        user_id: data.user_id,
        operation: data.operation,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        details: data.details,
        changedFields: data.changedFields,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
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
  static async log_user_login(user_id: string, ip_address?: string, user_agent?: string): Promise<void> {
    await this.log({
      user_id,
      operation: operation_type.USER_LOGIN,
      ip_address,
      user_agent: user_agent,
      details: {
        loginTime: new Date().toISOString()
      }
    })
  }
  
  /**
   * 记录用户登出
   */
  static async log_user_logout(user_id: string, ip_address?: string): Promise<void> {
    await this.log({
      user_id,
      operation: operation_type.USER_LOGOUT,
      ip_address,
      details: {
        logoutTime: new Date().toISOString()
      }
    })
  }
  
  /**
   * 记录采购创建
   */
  static async log_purchase_create(
    user_id: string, 
    purchase_id: string, 
    purchase_data: any,
    ip_address?: string
  ): Promise<void> {
    await this.log({
      user_id,
      operation: operation_type.PURCHASE_CREATE,
      resourceType: 'purchase',
      resourceId: purchase_id,
      ip_address,
      details: {
        product_name: purchase_data.product_name,
        material_type: purchase_data.material_type,
        total_price: purchase_data.total_price,
        supplier_name: purchase_data.supplier?.name
      }
    })
  }
  
  /**
   * 记录采购更新
   */
  static async log_purchase_update(
    user_id: string,
    purchase_id: string,
    changedFields: Record<string, { from: any; to: any }>,
    ip_address?: string
  ): Promise<void> {
    await this.log({
      user_id,
      operation: operation_type.PURCHASE_UPDATE,
      resourceType: 'purchase',
      resourceId: purchase_id,
      changedFields,
      ip_address,
      details: {
        fieldsChanged: Object.keys(changedFields),
        changeCount: Object.keys(changedFields).length
      }
    })
  }
  
  /**
   * 记录供应商创建
   */
  static async log_supplier_create(
    user_id: string,
    supplier_id: string,
    supplierData: any,
    ip_address?: string
  ): Promise<void> {
    await this.log({
      user_id,
      operation: operation_type.SUPPLIER_CREATE,
      resourceType: 'supplier',
      resourceId: supplier_id,
      ip_address,
      details: {
        supplier_name: supplierData.name,
        contact: supplierData.contact,
        phone: supplierData.phone
      }
    })
  }
  
  /**
   * 记录库存查看
   */
  static async log_inventory_view(
    user_id: string,
    viewType: string,
    filters?: any,
    ip_address?: string
  ): Promise<void> {
    await this.log({
      user_id,
      operation: operation_type.INVENTORY_VIEW,
      resourceType: 'inventory',
      ip_address,
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
  static async log_inventory_export(
    user_id: string,
    exportType: string,
    recordCount: number,
    ip_address?: string
  ): Promise<void> {
    await this.log({
      user_id,
      operation: operation_type.INVENTORY_EXPORT,
      resourceType: 'inventory',
      ip_address,
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
  static async log_ai_operation(
    user_id: string,
    aiOperation: operation_type,
    details: any,
    ip_address?: string
  ): Promise<void> {
    await this.log({
      user_id,
      operation: aiOperation,
      resourceType: 'ai',
      ip_address,
      details
    })
  }
  
  /**
   * 记录文件操作
   */
  static async log_file_operation(
    user_id: string,
    operation: operation_type.FILE_UPLOAD | operation_type.FILE_DELETE,
    file_name: string,
    file_size?: number,
    ip_address?: string
  ): Promise<void> {
    await this.log({
      user_id,
      operation,
      resourceType: 'file',
      ip_address,
      details: {
        file_name,
        file_size,
        timestamp: new Date().toISOString()
      }
    })
  }
  
  /**
   * 获取用户操作日志
   */
  static async get_user_operation_logs(
    UserId: string,
    Limit: number = 50,
    Offset: number = 0
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
  static async get_resource_operation_logs(
    resourceType: string,
    resourceId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      if (resourceType === 'purchase') {
        const logs = await prisma.edit_log.findMany({
          where: { purchase_id: resourceId },
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
        
        return logs.map((log: any) => ({
          id: log.id,
          operation: log.action,
          user: log.user,
          details: log.details ? JSON.parse(log.details as string) : null,
          changedFields: log.changedFields ? JSON.parse(log.changedFields as string) : null,
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
export default operation_logger