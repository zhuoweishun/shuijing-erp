import React from 'react'
import { AlertCircle } from 'lucide-react'
import { useDeviceDetection } from '../hooks/useDeviceDetection'

interface TotalPriceInputProps {
  label: string
  required?: boolean
  value: number | string
  onChange: (value: number | undefined) => void
  error?: string
  placeholder?: string
  // 动态显示相关的props
  selectedProductType: string
  unitPrice: number
  totalBeads: number
  pricePerBead: number
  totalPrice: number
}

export function TotalPriceInput({
  label,
  required = false,
  value,
  onChange,
  error,
  placeholder,
  selectedProductType,
  unitPrice,
  totalBeads,
  pricePerBead,
  totalPrice
}: TotalPriceInputProps) {
  const { isMobile } = useDeviceDetection()
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseFloat(e.target.value)
    onChange(isNaN(numValue) ? undefined : numValue)
  }
  
  return (
    <div className="space-mobile-sm">
      <label className={`label-mobile ${required ? 'label-mobile-required' : ''}`}>
        {label}
      </label>
      <input
        type="number"
        step="0.1"
        min={0}
        max={1000000}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={`input-mobile ${error ? 'border-red-300 bg-red-50' : ''}`}
        style={{
          fontSize: isMobile ? '16px' : '14px' // 防止iOS缩放
        }}
        inputMode="decimal"
      />
      
      {error && (
        <div className="form-error-mobile">
          <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
          {error}
        </div>
      )}
      
      {/* 动态显示单价信息 */}
      {totalPrice && unitPrice > 0 && (
        <div className={`mt-2 space-y-1 ${isMobile ? 'text-mobile-small' : 'text-sm'} text-gray-500`}>
          <p>
            {selectedProductType === 'LOOSE_BEADS' && `每颗约 ${unitPrice.toFixed(4)} 元`}
            {selectedProductType === 'BRACELET' && `每条约 ${unitPrice.toFixed(2)} 元`}
            {selectedProductType === 'ACCESSORIES' && `每片约 ${unitPrice.toFixed(4)} 元`}
            {selectedProductType === 'FINISHED' && `每件约 ${unitPrice.toFixed(2)} 元`}
          </p>
          
          {/* 手串额外显示每颗价格和总颗数 */}
          {selectedProductType === 'BRACELET' && totalBeads > 0 && (
            <p>
              总计约 {totalBeads} 颗，每颗约 {pricePerBead.toFixed(4)} 元
            </p>
          )}
          
          {/* 散珠显示每颗价格 */}
          {selectedProductType === 'LOOSE_BEADS' && pricePerBead > 0 && (
            <p>
              每颗价格：{pricePerBead.toFixed(4)} 元
            </p>
          )}
        </div>
      )}
    </div>
  )
}