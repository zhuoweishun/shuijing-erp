const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 检查文件类型
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件 (jpeg, jpg, png, gif, webp)'));
  }
};

// 配置multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
    files: 10 // 最多10个文件
  },
  fileFilter: fileFilter
});

// 单文件上传
router.post('/single', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const fileUrl = `/api/upload/files/${req.file.filename}`;
    
    res.json({
      message: '文件上传成功',
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path
      }
    });
  } catch (error) {
    console.error('单文件上传错误:', error);
    res.status(500).json({ error: '文件上传失败' });
  }
});

// 多文件上传
router.post('/multiple', authenticateToken, upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const files = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      url: `/api/upload/files/${file.filename}`,
      path: file.path
    }));

    res.json({
      message: '文件上传成功',
      files: files,
      count: files.length
    });
  } catch (error) {
    console.error('多文件上传错误:', error);
    res.status(500).json({ error: '文件上传失败' });
  }
});

// 获取文件
router.get('/files/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    // 设置适当的Content-Type
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 缓存1年

    // 发送文件
    res.sendFile(filePath);
  } catch (error) {
    console.error('获取文件错误:', error);
    res.status(500).json({ error: '获取文件失败' });
  }
});

// 删除文件
router.delete('/files/:filename', authenticateToken, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    // 删除文件
    fs.unlinkSync(filePath);

    res.json({ message: '文件删除成功', filename });
  } catch (error) {
    console.error('删除文件错误:', error);
    res.status(500).json({ error: '删除文件失败' });
  }
});

// 获取上传文件列表（仅管理员）
router.get('/files', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }

    const files = fs.readdirSync(uploadDir).map(filename => {
      const filePath = path.join(uploadDir, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        url: `/api/upload/files/${filename}`
      };
    });

    res.json({ files });
  } catch (error) {
    console.error('获取文件列表错误:', error);
    res.status(500).json({ error: '获取文件列表失败' });
  }
});

// 清理过期文件（仅管理员）
router.post('/cleanup', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }

    const { days = 30 } = req.body; // 默认清理30天前的文件
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const files = fs.readdirSync(uploadDir);
    let deletedCount = 0;
    let deletedSize = 0;

    files.forEach(filename => {
      const filePath = path.join(uploadDir, filename);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        deletedSize += stats.size;
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });

    res.json({
      message: '文件清理完成',
      deletedCount,
      deletedSize: `${(deletedSize / 1024 / 1024).toFixed(2)} MB`,
      cutoffDate
    });
  } catch (error) {
    console.error('清理文件错误:', error);
    res.status(500).json({ error: '清理文件失败' });
  }
});

// 错误处理中间件
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制 (5MB)' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: '文件数量超过限制 (10个)' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: '意外的文件字段' });
    }
  }
  
  if (error.message.includes('只允许上传图片文件')) {
    return res.status(400).json({ error: error.message });
  }

  console.error('上传错误:', error);
  res.status(500).json({ error: '文件上传失败' });
});

module.exports = router;