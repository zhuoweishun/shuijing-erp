import React, { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { useDeviceDetection } from '../hooks/useDeviceDetection'

// 移动端优化的表单容器
interface MobileFormProps {
  children: ReactNode
  className?: string
  on_submit?: (e: React.FormEvent) => void
}

export function MobileForm({ children, className = '', on_submit }: MobileFormProps) {
  const { isMobile } = useDeviceDetection()
  
  return (
    <form 
      onSubmit={on_submit}
      className={`space-mobile-lg ${isMobile ? 'pb-20' : ''} ${className}`}
    >
      {children}
    </form>
  )
}

// 移动端优化的输入框
interface MobileInputProps {
  label: string
  required?: boolean
  error?: string
  type?: 'text' | 'number' | 'email' | 'tel' | 'password'
  placeholder?: string
  value?: string | number
  on_change?: (e: React.ChangeEvent<HTMLInputElement>) => void
  on_blur?: (e: React.FocusEvent<HTMLInputElement>) => void
  step?: string
  min?: string | number
  max?: string | number
  disabled?: boolean
  auto_complete?: string
  input_mode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
}

export function MobileInput({
  label,
  required = false,
  error,
  type = 'text',
  placeholder,
  value,
  on_change,
  on_blur,
  step,
  min,
  max,
  disabled = false,
  auto_complete,
  input_mode
}: MobileInputProps) {
  const { isMobile } = useDeviceDetection()
  
  return (
    <div className="space-mobile-sm">
      <label className={`label-mobile ${required ? 'label-mobile-required' : ''}`}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={on_change}
        onBlur={on_blur}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        autoComplete={auto_complete}
        inputMode={input_mode}
        className={`input-mobile ${error ? 'border-red-300 bg-red-50' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{
          fontSize: isMobile ? '16px' : '14px' // 防止iOS缩放
        }}
      />
      {error && (
        <div className="form-error-mobile">
          <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}

// 移动端优化的选择框
interface MobileSelectProps {
  label: string
  required?: boolean
  error?: string
  value?: string
  on_change?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
}

export function MobileSelect({
  label,
  required = false,
  error,
  value,
  on_change,
  options,
  placeholder,
  disabled = false
}: MobileSelectProps) {
  return (
    <div className="space-mobile-sm">
      <label className={`label-mobile ${required ? 'label-mobile-required' : ''}`}>
        {label}
      </label>
      <select
        value={value}
        onChange={on_change}
        disabled={disabled}
        className={`select-mobile ${error ? 'border-red-300 bg-red-50' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <div className="form-error-mobile">
          <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}

// 移动端优化的文本域
interface MobileTextareaProps {
  label: string
  required?: boolean
  error?: string
  placeholder?: string
  value?: string
  on_change?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  rows?: number
  disabled?: boolean
  maxLength?: number
}

export function MobileTextarea({
  label,
  required = false,
  error,
  placeholder,
  value,
  on_change,
  rows = 4,
  disabled = false,
  maxLength
}: MobileTextareaProps) {
  const { isMobile } = useDeviceDetection()
  
  return (
    <div className="space-mobile-sm">
      <label className={`label-mobile ${required ? 'label-mobile-required' : ''}`}>
        {label}
      </label>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={on_change}
        rows={rows}
        disabled={disabled}
        maxLength={maxLength}
        className={`textarea-mobile ${error ? 'border-red-300 bg-red-50' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{
          fontSize: isMobile ? '16px' : '14px', // 防止iOS缩放
          minHeight: isMobile ? '120px' : '100px'
        }}
      />
      <div className="flex justify-between items-center">
        {error && (
          <div className="form-error-mobile">
            <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
            {error}
          </div>
        )}
        {maxLength && (
          <div className="text-mobile-small ml-auto">
            {value?.length || 0}/{maxLength}
          </div>
        )}
      </div>
    </div>
  )
}

// 移动端优化的按钮
interface MobileButtonProps {
  children: ReactNode
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  on_click?: (e: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
  fullWidth?: boolean
}

export function MobileButton({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  on_click,
  className = '',
  fullWidth = false
}: MobileButtonProps) {
  const baseClasses = 'btn-mobile touch-feedback'
  const variantClasses = {
    primary: 'btn-mobile-primary',
    secondary: 'btn-mobile-secondary',
    danger: 'btn-mobile-danger',
    ghost: 'btn-ghost'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-3 text-base min-h-[44px]',
    lg: 'px-6 py-4 text-lg min-h-[52px]'
  }
  
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={on_click}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading ? (
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          <span>处理中...</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
}

// 移动端优化的表单组
interface MobileFormGroupProps {
  title: string
  children: ReactNode
  className?: string
}

export function MobileFormGroup({ title, children, className = '' }: MobileFormGroupProps) {
  return (
    <div className={`card-mobile space-mobile ${className}`}>
      <h3 className="text-mobile-subtitle mb-4">{title}</h3>
      {children}
    </div>
  )
}

// 移动端优化的表单行
interface MobileFormRowProps {
  children: ReactNode
  columns?: 1 | 2
  className?: string
}

export function MobileFormRow({ children, columns = 1, className = '' }: MobileFormRowProps) {
  const gridClass = columns === 1 ? 'grid-mobile-1' : 'grid-mobile-2'
  
  return (
    <div className={`${gridClass} ${className}`}>
      {children}
    </div>
  )
}