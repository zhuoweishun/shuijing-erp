// API服务 - 替换Supabase的API调用

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
  const token = getAuthToken();
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '请求失败' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API请求错误:', error);
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

export { getAuthToken, setAuthToken, clearAuthToken };