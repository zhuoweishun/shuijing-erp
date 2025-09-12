import { Router } from 'express'
import multer from 'multer'
import * as path from 'path'
import * as fs from 'fs'
import { z } from 'zod'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticate_token } from '../middleware/auth.js'

const router = Router()

// 删除图片请求验证schema
const deleteImagesSchema = z.object({
  urls: z.array(
    z.string().url('图片URL格式不正确')
  ).min(1, '至少需要提供一个图片URL').max(10, '一次最多删除10个图片')
})

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), 'uploads', 'purchases')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：时间戳_随机数.扩展名
    const timestamp = Date.now()
    const randomNum = Math.floor(Math.random() * 1000)
    const ext = path.extname(file.originalname)
    const filename = `${timestamp}_${randomNum}${ext}`
    cb(null, filename)
  }
})

// 文件过滤器
const fileFilter = (req: any, file: any, cb: any) => {
  // 只允许图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('只允许上传图片文件'), false)
  }
}

// 配置multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    file_size: 10 * 1024 * 1024, // 10MB
    files: 5 // 最多5个文件
  }
})

// 上传采购图片
router.post('/purchase-images', authenticate_token, upload.array('images', 5), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请选择要上传的图片'
    })
  }

  const files = req.files as Express.Multer.File[]
  
  // 构建完整的图片URL
  const protocol = req.protocol
  const host = req.get('host')
  const baseUrl = `${protocol}://${host}`
  
  const imageUrls = files.map(file => {
    // 返回完整的URL路径
    return `${baseUrl}/uploads/purchases/${file.filename}`
  })

  res.json({
    success: true,
    message: '图片上传成功',
    data: {
      urls: imageUrls
    }
  })
  return
}))

// 删除图片
router.delete('/purchase-images', authenticate_token, asyncHandler(async (req, res) => {
  // 验证请求数据
  const validatedData = deleteImagesSchema.parse(req.body)
  const { urls } = validatedData

  const deletedFiles: string[] = []
  const errors: string[] = []

  for (const url of urls) {
    try {
      // 从URL中提取文件名
      const filename = path.basename(url)
      const filePath = path.join(uploadDir, filename)
      
      // 检查文件是否存在
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        deletedFiles.push(url)
      } else {
        errors.push(`文件不存在: ${url}`)
      }
    } catch (error) {
      errors.push(`删除失败: ${url} - ${error}`)
    }
  }

  res.json({
    success: errors.length === 0,
    message: errors.length === 0 ? '图片删除成功' : '部分图片删除失败',
    data: {
      deleted: deletedFiles,
      errors
    }
  })
}))

export default router