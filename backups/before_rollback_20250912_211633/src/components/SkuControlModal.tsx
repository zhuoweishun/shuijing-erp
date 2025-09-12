import { useState, useEffect } from 'react';
import { X, Settings, DollarSign, ToggleLeft, ToggleRight, AlertTriangle, Clock } from 'lucide-react';
import { sku_item } from '../types';
import { format_amount } from '../utils/format';
import { sku_api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface SkuControlModalProps {
  sku: SkuItem, is_open: boolean, onClose: () => void, onSuccess: () => void
},
interface PriceFormData { new_price: string, reason: string },
interface StatusFormData {
  newStatus: 'ACTIVE' | 'INACTIVE'
  reason: string
},
interface OperationLog {
  id: string, action: string, quantity_change: number, quantity_before: number, quantity_after: number, reference_type: string, notes: string, created_at: string, user: {
    id: string, user_name: string, name: string
  }
},
export default function SkuControlModal({
  sku,
  is_open,
  onClose,
  onSuccess)): any) {
  const [active_tab, setActiveTab] = useState<'price' | 'status' | 'logs'>('price')
  const [priceForm, setPriceForm] = useState<PriceFormData>({
    new_price: sku.selling_price?.toString() || sku.unit_price?.toString() || '0',
    reason: ''
  })
  const [statusForm, setStatusForm] = useState<StatusFormData>({
    newStatus: sku.status as 'ACTIVE' | 'INACTIVE',
    reason: ''
  ))
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({))
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({))
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState<string | null>(null)
  const { is_boss } = use_auth()

  // 获取操作日志;
const fetch_operation_logs = async () => {
    if (!sku.sku_id && !sku.id) return;
setLogsLoading(true)
    setLogsError(null)
    try {
      const response = await sku_api.get_history(sku.sku_id || sku.id, { page: 1, limit: 50 ));
      if (response.success) {
        // 过滤出调价和状态管理相关的日志;
const filtered_logs = (response.data, as { logs: OperationLog[] )).logs.filter((log: OperationLog) => ;
          log.notes && (
            log.notes.includes('调整售价') || 
            log.notes.includes('状态变更') ||
            log.notes.includes('价格') ||
            log.notes.includes('状态')
          )
        )
        setOperationLogs(filtered_logs)
      } else {
        setLogsError(response.message || '获取操作日志失败')
      }
    } catch (error) {
      console.error('获取操作日志失败:', error)
      setLogsError('获取操作日志失败，请重试')
    } finally {
      setLogsLoading(false)
    }
  }
  // 当弹窗打开且切换到日志标签页时获取日志;
useEffect(() => {
    if (is_open && active_tab === 'logs') {
      fetch_operation_logs()
    }
  }, [is_open, active_tab, sku.sku_id, sku.id])

  if (!is_open) return null

  // 计算利润率;
const calculate_profit_margin = (selling_price: number, total_cost: number): number => {
    if (total_cost <= 0) return 0;
return ((selling_price - total_cost) / selling_price) * 100
  }
  // 验证价格表单;
const validate_price_form = (): boolean => {
    const, newErrors: Record<string, string> = {},
    const price = parseFloat(priceForm.new_price)
    if (isNaN(price) || price <= 0) {
      newErrors.new_price = '请输入有效的价格'
    },
    if (!priceForm.reason.trim()) {
      newErrors.reason = '请输入调价原因'
    },
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  // 验证状态表单;
const validate_status_form = (): boolean => {
    const, newErrors: Record<string, string> = {},
    if (!statusForm.reason.trim()) {
      newErrors.status_reason = '请输入状态变更原因'
    },
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  // 处理价格更新;
const handle_price_update = async () => {
    if (!validate_price_form()) return;
setloading(true)
    try {
      const new_price = parseFloat(priceForm.new_price },
      const response = await sku_api.control(sku.sku_id || sku.id, {
        type: 'price',
        new_price,
        reason: priceForm.reason
      ))
      
      if (response.success) {
        setPriceForm({ new_price: '', reason: '' )))
        setErrors({))
        onSuccess()
        onClose()
      } else {
        setErrors({ submit: response.message || '价格更新失败' )))
      }
    } catch (error) {
      console.error('价格更新失败:', error)
      setErrors({ submit: '价格更新失败，请重试' )))
    } finally {
      setloading(false)
    }
  }
  // 处理状态更新;
