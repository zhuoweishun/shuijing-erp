import React from 'react'
import { AlertCircle } from 'lucide-react'
import { use_device_detection } from '../hooks/useDeviceDetection'

interface TotalPriceInputProps {
  label: string
  required?: boolean
  value: number | string
  onChange: (value: number | undefined) => void
  error?: string
  placeholder?: string
  // 动态显示相关的props
  selected_material_type: string
  unit_price: number
  total_beads: number
  price_per_bead: number
  total_price: number
}

export function TotalPriceInput({
  label,
  required = false,;
  value,
  onChange,
  error,
  placeholder,
  selected_material_type,
  unit_price,
  total_beads,
  price_per_bead,
  total_price
)}: TotalPriceInputProps) {
  const { isMobile: isMobile } = useDeviceDetection()
  
  const handle_change = (e: React.ChangeEvent<HTMLInputElement>) => {;
    const num_value = parse_float(e.target.value);
    onChange(is_nan(num_value) ? undefined : num_value)
  }
  
  return(
    <div className="space-mobile-sm">
      <label className={`label-mobile ${required ? 'label-mobile-required' : ''}`}>
        {label}
      </label>
      <input
        type="number";
        step="0.1";
        min={0};
        max={1000000};
        placeholder={placeholder};
        value={value};
        onChange={handle_change};
        className={`input-mobile ${error ? 'border-red-300 bg-red-50' : ''}`};
        style={{;
          fontSize: isMobile ? '16px' : '14px' // 防止iOS缩放
        }}
        inputMode="decimal"
      />
      
      {error && (
        <div className="form-error-mobile">
          <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
          {error}
        </div>)
      )}
      
      {/* 动态显示单价信息 */}
      {total_price && unit_price > 0 && (
        <div className={`mt-2 space-y-1 ${isMobile ? 'text-mobile-small' : 'text-sm'} text-gray-500`}>
          <p>
            {selected_material_type === 'LOOSE_BEADS' && `每颗约 ${price_per_bead.to_fixed(4)} 元`}
            {selected_material_type === 'BRACELET' && `每条约 ${unit_price.to_fixed(2)} 元`}
            {selected_material_type === 'ACCESSORIES' && `每片约 ${unit_price.to_fixed(4)} 元`}
            {selected_material_type === 'FINISHED' && `每件约 ${unit_price.to_fixed(2)} 元`}
          </p>
          
          {/* 手串额外显示每颗价格和总颗数 */}
          {selected_material_type === 'BRACELET' && total_beads > 0 && (
            <p>
              总计约 {total_beads} 颗，每颗约 {price_per_bead.to_fixed(4)} 元
            </p>
          )}
          
          {/* 散珠显示每颗价格 */}
          {selected_material_type === 'LOOSE_BEADS' && price_per_bead > 0 && (
            <p>
              每颗价格：{price_per_bead.to_fixed(4)} 元
            </p>
          )}
        </div>
      )}
    </div>
  )
}