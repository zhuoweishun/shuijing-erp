import React from 'react'
import { Package, Gem, Sparkles, Star } from 'lucide-react'

// 产品类型枚举
export type ProductType = 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED'
export type UnitType = 'PIECES' | 'STRINGS' | 'SLICES' | 'ITEMS'

// Tab选项配置
interface TabOption {
  id: ProductType
  label: string
  icon: React.ComponentType<{ className?: string }>
  unit_type: UnitType
  description: string
}

const tabOptions: TabOption[] = [
  {
    id: 'LOOSE_BEADS',
    label: '散珠',
    icon: Gem,
    unit_type: 'PIECES',
    description: '按颗计量的散装珠子'
  },
  {
    id: 'BRACELET',
    label: '手串',
    icon: Package,
    unit_type: 'STRINGS',
    description: '按条计量的成串珠子'
  },
  {
    id: 'ACCESSORIES',
    label: '饰品配件',
    icon: Sparkles,
    unit_type: 'SLICES',
    description: '按片计量的隔片等配件'
  },
  {
    id: 'FINISHED',
    label: '成品',
    icon: Star,
    unit_type: 'ITEMS',
    description: '按件计量的成品手串'
  }
]

interface ProductTypeTabProps {
  selected_type: ProductType
  onTypeChange: (type: ProductType, unit_type: UnitType) => void
  className?: string
}

export default function ProductTypeTab({ selected_type, onTypeChange, className = '' }: ProductTypeTabProps) {
  return (
    <div className={`w-full ${className}`}>
      {/* Tab标题 */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">产品类型</h3>
        <p className="text-sm text-gray-500">选择要录入的产品类型，不同类型有不同的录入字段</p>
      </div>
      
      {/* Tab按钮组 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-1 bg-gray-50 rounded-xl border border-gray-200">
        {tabOptions.map((option) => {
          const Icon = option.icon
          const isSelected = selected_type === option.id
          
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onTypeChange(option.id, option.unit_type)}
              className={`
                relative flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-200
                ${isSelected 
                  ? 'bg-white text-gray-800 shadow-sm border border-gray-200' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }
                focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2
                min-h-[80px] group
              `}
            >
              {/* 图标 */}
              <Icon className={`h-5 w-5 mb-2 transition-colors ${
                isSelected ? 'text-gray-700' : 'text-gray-500 group-hover:text-gray-700'
              }`} />
              
              {/* 标签 */}
              <span className={`text-sm font-medium transition-colors ${
                isSelected ? 'text-gray-800' : 'text-gray-600 group-hover:text-gray-800'
              }`}>
                {option.label}
              </span>
              
              {/* 选中指示器 */}
              {isSelected && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-gray-700 rounded-full" />
              )}
            </button>
          )
        })}
      </div>
      
      {/* 当前选中类型的描述 */}
      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-600 rounded-full" />
          <span className="text-sm text-gray-600">
            {tabOptions.find(option => option.id === selected_type)?.description}
          </span>
        </div>
      </div>
    </div>
  )
}

// 导出类型定义供其他组件使用
export { tabOptions }
export type { TabOption }