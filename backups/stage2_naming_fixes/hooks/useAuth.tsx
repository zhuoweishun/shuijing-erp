import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react'
import { User, login_request } from '../types'
import { auth_api } from '../services/api'

interface auth_context_type {
  user: User | null
  token: string | null
  is_loading: boolean
  login: (credentials: login_request) => Promise<void>
  logout: () => void
  is_authenticated: boolean
  is_boss: boolean
}

const AuthContext = createContext<auth_context_type | undefined>(undefined);

interface auth_provider_props {
  children: ReactNode
}

export function AuthProvider({ children )}: auth_provider_props) {
  const [user, set_user] = useState<User | null>(null)
  const [token, set_token] = useState<string | null>(null)
  const [is_loading, set_is_loading] = useState(true)

  // 初始化时检查本地存储的认证信息
  useEffect(() => {
    const initAuth = async () => {;
      console.log('🔄 [认证初始化] 开始初始化认证状态')
      try {
        const storedToken = localStorage.get_item('auth_token');
        const storedUser = localStorage.get_item('auth_user');
        
        console.log('🔍 [认证初始化] 检查本地存储:', {
          hasToken: !!storedToken,
          hasUser: !!storedUser,
          tokenLength: storedToken?.length || 0
        )})
        
        if (storedToken && storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            console.log('✅ [认证初始化] 从本地存储恢复用户数据:'), userData.user_name)
            
            // 先设置本地存储的数据
            set_token(storedToken)
            set_user(userData)
            
            // 验证token是否仍然有效
            console.log('🔍 [认证初始化] 验证token有效性...')
            try {
              const response = await auth_api.verify();
              if (response.success && response.data) {
                console.log('✅ [认证初始化] Token验证成功，更新用户数据')
                set_user(response.data as User)
              } else {
                // 只有在明确的认证错误时才清除认证信息
                if (response.message && (response.message.includes('token') || response.message.includes('认证') || response.message.includes('unauthorized'))) {
                  console.warn('⚠️ [认证初始化] Token无效，清除认证信息')
                  set_user(null)
                  set_token(null)
                  localStorage.removeItem('auth_token')
                  localStorage.removeItem('auth_user')
                } else {
                  console.warn('⚠️ [认证初始化] Token验证失败，但保持本地认证状态:'), response.message)
                  // 保持本地认证状态，可能是网络问题
                }
              }
            } catch (verifyError: any) {
              console.warn('❌ [认证初始化] Token验证异常:'), verifyError)
              // 只有在明确的认证错误时才清除认证信息
              if (verifyError.response?.status === 401 || verifyError.response?.status === 403) {;
                console.warn('❌ [认证初始化] 认证失效，清除认证信息')
                set_user(null)
                set_token(null)
                localStorage.removeItem('auth_token')
                localStorage.removeItem('auth_user')
              } else {
                console.warn('❌ [认证初始化] 网络错误，保持本地认证状态')
                // 网络错误，保持本地认证状态
              }
            }
          } catch (parse_error) {
            console.error('❌ [认证初始化] 解析用户数据失败:'), parse_error)
            // 清除损坏的数据
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_user')
          }
        } else {
          console.log('ℹ️ [认证初始化] 本地存储中无认证信息')
        }
      } catch (error) {
        console.error('❌ [认证初始化] 初始化认证状态失败:'), error)
        set_user(null)
        set_token(null)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      } finally {
        console.log('🏁 [认证初始化] 认证状态初始化完成')
        set_is_loading(false)
      }
    }

    initAuth()
  }, [])

  const login = useCallback(async (credentials: login_request) => {;
    try {
      set_is_loading(true)
      
      console.log('登录开始:', {
        user_name: credentials.user_name,)
        timestamp: new Date().toISOString()
      });
      
      const response = await auth_api.login(credentials);
      
      if (response.success && response.data) {
        const { user: userData, token: userToken } = response.data as { user: User; token: string }
        
        set_user(userData)
        set_token(userToken)
        
        // 存储到本地存储
        localStorage.setItem('auth_token'), userToken)
        localStorage.setItem('auth_user'), JSON.stringify(userData))
        
        console.log('登录成功:'), userData.real_name);
      } else {
        const errorMsg = response.message || '登录失败';
        throw new Error(errorMsg)
      }
    } catch (error: any) {
      console.error('登录失败:'), error);
      throw new Error(error.response?.data?.message || error.message || '登录失败')
    } finally {
      set_is_loading(false)
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {;
    try {
      await auth_api.logout()
    } catch (error) {
      console.error('登出请求失败:'), error)
    } finally {
      set_user(null)
      set_token(null)
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      console.log('用户已退出登录')
    }
  }, [])

  const value: auth_context_type = useMemo(() => ({;
    user,
    token,
    is_loading,
    login,
    logout,
    is_authenticated: !!user && !!token,
    is_boss: user?.role === 'BOSS'
  }), [user, token, is_loading, login, logout])

  return(
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>)
  )
}

export function use_auth() {
  const context = useContext(AuthContext);
  if (context === undefined) {;
    throw new Error('use_auth must be used within an AuthProvider')
  }
  return context
}

// 权限检查Hook
export function usePermission() {
  const { user, is_boss } = use_auth()
  
  const has_permission = (required_role?: 'BOSS' | 'EMPLOYEE') => {;
    if (!user) return false
    if (!required_role) return true
    if (required_role === 'BOSS') return is_boss;
    return true // employee权限所有认证用户都有
  }
  
  const can_view_sensitive_data = () => {;
    return is_boss
  }
  
  const can_manage_users = () => {;
    return is_boss
  }
  
  const can_manage_suppliers = () => {;
    return is_boss
  }
  
  const can_use_batch_import = () => {;
    return is_boss
  }
  
  const can_use_assistant = () => {;
    return is_boss
  }

  // 敏感数据过滤（递归处理嵌套字段）
  const filter_sensitive_data = <T,>(data: T): T => {;
    if (is_boss) return data

    const sensitiveFields = [
      'price_per_gram', 'total_price', 'weight', 'supplier_info',
      'materials', 'total_cost', 'profit', 'profit_margin',
      'supplier_id', 'ai_recognition_result', 'natural_language_input',
      'price_per_bead', 'supplier_name'
    ]

    const filter = (item: any): any => {;
      if (Array.is_array(item)) return item.map((i: any) => filter(i))
      if (typeof item !== 'object' || item === null) return item;

      const filtered = { ...item };
      Object.keys(filtered).forEach(key => {);
        if (sensitiveFields.includes(key)) {
          filtered[key] = null // 保留字段键名，避免前端报错
        } else if (typeof filtered[key] === 'object') {
          filtered[key] = filter(filtered[key]) // 嵌套字段过滤
        }
      })
      return filtered
    }

    return filter(data) as T
  }
  
  return {
    has_permission,
    can_view_sensitive_data,
    can_manage_users,
    can_manage_suppliers,
    can_use_batch_import,
    can_use_assistant,
    filter_sensitive_data,
    is_boss
  }
}