/**
 * UUID 工具函数
 * 提供UUID验证和生成功能
 */

/**
 * 验证字符串是否为有效的UUID格式
 * @param uuid 要验证的字符串
 * @returns 是否为有效UUID
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * 生成新的UUID v4格式
 * @returns 新的UUID字符串
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * 确保用户ID为有效UUID格式
 * 如果不是有效UUID，则生成新的UUID
 * @param userId 原始用户ID
 * @returns 有效的UUID
 */
export const ensureValidUUID = (userId: string): string => {
  if (isValidUUID(userId)) {
    return userId;
  }
  
  console.warn('⚠️ 用户ID格式无效，生成新的UUID:', userId);
  const newUUID = generateUUID();

  return newUUID;
};

/**
 * 验证并修复用户对象的ID
 * @param user 用户对象
 * @returns 修复后的用户对象
 */
export const fixUserUUID = <T extends { id: string }>(user: T): T => {
  return {
    ...user,
    id: ensureValidUUID(user.id)
  };
};