import { useMemo } from 'react'
import { useAuth } from './useAuth'

// SKU权限类型定义
export interface SkuPermissions {
  canViewPrice: boolean
  canSell: boolean
  canDestroy: boolean
  canAdjust: boolean
  canViewTrace: boolean
  canViewHistory: boolean
  canBatchOperate: boolean
  canExport: boolean
}

// 角色权限配置
const ROLE_PERMISSIONS: Record<string, SkuPermissions> = {
  BOSS: {
    canViewPrice: true,
    canSell: true,
    canDestroy: true,
    canAdjust: true,
    canViewTrace: true,
    canViewHistory: true,
    canBatchOperate: true,
    canExport: true,
  },
  MANAGER: {
    canViewPrice: true,
    canSell: true,
    canDestroy: true,
    canAdjust: true,
    canViewTrace: true,
    canViewHistory: true,
    canBatchOperate: true,
    canExport: true,
  },
  EMPLOYEE: {
    canViewPrice: false,
    canSell: true,
    canDestroy: false,
    canAdjust: false,
    canViewTrace: true,
    canViewHistory: false,
    canBatchOperate: false,
    canExport: false,
  },
  VIEWER: {
    canViewPrice: false,
    canSell: false,
    canDestroy: false,
    canAdjust: false,
    canViewTrace: false,
    canViewHistory: false,
    canBatchOperate: false,
    canExport: false,
  },
}

// 默认权限（未登录或角色未知）
const DEFAULT_PERMISSIONS: SkuPermissions = {
  canViewPrice: false,
  canSell: false,
  canDestroy: false,
  canAdjust: false,
  canViewTrace: false,
  canViewHistory: false,
  canBatchOperate: false,
  canExport: false,
}

/**
 * SKU权限控制Hook
 * 根据用户角色返回相应的权限配置
 */
export const useSkuPermissions = (): SkuPermissions => {
  const { user } = useAuth()

  const permissions = useMemo(() => {
    // 如果用户未登录，返回默认权限
    if (!user) {
      return DEFAULT_PERMISSIONS
    }

    // 根据用户角色获取权限
    const userRole = user.role?.toUpperCase() || 'VIEWER'
    const rolePermissions = ROLE_PERMISSIONS[userRole]

    // 如果角色不存在，返回默认权限
    if (!rolePermissions) {
      console.warn(`未知用户角色: ${userRole}，使用默认权限`)
      return DEFAULT_PERMISSIONS
    }

    return rolePermissions
  }, [user])

  return permissions
}

/**
 * 检查特定权限的Hook
 * @param permission 要检查的权限名称
 * @returns 是否具有该权限
 */
export const useSkuPermission = (permission: keyof SkuPermissions): boolean => {
  const permissions = useSkuPermissions()
  return permissions[permission]
}

/**
 * 权限检查工具函数
 * @param userRole 用户角色
 * @param permission 要检查的权限
 * @returns 是否具有该权限
 */
export const checkSkuPermission = (
  userRole: string | undefined,
  permission: keyof SkuPermissions
): boolean => {
  if (!userRole) return false
  
  const role = userRole.toUpperCase()
  const rolePermissions = ROLE_PERMISSIONS[role]
  
  if (!rolePermissions) return false
  
  return rolePermissions[permission]
}

/**
 * 获取用户所有SKU权限
 * @param userRole 用户角色
 * @returns 权限配置对象
 */
export const getSkuPermissions = (userRole: string | undefined): SkuPermissions => {
  if (!userRole) return DEFAULT_PERMISSIONS
  
  const role = userRole.toUpperCase()
  const rolePermissions = ROLE_PERMISSIONS[role]
  
  return rolePermissions || DEFAULT_PERMISSIONS
}

/**
 * 权限验证装饰器函数
 * 用于在组件中快速验证权限
 * 注意：此函数需要在.tsx文件中使用，因为包含JSX语法
 */
export const createSkuPermissionWrapper = (
  requiredPermission: keyof SkuPermissions
) => {
  return {
    requiredPermission,
    checkPermission: (userRole: string | undefined) => 
      checkSkuPermission(userRole, requiredPermission)
  }
}

export default useSkuPermissions