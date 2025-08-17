// 数据存储工具类 - 使用 Supabase
import { PurchaseService, ProductService, StatsService } from '../lib/supabaseService';
import { supabase, getCurrentUser, isSupabaseReady } from '../lib/supabase';
import { authService } from '../services/auth';

// 保持原有接口兼容性
export interface Purchase {
  id: string;
  supplier: string;
  crystalType: string;
  weight: number;
  price: number;
  quality: string;
  notes: string;
  photos: string[];
  createdAt: string;
  updatedAt: string;
  // 新增字段
  quantity?: number;
  size?: string;
  unitPrice?: number;
  beadPrice?: number; // 单珠价格
  estimatedBeadCount?: number; // 估算珠子数量
  // 用户信息
  user_profiles?: {
    username: string | null;
    full_name: string | null;
  } | null;
  createdBy?: string; // 录入人用户名
  userId?: string; // 录入人ID
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
  status: string;
  createdAt: string;
  updatedAt: string;
}

// 数据转换函数
function convertSupabasePurchase(data: any): Purchase {
  return {
    id: data.id,
    supplier: data.supplier || '',
    crystalType: data.crystal_type || '',
    weight: data.weight || 0,
    price: data.price || 0,
    quality: data.quality || '',
    notes: data.notes || '',
    photos: data.photos || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    // 新增字段
    quantity: data.quantity || undefined,
    size: data.size || undefined,
    unitPrice: data.unit_price || undefined,
    beadPrice: data.bead_price || undefined,
    estimatedBeadCount: data.estimated_bead_count || undefined,
    // 用户信息
    user_profiles: data.user_profiles || null,
    createdBy: data.created_by || data.createdBy,
    userId: data.user_id || data.userId
  };
}

