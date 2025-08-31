import { logger } from '../utils/logger'

// 豆包AI配置 - 从环境变量读取
const DOUBAO_CONFIG = {
  apiKey: process.env.DOUBAO_API_KEY || '',
  baseUrl: process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
  model: process.env.DOUBAO_MODEL || 'doubao-1.5-pro-32k-250115',
}

// AI服务健康检查
export const checkAIHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy'
  message: string
  details?: any
}> => {
  try {
    if (!DOUBAO_CONFIG.apiKey) {
      return {
        status: 'unhealthy',
        message: 'AI服务未配置API密钥',
        details: {
          timestamp: new Date().toISOString()
        }
      }
    }

    // 简单的配置检查
    return {
      status: 'healthy',
      message: 'AI服务配置正常',
      details: {
        model: DOUBAO_CONFIG.model,
        baseUrl: DOUBAO_CONFIG.baseUrl,
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    logger.error('AI服务健康检查失败', { error })
    return {
      status: 'unhealthy',
      message: 'AI服务检查异常',
      details: {
        error: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString()
      }
    }
  }
}

// 获取AI配置信息
export const getAIConfig = () => {
  return {
    model: DOUBAO_CONFIG.model,
    baseUrl: DOUBAO_CONFIG.baseUrl,
    hasApiKey: !!DOUBAO_CONFIG.apiKey,
    timestamp: new Date().toISOString()
  }
}

// 解析水晶珠宝采购描述
export const parseCrystalPurchaseDescription = async (description: string): Promise<{
  success: boolean
  data?: {
    productName?: string
    productType?: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED'
    unitType?: 'PIECES' | 'STRINGS' | 'SLICES' | 'ITEMS'
    beadDiameter?: number
    quantity?: number
    pieceCount?: number
    pricePerGram?: number
    unitPrice?: number
    totalPrice?: number
    weight?: number
    quality?: 'AA' | 'A' | 'AB' | 'B' | 'C'
    supplierName?: string
    notes?: string
  }
  error?: string
}> => {
  try {
    if (!DOUBAO_CONFIG.apiKey) {
      throw new Error('AI服务未配置API密钥')
    }

    const prompt = `请解析以下水晶珠宝采购描述，提取出具体的采购信息：

"${description}"

请以JSON格式返回，包含以下字段（如果描述中没有提到某个字段，请不要包含该字段）：
{
  "productName": "水晶名称（如：白水晶、紫水晶、粉水晶等）",
  "productType": "产品类型（LOOSE_BEADS/BRACELET/ACCESSORIES/FINISHED）",
  "unitType": "单位类型（PIECES/STRINGS/SLICES/ITEMS）",
  "beadDiameter": 珠子直径（毫米，数字）,
  "quantity": 数量（串数，仅用于BRACELET类型）,
  "pieceCount": 数量（颗数/片数/件数，用于LOOSE_BEADS/ACCESSORIES/FINISHED类型）,
  "pricePerGram": 克价（数字，仅用于LOOSE_BEADS和BRACELET类型）,
  "unitPrice": 单价（数字，仅用于ACCESSORIES和FINISHED类型）,
  "totalPrice": 总价（数字）,
  "weight": 重量（克，数字，仅在明确提到重量时才包含）,
  "quality": "品相等级（AA/A/AB/B/C）",
  "supplierName": "供应商名称",
  "notes": "其他备注信息"
}

品相等级识别规则（重要）：
- AA级：全净体、完美、极品、顶级、无瑕疵、完美无瑕
- A级：净体、很好、优质、高品质、品质很好、很干净
- AB级：还不错、不错、良好、轻微瑕疵、品相不错、还可以、挺好的、品质不错、质量不错、品质还行、质量还行
- B级：一般、普通、有点棉、有棉絮、有瑕疵、有点杂质、稍微有点棉
- C级：差、有裂、有明显瑕疵、品质较差、有裂纹、瑕疵较多

水晶专业术语对应：
- 全净体 → AA级
- 净体 → A级  
- 有点棉/有棉絮/有杂质 → B级
- 有裂/有裂纹/有明显瑕疵 → C级
- 还不错/不错/良好/品相不错 → AB级

产品类型识别规则（重要）：
- LOOSE_BEADS（散珠）：包含'散珠'、'颗'、'粒'、'散装'、'单颗'等关键词
- BRACELET（手串）：包含'手串'、'串'、'条'、'手链'等关键词，但不包含'多宝手串'、'成品手串'等成品关键词
- ACCESSORIES（饰品）：包含'吊坠'、'挂件'、'饰品'、'片'、'配件'、'耳环'、'项链'等关键词
- FINISHED（成品）：包含'成品'、'件'、'个'、'雕件'、'摆件'、'工艺品'、'多宝手串'、'设计款'、'同款'、'明星同款'、'成品手串'、'定制款'、'限量款'、'特别款'、'收藏款'、'精品'、'艺术品'、'纪念品'、'礼品'等关键词

单位类型对应：
- LOOSE_BEADS → PIECES（颗）
- BRACELET → STRINGS（串）
- ACCESSORIES → SLICES（片）
- FINISHED → ITEMS（件）

字段使用规则（重要）：
- LOOSE_BEADS（散珠）：使用pieceCount（颗数）、pricePerGram（克价）
- BRACELET（手串）：使用quantity（串数）、pricePerGram（克价）
- ACCESSORIES（饰品）：使用pieceCount（片数）、unitPrice（单价）
- FINISHED（成品）：使用pieceCount（件数）、unitPrice（单价）

数量识别规则：
- "2串"、"3串" → quantity: 2或3（仅用于BRACELET）
- "2件"、"3件" → pieceCount: 2或3（用于FINISHED）
- "2颗"、"3颗" → pieceCount: 2或3（用于LOOSE_BEADS）
- "2片"、"3片" → pieceCount: 2或3（用于ACCESSORIES）

价格识别规则（重要）：
- 成品和饰品："2000块一串"、"500元一件" → unitPrice: 2000或500
- 散珠和手串："50元一克"、"客价100"、"克价50" → pricePerGram: 50或100
- 克价表述："客价"、"克价"、"每克"、"一克"都表示pricePerGram
- 总价识别："200块钱"、"500元"、"1000块"、"总共200"、"一共500元"、"花了300块"、"总价1000"、"合计500元" → totalPrice: 200、500、1000、200、500、300、1000、500
- 单独价格表述：当描述中只出现一个价格且没有明确单位指示时，如"200块钱"、"300元"、"500块" → totalPrice: 200、300、500
- 价格单位："块"、"元"、"块钱"都表示人民币

珠子直径识别规则（重要）：
- 标准表述：6mm、8mm、10mm、12mm、14mm、16mm、18mm、20mm等
- 行业简称：6米、8米、10米、12米、14米、16米、18米、20米等（"米"在珠宝行业指毫米）
- 口语表述：6的、8的、10的、12的、14的、16的、18的、20的等
- 带"的"表述："16米的"、"8毫米的"、"12的" → 提取数字部分
- 特殊表述：六毫米、八毫米、十毫米、十二毫米、十四毫米等
- 注意："X米的"格式中，X就是直径数值（毫米），如"16米的" → beadDiameter: 16

供应商名称识别规则（重要）：
- 直接提及："供应商张三"、"张三水晶"、"李四珠宝" → supplierName: "张三"、"张三水晶"、"李四珠宝"
- 购买地点："在阿来水晶买的"、"从张三那里买的"、"在李四店里买的" → supplierName: "阿来水晶"、"张三"、"李四"
- 商店名称："XX水晶"、"XX珠宝"、"XX商行"、"XX店" → 完整提取商店名称
- 特殊商店名："咯咯珠宝"、"阿来水晶"、"晶晶水晶"等 → 完整提取包含特殊字符的商店名
- 人名模式："老张"、"小李"、"阿明" → 提取人名
- 地点+商家："市场里的张三"、"批发市场的李四" → 提取商家名称
- 特殊表述："那家店"、"老板"、"商家" → 如果前文有具体名称则提取，否则不提取
- 购买表述："在XX买的"、"从XX购买"、"XX那里买的" → 提取XX作为供应商名称

供应商识别示例（必须严格遵循）：
- "在咯咯珠宝买的" → supplierName: "咯咯珠宝"
- "在阿来水晶买的" → supplierName: "阿来水晶"
- "从张三那里买的" → supplierName: "张三"
- "李四珠宝店" → supplierName: "李四珠宝店"
- "老王水晶" → supplierName: "老王水晶"
- "晶晶商行" → supplierName: "晶晶商行"

注意：
1. 只返回JSON，不要其他文字
2. 数字字段请返回数字类型，不要字符串
3. 如果描述中没有明确提到某个字段，请不要包含该字段
4. 珠子直径识别："14米"、"14的"、"14毫米"、"14mm"都应识别为14
5. 品相等级必须严格按照上述规则识别，从AA、A、AB、B、C中选择
6. 特别注意识别"还不错"、"不错"、"良好"、"品质不错"等表述应对应AB级
7. 重量字段只有在明确提到重量时才包含，不要根据数量或价格推测
8. 成品和饰品类型不使用pricePerGram字段，散珠和手串类型不使用unitPrice字段
9. 供应商识别重点："在XX买的"格式中，XX就是供应商名称，如"在阿来水晶买的" → supplierName: "阿来水晶"
10. 供应商名称要完整提取，包括"水晶"、"珠宝"等后缀，不要只提取人名部分
11. 克价识别重点："客价100"、"克价50"都表示pricePerGram，提取数字部分
12. 直径识别重点："16米的"表示16毫米直径，提取数字部分作为beadDiameter
13. 特殊商店名识别："咯咯珠宝"等包含重复字符或特殊字符的商店名要完整识别
14. 【重要】供应商字段是必须识别的关键信息，如果描述中包含"在XX买的"、"从XX购买"等表述，必须提取XX作为supplierName
15. 【重要】总价识别：当描述中出现"200块钱"、"500元"等单独价格表述时，应识别为totalPrice，特别是散珠类型应优先使用totalPrice而非pricePerGram
16. 【重要】价格字段优先级：如果同时出现总价和克价，散珠类型优先使用totalPrice；如果只有总价，所有类型都使用totalPrice
17. 【重要】测试案例："在咯咯珠宝买的黑曜石五串" → 必须识别出 supplierName: "咯咯珠宝"
18. 【重要】测试案例："拉拉水晶买的单珠，黄耀石一颗，200块钱，品质还不错的。18米。" → 必须识别出 supplierName: "拉拉水晶", totalPrice: 200`

    const response = await fetch(`${DOUBAO_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DOUBAO_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: DOUBAO_CONFIG.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      throw new Error(`AI API请求失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('AI返回内容为空')
    }

    // 尝试解析JSON
    let parsedData
    try {
      parsedData = JSON.parse(content)
    } catch (parseError) {
      // 如果直接解析失败，尝试提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('无法解析AI返回的JSON格式')
      }
    }

    logger.info('水晶采购描述解析成功', {
      originalDescription: description,
      parsedData
    })

    return {
      success: true,
      data: parsedData
    }

  } catch (error) {
    logger.error('解析水晶采购描述失败', {
      description,
      error: error instanceof Error ? error.message : '未知错误'
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : '解析失败'
    }
  }
}

// 解析采购描述（保持向后兼容）
export const parsePurchaseDescription = async (description: string): Promise<{
  success: boolean
  data?: {
    items: Array<{
      name: string
      quantity: number
      unit: string
      estimatedPrice?: number
    }>
    supplier?: string
    notes?: string
  }
  error?: string
}> => {
  try {
    if (!DOUBAO_CONFIG.apiKey) {
      throw new Error('AI服务未配置API密钥')
    }

    const prompt = `请解析以下采购描述，提取出具体的采购项目信息：

"${description}"

请以JSON格式返回，包含以下字段：
{
  "items": [
    {
      "name": "物品名称",
      "quantity": 数量,
      "unit": "单位",
      "estimatedPrice": 预估单价(可选)
    }
  ],
  "supplier": "供应商名称(如果提到)",
  "notes": "其他备注信息"
}

只返回JSON，不要其他文字。`

    const response = await fetch(`${DOUBAO_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DOUBAO_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: DOUBAO_CONFIG.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      throw new Error(`AI API请求失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('AI返回内容为空')
    }

    // 尝试解析JSON
    let parsedData
    try {
      parsedData = JSON.parse(content)
    } catch (parseError) {
      // 如果直接解析失败，尝试提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('无法解析AI返回的JSON格式')
      }
    }

    logger.info('采购描述解析成功', {
      originalDescription: description,
      parsedData
    })

    return {
      success: true,
      data: parsedData
    }

  } catch (error) {
    logger.error('解析采购描述失败', {
      description,
      error: error instanceof Error ? error.message : '未知错误'
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : '解析失败'
    }
  }
}

// 智能助理对话
export const chatWithAssistant = async (message: string, context?: any): Promise<{
  success: boolean
  data?: {
    response: string
    suggestions?: string[]
  }
  error?: string
}> => {
  try {
    if (!DOUBAO_CONFIG.apiKey) {
      throw new Error('AI服务未配置API密钥')
    }

    const systemPrompt = `你是水晶ERP系统的智能助理，专门帮助用户处理采购、库存、产品管理等业务问题。

请根据用户的问题提供专业、准确的回答。如果涉及具体的数据查询，请说明需要查看相关模块。

当前系统功能包括：
- 采购管理：采购录入、采购列表查询
- 产品管理：成品制作、销售列表查询
- 库存管理：库存查询和统计
- 供应商管理：供应商信息维护
- 用户管理：用户权限管理

请用简洁、专业的语言回答，并在适当时候提供操作建议。`

    const response = await fetch(`${DOUBAO_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DOUBAO_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: DOUBAO_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    })

    if (!response.ok) {
      throw new Error(`AI API请求失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('AI返回内容为空')
    }

    logger.info('智能助理对话成功', {
      userMessage: message,
      assistantResponse: content
    })

    return {
      success: true,
      data: {
        response: content,
        suggestions: [
          '查看采购列表',
          '录入新采购',
          '查看库存状态',
          '管理供应商信息'
        ]
      }
    }

  } catch (error) {
    logger.error('智能助理对话失败', {
      message,
      error: error instanceof Error ? error.message : '未知错误'
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : '对话失败'
    }
  }
}

// 获取业务洞察
export const getBusinessInsights = async (query: string, options?: {
  timeRange?: string
  includeFinancial?: boolean
  userId?: number
}): Promise<{
  success: boolean
  data?: {
    insights: string
    recommendations?: string[]
    metrics?: any
  }
  error?: string
}> => {
  try {
    if (!DOUBAO_CONFIG.apiKey) {
      throw new Error('AI服务未配置API密钥')
    }

    const { timeRange = '30d', includeFinancial = true } = options || {}

    const systemPrompt = `你是水晶ERP系统的业务分析专家，专门为珠宝行业提供数据洞察和业务建议。

请根据用户的查询需求，提供专业的业务分析和建议。

分析维度包括：
- 采购趋势分析
- 库存周转分析
- 供应商表现评估
- 产品销售分析
- 成本控制建议
- 市场趋势预测

请提供具体、可操作的建议，并用专业但易懂的语言表达。`

    const userPrompt = `请分析以下业务问题："${query}"

分析时间范围：${timeRange}
${includeFinancial ? '包含财务数据分析' : '不包含财务敏感数据'}

请提供：
1. 问题分析
2. 数据洞察
3. 具体建议
4. 风险提示（如有）`

    const response = await fetch(`${DOUBAO_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DOUBAO_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: DOUBAO_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      throw new Error(`AI API请求失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('AI返回内容为空')
    }

    logger.info('业务洞察分析成功', {
      query,
      timeRange,
      includeFinancial,
      insightsLength: content.length
    })

    return {
      success: true,
      data: {
        insights: content,
        recommendations: [
          '定期检查库存周转率',
          '优化供应商合作关系',
          '关注市场价格波动',
          '建立预警机制'
        ],
        metrics: {
          analysisDate: new Date().toISOString(),
          timeRange,
          includeFinancial
        }
      }
    }

  } catch (error) {
    logger.error('业务洞察分析失败', {
      query,
      error: error instanceof Error ? error.message : '未知错误'
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : '分析失败'
    }
  }
}

export { DOUBAO_CONFIG }