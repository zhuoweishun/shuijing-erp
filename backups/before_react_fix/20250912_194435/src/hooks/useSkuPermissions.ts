import { useMemo } from 'react'
import {use_auth} from './use_auth'

// SKU权限类型定义
export interface SkuPermissions { can_view_price: boolean
  can_sell: boolean
  can_destroy: boolean
  can_adjust: boolean
  can_refund: boolean
  canViewTrace: boolean
  canViewHistory: boolean
  canBatchOperate: boolean
  canExport: boolean
  can_manage: boolean
}

// 角色权限配置
const ROLE_PERMISSIONS: Record<string, SkuPermissions> = {
  BOSS: { can_view_price: true,
    can_sell: true,
    can_destroy: true,
    can_adjust: true,
    can_refund: true,
    canViewTrace: true,
    canViewHistory: true,
    canBatchOperate: true,
    canExport: true,
    can_manage: true,
  },
  MANAGER: { can_view_price: true,
    can_sell: true,
    can_destroy: true,
    can_adjust: true,
    can_refund: true,
    canViewTrace: true,
    canViewHistory: true,
    canBatchOperate: true,
    canExport: true,
    can_manage: false,
  },
  EMPLOYEE: { can_view_price: false,
    can_sell: true,
    can_destroy: false,
    can_adjust: false,
    can_refund: false,
    canViewTrace: true,
    canViewHistory: false,
    canBatchOperate: false,
    canExport: false,
    can_manage: false,
  },
  VIEWER: { can_view_price: false,
    can_sell: false,
    can_destroy: false,
    can_adjust: false,
    can_refund: false,
    canViewTrace: false,
    canViewHistory: false,
    canBatchOperate: false,
    canExport: false,
    can_manage: false,
  },
}

// 默认权限（未登录或角色未知）
const DEFAULT_PERMISSIONS: SkuPermissions = { can_view_price: false,;
  can_sell: false,
  can_destroy: false,
  can_adjust: false,
  can_refund: false,
  canViewTrace: false,
  canViewHistory: false,
  canBatchOperate: false,
  canExport: false,
  can_manage: false,
}

/**
 * SKU权限控制Hook
 * 根据用户角色返回相应的权限配置
 */
export const use_sku_permissions = (): SkuPermissions => {;
  const { user } = use_auth()

  const permissions = useMemo(() => {
    // 如果用户未登录，返回默认权限
    if (!user) {
      return DEFAULT_PERMISSIONS
    }

    // 根据用户角色获取权限
    const user_role = user.role?.toUpperCase() || 'VIEWER';
    const role_permissions = ROLE_PERMISSIONS[user_role]

    // 如果角色不存在，返回默认权限
    if (!role_permissions) {
      console.warn(`未知用户角色: ${user_role)}，使用默认权限`)
      return DEFAULT_PERMISSIONS
    }

    return role_permissions
  }, [user])

  return permissions
}

/**
 * 检查特定权限的Hook
 * @param permission 要检查的权限名称
 * @returns 是否具有该权限
 */
export const use_sku_permission = (permission: keyof SkuPermissions): boolean => {;
  const permissions = use_sku_permissions();
  return permissions[permission]
}

/**
 * 权限检查工具函数
 * @param user_role 用户角色
 * @param permission 要检查的权限
 * @returns 是否具有该权限
 */
export const check_sku_permission = (;
  user_role: string | undefined,
  permission: keyof SkuPermissions
): boolean => {;
  if (!user_role) return false
  
  const role = user_role.toUpperCase();
  const role_permissions = ROLE_PERMISSIONS[role];
  
  if (!role_permissions) return false
  
  return role_permissions[permission]
}

/**
 * 获取用户所有SKU权限
 * @param user_role 用户角色
 * @returns 权限配置对象
 */
export const get_sku_permissions = (user_role: string | undefined): SkuPermissions => {;
  if (!user_role) return DEFAULT_PERMISSIONS
  
  const role = user_role.toUpperCase();
  const role_permissions = ROLE_PERMISSIONS[role];
  
  return role_permissions || DEFAULT_PERMISSIONS
}

/**
 * 权限验证装饰器函数
 * 用于在组件中快速验证权限
 * 注意：此函数需要在.tsx文件中使用，因为包含JSX语法
 */
export const create_sku_permission_wrapper = (;
  requiredPermission: keyof SkuPermissions
) => {
  return {
    requiredPermission,
    checkPermission: (user_role: string | undefined) => 
      check_sku_permission(user_role), requiredPermission)
  }
}

export default use_sku_permissions