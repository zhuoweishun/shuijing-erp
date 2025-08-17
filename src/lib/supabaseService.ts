import { supabase } from './supabase';
import type { Database } from './supabase';

type Purchase = Database['public']['Tables']['purchases']['Row'];
type PurchaseInsert = Database['public']['Tables']['purchases']['Insert'];
type PurchaseUpdate = Database['public']['Tables']['purchases']['Update'];

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert'];

// 用户配置文件服务（简化版，符合Supabase标准）
export class UserProfileService {
  // 获取当前用户的配置文件，如果不存在则返回null
  static async getCurrentUserProfile(): Promise<UserProfile | null> {
    if (!supabase) throw new Error('Supabase未配置');
    
    try {
      // 获取当前认证用户
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log('❌ 用户未认证');
        return null;
      }
      
      console.log('✅ 获取到认证用户:', user.id);
      
      // 查找用户配置文件
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        if (profileError.code === 'PGRST116') {
          console.log('📝 用户配置文件不存在，将由触发器自动创建');
          return null;
        }
        throw profileError;
      }
      
      return profile;
    } catch (error: any) {
      console.error('❌ 获取用户配置文件失败:', error);
      throw new Error(`获取用户配置文件失败: ${error.message || '未知错误'}`);
    }
  }
  
  // 获取当前认证用户的ID
  static async getCurrentUserId(): Promise<string | null> {
    if (!supabase) throw new Error('Supabase未配置');
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }
      
      return user.id;
    } catch (error) {
      console.error('❌ 获取当前用户ID失败:', error);
      return null;
    }
  }
}

// 采购数据服务
export class PurchaseService {
  // 获取所有采购记录（启用缓存）
  static async getAll(): Promise<Purchase[]> {
    if (!supabase) throw new Error('Supabase未配置');
    
    // 尝试从缓存获取
    const cacheKey = 'purchases:all';
    // 简化版本：不使用缓存
    
    console.log('🌐 从数据库获取采购记录');
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const result = data || [];
    // 简化版本：不使用缓存
    
    return result;
  }
  
  // 移除复杂的用户信息查询方法以提升性能
  
  // 根据ID获取采购记录（启用缓存）
  static async getById(id: string): Promise<Purchase | null> {
    if (!supabase) throw new Error('Supabase未配置');
    
    // 简化版本：不使用缓存
    
    console.log(`🌐 从数据库获取采购记录: ${id}`);
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return data;
  }
  
  // 创建采购记录
  static async create(purchase: Omit<PurchaseInsert, 'user_id'>): Promise<Purchase> {
    if (!supabase) throw new Error('Supabase未配置');
    
    console.log('🔍 开始创建采购记录...');
    
    // 获取当前认证用户ID
    const userId = await UserProfileService.getCurrentUserId();
    if (!userId) {
      throw new Error('用户未登录，请先登录后再操作');
    }
    
    console.log('✅ 获取到认证用户ID:', userId);
    
    // 直接使用认证用户ID创建记录
    const { data, error } = await supabase
      .from('purchases')
      .insert({ ...purchase, user_id: userId })
      .select()
      .single();
    
    if (error) {
      console.error('❌ 创建采购记录失败:', error);
      throw error;
    }
    
    // 简化版本：不使用缓存
    
    console.log('✅ 采购记录创建成功:', data.id);
    return data;
  }
  
