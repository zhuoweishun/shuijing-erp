// 数据存储工具类 - 使用本地MySQL API
import { purchasesAPI, productsAPI } from '../lib/apiService';
import { authService } from '../services/auth';

export interface Purchase {
  id: string;
  supplier: string;
  crystalType: string;
  weight: number;
  price: number;
  quality: string;
  notes: string;
  photos: string[];
  purchaseDate?: string;
  quantity?: number;
  size?: string;
  unitPrice?: number;
  beadPrice?: number;
  estimatedBeadCount?: number;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  createdBy?: string;
}

export interface Product {
  id: string;
  productName: string;
  category: string;
  rawMaterial: string;
  weight: number;
  size: string;
  craftTime: number;
  cost: number;
  sellingPrice: number;
  description: string;
  photos: string[];
  status: 'available' | 'sold' | 'reserved';
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  totalPurchases: number;
  totalProducts: number;
  totalInvestment: number;
  totalRevenue: number;
  profit: number;
  profitMargin: number;
}

class StorageService {
  private async ensureAuthenticated(): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) {
      throw new Error('用户未登录');
    }
  }

  // 测试API连接
  async testApiConnection(): Promise<boolean> {
    try {
      // 使用fetch直接测试健康检查端点
      const response = await fetch('http://localhost:3001/health');
      const data = await response.json();
      return data.status === 'OK';
    } catch (error) {
      console.error('❌ API连接测试失败:', error);
      return false;
    }
  }

  // 采购数据管理
  async getPurchases(): Promise<Purchase[]> {
    await this.ensureAuthenticated();
    
    try {
      const response = await purchasesAPI.getPurchases();
      return response.purchases || [];
    } catch (error) {
      console.error('❌ 获取采购数据失败:', error);
      throw error;
    }
  }

  async savePurchase(purchaseData: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>): Promise<Purchase> {
    await this.ensureAuthenticated();
    
    try {
      const response = await purchasesAPI.createPurchase(purchaseData);
      return response.purchase;
    } catch (error) {
      console.error('❌ 保存采购数据失败:', error);
      throw new Error(`保存失败，请检查网络连接: ${error.message}`);
    }
  }

  async updatePurchase(id: string, updateData: Partial<Omit<Purchase, 'id' | 'createdAt'>>): Promise<Purchase | null> {
    await this.ensureAuthenticated();
    
    try {
      const response = await purchasesAPI.updatePurchase(id, updateData);
      return response.purchase;
    } catch (error) {
      console.error('❌ 更新采购数据失败:', error);
      throw error;
    }
  }

  async deletePurchase(id: string): Promise<boolean> {
    await this.ensureAuthenticated();
    
    try {
      await purchasesAPI.deletePurchase(id);
      return true;
    } catch (error) {
      console.error('删除采购数据失败:', error);
      throw error;
    }
  }

  async getPurchaseById(id: string): Promise<Purchase | null> {
    await this.ensureAuthenticated();
    
    try {
      const response = await purchasesAPI.getPurchase(id);
      return response.purchase;
    } catch (error) {
      console.error('获取采购数据失败:', error);
      throw error;
    }
  }

  // 成品数据管理
  async getProducts(): Promise<Product[]> {
    await this.ensureAuthenticated();
    
    try {
      const response = await productsAPI.getProducts();
      return response.products || [];
    } catch (error) {
      console.error('获取成品数据失败:', error);
      throw error;
    }
  }

  async saveProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    await this.ensureAuthenticated();
    
    try {
      const response = await productsAPI.createProduct(productData);
      return response.product;
    } catch (error) {
      console.error('保存成品数据失败:', error);
      throw error;
    }
  }

  async updateProduct(id: string, updateData: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<Product> {
    await this.ensureAuthenticated();
    
    try {
      const response = await productsAPI.updateProduct(id, updateData);
      return response.product;
    } catch (error) {
      console.error('更新成品数据失败:', error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    await this.ensureAuthenticated();
    
    try {
      await productsAPI.deleteProduct(id);
      return true;
    } catch (error) {
      console.error('删除成品数据失败:', error);
      throw error;
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    await this.ensureAuthenticated();
    
    try {
      const response = await productsAPI.getProduct(id);
      return response.product;
    } catch (error) {
      console.error('获取成品数据失败:', error);
      throw error;
    }
  }

  // 统计数据
  async getStats(): Promise<Stats> {
    await this.ensureAuthenticated();
    
    try {
      const response = await productsAPI.getProductStats();
      return response.stats || {
        totalPurchases: 0,
        totalProducts: 0,
        totalInvestment: 0,
        totalRevenue: 0,
        profit: 0,
        profitMargin: 0
      };
    } catch (error) {
      console.error('获取统计数据失败:', error);
      throw error;
    }
  }

  // 清理本地存储
  clearLocalStorage(): void {
    try {
      localStorage.removeItem('purchases');
      localStorage.removeItem('products');
      localStorage.removeItem('lastSync');

    } catch (error) {
      console.error('清理本地存储失败:', error);
    }
  }

  // 获取系统状态
  async getSystemStatus(): Promise<any> {
    try {
      const apiConnected = await this.testApiConnection();
      const user = await authService.getCurrentUser();
      
      return {
        apiConnected,
        userLoggedIn: !!user,
        user: user ? { id: user.id, username: user.username, email: user.email } : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('获取系统状态失败:', error);
      return {
        apiConnected: false,
        userLoggedIn: false,
        user: null,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const storage = new StorageService();
export default storage;