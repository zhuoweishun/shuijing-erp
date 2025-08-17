import { authService } from '../services/auth';

/**
 * 简化的权限管理器
 */
export class PermissionManager {
  /**
   * 检查用户是否为管理员
   */
  static async isAdmin(): Promise<boolean> {
    try {
      const user = await authService.getCurrentUser();
      return user?.role === 'admin';
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 检查用户是否已登录
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const user = await authService.getCurrentUser();
      return !!user;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 检查用户权限
   */
  static async checkPermission(action: 'create' | 'read' | 'update' | 'delete'): Promise<boolean> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        return false;
      }
      
      // 管理员拥有所有权限
      if (user.role === 'admin') {
        return true;
      }
      
      // 普通用户只能读取
      return action === 'read';
    } catch (error) {
      return false;
    }
  }
}

// 导出便捷函数
export const checkPermission = PermissionManager.checkPermission.bind(PermissionManager);
export const isAdmin = PermissionManager.isAdmin.bind(PermissionManager);