const handle_status_update = async () => {
    if (!validate_status_form()) return;
setloading(true)
    try {
      const response = await sku_api.control(sku.sku_id || sku.id, {
        type: 'status',
        newStatus: statusForm.newStatus,
        reason: statusForm.reason
      ))
      
      if (response.success) {
        setStatusForm({ newStatus: sku.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE', reason: '' )));
         setStatusErrors({))
         onSuccess()
         onClose()
       } else {
         setStatusErrors({ submit: response.message || '状态更新失败' )))
      }
    } catch (error) {
       console.error('状态更新失败:', error)
       setStatusErrors({ submit: '状态更新失败，请重试' )))
     } finally {
      setloading(false)
    }
  },
  const current_price = parseFloat(sku.selling_price?.toString() || sku.unit_price?.toString() || '0');
  const new_price = parseFloat(priceForm.new_price) || 0
  // 使用SKU配方成本：material_cost + labor_cost + craft_cost;
const recipe_cost = (parseFloat(sku.material_cost?.toString() || '0') + ;
                      parseFloat(sku.labor_cost?.toString() || '0') + 
                      parseFloat(sku.craft_cost?.toString() || '0'))
  const current_profit_margin = calculate_profit_margin(current_price, recipe_cost);
  const new_profit_margin = calculate_profit_margin(new_price, recipe_cost);

  if (!is_boss) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center, sm:block, sm:p-0">
          <div className="fixed inset-0 transition-opacity bg-black bg-opacity-50" onClick={onClose} />
          <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                权限不足
              </h3>
              <button onClick={onClose} className="text-gray-400, hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">只有BOSS角色可以使用SKU调控功能。</p>
            <div className="flex justify-end">
              <button className="btn-primary">
                onClick={onClose},
                className},
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center, sm:block, sm:p-0">
        {/* 背景遮罩 */}
        <div className="fixed inset-0 transition-opacity bg-black bg-opacity-50" onClick={onClose} />
        
        {/* 弹窗内容 */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg max-h-[90vh] overflow-y-auto">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Settings className="h-5 w-5 mr-2" />;
              SKU调控 - {sku.sku_name}</h3>
            <button onClick={onClose} className="text-gray-400, hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* SKU基本信息 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2, md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">SKU编号:</span>
                <div className="font-medium">{sku.sku_code || sku.sku_number}</div>
              </div>
              <div>
                <span className="text-gray-600">当前库存:</span>
                <div className="font-medium text-green-600">{sku.available_quantity} 件</div>
              </div>
              <div>
                <span className="text-gray-600">当前售价:</span>
                <div className="font-medium">{format_amount(current_price}</div>
              </div>
              <div>
                <span className="text-gray-600">当前状态:</span>
                <div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${\n                    sku.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {sku.status === 'ACTIVE' ? '活跃' : '停用'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 标签页导航 */);
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button className="btn-primary">
                onClick={() => setActiveTab('price')
                className}`}\n              >
                <DollarSign className="h-4 w-4 inline mr-2" />
                调整售价
              </button>
              
              <button className="btn-primary">
                onClick={() => setActiveTab('status')
                className}`}
              >
                <ToggleLeft className="h-4 w-4 inline mr-2" />
                状态管理
              </button>
              
              <button className="btn-primary">
                onClick={() => setActiveTab('logs')
                className}`}\n              >
                <Clock className="h-4 w-4 inline mr-2" />
                操作日志
              </button>
            </nav>
          </div>

          {/* 标签页内容 */}, {active_tab === 'price' && (
            <div className="space-y-6">
              {/* 价格调整表单 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  新售价 *
                </label>
                <div className="relative">
                  <input;
type="number"
                    step="0.01"
                    min="0"
                    value={priceForm.new_price);
                    onChange={(e) => setPriceForm({ ...price_form, new_price: e.target.value )))},
                    className}`},
                    placeholder;
                )}</div>

              {/* 利润率对比 */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-3">利润率对比</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">当前利润率:</span>
                    <div className="font-medium text-blue-900">{current_profit_margin.toFixed(2)%</div>
                  </div>
                  <div>
                    <span className="text-blue-700">调整后利润率:</span>
                    <div className={`font-medium ${\n                      new_profit_margin > current_profit_margin ? 'text-green-600' : null;
new_profit_margin < current_profit_margin ? 'text-red-600' : 'text-blue-900'
                    }`}>
                      {new_profit_margin.toFixed(2)%
                      {new_profit_margin !== current_profit_margin && (
                        <span className="ml-1 text-xs">
                          ({new_profit_margin > current_profit_margin ? '+' : ''){(new_profit_margin - current_profit_margin).toFixed(2)%)
                        </span>
                      )}</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  配方成本: {format_amount(recipe_cost} | 价格变化: {format_amount(new_price - current_price}</div>
              </div>

              {/* 调价原因 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  调价原因 *
                </label>
                <textarea;
value={priceForm.reason);
                  onChange={(e) => setPriceForm({ ...price_form, reason: e.target.value )))},
                  className}`}\n                  rows={3},
                  placeholder;
                )}</div>

              {/* 价格调整按钮 */}
              <div className="flex justify-end space-x-3">
                <button className="btn-primary">
                  onClick={onClose},
                  classNameonClick={handle_price_update},
                  disabled={loading},
                  className;
                  {loading ? '更新中...' : '确认调价'}</button>
              </div>
            </div>
          }) {active_tab === 'status' && (
            <div className="space-y-6">
              {/* 状态切换 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">;
                  SKU状态
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input;
type="radio"
                      name="status"
                      value="ACTIVE"
                      checked={statusForm.newStatus === 'ACTIVE');
                      onChange={(e) => setStatusForm({ ...status_form, newStatus: e.target.value, as 'ACTIVE' | 'INACTIVE' )))},
                      classNametype="radio"
                      name="status"
                      value="INACTIVE"
                      checked={statusForm.newStatus === 'INACTIVE'},
                      onChange={(e) => setStatusForm({ ...status_form, newStatus: e.target.value, as 'ACTIVE' | 'INACTIVE' )))},
                      className;
              {/* 状态变更原因 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  变更原因 *
                </label>
                <textarea;
value={statusForm.reason},
                  onChange={(e) => setStatusForm({ ...status_form, reason: e.target.value )))},
                  className}`},
                  rows={3},
                  placeholder;
                )}</div>

              {/* 状态变更按钮 */}
              <div className="flex justify-end space-x-3">
                <button className="btn-primary">
                  onClick={onClose},
                  classNameonClick={handle_status_update},
                  disabled={loading},
                  className;
                  {loading ? '更新中...' : '确认变更'}</button>
              </div>
            </div>
          }) {active_tab === 'logs' && (
            <div className="space-y-4">
              {/* 日志标题 */}
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">调价和状态管理操作记录</h4>
                <button className="btn-primary">
                  onClick={fetch_operation_logs},
                  disabled={logs_loading},
                  className;
                  {logsLoading ? '刷新中...' : '刷新'}</button>
              </div>

              {/* 加载状态 */}, {logsLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">加载中...</span>
                </div>
              }, {/* 错误状态 */}, {logsError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{logs_error}</p>
                </div>
              ))
      
      {/* 日志列表 */}, {!logsLoading && !logsError && (
                <div className="space-y-3">
                  {operationLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">暂无调价和状态管理操作记录</p>
                    </div>
                   : (
                    operationLogs.map((log) => (
                      <div key={log.id) className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${\n                                log.notes.includes('调整售价') || log.notes.includes('价格') 
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {log.notes.includes('调整售价') || log.notes.includes('价格') ? '调价' : '状态变更'}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(log.created_at).to_locale_string('zh-CN', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                ))</span>
                            </div>
                            <p className="text-sm text-gray-900 mb-1">{log.notes}</p>
                            <p className="text-xs text-gray-500">
                              操作人: {log.user.name || log.user.user_name}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}</div>
              )}</div>
          })
      
      {/* 错误提示 */}, {(errors.submit || statusErrors.submit) && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit || statusErrors.submit)</p>
            </div>
          )}</div>
      </div>
    </div>
  )
}