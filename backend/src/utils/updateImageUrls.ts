import { PrismaClient } from '@prisma/client'
import { logger } from './logger.js'

const prisma = new PrismaClient()

/**
 * 更新数据库中的图片URL，将旧IP地址替换为新IP地址
 * @param oldIP 旧的IP地址
 * @param newIP 新的IP地址
 */
export async function updateImageUrls(oldIP: string, newIP: string) {
  try {
    logger.info(`开始更新图片URL: ${oldIP} -> ${newIP}`)
    
    // 查找所有包含旧IP的采购记录
    const purchases = await prisma.purchase.findMany({
      where: {
        photos: {
          array_contains: `http://${oldIP}:3001`
        }
      }
    })
    
    logger.info(`找到 ${purchases.length} 条需要更新的采购记录`)
    
    let updatedCount = 0
    
    for (const purchase of purchases) {
      if (purchase.photos && Array.isArray(purchase.photos)) {
        // 更新图片URL数组
        const updatedPhotos = (purchase.photos as string[]).map((photo: string) => {
          if (typeof photo === 'string' && photo.includes(`http://${oldIP}:3001`)) {
            return photo.replace(`http://${oldIP}:3001`, `http://${newIP}:3001`)
          }
          return photo
        })
        
        // 更新数据库记录
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: { photos: updatedPhotos }
        })
        
        updatedCount++
        logger.info(`已更新采购记录 ${purchase.id} 的图片URL`)
      }
    }
    
    logger.info(`图片URL更新完成，共更新 ${updatedCount} 条记录`)
    return { success: true, updatedCount }
    
  } catch (error) {
    logger.error('更新图片URL失败:', error)
    return { success: false, error: (error as Error).message }
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * 批量更新常见的旧IP地址
 */
export async function updateCommonOldIPs() {
  const oldIPs = ['192.168.50.160', '192.168.50.146']
  const newIP = '192.168.3.249' // 当前IP
  
  for (const oldIP of oldIPs) {
    await updateImageUrls(oldIP, newIP)
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  updateCommonOldIPs()
    .then(() => {
      logger.info('图片URL批量更新完成')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('图片URL批量更新失败:', error)
      process.exit(1)
    })
}