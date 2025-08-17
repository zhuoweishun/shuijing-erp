-- 添加采购表缺失字段和修改权限策略
-- 创建时间: 2024-12-15

-- 1. 为purchases表添加新字段
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS size TEXT,
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS bead_price DECIMAL(10,2);

-- 2. 删除现有的RLS策略（需要重新创建以支持匿名访问）
DROP POLICY IF EXISTS "用户只能查看自己的采购记录" ON purchases;
DROP POLICY IF EXISTS "用户只能插入自己的采购记录" ON purchases;
DROP POLICY IF EXISTS "用户只能更新自己的采购记录" ON purchases;
DROP POLICY IF EXISTS "用户只能删除自己的采购记录" ON purchases;

-- 3. 创建新的RLS策略，支持匿名访问
-- 允许匿名用户查看所有采购记录
CREATE POLICY "允许匿名用户查看采购记录" ON purchases
  FOR SELECT USING (true);

-- 允许匿名用户插入采购记录（不设置user_id）
CREATE POLICY "允许匿名用户插入采购记录" ON purchases
  FOR INSERT WITH CHECK (true);

-- 允许匿名用户更新采购记录
CREATE POLICY "允许匿名用户更新采购记录" ON purchases
  FOR UPDATE USING (true);

-- 允许匿名用户删除采购记录
CREATE POLICY "允许匿名用户删除采购记录" ON purchases
  FOR DELETE USING (true);

-- 4. 同样为products表创建匿名访问策略
DROP POLICY IF EXISTS "用户只能查看自己的成品记录" ON products;
DROP POLICY IF EXISTS "用户只能插入自己的成品记录" ON products;
DROP POLICY IF EXISTS "用户只能更新自己的成品记录" ON products;
DROP POLICY IF EXISTS "用户只能删除自己的成品记录" ON products;

-- 允许匿名用户操作成品记录
CREATE POLICY "允许匿名用户查看成品记录" ON products
  FOR SELECT USING (true);

CREATE POLICY "允许匿名用户插入成品记录" ON products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "允许匿名用户更新成品记录" ON products
  FOR UPDATE USING (true);

CREATE POLICY "允许匿名用户删除成品记录" ON products
  FOR DELETE USING (true);

-- 5. 授予匿名用户权限
GRANT ALL PRIVILEGES ON purchases TO anon;
GRANT ALL PRIVILEGES ON products TO anon;

-- 6. 更新数据库表类型定义的注释
COMMENT ON COLUMN purchases.quantity IS '采购数量';
COMMENT ON COLUMN purchases.size IS '尺寸(mm)';
COMMENT ON COLUMN purchases.unit_price IS '克价(元/克)';
COMMENT ON COLUMN purchases.bead_price IS '单珠价格(元/颗)';