import React from 'react'
import { useAuth } from '../hooks/useAuth';

interface PermissionWrapperProps {
  children: React.ReactNode, allowed_roles: ('BOSS' | 'EMPLOYEE')[]
  fallback?: React.ReactNode
  hide_for_employee?: boolean
  class_name?: string
}

const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  children,
  allowed_roles,
  fallback = null,
  hide_for_employee = false,
  class_name = ''
}) => {
  const { user } = useAuth()

  if (!user || !allowed_roles.includes(user.role)) {
    return fallback
  }
  
  if (hide_for_employee && user.role === 'EMPLOYEE') {
    return <span className={`text-gray-400 ${class_name}`}>***</span>
  }

  // 直接返回children，避免在表格中产生无效的DOM结构
  return <>{children}</>
}

export default PermissionWrapper