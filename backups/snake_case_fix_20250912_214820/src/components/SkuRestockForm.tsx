import React, { useState, useEffect } from 'react'
import { X, Package, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { RestockData, RestockInfo, SkuItem } from '../types'
import { get_network_config } from '../utils/network'

interface SkuRestockFormProps {
  sku: SkuItem
  is_open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function SkuRestockForm({ sku, is_open, onClose, onSuccess }: SkuRestockFormProps) {
  const [formData, setFormData] = useState<RestockData>({
    quantity: 1
  })
  const [restockInfo, setRestockInfo] = useState<RestockInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [is_submitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  // 获取补货信息
  const fetchRestockInfo = async () => {
    if (!sku.id) return
    
    setIsLoading(true)
    setError('')
    
    try {
      const networkConfig = get_network_config()
      const response = await fetch(`${networkConfig.api_base_url}/api/v1/skus/${sku.id}/restock-info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.get_item('auth_token')}`
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setRestockInfo(result.data)
      } else {
        setError(result.message || '获取补货信息失败')
      }
    } catch (err) {
      console.error('获取补货信息失败:', err)
      setError('网络错误，请检查连接')
    } finally {
      setIsLoading(false)
    }
  }

  // 组件打开时获取补货信息
  useEffect(() => {
    if (is_open) {
      fetchRestockInfo()
      setFormData({ quantity: 1 })
      setShowConfirm(false)
      setError('')
    }
  }, [is_open, sku.id])

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!restockInfo?.can_restock) {
      setError('当前无法补货，请检查原材料库存')
      return
    }
    
    setShowConfirm(true)
  }

  // 确认补货操作
  const confirmRestock = async () => {
    setIsSubmitting(true)
    setError('')
    
    try {
      const networkConfig = get_network_config()
      const response = await fetch(`${networkConfig.api_base_url}/api/v1/skus/${sku.id}/restock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.get_item('auth_token')}`
        },
        body: JSON.stringify(formData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        onSuccess()
        onClose()
      } else {
        setError(result.message || '补货失败')
        setShowConfirm(false)
      }
    } catch (err) {
      console.error('补货失败:', err)
      setError('网络错误，请检查连接')
      setShowConfirm(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 计算总成本
  const calculateTotalCost = () => {
    if (!restockInfo) return 0
    
    const materialCost = restockInfo.required_materials.reduce((sum, material) => {
      return sum + (material.unitCost * material.quantityNeededPerSku * formData.quantity)
    }, 0)
    
    return materialCost + (restockInfo.labor_cost * formData.quantity) + (restockInfo.craft_cost * formData.quantity)
  }

  if (!is_open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5" />
            SKU补货
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* SKU信息 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">SKU信息</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">SKU编码：</span>
                <span className="font-medium">{sku.sku_code}</span>
              </div>
              <div>
                <span className="text-gray-500">SKU名称：</span>
                <span className="font-medium">{sku.sku_name}</span>
              </div>
              <div>
                <span className="text-gray-500">当前库存：</span>
                <span className="font-medium">{sku.available_quantity} 件</span>
              </div>
              <div>
                <span className="text-gray-500">累计制作：</span>
                <span className="font-medium">{sku.total_quantity} 件</span>
              </div>
            </div>
          </div>

          {/* 加载状态 */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">正在获取补货信息...</span>
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">错误</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}

          {/* 补货信息 */}
          {restockInfo && !isLoading && (
            <>
              {/* 补货状态 */}
              <div className={`rounded-lg p-4 mb-6 ${
                restockInfo.can_restock 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {restockInfo.can_restock ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-medium ${
                    restockInfo.can_restock ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {restockInfo.can_restock ? '可以补货' : '无法补货'}
                  </span>
                </div>
                {!restockInfo.can_restock && restockInfo.insufficient_materials && (
                  <div className="mt-2 text-red-700">
                    <p className="text-sm">以下原材料库存不足：</p>
                    <ul className="list-disc list-inside text-sm mt-1">
                      {restockInfo.insufficient_materials.map((material, index) => (
                        <li key={index}>{material}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 所需原材料列表 */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">所需原材料</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">原材料名称</th>
                        <th className="px-4 py-2 text-left">供应商</th>
                        <th className="px-4 py-2 text-left">批次号</th>
                        <th className="px-4 py-2 text-right">需要数量</th>
                        <th className="px-4 py-2 text-right">库存数量</th>
                        <th className="px-4 py-2 text-center">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {restockInfo.required_materials.map((material, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2 font-medium">{material.material_name}</td>
                          <td className="px-4 py-2">{material.supplier_name}</td>
                          <td className="px-4 py-2">{material.purchase_code}</td>
                          <td className="px-4 py-2 text-right">
                            {material.quantityNeededPerSku * formData.quantity} {material.unit}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {material.available_quantity} {material.unit}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {material.isSufficient ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                充足
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                不足
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 补货表单 */}
              {restockInfo.can_restock && (
                <form on_submit={handleSubmit}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      补货数量 *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* 成本预览 */}
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-blue-900 mb-3">成本预览</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700">原材料成本：</span>
                        <span className="font-medium text-blue-900">
                          ¥{restockInfo.required_materials.reduce((sum, material) => {
                            return sum + (material.unitCost * material.quantityNeededPerSku * formData.quantity)
                          }, 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">人工成本：</span>
                        <span className="font-medium text-blue-900">
                          ¥{(restockInfo.labor_cost * formData.quantity).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">工艺成本：</span>
                        <span className="font-medium text-blue-900">
                          ¥{(restockInfo.craft_cost * formData.quantity).toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t border-blue-200 pt-2 flex justify-between">
                        <span className="font-medium text-blue-900">总成本：</span>
                        <span className="font-bold text-blue-900">
                          ¥{calculateTotalCost().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      确认补货
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* 确认对话框 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">确认补货</h3>
              <div className="space-y-2 text-sm text-gray-600 mb-6">
                <p>SKU编码：<span className="font-medium text-gray-900">{sku.sku_code}</span></p>
                <p>补货数量：<span className="font-medium text-gray-900">{formData.quantity} 件</span></p>
                <p>总成本：<span className="font-medium text-gray-900">¥{calculateTotalCost().toFixed(2)}</span></p>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                确认后将消耗相应的原材料库存，并增加SKU库存。此操作不可撤销。
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={is_submitting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={confirmRestock}
                  disabled={is_submitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {is_submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  确认补货
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}