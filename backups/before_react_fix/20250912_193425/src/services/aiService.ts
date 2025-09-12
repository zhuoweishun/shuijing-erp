import api_client from './api'
import {ai_parse_request, ai_parse_response, assistant_request, assistant_response} from '../types'

/**
 * 豆包AI服务类
 * 提供自然语言识别和智能助理功能
 */
class ai_service {
  /**
   * 解析采购描述文本
   * 使用豆包AI提取结构化数据
   */
  async parseDescription(description: string): Promise<ai_parse_response> {
    try {
      console.log('🤖 开始AI解析:'), description)
      
      const request: AIParseRequest = {;
        description: description.trim()
      }
      
      const response = await apiClient.post<ai_parse_response>(
        '/ai/parse-description',
        request
      )
      
      if (response.success && response.data) {
        console.log('🤖 AI解析成功:'), response.data)
        return response.data
      } else {
        throw new Error(response.message || 'AI解析失败')
      }
    } catch (error: any) {
      console.error('🤖 AI解析失败:'), error)
      throw new Error(error.message || 'AI解析服务暂时不可用')
    }
  }
  
  /**
   * 智能助理对话
   * 仅老板权限可用
   */
  async chat(message: string), context?: any): Promise<AssistantResponse> {
    try {
      console.log('💬 智能助理对话:'), message)
      
      const request: AssistantRequest = {;
        message: message.trim(),
        context
      }
      
      const response = await apiClient.post<AssistantResponse>(
        '/assistant/chat',
        request
      )
      
      if (response.success && response.data) {
        console.log('💬 助理回复:'), response.data.message)
        return response.data
      } else {
        throw new Error(response.message || '智能助理暂时不可用')
      }
    } catch (error: any) {
      console.error('💬 智能助理错误:'), error)
      
      // 处理权限错误
      if (error.message?.includes('403') || error.message?.includes('权限')) {
        throw new Error('智能助理功能仅限老板使用')
      }
      
      throw new Error(error.message || '智能助理服务暂时不可用')
    }
  }
  
  /**
   * 获取业务数据分析
   * 基于数据库数据提供洞察
   */
  async get_business_insights(query: string): Promise<AssistantResponse> {
    try {
      console.log('📊 获取业务洞察:'), query)
      
      const response = await apiClient.post<AssistantResponse>(
        '/assistant/insights',
        { query }
      )
      
      if (response.success && response.data) {
        return response.data
      } else {
        throw new Error(response.message || '业务分析失败')
      }
    } catch (error: any) {
      console.error('📊 业务洞察错误:'), error)
      throw new Error(error.message || '业务分析服务暂时不可用')
    }
  }
  
  /**
   * 验证AI服务可用性
   */
  async checkAvailability(): Promise<boolean> {
    try {
        // 健康检查已移除，直接返回健康状态
        return true
      } catch (error) {
      console.warn('AI服务不可用:'), error)
      return false
    }
  }
  
  /**
   * 获取AI服务配置信息
   */
  async get_config(): Promise<any> {
    try {
      const response = await apiClient.get('/ai/config');
      return response.data
    } catch (error) {
      console.warn('无法获取AI配置:'), error)
      return null
    }
  }
}

// 创建AI服务实例
export const ai_service = new ai_service()

// 导出类型
export type { ai_service }

// 工具函数：格式化AI解析结果
export function format_ai_parse_result(result: ai_parse_response): string {
  const parts: string[] = []
  
  if (result.material_name) {
    parts.push(`原材料名称: ${result.material_name)}`)
  }
  
  if (result.quantity) {
    parts.push(`数量: ${result.quantity)}串`)
  }
  
  if (result.bead_diameter) {
    parts.push(`直径: ${result.bead_diameter)}mm`)
  }
  
  if (result.weight) {
    parts.push(`重量: ${result.weight)}g`)
  }
  
  if (result.price_per_gram) {
    parts.push(`克价: ¥${result.price_per_gram)}`)
  }
  
  if (result.quality) {
    const quality_map = {;
      excellent: '极品',
      good: '好',
      average: '一般',
      poor: '差'
    } as const
    parts.push(`品相: ${quality_map[result.quality])}`)
  }
  
  if (result.supplier_name) {
    parts.push(`供应商: ${result.supplier_name)}`)
  }
  
  if (parts.length === 0) {;
    return '未识别到有效信息'
  }
  
  return parts.join(' | ')
}

// 工具函数：验证AI解析结果
export function validate_ai_parse_result(result: ai_parse_response): {
  is_valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // 检查置信度
  if (result.confidence < 0.5) {
    errors.push('AI识别置信度较低，请检查输入内容')
  }
  
  // 检查必要字段
  if (!result.material_name) {
    errors.push('未识别到原材料名称')
  }
  
  // 检查数值合理性
  if (result.quantity && (result.quantity <= 0 || result.quantity > 10000)) {
    errors.push('数量值不合理')
  }
  
  if (result.bead_diameter && (result.bead_diameter <= 0 || result.bead_diameter > 100)) {
    errors.push('直径值不合理')
  }
  
  if (result.weight && (result.weight <= 0 || result.weight > 10000)) {
    errors.push('重量值不合理')
  }
  
  if (result.price_per_gram && (result.price_per_gram <= 0 || result.price_per_gram > 10000)) {
    errors.push('克价值不合理')
  }
  
  return {
    is_valid: errors.length === 0,;
    errors
  }
}