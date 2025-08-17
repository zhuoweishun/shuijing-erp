const crypto = require('crypto');

/**
 * 使用Node.js原生crypto模块的密码哈希工具
 * 替代bcrypt，解决npm安装依赖问题
 */

/**
 * 生成随机盐值
 * @param {number} length 盐值长度，默认32字节
 * @returns {string} 十六进制盐值
 */
function generateSalt(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 使用PBKDF2算法哈希密码
 * @param {string} password 原始密码
 * @param {string} salt 盐值
 * @param {number} iterations 迭代次数，默认100000
 * @param {number} keyLength 密钥长度，默认64字节
 * @returns {string} 哈希后的密码
 */
function hashPassword(password, salt, iterations = 100000, keyLength = 64) {
  return crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha512').toString('hex');
}

/**
 * 创建密码哈希（包含盐值）
 * @param {string} password 原始密码
 * @returns {string} 格式：iterations$salt$hash
 */
function createPasswordHash(password) {
  const iterations = 100000;
  const salt = generateSalt();
  const hash = hashPassword(password, salt, iterations);
  
  // 格式：iterations$salt$hash
  return `${iterations}$${salt}$${hash}`;
}

/**
 * 验证密码
 * @param {string} password 原始密码
 * @param {string} storedHash 存储的哈希值
 * @returns {boolean} 验证结果
 */
function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split('$');
    
    if (parts.length !== 3) {
      return false;
    }
    
    const iterations = parseInt(parts[0]);
    const salt = parts[1];
    const hash = parts[2];
    
    const computedHash = hashPassword(password, salt, iterations);
    
    // 使用timingSafeEqual防止时序攻击
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  } catch (error) {
    console.error('密码验证错误:', error);
    return false;
  }
}

/**
 * 兼容bcrypt格式的哈希函数
 * @param {string} password 原始密码
 * @param {number} saltRounds 盐轮数（这里用作迭代次数的参考）
 * @returns {Promise<string>} 哈希后的密码
 */
function hash(password, saltRounds = 10) {
  return Promise.resolve(createPasswordHash(password));
}

/**
 * 兼容bcrypt格式的比较函数
 * @param {string} password 原始密码
 * @param {string} hash 存储的哈希值
 * @returns {Promise<boolean>} 验证结果
 */
function compare(password, hash) {
  return Promise.resolve(verifyPassword(password, hash));
}

module.exports = {
  generateSalt,
  hashPassword,
  createPasswordHash,
  verifyPassword,
  hash,
  compare
};