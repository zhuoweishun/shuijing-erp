-- 更新管理员用户密码哈希
UPDATE user_profiles 
SET password_hash = '100000$2017568c6c09be4f80ad9be09eee6b07f6033ca790813ced5f09eb5d204a5322$47b411cbfcb8b658ba6aff363f0d0a2f47ba8685d178e8905c1e7c3173f905f4a9d6cfc678fd2bfa5589822630fa4eb6fefc7df6805d40376f422afa64e2c189'
WHERE username = 'admin';

-- 验证更新结果
SELECT username, email, role, created_at FROM user_profiles WHERE username = 'admin';