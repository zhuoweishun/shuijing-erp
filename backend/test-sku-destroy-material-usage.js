// 测试SKU销毁时原材料使用量显示的脚本
import { PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'

const prisma = new PrismaClient()

async function testSkuDestroyMaterialUsage() {
  try {
    console.log('🧪 开始测试SKU销毁时原材料使用量显示...')
    
    // 1. 查找和田玉挂件SKU
    console.log('\n📋 查找和田玉挂件SKU:')
    const hetianyuSku = await prisma.product_sku.find_first({
      where: {
        sku_name: {
          contains: '和田玉挂件'
        }
      },
      include: {
        products: {
          include: {
            materialUsages: {
              include: {
                purchase: true
              },
              orderBy: {
                created_at: 'asc'
              }
            }
          }
        }
      }
    })
    
    if (!hetianyuSku) {
      console.log('   ❌ 未找到和田玉挂件SKU')
      return
    }
    
    console.log(`   ✅ 找到SKU: ${hetianyuSku.sku_name}`)
    console.log(`   SKU ID: ${hetianyuSku.id}`)
    console.log(`   SKU代码: ${hetianyuSku.sku_code}`)
    console.log(`   当前库存: ${hetianyuSku.available_quantity} 件`)
    console.log(`   总数量: ${hetianyuSku.total_quantity} 件`)
    
    // 2. 分析MaterialUsage记录
    console.log('\n🔍 分析MaterialUsage记录:')
    let allMaterialUsages = []
    hetianyuSku.products.for_each(product => {
      allMaterialUsages.push(...product.materialUsages)
    })
    
    console.log(`   总MaterialUsage记录数: ${allMaterialUsages.length}`)
    allMaterialUsages.for_each((usage, index) => {
      console.log(`   ${index + 1}. 采购记录: ${usage.purchase.product_name}`)
      console.log(`      使用量: ${usage.quantity_used_beads || 0}颗 + ${usage.quantity_used_pieces || 0}件 = ${(usage.quantity_used_beads || 0) + (usage.quantity_used_pieces || 0)}件`)
      console.log(`      创建时间: ${usage.created_at.to_locale_string()}`)
      console.log(`      采购记录ID: ${usage.purchase_id}`)
    })
    
    // 3. 计算期望的单个SKU消耗量
    console.log('\n📊 计算期望的单个SKU消耗量:')
    if (allMaterialUsages.length > 0) {
      const firstUsage = allMaterialUsages[0]
      const firstUsageTotal = (firstUsage.quantity_used_beads || 0) + (firstUsage.quantity_used_pieces || 0)
      const expectedSingleConsumption = Math.floor(firstUsageTotal / hetianyuSku.total_quantity)
      
      console.log(`   第一次制作时总消耗: ${firstUsageTotal} 件`)
      console.log(`   SKU总数量: ${hetianyuSku.total_quantity} 件`)
      console.log(`   期望单个SKU消耗量: ${expectedSingleConsumption} 件`)
      console.log(`   用户期望: 1件 (因为制作时是1:1对应)`)
    }
    
    // 4. 测试API返回的原材料信息
    console.log('\n🌐 测试SKU原材料信息API:')
    try {
      const response = await fetch(`http://localhost:3001/api/v1/skus/${hetianyuSku.id}/materials`, {
        headers: {
          'Authorization': 'Bearer test-token', // 这里需要实际的token
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('   ✅ API调用成功')
        console.log('   📦 返回的原材料信息:')
        
        if (result.success && result.data.materials) {
          result.data.materials.for_each((material, index) => {
            console.log(`   ${index + 1}. ${material.product_name}`)
            console.log(`      供应商: ${material.supplier_name}`)
            console.log(`      显示使用量: ${material.quantity_used_beads}颗 + ${material.quantity_used_pieces}件`)
            console.log(`      总使用量: ${material.quantity_used_beads + material.quantity_used_pieces}件`)
            console.log(`      成本: ¥${material.total_cost?.to_fixed(2) || '0.00'}`)
            
            // 检查是否符合用户期望
            const totalUsage = material.quantity_used_beads + material.quantity_used_pieces
            if (totalUsage === 1) {
              console.log(`      ✅ 使用量正确: ${totalUsage}件 (符合用户期望的1:1对应)`)
            } else {
              console.log(`      ❌ 使用量错误: ${totalUsage}件 (用户期望1件)`)
            }
          })
        } else {
          console.log('   ❌ API返回数据格式错误')
          console.log('   响应:', JSON.stringify(result, null, 2))
        }
      } else {
        console.log(`   ❌ API调用失败: ${response.status} ${response.status_text}`)
        const errorText = await response.text()
        console.log('   错误信息:', errorText)
      }
    } catch (api_error) {
      console.log('   ❌ API调用异常:', apiError.message)
      console.log('   💡 提示: 请确保后端服务正在运行，并且有有效的认证token')
    }
    
    // 5. 总结
    console.log('\n📋 测试总结:')
    console.log('   🎯 测试目标: 验证SKU销毁时显示的原材料使用量是否正确')
    console.log('   📝 用户期望: 销毁1件SKU时，显示使用量应为1件原材料')
    console.log('   🔧 修复内容: 修改API返回单个SKU消耗量，而非累计MaterialUsage记录')
    console.log('   ✅ 如果API返回的使用量为1件，说明修复成功')
    console.log('   ❌ 如果API返回的使用量为4件或其他数值，说明仍有问题')
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testSkuDestroyMaterialUsage().catch(console.error)