  // 更新采购记录
  static async update(id: string, updates: PurchaseUpdate): Promise<Purchase> {
    if (!supabase) throw new Error('Supabase未配置');
    
    console.log('🔍 === 开始更新采购记录（无权限限制模式）===');
    console.log('📋 记录ID:', id);
    console.log('📋 更新数据:', updates);
    
    // 跳过所有权限检查，直接执行更新
    console.log('🚀 直接执行更新操作（绕过权限检查）...');
    
    try {
      const { data, error } = await supabase
        .from('purchases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ 更新操作失败:', {
          error: error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('✅ 更新操作成功（无权限限制）:', {
        id: data.id,
        user_id: data.user_id,
        updated_at: data.updated_at
      });
      
      // 简化版本：不使用缓存
      
      return data;
    } catch (updateError: any) {
      console.error('❌ 更新过程中发生异常:', updateError);
      
      // 如果是网络错误，提供更详细的诊断信息
      if (updateError.message && updateError.message.includes('Failed to fetch')) {
        console.error('🌐 网络连接问题检测到');
        throw new Error('网络连接失败，请检查网络状态后重试');
      }
      
      throw updateError;
    }
  }
  
  // 删除采购记录
  static async delete(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase未配置');
    
    const { error } = await supabase
      .from('purchases')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // 简化版本：不使用缓存
  }
  
  // 搜索采购记录（启用缓存）
  static async search(query: string): Promise<Purchase[]> {
    if (!supabase) throw new Error('Supabase未配置');
    
    // 简化版本：不使用缓存
    
    console.log(`🌐 从数据库搜索采购记录: ${query}`);
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .or(`supplier.ilike.%${query}%,crystal_type.ilike.%${query}%,notes.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const result = data || [];
    
    return result;
  }
  
  // 获取所有不重复的历史供应商（启用缓存）
  static async getUniqueSuppliers(): Promise<string[]> {
    if (!supabase) throw new Error('Supabase未配置');
    
    // 简化版本：不使用缓存
    
    console.log('🌐 从数据库获取供应商列表');
    const { data, error } = await supabase
      .from('purchases')
      .select('supplier')
      .not('supplier', 'is', null)
      .neq('supplier', '')
      .order('supplier');
    
    if (error) throw error;
    
    // 去重并过滤空值
    const uniqueSuppliers = [...new Set(
      (data || []).map(item => item.supplier).filter(Boolean)
    )];
    
    return uniqueSuppliers;
  }
}

// 成品数据服务
export class ProductService {
  // 获取所有成品记录
  static async getAll(): Promise<Product[]> {
    if (!supabase) throw new Error('Supabase未配置');
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
  
  // 根据ID获取成品记录
  static async getById(id: string): Promise<Product | null> {
    if (!supabase) throw new Error('Supabase未配置');
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // 创建成品记录
  static async create(product: Omit<ProductInsert, 'user_id'>): Promise<Product> {
    if (!supabase) throw new Error('Supabase未配置');
    
    console.log('🔍 开始创建成品记录...');
    
    // 获取当前认证用户ID
    const userId = await UserProfileService.getCurrentUserId();
    if (!userId) {
      throw new Error('用户未登录，请先登录后再操作');
    }
    
    console.log('✅ 获取到认证用户ID:', userId);
    
    // 直接使用认证用户ID创建记录
    const { data, error } = await supabase
      .from('products')
      .insert({ ...product, user_id: userId })
      .select()
      .single();
    
    if (error) {
      console.error('❌ 创建成品记录失败:', error);
      throw error;
    }
    
    console.log('✅ 成品记录创建成功:', data.id);
    return data;
  }
  
  // 更新成品记录
  static async update(id: string, updates: ProductUpdate): Promise<Product> {
    if (!supabase) throw new Error('Supabase未配置');
    
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // 删除成品记录
  static async delete(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase未配置');
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
  
  // 搜索成品记录
  static async search(query: string): Promise<Product[]> {
    if (!supabase) throw new Error('Supabase未配置');
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`product_name.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
  
  // 根据状态筛选成品
  static async getByStatus(status: string): Promise<Product[]> {
    if (!supabase) throw new Error('Supabase未配置');
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
}

// 统计数据服务
export class StatsService {
  // 获取统计数据
  static async getStats() {
    if (!supabase) throw new Error('Supabase未配置');
    
    const [purchasesResult, productsResult] = await Promise.all([
      supabase.from('purchases').select('price, created_at'),
      supabase.from('products').select('cost, selling_price, status, created_at')
    ]);
    
    if (purchasesResult.error) throw purchasesResult.error;
    if (productsResult.error) throw productsResult.error;
    
    const purchases = purchasesResult.data || [];
    const products = productsResult.data || [];
    
    // 计算统计数据
    const totalPurchases = purchases.length;
    const totalProducts = products.length;
    
    // 计算本月收入和利润
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyProducts = products.filter(product => {
      const productDate = new Date(product.created_at);
      return productDate.getMonth() === currentMonth && 
             productDate.getFullYear() === currentYear &&
             product.status === '已售出';
    });
    
    const monthlyRevenue = monthlyProducts.reduce((sum, product) => {
      return sum + (product.selling_price || 0);
    }, 0);
    
    const monthlyProfit = monthlyProducts.reduce((sum, product) => {
      return sum + ((product.selling_price || 0) - (product.cost || 0));
    }, 0);
    
    return {
      totalPurchases,
      totalProducts,
      monthlyRevenue,
      monthlyProfit
    };
  }
}