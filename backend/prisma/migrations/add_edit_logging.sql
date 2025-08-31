-- 添加编辑日志功能
-- 为Purchase表添加lastEditedBy字段
ALTER TABLE purchases ADD COLUMN lastEditedById VARCHAR(191) NULL;

-- 添加外键约束
ALTER TABLE purchases ADD CONSTRAINT purchases_lastEditedById_fkey 
  FOREIGN KEY (lastEditedById) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- 创建编辑日志表
CREATE TABLE edit_logs (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  purchaseId VARCHAR(191) NOT NULL,
  userId VARCHAR(191) NOT NULL,
  action VARCHAR(191) NOT NULL,
  details TEXT NULL,
  changedFields JSON NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  
  CONSTRAINT edit_logs_purchaseId_fkey 
    FOREIGN KEY (purchaseId) REFERENCES purchases(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT edit_logs_userId_fkey 
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 创建索引
CREATE INDEX edit_logs_purchaseId_idx ON edit_logs(purchaseId);
CREATE INDEX edit_logs_userId_idx ON edit_logs(userId);
CREATE INDEX edit_logs_createdAt_idx ON edit_logs(createdAt);