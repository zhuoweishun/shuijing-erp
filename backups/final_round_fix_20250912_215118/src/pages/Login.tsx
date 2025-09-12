import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Gem, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { login_request } from '../types'

export default function Login() {
  const [user_name, set_user_name] = useState('')
  const [pass_word, set_pass_word] = useState('')
  const [show_password, set_show_password] = useState(false)
  const [isLoading, set_is_loading] = useState(false)
  const [error_message, set_error_message] = useState('')
  const [error_messages, set_error_messages] = useState({ user_name: '', password: '' })
  
  const { login, is_authenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // 使用useMemo稳定化from值，避免location对象变化导致的无限循环
  const from = useMemo(() => {
    return (location.state as any)?.from || '/'
  }, [location.state])

  // 稳定化navigate函数
  const stable_navigate = useCallback((to: string, options?: any) => {
    navigate(to, options)
  }, [navigate])

  // 如果已经登录，重定向到目标页面
  useEffect(() => {
    if (is_authenticated) {
      stable_navigate(from, { replace: true })
    }
  }, [is_authenticated, stable_navigate, from])



  // 简单的表单验证
  const validate_form = () => {
    const newErrors = { user_name: '', password: '' }
    
    if (!user_name.trim()) {
      newErrors.user_name = '请输入用户名'
    } else if (user_name.trim().length < 2) {
      newErrors.user_name = '用户名至少2个字符'
    }
    
    if (!pass_word) {
      newErrors.password = '请输入密码'
    } else if (pass_word.length < 6) {
      newErrors.password = '密码至少6个字符'
    }
    
    set_error_messages(newErrors)
    return !newErrors.user_name && !newErrors.password
  }

  const handle_submit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate_form()) return
    
    try {
      set_is_loading(true)
      set_error_message('')
      
      const login_request: login_request = {
        user_name: user_name.trim(),
        password: pass_word
      }
      
      await login(login_request)
    } catch (err: any) {
      set_error_message(err.message || '登录失败，请重试')
    } finally {
      set_is_loading(false)
    }
  }

  const toggle_password_visibility = () => {
    set_show_password(!show_password)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-crystal-50 to-crystal-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo和标题 */}
        <div className="text-center">
          <div className="flex justify-center">
            <Gem className="h-16 w-16 text-crystal-500" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            水晶ERP系统
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            专业的水晶珠宝库存管理系统
          </p>
        </div>


        {/* 登录表单 */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <form className="space-y-6" on_submit={handle_submit}>
            {/* 错误提示 */}
            {error_message && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-600">{error_message}</p>
              </div>
            )}
            


            {/* 用户名输入 */}
            <div>
              <label htmlFor="user_name" className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <input
                id="user_name"
                type="text"
                autoComplete="user_name"
                value={user_name}
                onChange={(e) => set_user_name(e.target.value)}
                className={`input-apple ${
                  error_messages.user_name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                }`}
                placeholder="请输入用户名"
              />
              {error_messages.user_name && (
                <p className="mt-1 text-sm text-red-600">{error_messages.user_name}</p>
              )}
            </div>

            {/* 密码输入 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={show_password ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={pass_word}
                  onChange={(e) => set_pass_word(e.target.value)}
                  className={`input-apple pr-10 ${
                    error_messages.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={toggle_password_visibility}
                >
                  {show_password ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {error_messages.password && (
                <p className="mt-1 text-sm text-red-600">{error_messages.password}</p>
              )}
            </div>

            {/* 登录按钮 */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>登录中...</span>
                  </>
                ) : (
                  <span>登录</span>
                )}
              </button>
            </div>
          </form>

          {/* 测试账号提示 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">测试账号</p>
              <div className="space-y-1 text-xs text-gray-400">
                <div>老板账号: boss / 123456</div>
                <div>雇员账号: employee / 123456</div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="text-center text-xs text-gray-500">
          <p>© 2024 水晶ERP系统. 保留所有权利</p>
        </div>
      </div>
    </div>
  )
}
