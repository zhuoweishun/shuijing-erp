// AI服务集成模块
// 支持豆包AI、通义千问等外部AI API进行自然语言智能识别

import { BUILT_IN_AI_CONFIG, hasBuiltInAPIKey, getBuiltInAIConfig } from '../config/aiConfig';

interface AIRecognitionResult {
  productName?: string;
  quantity?: string;
  quality?: string;
  size?: string;
  weight?: string;
  unitPrice?: string;
  totalPrice?: string;
  supplier?: string;
}

interface AIServiceConfig {
  provider: 'doubao' | 'tongyi';
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

// 豆包AI API配置
const DOUBAO_CONFIG = {
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  model: 'doubao-1.5-pro-32k-250115',
};

// 通义千问API配置
const TONGYI_CONFIG = {
  baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
  model: 'qwen-turbo',
};

class AIService {
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
  }

  /**
   * 使用外部AI API进行自然语言识别
   * @param text 自然语言文本
   * @returns 识别结果
   */
  async recognizeWithAI(text: string): Promise<AIRecognitionResult> {
    const prompt = this.buildPrompt(text);
    
    try {
      switch (this.config.provider) {
        case 'doubao':
          return await this.callDoubaoAPI(prompt);
        case 'tongyi':
          return await this.callTongyiAPI(prompt);
        default:
          throw new Error(`不支持的AI服务提供商: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('AI识别失败:', error);
      throw new Error('AI识别服务暂时不可用，请稍后重试');
    }
  }

  /**
   * 构建AI识别提示词 - 增强版本，专门处理水晶行业口语化表达
   */
  private buildPrompt(text: string): string {
    return `你是一个专业的水晶行业数据提取助手。请从以下文本中提取结构化信息：

文本："${text}"

请理解水晶行业的专业知识和口语化表达：

1. 产品类型识别：
   - 水晶类：紫水晶、黄水晶、白水晶、粉水晶、绿幽灵等
   - 其他宝石：玛瑙、琥珀、翡翠等
   - 产品形式：手串、项链、吊坠、原石等

2. 品相等级标准化：
   - "极品"、"精品"、"顶级"、"顶品"、"全净体"、"纯净体" → AA
   - "干净"、"纯净"、"透明"、"清澈"、"品相好" → A
   - "有棉"、"有絮"、"有杂质"、"品相一般" → C
   - "有裂"、"冰裂"、"裂纹" → B
   - 直接标注的"AA"、"A"、"B"、"C"保持不变

3. 尺寸识别和格式要求（重要）：
   - "尺寸是15mm的"、"尺寸15mm"、"15mm的" → 只提取数字："15"
   - "15米的"、"15米" → "15"（水晶行业口语，"米"实际指"毫米"）
   - "1.5厘米"、"1.5cm" → "15"（转换为毫米后只保留数字）
   - "12毫米" → "12"
   - **重要：尺寸字段只输出纯数字，不包含任何单位符号**

4. 数量识别：
   - "5串"、"3颗"、"2个"、"一条" → 提取数字
   - "一"→1，"二"→2，"三"→3等中文数字转换

5. 价格识别：
   - "总价5000"、"花了5000"、"5000块" → totalPrice: "5000"
   - "克价200"、"一克200" → unitPrice: "200"
   - "克价一块5" → unitPrice: "1.5"

6. 供应商识别（重要：保留完整店铺名称）：
   - "阿牛水晶买的" → supplier: "阿牛水晶"
   - "王五珠宝买的" → supplier: "王五珠宝"
   - "张三玉器买的" → supplier: "张三玉器"
   - "李四首饰买的" → supplier: "李四首饰"
   - "在某某水晶店" → supplier: "某某水晶店"
   - **重要：必须保留完整的店铺名称，包括"水晶"、"珠宝"、"玉器"、"首饰"等后缀**
   - 如果只有人名没有店铺类型，如"王五家买的" → supplier: "王五"

7. 智能计算功能（重要）：
   根据重量、克价、总价之间的关系进行自动计算：
   - 如果有总价和克价，计算重量：重量 = 总价 ÷ 克价
   - 如果有重量和克价，计算总价：总价 = 重量 × 克价
   - 如果有重量和总价，计算克价：克价 = 总价 ÷ 重量
   - 计算结果保留2位小数

请严格按照以下JSON格式输出，不要添加任何其他文字：
{
  "productName": "产品名称",
  "quantity": "数量（纯数字）",
  "quality": "品相等级（AA/A/B/C）",
  "size": "尺寸（纯数字，不含单位）",
  "weight": "重量（纯数字，如果能计算出来）",
  "unitPrice": "单价/克价（纯数字）",
  "totalPrice": "总价（纯数字）",
  "supplier": "供应商名称"
}

重要提醒：
- 只输出JSON格式，不要任何解释文字
- 未识别的字段设为null
- 所有数字字段只保留数值，不包含任何单位符号
- 尺寸字段特别重要：只输出纯数字，如"15"而不是"15mm"
- 利用智能计算功能自动补全缺失的重量、克价或总价字段
- 特别注意"尺寸是15mm的"这种表述要正确识别为"15"（纯数字）`;
  }

  /**
   * 调用豆包AI API
   */
  private async callDoubaoAPI(prompt: string): Promise<AIRecognitionResult> {
    if (!this.config.apiKey) {
      throw new Error('豆包AI API Key未配置');
    }

    console.log('=== 豆包AI API调用开始 ===');
    console.log('API Key长度:', this.config.apiKey.length);
    console.log('提示词长度:', prompt.length);

    const requestBody = {
      model: this.config.model || DOUBAO_CONFIG.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1000,
    };
    
    try {
      console.log('发送请求到豆包AI...');
      const response = await fetch(`${DOUBAO_CONFIG.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-TT-LOGID': Date.now().toString(),
        },
        body: JSON.stringify(requestBody),
      });

      console.log('豆包AI响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('豆包AI API错误响应:', errorText);
        throw new Error(`豆包AI API调用失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('豆包AI返回数据:', data);
      
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        console.error('豆包AI返回内容为空');
        throw new Error('豆包AI返回内容为空');
      }
      
      console.log('豆包AI识别结果:', content);
      return this.parseAIResponse(content);
    } catch (error) {
      console.error('豆包AI API调用失败:', error);
      
      // 如果API调用失败，抛出错误
      throw error;
    }
  }

  /**
   * 调用通义千问API
   */
  private async callTongyiAPI(prompt: string): Promise<AIRecognitionResult> {
    if (!this.config.apiKey) {
      throw new Error('通义千问API Key未配置');
    }

    const response = await fetch(`${TONGYI_CONFIG.baseUrl}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || TONGYI_CONFIG.model,
        input: {
          prompt: prompt
        },
        parameters: {
          temperature: 0.1,
          max_tokens: 1000,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`通义千问API调用失败: ${response.status}`);
    }

    const data = await response.json();
    const content = data.output?.text;
    
    if (!content) {
      throw new Error('通义千问返回内容为空');
    }

    return this.parseAIResponse(content);
  }

  /**
   * 解析AI返回的JSON结果
   */
  private parseAIResponse(content: string): AIRecognitionResult {
    try {
      // 尝试提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI返回内容中未找到JSON格式数据');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      // 数据清洗和验证
      return {
        productName: result.productName || undefined,
        quantity: result.quantity ? String(result.quantity) : undefined,
        quality: result.quality || undefined,
        size: result.size || undefined,
        weight: result.weight ? String(result.weight) : undefined,
        unitPrice: result.unitPrice ? String(result.unitPrice) : undefined,
        totalPrice: result.totalPrice ? String(result.totalPrice) : undefined,
        supplier: result.supplier || undefined,
      };
    } catch (error) {
      console.error('解析AI返回结果失败:', error);
      console.error('AI返回内容:', content);
      throw new Error('AI返回结果格式错误，无法解析');
    }
  }
}

// 创建AI服务实例的工厂函数
export function createAIService(config: AIServiceConfig): AIService {
  return new AIService(config);
}

// 获取全局AI配置 - 优先使用内置配置
export function getGlobalAIConfig(): AIServiceConfig {
  // 优先使用内置的API配置
  if (hasBuiltInAPIKey()) {
    const builtInConfig = getBuiltInAIConfig();
    return {
      provider: builtInConfig.provider,
      apiKey: builtInConfig.apiKey,
      baseUrl: builtInConfig.baseUrl,
      model: builtInConfig.model,
    };
  }

  // 如果没有内置配置，尝试从localStorage读取
  try {
    const savedConfig = localStorage.getItem('ai_service_config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      if (config.apiKey) {
        return {
          provider: config.provider || 'doubao',
          apiKey: config.apiKey,
          baseUrl: config.provider === 'doubao' ? DOUBAO_CONFIG.baseUrl : 
                  config.provider === 'tongyi' ? TONGYI_CONFIG.baseUrl : DOUBAO_CONFIG.baseUrl,
          model: config.provider === 'doubao' ? DOUBAO_CONFIG.model : 
                 config.provider === 'tongyi' ? TONGYI_CONFIG.model : DOUBAO_CONFIG.model,
        };
      }
    }
  } catch (error) {
    console.error('读取AI配置失败:', error);
  }

  // 如果都没有，抛出错误
  throw new Error('未找到可用的AI配置，请联系管理员');
}

// 保存AI配置到localStorage
export function saveGlobalAIConfig(config: { provider: string; apiKey?: string }): void {
  try {
    localStorage.setItem('ai_service_config', JSON.stringify(config));
  } catch (error) {
    console.error('保存AI配置失败:', error);
    throw new Error('保存AI配置失败');
  }
}

// 默认配置（兼容旧版本）
export function getDefaultAIConfig(): AIServiceConfig {
  return getGlobalAIConfig();
}

export type { AIRecognitionResult, AIServiceConfig };
export { AIService };