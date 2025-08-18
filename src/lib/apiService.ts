// API服务 - 本地MySQL数据库API调用
import { getBestAPIBaseURL, getDeviceType, getNetworkInfo } from '../utils/networkUtils';

// 动态获取API基础URL
let API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
let isInitialized = false;
let lastInitTime = 0;
const REINIT_INTERVAL = 30000; // 30秒重新初始化间隔

// 初始化API配置
async function initializeAPI(forceRefresh = false) {
  const now = Date.now();
  
  // 如果已初始化且未强制刷新且在时间间隔内，直接返回
  if (isInitialized && !forceRefresh && (now - lastInitTime) < REINIT_INTERVAL) {
    return;
  }
  
  try {
    const deviceType = getDeviceType();
    const networkInfo = getNetworkInfo();
    
    console.log(`📱 设备类型: ${deviceType}`);
    console.log(`🌐 网络状态:`, networkInfo);
    console.log(`🔄 API${forceRefresh ? '强制' : ''}初始化开始...`);
    
    // 动态获取最佳API地址
    const newAPIURL = await getBestAPIBaseURL();
    
    // 如果API地址发生变化，记录日志
    if (API_BASE_URL !== newAPIURL) {
      console.log(`🔄 API地址变更: ${API_BASE_URL} -> ${newAPIURL}`);
    }
    
    API_BASE_URL = newAPIURL;
    isInitialized = true;
    lastInitTime = now;
    
    console.log(`🔗 API地址已设置: ${API_BASE_URL}`);
  } catch (error) {
    console.error('❌ API初始化失败:', error);
    // 使用默认地址
    const fallback = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    if (API_BASE_URL !== fallback) {
      console.log(`🔄 使用默认API地址: ${fallback}`);
      API_BASE_URL = fallback;
    }
  }
}

// 获取当前API基础URL
export function getAPIBaseURL(): string {
  return API_BASE_URL;
}

// 强制刷新API地址
export async function refreshAPIAddress(): Promise<string> {
  console.log('🔄 强制刷新API地址...');
  await initializeAPI(true);
  return API_BASE_URL;
}

// 重置API初始化状态（用于调试）
export function resetAPIInitialization(): void {
  isInitialized = false;
  lastInitTime = 0;
  console.log('🔄 API初始化状态已重置');
}

// 获取认证token
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// 设置认证token
function setAuthToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

// 清除认证token
function clearAuthToken(): void {
  localStorage.removeItem('auth_token');
}

// 通用请求函数
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // 确保API已初始化
  await initializeAPI();
  
  const token = getAuthToken();
  
  // 创建超时控制器
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
    signal: controller.signal,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    clearTimeout(timeoutId); // 清理超时定时器
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '请求失败' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId); // 确保在错误情况下也清理定时器
    console.error('API请求错误:', error);
    
    // 提供更友好的错误信息
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('网络连接失败，请检查网络设置或API服务器状态');
    }
    
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接');
    }
    
    throw error;
  }
}