function convertSupabaseProduct(data: any): Product {
  return {
    id: data.id,
    productName: data.product_name || '',
    category: data.category || '',
    rawMaterial: data.raw_material || '',
    weight: data.weight || 0,
    size: data.size || '',
    craftTime: data.craft_time || 0,
    cost: data.cost || 0,
    sellingPrice: data.selling_price || 0,
    description: data.description || '',
    photos: data.photos || [],
    status: data.status || '制作中',
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

function convertToPurchaseInsert(data: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    supplier: data.supplier,
    crystal_type: data.crystalType,
    weight: data.weight,
    price: data.price,
    quality: data.quality || '未知', // 确保品相字段不为空
    notes: data.notes,
    photos: data.photos,
    // 新增字段
    quantity: data.quantity || null,
    size: data.size || null,
    unit_price: data.unitPrice || null,
    bead_price: data.beadPrice || null,
    estimated_bead_count: data.estimatedBeadCount || null
  };
}

function convertToProductInsert(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
  return {
    product_name: data.productName,
    category: data.category,
    raw_material: data.rawMaterial,
    weight: data.weight,
    size: data.size,
    craft_time: data.craftTime,
    cost: data.cost,
    selling_price: data.sellingPrice,
    description: data.description,
    photos: data.photos,
    status: data.status
  };
}

class StorageManager {
  private readonly PURCHASES_KEY = 'crystal_purchases';
  private readonly PRODUCTS_KEY = 'crystal_products';
  private readonly STORAGE_SOURCE_KEY = 'storage_source_preference';

  // 生成唯一ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 获取当前时间戳
  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }



  // 简化的用户认证检查
  private async ensureAuthenticated(): Promise<boolean> {
    const user = await authService.getCurrentUser();
    if (!user) {
      throw new Error('用户未登录，请先登录后再操作');
    }
    return true;
  }



  // 获取当前数据源信息（用于调试）
  async getCurrentDataSource(): Promise<{ source: 'cloud', reason: string, user?: string }> {
    try {
      await this.ensureAuthenticated();
      const user = await authService.getCurrentUser();
      return { 
        source: 'cloud', 
        reason: 'Supabase连接正常，用户已登录',
        user: user?.username || 'unknown'
      };
    } catch (error) {
      throw new Error(`数据源不可用: ${error}`);
    }
  }



  // 清除本地存储数据
  private clearLocalStorage(): void {
    try {
      // 清除所有可能的本地存储键
      const keysToRemove = [
        'purchases',
        'products', 
        'user_profiles',
        'cached_purchases',
        'offline_purchases',
        'local_purchases'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      console.log('🗑️ 已清除所有本地存储数据');
    } catch (error) {
      console.warn('⚠️ 清除本地存储时出错:', error);
    }
  }

  // 测试Supabase连接
  async testSupabaseConnection(): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('❌ Supabase未配置');
        return false;
      }
      
      // 简单的连接测试，不依赖特定表的权限
      const { data, error } = await supabase.auth.getSession();
      if (error && error.message !== 'Auth session missing!') {
        throw error;
      }
      
      // 尝试一个简单的查询来测试数据库连接
      const { error: testError } = await supabase
        .from('purchases')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.warn('⚠️ 数据库查询测试失败，但连接正常:', testError.message);
        // 即使查询失败（可能是权限问题），连接本身可能是正常的
        return true;
      }
      
      console.log('✅ Supabase云端连接测试成功');
      return true;
    } catch (error) {
      console.error('❌ Supabase云端连接测试失败:', error);
      return false;
    }
  }

  // 采购数据管理 - 最简化版本
  async getPurchases(): Promise<Purchase[]> {
    await this.ensureAuthenticated();
    
    try {
      console.log('🚀 开始获取采购数据（最简化版本）');
      
      // 直接查询，不使用任何服务层
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ 查询失败:', error);
        throw error;
      }
      
      console.log('✅ 采购数据获取成功，数量:', data?.length || 0);
      return (data || []).map(convertSupabasePurchase);
    } catch (error) {
      console.error('❌ 获取采购数据失败:', error);
      throw error;
    }
  }

  async savePurchase(purchaseData: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt'>): Promise<Purchase> {
    await this.ensureAuthenticated();
    
    // 强制只使用云端保存，不允许本地存储
    console.log('🌐 强制使用云端保存，禁用本地存储');
    
    try {
      // 设置用户上下文
      const { authService } = await import('../services/auth');
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        // 简化版本：不需要设置用户上下文
      }
      
      const supabaseData = convertToPurchaseInsert(purchaseData);
      const result = await PurchaseService.create(supabaseData);
      console.log('✅ 采购数据已成功保存到云端');
      
      // 清除任何可能的本地存储数据
      this.clearLocalStorage();
      
      return convertSupabasePurchase(result);
    } catch (error) {
      console.error('❌ 云端保存失败:', error);
      // 不降级到本地存储，直接抛出错误
      throw new Error(`云端保存失败，请检查网络连接和Supabase配置: ${error.message}`);
    }
  }

  async updatePurchase(id: string, updateData: Partial<Omit<Purchase, 'id' | 'createdAt'>>): Promise<Purchase | null> {
    await this.ensureAuthenticated();
    
    const maxRetries = 3;
    let lastError: any;
    
    // 添加详细的调试日志
    console.log('🔍 === 开始更新采购数据 ===');
    console.log('📋 更新ID:', id);
    console.log('📋 更新数据:', updateData);
    console.log('🌐 Supabase配置状态:', {
      hasSupabase: !!supabase,
      isReady: isSupabaseReady()
    });
    
    // 检查网络连接
    try {
      const connectionTest = await this.testSupabaseConnection();
      console.log('🔗 网络连接测试结果:', connectionTest);
    } catch (connError) {
      console.error('❌ 网络连接测试失败:', connError);
    }
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 === 尝试更新采购数据 (第 ${attempt} 次) ===`);
        console.log('🔍 详细调试信息:');
        console.log('  - 记录ID:', id);
        console.log('  - 更新数据:', JSON.stringify(updateData, null, 2));
        const currentUser = await authService.getCurrentUser();
        console.log('  - 当前用户:', currentUser);
        console.log('  - Supabase状态:', {
          hasSupabase: !!supabase,
          isReady: isSupabaseReady()
        });
        
        const supabaseData: any = {};
        if (updateData.supplier !== undefined) supabaseData.supplier = updateData.supplier;
        if (updateData.crystalType !== undefined) supabaseData.crystal_type = updateData.crystalType;
        if (updateData.weight !== undefined) supabaseData.weight = updateData.weight;
        if (updateData.price !== undefined) supabaseData.price = updateData.price;
        if (updateData.quality !== undefined) supabaseData.quality = updateData.quality || '未知'; // 确保品相字段不为空
        if (updateData.notes !== undefined) supabaseData.notes = updateData.notes;
        if (updateData.photos !== undefined) supabaseData.photos = updateData.photos;
        // 新增字段
        if (updateData.quantity !== undefined) supabaseData.quantity = updateData.quantity;
        if (updateData.size !== undefined) supabaseData.size = updateData.size;
        if (updateData.unitPrice !== undefined) supabaseData.unit_price = updateData.unitPrice;
        if (updateData.beadPrice !== undefined) supabaseData.bead_price = updateData.beadPrice;
        if (updateData.estimatedBeadCount !== undefined) supabaseData.estimated_bead_count = updateData.estimatedBeadCount;
        
        console.log('📤 发送到Supabase的数据:', JSON.stringify(supabaseData, null, 2));
        console.log('🚀 开始调用PurchaseService.update...');
        
        const result = await PurchaseService.update(id, supabaseData);
        console.log('✅ 采购数据已在Supabase更新成功');
        console.log('📥 更新结果:', JSON.stringify(result, null, 2));
        return convertSupabasePurchase(result);
      } catch (error: any) {
        lastError = error;
        console.error(`❌ 更新采购数据失败 (第 ${attempt} 次):`);
        console.error('错误类型:', error.constructor.name);
        console.error('错误消息:', error.message);
        console.error('错误详情:', error);
        console.error('错误堆栈:', error.stack);
        
        // 检查是否是网络错误
        const isNetworkError = error.message && (
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('timeout') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('ETIMEDOUT')
        );
        
        console.log('🔍 是否为网络错误:', isNetworkError);
        
        // 如果是网络错误且还有重试次数，立即重试
        if (isNetworkError && attempt < maxRetries) {
          console.log(`⏳ 网络错误，立即重试...`);
          continue;
        }
        
        // 如果不是网络错误或已达到最大重试次数，直接抛出错误
        break;
      }
    }
    
    console.log('🚨 === 更新采购数据最终失败 ===');
    console.error('最终错误:', lastError);
    
    // 提供更友好的错误信息和诊断建议
    let errorMessage = '更新采购记录失败';
    let diagnosticInfo = '';
    
    if (lastError?.message?.includes('Failed to fetch') || lastError?.message?.includes('Supabase网络请求失败')) {
      errorMessage = '网络连接失败';
      diagnosticInfo = '\n\n🔧 诊断建议:\n1. 检查网络连接是否正常\n2. 确认Supabase服务状态\n3. 尝试刷新页面重新登录\n4. 如问题持续，请使用Debug页面进行详细诊断';
    } else if (lastError?.message?.includes('JWT') || lastError?.message?.includes('auth')) {
      errorMessage = '认证失败，请重新登录';
      diagnosticInfo = '\n\n🔧 建议：请退出后重新登录';
    } else if (lastError?.message?.includes('permission') || lastError?.message?.includes('RLS')) {
      errorMessage = '权限不足，无法更新记录';
      diagnosticInfo = '\n\n🔧 建议：请联系管理员检查数据库权限配置';
    } else if (lastError?.message?.includes('timeout')) {
      errorMessage = '请求超时，请稍后重试';
      diagnosticInfo = '\n\n🔧 建议：检查网络连接速度';
    }
    
    const finalError = new Error(errorMessage + diagnosticInfo);
    (finalError as any).originalError = lastError;
    (finalError as any).diagnosticInfo = diagnosticInfo;
    
    throw finalError;
  }

  async deletePurchase(id: string): Promise<boolean> {
    await this.ensureAuthenticated();
    
    try {
      await PurchaseService.delete(id);
      console.log('✅ 采购数据已从Supabase删除');
      return true;
    } catch (error) {
      console.error('删除采购数据失败:', error);
      throw error;
    }
  }

  async getPurchaseById(id: string): Promise<Purchase | null> {
    await this.ensureAuthenticated();
    
    try {
      const result = await PurchaseService.getById(id);
      return result ? convertSupabasePurchase(result) : null;
    } catch (error) {
      console.error('获取采购数据失败:', error);
      throw error;
    }
  }

  // 成品数据管理
  async getProducts(): Promise<Product[]> {
    await this.ensureAuthenticated();
    
    try {
      const data = await ProductService.getAll();
      console.log('✅ 从Supabase获取成品数据成功');
      return data.map(convertSupabaseProduct);
    } catch (error) {
      console.error('从Supabase获取成品数据失败:', error);
      throw error;
    }
  }

  async saveProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    await this.ensureAuthenticated();
    
    try {
      const supabaseData = convertToProductInsert(productData);
      const result = await ProductService.create(supabaseData);
      console.log('✅ 成品数据已成功保存到Supabase');
      return convertSupabaseProduct(result);
    } catch (error) {
      console.error('保存成品数据到Supabase失败:', error);
      throw error;
    }
  }

  async updateProduct(id: string, updateData: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<Product | null> {
    await this.ensureAuthenticated();
    
    try {
      const supabaseData: any = {};
      if (updateData.productName !== undefined) supabaseData.product_name = updateData.productName;
      if (updateData.category !== undefined) supabaseData.category = updateData.category;
      if (updateData.rawMaterial !== undefined) supabaseData.raw_material = updateData.rawMaterial;
      if (updateData.weight !== undefined) supabaseData.weight = updateData.weight;
      if (updateData.size !== undefined) supabaseData.size = updateData.size;
      if (updateData.craftTime !== undefined) supabaseData.craft_time = updateData.craftTime;
      if (updateData.cost !== undefined) supabaseData.cost = updateData.cost;
      if (updateData.sellingPrice !== undefined) supabaseData.selling_price = updateData.sellingPrice;
      if (updateData.description !== undefined) supabaseData.description = updateData.description;
      if (updateData.photos !== undefined) supabaseData.photos = updateData.photos;
      if (updateData.status !== undefined) supabaseData.status = updateData.status;
      
      const result = await ProductService.update(id, supabaseData);
      return convertSupabaseProduct(result);
    } catch (error) {
      console.error('更新成品数据失败:', error);
      throw error;
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    await this.ensureAuthenticated();
    
    try {
      await ProductService.delete(id);
      return true;
    } catch (error) {
      console.error('删除成品数据失败:', error);
      throw error;
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    await this.ensureAuthenticated();
    
    try {
      const result = await ProductService.getById(id);
      return result ? convertSupabaseProduct(result) : null;
    } catch (error) {
      console.error('获取成品数据失败:', error);
      throw error;
    }
  }

  // 统计数据
  async getStatistics() {
    await this.ensureAuthenticated();
    
    try {
      return await StatsService.getStats();
    } catch (error) {
      console.error('获取统计数据失败:', error);
      throw error;
    }
  }

  // 导出数据
  async exportData() {
    await this.ensureAuthenticated();
    
    try {
      const [purchases, products] = await Promise.all([
        this.getPurchases(),
        this.getProducts()
      ]);
      
      return {
        purchases,
        products,
        exportTime: this.getCurrentTimestamp()
      };
    } catch (error) {
      console.error('导出数据失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const storage = new StorageManager();
export default storage;