import { PrismaClient } from '@prisma/client'
import { logger } from './logger.js'
import { get_local_i_p } from './network.js'

const prisma = new PrismaClient()

/**
 * 更新数据库中的图片URL，将旧IP地址替换为新IP地址
 * @param oldIP 旧的IP地址
 * @param newIP 新的IP地址
 */
export async function update_image_urls(old_ip: string, new_ip: string) {
  try {
    logger.info(`开始更新图片URL: ${old_ip} -> ${new_ip}`)

    // 查找所有包含旧IP的采购记录
    const purchases = await prisma.purchase.find_many({
      where: {
        photos: {
          arrayContains: `http://${old_ip}:3001`
        }
      }
    })

    logger.info(`找到 ${purchases.length} 条需要更新的采购记录`)

    let updated_count = 0

    for (const purchase of purchases) {
      if (purchase.photos && Array.isArray(purchase.photos)) {
        // 更新图片URL数组
        const updated_photos = (purchase.photos as string[]).map((photo: string) => {
          if (typeof photo === 'string' && photo.includes(`http://${old_ip}:3001`)) {
            return photo.replace(`http://${old_ip}:3001`, `http://${new_ip}:3001`)
          }
          return photo
        })

        // 更新数据库记录
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: { photos: updated_photos }
        })

        updated_count++
        logger.info(`已更新采购记录 ${purchase.id} 的图片URL`)
      }
    }

    logger.info(`图片URL更新完成，共更新 ${updated_count} 条记录`)
    return { success: true, updated_count }

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
export async function update_common_old_ips() {
  const oldIps = ['192.168.50.160', '192.168.50.146']
  const new_ip = get_local_ip() // 动态获取当前IP

  for (const old_ip of oldIps) {
    await update_image_urls(old_ip, new_ip)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  update_common_old_ips()
    .then(() => {
      logger.info('图片URL批量更新完成')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('图片URL批量更新失败:', error)
      process.exit(1)
    })
}