import { ReactNode, useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { use_device_detection } from '../hooks/use_device_detection'

// 表格列定义
interface TableColumn {
  key: string
  title: string
  width?: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  render?: (value: any, record: any, index: number) => ReactNode
  mobileRender?: (value: any, record: any, index: number) => ReactNode
  hideOnMobile?: boolean
  priority?: 'high' | 'medium' | 'low' // 移动端显示优先级
}

// 表格数据行
interface TableRecord {
  [key: string]: any
}

// 移动端表格属性
interface MobileTableProps {
  columns: TableColumn[]
  data: TableRecord[]
  loading?: boolean
  empty_text?: string
  onRowClick?: (record: TableRecord, index: number) => void
  rowKey?: string | ((record: TableRecord) => string)
  className?: string
  searchable?: boolean
  search_placeholder?: string
  onSearch?: (value: string) => void
  pagination?: {
    current: number
    total: number
    page_size: number
    onChange: (page: number) => void
  }
}

export function MobileTable({
  columns,
  data,
  loading = false,
  empty_text = '暂无数据',
  onRowClick,
  rowKey = 'id',
  className = '',
  searchable = false,
  search_placeholder = '搜索...',
  onSearch,
  pagination
}: MobileTableProps) {
  const { is_mobile } = use_device_detection()
  const [search_value, setSearchValue] = useState('')
  const [expanded_rows, setExpandedRows] = useState<Set<string>>(new Set())

  // 获取行的唯一标识
  const getRowKey = (record: TableRecord, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record)
    }
    return record[rowKey] || index.toString()
  }

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchValue(value)
    onSearch?.(value)
  }

  // 切换行展开状态
  const toggleRowExpansion = (key: string) => {
    const newExpanded = new Set(expanded_rows)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedRows(newExpanded)
  }

  // 移动端卡片式布局
  const renderMobileCards = () => {
    if (data.length === 0) {
      return (
        <div className="empty-state-mobile">
          <div className="text-mobile-body text-gray-500">{empty_text}</div>
        </div>
      )
    }

    return (
      <div className="space-mobile-sm">
        {data.map((record, index) => {
          const key = getRowKey(record, index)
          const isExpanded = expanded_rows.has(key)
          
          // 获取高优先级列（主要信息）
          const primaryColumns = columns.filter(col => 
            !col.hide_on_mobile && (col.priority === 'high' || !col.priority)
          )
          
          // 获取次要信息列
          const secondaryColumns = columns.filter(col => 
            !col.hide_on_mobile && col.priority === 'medium'
          )
          
          // 获取详细信息列
          const detailColumns = columns.filter(col => 
            !col.hide_on_mobile && col.priority === 'low'
          )

          return (
            <div
              key={key}
              className="card-mobile touch-feedback cursor-pointer"
              onClick={() => onRowClick?.(record, index)}
            >
              {/* 主要信息 */}
              <div className="space-mobile-xs">
                {primaryColumns.map((column) => {
                  const value = record[column.key]
                  const content = column.mobile_render 
                    ? column.mobile_render(value, record, index)
                    : column.render 
                    ? column.render(value, record, index)
                    : value

                  return (
                    <div key={column.key} className="flex justify-between items-start">
                      <span className="text-mobile-caption text-gray-500 min-w-0 flex-shrink-0 mr-3">
                        {column.title}
                      </span>
                      <span className="text-mobile-body font-medium text-right min-w-0 flex-1">
                        {content}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* 次要信息 */}
              {secondaryColumns.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-mobile-xs">
                  {secondaryColumns.map((column) => {
                    const value = record[column.key]
                    const content = column.mobile_render 
                      ? column.mobile_render(value, record, index)
                      : column.render 
                      ? column.render(value, record, index)
                      : value

                    return (
                      <div key={column.key} className="flex justify-between items-center">
                        <span className="text-mobile-small text-gray-400">
                          {column.title}
                        </span>
                        <span className="text-mobile-small text-gray-600">
                          {content}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 展开/收起详细信息 */}
              {detailColumns.length > 0 && (
                <>
                  <button
                    className="mt-3 flex items-center text-mobile-small text-blue-600 touch-feedback"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleRowExpansion(key)
                    }}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        收起详情
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-4 w-4 mr-1" />
                        查看详情
                      </>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-mobile-xs">
                      {detailColumns.map((column) => {
                        const value = record[column.key]
                        const content = column.mobile_render 
                          ? column.mobile_render(value, record, index)
                          : column.render 
                          ? column.render(value, record, index)
                          : value

                        return (
                          <div key={column.key} className="flex justify-between items-start">
                            <span className="text-mobile-small text-gray-400 min-w-0 flex-shrink-0 mr-3">
                              {column.title}
                            </span>
                            <span className="text-mobile-small text-gray-600 text-right min-w-0 flex-1">
                              {content}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // 桌面端/平板端表格布局
  const renderDesktopTable = () => {
    const visibleColumns = columns.filter(col => !col.hide_on_mobile || !is_mobile)

    return (
      <div className="table-container-mobile">
        <table className="table-mobile">
          <thead>
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width, textAlign: column.align || 'left' }}
                  className={column.sortable ? 'cursor-pointer hover:bg-gray-50' : ''}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="text-center py-8 text-gray-500">
                  {empty_text}
                </td>
              </tr>
            ) : (
              data.map((record, index) => {
                const key = getRowKey(record, index)
                return (
                  <tr
                    key={key}
                    className={onRowClick ? 'cursor-pointer hover:bg-gray-50 touch-feedback' : ''}
                    onClick={() => onRowClick?.(record, index)}
                  >
                    {visibleColumns.map((column) => {
                      const value = record[column.key]
                      const content = column.render 
                        ? column.render(value, record, index)
                        : value

                      return (
                        <td
                          key={column.key}
                          style={{ textAlign: column.align || 'left' }}
                          className="px-4 py-3 border-b border-gray-100"
                        >
                          {content}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className={`mobile-table-wrapper ${className}`}>
      {/* 搜索框 */}
      {searchable && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={search_placeholder}
              value={search_value}
              onChange={(e) => handleSearch(e.target.value)}
              className="input-mobile pl-10"
            />
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {loading ? (
        <div className="loading-state-mobile">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <div className="text-mobile-body text-gray-500 mt-2">加载中...</div>
        </div>
      ) : (
        // 根据设备类型渲染不同布局
        is_mobile ? renderMobileCards() : renderDesktopTable()
      )}

      {/* 分页 */}
      {pagination && data.length > 0 && (
        <div className="mt-6">
          <MobilePagination {...pagination} />
        </div>
      )}
    </div>
  )
}

// 移动端分页组件
interface MobilePaginationProps {
  current: number
  total: number
  page_size: number
  onChange: (page: number) => void
}

function MobilePagination({ current, total, page_size, onChange }: MobilePaginationProps) {
  const { is_mobile } = use_device_detection()
  const total_pages = Math.ceil(total / page_size)
  
  if (total_pages <= 1) return null

  const startItem = (current - 1) * page_size + 1
  const endItem = Math.min(current * page_size, total)

  if (is_mobile) {
    // 移动端简化分页
    return (
      <div className="flex items-center justify-between">
        <button
          disabled={current <= 1}
          onClick={() => onChange(current - 1)}
          className="btn-mobile-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          上一页
        </button>
        
        <span className="text-mobile-small text-gray-600">
          {startItem}-{endItem} / {total}
        </span>
        
        <button
          disabled={current >= total_pages}
          onClick={() => onChange(current + 1)}
          className="btn-mobile-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一页
        </button>
      </div>
    )
  }

  // 桌面端完整分页
  const getPageNumbers = () => {
    const pages = []
    const showPages = 5
    let start = Math.max(1, current - Math.floor(showPages / 2))
    let end = Math.min(total_pages, start + showPages - 1)
    
    if (end - start + 1 < showPages) {
      start = Math.max(1, end - showPages + 1)
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    return pages
  }

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-600">
        显示 {startItem}-{endItem} 条，共 {total} 条
      </div>
      
      <div className="flex items-center space-x-1">
        <button
          disabled={current <= 1}
          onClick={() => onChange(current - 1)}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          上一页
        </button>
        
        {getPageNumbers().map(page => (
          <button
            key={page}
            onClick={() => onChange(page)}
            className={`px-3 py-1 text-sm border rounded ${
              page === current 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}
        
        <button
          disabled={current >= total_pages}
          onClick={() => onChange(current + 1)}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一页
        </button>
      </div>
    </div>
  )
}

export { MobilePagination }