// 认证相关API
export const authAPI = {
  // 登录
  async login(username: string, password: string) {
    const response = await apiRequest<{
      message: string;
      token: string;
      user: any;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    setAuthToken(response.token);
    return response;
  },

  // 注册
  async register(userData: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
  }) {
    const response = await apiRequest<{
      message: string;
      token: string;
      user: any;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    setAuthToken(response.token);
    return response;
  },

  // 获取当前用户信息
  async getCurrentUser() {
    return await apiRequest<{ user: any }>('/auth/me');
  },

  // 更新用户信息
  async updateProfile(userData: {
    full_name?: string;
    email?: string;
  }) {
    return await apiRequest<{
      message: string;
      user: any;
    }>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  // 修改密码
  async changePassword(currentPassword: string, newPassword: string) {
    return await apiRequest<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // 登出
  logout() {
    clearAuthToken();
  },
};

// 产品相关API
export const productsAPI = {
  // 获取产品列表
  async getProducts(params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([_, value]) => value !== undefined && value !== '')
        .map(([key, value]) => [key, String(value)])
    ).toString();
    
    return await apiRequest<{
      products: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/products?${queryString}`);
  },

  // 获取产品详情
  async getProduct(id: string) {
    return await apiRequest<{ product: any }>(`/products/${id}`);
  },

  // 创建产品
  async createProduct(productData: any) {
    return await apiRequest<{
      message: string;
      product: any;
    }>('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  // 更新产品
  async updateProduct(id: string, productData: any) {
    return await apiRequest<{
      message: string;
      product: any;
    }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  },

  // 删除产品
  async deleteProduct(id: string) {
    return await apiRequest<{
      message: string;
      deletedProduct: string;
    }>(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  // 获取产品统计
  async getProductStats() {
    return await apiRequest<{ stats: any }>('/products/stats/summary');
  },
};

// 采购相关API
export const purchasesAPI = {
  // 获取采购记录列表
  async getPurchases(params: {
    page?: number;
    limit?: number;
    search?: string;
    supplier?: string;
    crystal_type?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([_, value]) => value !== undefined && value !== '')
        .map(([key, value]) => [key, String(value)])
    ).toString();
    
    return await apiRequest<{
      purchases: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/purchases?${queryString}`);
  },

  // 获取采购记录详情
  async getPurchase(id: string) {
    return await apiRequest<{ purchase: any }>(`/purchases/${id}`);
  },

  // 创建采购记录
  async createPurchase(purchaseData: any) {
    return await apiRequest<{
      message: string;
      purchase: any;
    }>('/purchases', {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    });
  },

  // 更新采购记录
  async updatePurchase(id: string, purchaseData: any) {
    return await apiRequest<{
      message: string;
      purchase: any;
    }>(`/purchases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(purchaseData),
    });
  },

  // 删除采购记录
  async deletePurchase(id: string) {
    return await apiRequest<{
      message: string;
      deletedPurchase: string;
    }>(`/purchases/${id}`, {
      method: 'DELETE',
    });
  },

  // 获取采购统计
  async getPurchaseStats() {
    return await apiRequest<{
      stats: any;
      topSuppliers: any[];
      topCrystalTypes: any[];
    }>('/purchases/stats/summary');
  },

  // 获取供应商列表
  async getSuppliers() {
    return await apiRequest<{ suppliers: string[] }>('/purchases/suppliers/list');
  },

  // 获取水晶类型列表
  async getCrystalTypes() {
    return await apiRequest<{ crystalTypes: string[] }>('/purchases/crystal-types/list');
  },
};

// 用户管理相关API（管理员功能）
export const usersAPI = {
  // 获取用户列表
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}) {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([_, value]) => value !== undefined && value !== '')
        .map(([key, value]) => [key, String(value)])
    ).toString();
    
    return await apiRequest<{
      users: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(`/users?${queryString}`);
  },

  // 获取用户详情
  async getUser(id: string) {
    return await apiRequest<{ user: any }>(`/users/${id}`);
  },

  // 创建用户
  async createUser(userData: any) {
    return await apiRequest<{
      message: string;
      user: any;
    }>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // 更新用户
  async updateUser(id: string, userData: any) {
    return await apiRequest<{
      message: string;
      user: any;
    }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  // 重置用户密码
  async resetUserPassword(id: string, newPassword: string) {
    return await apiRequest<{ message: string }>(`/users/${id}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    });
  },

  // 删除用户
  async deleteUser(id: string) {
    return await apiRequest<{
      message: string;
      deletedUser: string;
    }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};

// 文件上传相关API
export const uploadAPI = {
  // 单文件上传
  async uploadSingle(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/upload/single`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '上传失败' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  },

  // 多文件上传
  async uploadMultiple(files: File[]) {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/upload/multiple`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '上传失败' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  },

  // 删除文件
  async deleteFile(filename: string) {
    return await apiRequest<{
      message: string;
      filename: string;
    }>(`/upload/files/${filename}`, {
      method: 'DELETE',
    });
  },

  // 获取文件URL
  getFileUrl(filename: string): string {
    return `${API_BASE_URL}/upload/files/${filename}`;
  },
};

// 通用API服务
export const apiService = {
  async get<T>(endpoint: string): Promise<T> {
    return await apiRequest<T>(endpoint);
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    return await apiRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async put<T>(endpoint: string, data: any): Promise<T> {
    return await apiRequest<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete<T>(endpoint: string): Promise<T> {
    return await apiRequest<T>(endpoint, {
      method: 'DELETE',
    });
  },
};

export { getAuthToken, setAuthToken, clearAuthToken };
export default apiService;