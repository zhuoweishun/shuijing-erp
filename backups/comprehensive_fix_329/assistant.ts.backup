import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { chatWithAssistant, getBusinessInsights } from '../services/ai.js'
import { z } from 'zod'

const router = Router()

// 验证聊天请求
const chatRequestSchema = z.object({
  message: z.string().min(1, '消息不能为空').max(1000, '消息长度不能超过1000字符'),
  context: z.any().optional()
})

// 验证洞察请求
const insightsRequestSchema = z.object({
  query: z.string().min(1, '查询内容不能为空').max(500, '查询长度不能超过500字符'),
  timeRange: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  includeFinancial: z.boolean().optional().default(true)
})

// 智能助理对话
router.post('/chat', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const validatedData = chatRequestSchema.parse(req.body)
    const { message, context } = validatedData

    const result = await chatWithAssistant(message, context)

    if (result.success) {
      res.json({
        success: true,
        message: '对话成功',
        data: result.data
      })
    } else {
      res.status(400).json({
        success: false,
        message: result.error || '对话失败',
        error: {
          code: 'CHAT_FAILED',
          details: result.error
        }
      })
    }
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        message: '请求参数验证失败',
        error: {
          code: 'VALIDATION_ERROR',
          details: error.errors
        }
      })
    } else {
      res.status(500).json({
        success: false,
        message: '智能助理服务异常',
        error: {
          code: 'ASSISTANT_ERROR',
          details: error.message
        }
      })
    }
  }
}))

// 获取业务洞察（仅老板权限）
router.post('/insights', authenticateToken, requireRole('BOSS'), asyncHandler(async (req, res) => {
  try {
    const validatedData = insightsRequestSchema.parse(req.body)
    const { query, timeRange, includeFinancial } = validatedData

    const result = await getBusinessInsights(query, {
      timeRange,
      includeFinancial,
      userId: req.user?.id
    })

    if (result.success) {
      res.json({
        success: true,
        message: '业务洞察获取成功',
        data: result.data
      })
    } else {
      res.status(400).json({
        success: false,
        message: result.error || '业务洞察获取失败',
        error: {
          code: 'INSIGHTS_FAILED',
          details: result.error
        }
      })
    }
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        message: '请求参数验证失败',
        error: {
          code: 'VALIDATION_ERROR',
          details: error.errors
        }
      })
    } else {
      res.status(500).json({
        success: false,
        message: '业务洞察服务异常',
        error: {
          code: 'INSIGHTS_ERROR',
          details: error.message
        }
      })
    }
  }
}))

export default router