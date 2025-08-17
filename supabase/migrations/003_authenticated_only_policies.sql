-- 重新设计RLS策略：只允许已登录用户操作
-- 移除匿名用户权限，改为基于用户认证的系统

-- 撤销匿名用户的所有权限
REVOKE ALL ON purchases FROM anon;
REVOKE ALL ON products FROM anon;
REVOKE ALL ON user_profiles FROM anon;

-- 删除现有的宽松策略
DROP POLICY IF EXISTS "Allow all access to purchases" ON purchases;
DROP POLICY IF EXISTS "Allow all access to products" ON products;

-- 为purchases表创建基于用户认证的RLS策略
CREATE POLICY "Authenticated users can view all purchases" ON purchases
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert purchases" ON purchases
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own purchases" ON purchases
    FOR UPDATE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own purchases" ON purchases
    FOR DELETE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- 为products表创建基于用户认证的RLS策略
CREATE POLICY "Authenticated users can view all products" ON products
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert products" ON products
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own products" ON products
    FOR UPDATE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own products" ON products
    FOR DELETE USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- 为user_profiles表创建RLS策略
CREATE POLICY "Users can view all profiles" ON user_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.role() = 'authenticated' AND auth.uid() = id);

-- 确保RLS已启用
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 授予authenticated角色必要的权限
GRANT ALL PRIVILEGES ON purchases TO authenticated;
GRANT ALL PRIVILEGES ON products TO authenticated;
GRANT SELECT, UPDATE ON user_profiles TO authenticated;

-- 检查最终权限配置
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;