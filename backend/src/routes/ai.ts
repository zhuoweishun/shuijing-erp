import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken } from '../middleware/auth.js'
import { parseCrystalPurchaseDescription, checkAIHealth, getAIConfig } from '../services/ai.js'
import { z } from 'zod'

const router = Router()

// 数据验证schema
const parseDescriptionSchema = z.object({
  description: z.string().min(1, '描述内容不能为空').max(2000, '描述内容不能超过2000字符')
})

// AI健康检查
router.get('/health', asyncHandler(async (_req, res) => {
  const healthStatus = await checkAIHealth()
  res.json({
    success: healthStatus.status === 'healthy',
    message: healthStatus.message,
    data: healthStatus.details
  })
}))

// AI配置信息
router.get('/config', asyncHandler(async (_req, res) => {
  const config = getAIConfig()
  res.json({
    success: true,
    data: {
      ...config,
      provider: 'doubao',
      features: {
        crystal_purchase_parsing: true,
        text_parsing: true,
        image_analysis: false,
        assistant: true
      }
    }
  })
}))

// 解析水晶采购描述
router.post('/parse-crystal-purchase', authenticateToken, asyncHandler(async (req, res) => {
  // 验证请求数据
  const validatedData = parseDescriptionSchema.parse(req.body)
  
  // 调用AI解析服务
  const result = await parseCrystalPurchaseDescription(validatedData.description)
  
  if (result.success) {
    res.json({
      success: true,
      message: '解析成功',
      data: result.data
    })
  } else {
    res.status(400).json({
      success: false,
      message: result.error || '解析失败'
    })
  }
}))

// 解析采购描述（保持向后兼容）
router.post('/parse-description', authenticateToken, asyncHandler(async (req, res) => {
  // 重定向到新的水晶采购解析接口
  const validatedData = parseDescriptionSchema.parse(req.body)
  const result = await parseCrystalPurchaseDescription(validatedData.description)
  
  if (result.success) {
    res.json({
      success: true,
      message: '解析成功',
      data: result.data
    })
  } else {
    res.status(400).json({
      success: false,
      message: result.error || '解析失败'
    })
  }
}))

export default router