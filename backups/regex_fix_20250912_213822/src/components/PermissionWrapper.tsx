import React from 'react'
import { use_auth } from '../hooks/useAuth'

interface Permission_wrapper_props {
  children: React.ReactNode;
  allowed_roles: ('BOSS' | 'EMPLOYEE')[];
  fallback?: React.ReactNode;
  hide_for_employee?: boolean;
  class_name?: string;
}

const Permission_wrapper: React.FC<Permission_wrapper_props> = ({
  children,
  allowed_roles,
  fallback = null,
  hide_for_employee = false,
  class_name = ''
}) => {
  const { user } = use_auth()

  if (!user || !allowed_roles.includes(user.role)) {
    return fallback
  }
  
  if (hide_for_employee && user.role === 'EMPLOYEE') {
    return <span className={`text-gray-400 ${class_name}`}>***</span>
  }

  // 直接返回children，避免在表格中产生无效的DOM结构
  return <>{children}</>
}

export default Permission_wrapper