-- 水晶销售管理系统数据库初始化脚本
-- 创建时间: 2024-01-01

-- 1. 创建用户配置表
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建采购记录表
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier TEXT NOT NULL,
  crystal_type TEXT NOT NULL,
  weight DECIMAL(10,2),
  price DECIMAL(10,2),
  quality TEXT,
  notes TEXT,
  photos TEXT[], -- 存储图片URL数组
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建成品记录表
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category TEXT,
  raw_material TEXT,
  weight DECIMAL(10,2),
  size TEXT,
  craft_time DECIMAL(10,2),
  cost DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  status TEXT DEFAULT '制作中',
  description TEXT,
  photos TEXT[], -- 存储图片URL数组
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- 5. 启用行级安全策略 (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 6. 创建RLS策略

-- 用户配置表策略
CREATE POLICY "用户只能查看和修改自己的配置" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- 采购记录表策略
CREATE POLICY "用户只能查看自己的采购记录" ON purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户只能插入自己的采购记录" ON purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的采购记录" ON purchases
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的采购记录" ON purchases
  FOR DELETE USING (auth.uid() = user_id);

-- 成品记录表策略
CREATE POLICY "用户只能查看自己的成品记录" ON products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户只能插入自己的成品记录" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的成品记录" ON products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的成品记录" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- 7. 创建文件存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('crystal-photos', 'crystal-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 8. 设置存储桶策略
CREATE POLICY "用户可以上传照片" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'crystal-photos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "用户可以查看照片" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'crystal-photos'
  );

CREATE POLICY "用户可以删除自己的照片" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'crystal-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 9. 创建触发器函数用于自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. 为表添加更新时间触发器
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. 授予必要的权限
GRANT ALL PRIVILEGES ON user_profiles TO authenticated;
GRANT ALL PRIVILEGES ON purchases TO authenticated;
GRANT ALL PRIVILEGES ON products TO authenticated;

-- 允许匿名用户注册（如果需要）
GRANT SELECT ON user_profiles TO anon;
GRANT INSERT ON user_profiles TO anon;