import { authAPI, getAuthToken } from '../lib/apiService';

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  role?: 'admin' | 'user';
  created_at?: string;
}

export class AuthService {
  private static instance: AuthService;
  private currentUser: AuthUser | null = null;
  private listeners: ((user: AuthUser | null) => void)[] = [];

  private constructor() {
    this.initializeAuth();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async initializeAuth() {
    try {
      // 检查是否有存储的token
      const token = getAuthToken();
      if (token) {
        await this.loadCurrentUser();
      }
    } catch (error) {
      console.error('初始化认证失败:', error);
      // 如果token无效，清除它
      authAPI.logout();
    }
  }

  private async loadCurrentUser() {
    try {
      const response = await authAPI.getCurrentUser();
      this.setCurrentUser({
        id: response.user.id,
        email: response.user.email,
        username: response.user.username,
        full_name: response.user.full_name,
        role: response.user.role || 'user'
      });
    } catch (error) {
      console.error('加载用户信息失败:', error);
      // 如果获取用户信息失败，清除认证状态
      authAPI.logout();
      this.setCurrentUser(null);
      throw error;
    }
  }

  private setCurrentUser(user: AuthUser | null) {
    this.currentUser = user;
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentUser));
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    this.listeners.push(callback);
    // 立即调用一次回调，传递当前状态
    callback(this.currentUser);
    
    // 返回取消订阅的函数
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  async signIn(usernameOrEmail: string, password: string): Promise<AuthUser> {
    try {
      const response = await authAPI.login(usernameOrEmail, password);
      
      const user: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        username: response.user.username,
        full_name: response.user.full_name,
        role: response.user.role || 'user'
      };

      this.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  }

  async signUp(username: string, email: string, password: string, full_name?: string): Promise<AuthUser> {
    try {
      const response = await authAPI.register({
        username,
        email,
        password,
        full_name
      });
      
      const user: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        username: response.user.username,
        full_name: response.user.full_name,
        role: response.user.role || 'user'
      };

      this.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      authAPI.logout();
      this.setCurrentUser(null);
    } catch (error) {
      console.error('登出失败:', error);
      throw error;
    }
  }

  async updateProfile(updates: Partial<Pick<AuthUser, 'full_name' | 'email'>>): Promise<AuthUser> {
    if (!this.currentUser) {
      throw new Error('用户未登录');
    }

    try {
      const response = await authAPI.updateProfile(updates);
      
      const updatedUser: AuthUser = {
        ...this.currentUser,
        ...response.user
      };

      this.setCurrentUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('更新用户配置失败:', error);
      throw error;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('用户未登录');
    }

    try {
      await authAPI.changePassword(currentPassword, newPassword);
    } catch (error) {
      console.error('修改密码失败:', error);
      throw error;
    }
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
}

// 导出单例实例
export const authService = AuthService.getInstance();