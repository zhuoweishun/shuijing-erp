import { createClient } from '@supabase/supabase-js';
import { supabaseConfig, isSupabaseConfigured } from '../../supabase/config';

// 数据库类型定义
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      purchases: {
        Row: {
          id: string;
          user_id: string | null;
          supplier: string;
          crystal_type: string;
          weight: number | null;
          price: number | null;
          quality: string | null;
          notes: string | null;
          photos: string[] | null;
          quantity: number | null;
          size: string | null;
          unit_price: number | null;
          bead_price: number | null;
          estimated_bead_count: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          supplier: string;
          crystal_type: string;
          weight?: number | null;
          price?: number | null;
          quality?: string | null;
          notes?: string | null;
          photos?: string[] | null;
          quantity?: number | null;
          size?: string | null;
          unit_price?: number | null;
          bead_price?: number | null;
          estimated_bead_count?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          supplier?: string;
          crystal_type?: string;
          weight?: number | null;
          price?: number | null;
          quality?: string | null;
          notes?: string | null;
          photos?: string[] | null;
          quantity?: number | null;
          size?: string | null;
          unit_price?: number | null;
          bead_price?: number | null;
          estimated_bead_count?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          user_id: string | null;
          product_name: string;
          category: string | null;
          raw_material: string | null;
          weight: number | null;
          size: string | null;
          craft_time: number | null;
          cost: number | null;
          selling_price: number | null;
          status: string | null;
          description: string | null;
          photos: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          product_name: string;
          category?: string | null;
          raw_material?: string | null;
          weight?: number | null;
          size?: string | null;
          craft_time?: number | null;
          cost?: number | null;
          selling_price?: number | null;
          status?: string | null;
          description?: string | null;
          photos?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          product_name?: string;
          category?: string | null;
          raw_material?: string | null;
          weight?: number | null;
          size?: string | null;
          craft_time?: number | null;
          cost?: number | null;
          selling_price?: number | null;
          status?: string | null;
          description?: string | null;
          photos?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// 创建Supabase客户端
let supabase: ReturnType<typeof createClient<Database>> | null = null;
let supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

console.log('🔧 开始初始化Supabase客户端...');

if (isSupabaseConfigured()) {
  console.log('✅ Supabase配置检查通过，开始创建客户端');
  
  // 简化的客户端配置
  const clientOptions = {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  };
  
  // 普通客户端，使用anon key
  supabase = createClient<Database>(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    clientOptions
  );
  console.log('✅ Supabase客户端创建成功');
  
  // Admin客户端，使用service role key
  if (supabaseConfig.serviceRoleKey) {
    supabaseAdmin = createClient<Database>(
      supabaseConfig.url,
      supabaseConfig.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    console.log('✅ Supabase Admin客户端创建成功');
  }
} else {
  console.error('❌ Supabase配置检查失败，无法创建客户端');
}



export { supabase, supabaseAdmin };

// 检查Supabase是否已配置
export const isSupabaseReady = () => {
  return supabase !== null;
};

// 检查Supabase Admin是否已配置
export const isSupabaseAdminReady = () => {
  const isReady = supabaseAdmin !== null;
  console.log('🔍 检查Supabase Admin状态:', {
    isReady,
    hasServiceRoleKey: !!supabaseConfig.serviceRoleKey,
    supabaseAdminExists: supabaseAdmin !== null
  });
  return isReady;
};

// 获取当前用户
export const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// 登录
export const signIn = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase未配置');
  return await supabase.auth.signInWithPassword({ email, password });
};

// 注册
export const signUp = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase未配置');
  return await supabase.auth.signUp({ email, password });
};

// 登出
export const signOut = async () => {
  if (!supabase) throw new Error('Supabase未配置');
  return await supabase.auth.signOut();
};

// 上传图片到存储桶
export const uploadPhoto = async (file: File, path: string) => {
  if (!supabase) throw new Error('Supabase未配置');
  
  const { data, error } = await supabase.storage
    .from('crystal-photos')
    .upload(path, file);
  
  if (error) throw error;
  
  // 获取公共URL
  const { data: { publicUrl } } = supabase.storage
    .from('crystal-photos')
    .getPublicUrl(path);
  
  return publicUrl;
};

// 删除图片
export const deletePhoto = async (path: string) => {
  if (!supabase) throw new Error('Supabase未配置');
  
  const { error } = await supabase.storage
    .from('crystal-photos')
    .remove([path]);
  
  if (error) throw error;
};

// ===== Admin 功能 =====

// 创建用户（Admin功能）
export const createUser = async (email: string, password: string, userData?: { username?: string; full_name?: string; role?: string }) => {
  if (!supabaseAdmin) throw new Error('Supabase Admin未配置');
  
  // 使用Admin客户端创建用户
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true // 自动确认邮箱
  });
  
  if (error) throw error;
  
  // 如果提供了用户数据，创建用户档案
  if (data.user && userData) {
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: data.user.id,
        username: userData.username || null,
        full_name: userData.full_name || null,
        role: userData.role || 'user'
      });
    
    if (profileError) {
      console.error('创建用户档案失败:', profileError);
    }
  }
  
  return data;
};

// 获取所有用户（Admin功能）
export const getAllUsers = async () => {
  if (!supabaseAdmin) throw new Error('Supabase Admin未配置');
  
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error) throw error;
  return data;
};

// 重置用户密码（Admin功能）
export const resetUserPassword = async (userId: string, newPassword: string) => {
  if (!supabaseAdmin) throw new Error('Supabase Admin未配置');
  
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword
  });
  
  if (error) throw error;
  return data;
};

// 根据邮箱查找用户（Admin功能）
export const getUserByEmail = async (email: string) => {
  if (!supabaseAdmin) throw new Error('Supabase Admin未配置');
  
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error) throw error;
  
  const user = data.users.find((u: any) => u.email === email);
  return user || null;
};