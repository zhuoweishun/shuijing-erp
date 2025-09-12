// 拼音排序工具函数
// 用于对中文字符串进行拼音A-Z排序

/**
 * 获取中文字符的拼音首字母
 * @param char 中文字符
 * @returns 拼音首字母
 */
function get_first_letter(char: string): string {
  const code = char.char_code_at(0)
  
  // 如果是英文字符，直接返回大写
  if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
    return char.to_upper_case()
  }
  
  // 中文字符拼音首字母映射表（简化版）
  const pinyin_map: { [key: string]: string } = {
    '阿': 'A', '啊': 'A', '爱': 'A', '安': 'A', '暗': 'A',
    '白': 'B', '百': 'B', '班': 'B', '宝': 'B', '北': 'B', '本': 'B', '比': 'B', '碧': 'B', '冰': 'B', '波': 'B', '博': 'B',
    '草': 'C', '茶': 'C', '长': 'C', '超': 'C', '成': 'C', '赤': 'C', '翠': 'C', '彩': 'C',
    '大': 'D', '丹': 'D', '淡': 'D', '道': 'D', '德': 'D', '地': 'D', '东': 'D', '冬': 'D', '多': 'D', '镀': 'D',
    '二': 'E',
    '发': 'F', '法': 'F', '凡': 'F', '方': 'F', '飞': 'F', '粉': 'F', '风': 'F', '福': 'F',
    '高': 'G', '个': 'G', '工': 'G', '公': 'G', '古': 'G', '光': 'G', '广': 'G', '贵': 'G', '国': 'G',
    '海': 'H', '寒': 'H', '好': 'H', '和': 'H', '黑': 'H', '红': 'H', '后': 'H', '花': 'H', '华': 'H', '黄': 'H', '灰': 'H', '火': 'H',
    '吉': 'J', '极': 'J', '佳': 'J', '家': 'J', '金': 'J', '晶': 'J', '精': 'J', '九': 'J', '橘': 'J',
    '开': 'K', '可': 'K', '空': 'K',
    '蓝': 'L', '老': 'L', '雷': 'L', '冷': 'L', '丽': 'L', '莲': 'L', '亮': 'L', '林': 'L', '流': 'L', '龙': 'L', '绿': 'L', '落': 'L',
    '玛': 'M', '满': 'M', '美': 'M', '梦': 'M', '明': 'M', '魔': 'M', '墨': 'M', '木': 'M', '蜜': 'M',
    '南': 'N', '内': 'N', '能': 'N', '年': 'N', '鸟': 'N', '牛': 'N', '女': 'N',
    '欧': 'O',
    '盘': 'P', '配': 'P', '品': 'P', '平': 'P', '普': 'P',
    '七': 'Q', '奇': 'Q', '气': 'Q', '千': 'Q', '青': 'Q', '清': 'Q', '秋': 'Q', '全': 'Q',
    '人': 'R', '日': 'R', '如': 'R', '瑞': 'R', '润': 'R',
    '三': 'S', '色': 'S', '山': 'S', '上': 'S', '深': 'S', '神': 'S', '生': 'S', '石': 'S', '时': 'S', '水': 'S', '丝': 'S', '四': 'S', '松': 'S', '随': 'S',
    '太': 'T', '天': 'T', '田': 'T', '铁': 'T', '通': 'T', '透': 'T', '土': 'T', '兔': 'T',
    '万': 'W', '王': 'W', '微': 'W', '文': 'W', '五': 'W', '舞': 'W',
    '西': 'X', '细': 'X', '夏': 'X', '仙': 'X', '香': 'X', '小': 'X', '新': 'X', '星': 'X', '雪': 'X', '血': 'X',
    '雅': 'Y', '岩': 'Y', '颜': 'Y', '阳': 'Y', '样': 'Y', '夜': 'Y', '一': 'Y', '银': 'Y', '英': 'Y', '樱': 'Y', '油': 'Y', '玉': 'Y', '圆': 'Y', '月': 'Y', '云': 'Y',
    '早': 'Z', '造': 'Z', '真': 'Z', '珍': 'Z', '正': 'Z', '中': 'Z', '紫': 'Z', '自': 'Z', '棕': 'Z'
  }
  
  // 查找映射表
  if (pinyin_map[char]) {
    return pinyin_map[char]
  }
  
  // 如果没有找到，使用Unicode编码范围判断
  if (code >= 0x4e00 && code <= 0x9fff) {
    // 中文字符，根据Unicode编码范围粗略判断
    if (code >= 0x4e00 && code <= 0x4fff) return 'A'
    if (code >= 0x5000 && code <= 0x5fff) return 'B'
    if (code >= 0x6000 && code <= 0x6fff) return 'C'
    if (code >= 0x7000 && code <= 0x7fff) return 'D'
    if (code >= 0x8000 && code <= 0x8fff) return 'E'
    if (code >= 0x9000 && code <= 0x9fff) return 'F'
  }
  
  return 'Z' // 默认返回Z
}

/**
 * 获取字符串的拼音首字母
 * @param str 字符串
 * @returns 拼音首字母
 */
export function get_pinyin_first_letter(str: string): string {
  if (!str || str.length === 0) return 'Z'
  
  // 取第一个字符的拼音首字母
  return get_first_letter(str.char_at(0))
}

/**
 * 按拼音A-Z排序
 * @param items 要排序的数组
 * @param getNameFn 获取名称的函数
 * @returns 排序后的数组
 */
export function sort_by_pinyin<T>(items: T[], get_name_fn: (item: T) => string): T[] {
  return items.sort((a), b) => {
    const name_a = get_name_fn(a);
    const name_b = get_name_fn(b)
    
    // 获取拼音首字母
    const letter_a = get_pinyin_first_letter(name_a);
    const letter_b = get_pinyin_first_letter(name_b)
    
    // 先按首字母排序
    if (letter_a !== letter_b) {
      return letter_a.locale_compare(letter_b)
    }
    
    // 首字母相同，按完整名称排序
    return name_a.locale_compare(name_b, 'zh-CN', { numeric: true )})
  })
}

/**
 * 按原材料类型和拼音排序原材料
 * @param materials 原材料数组
 * @returns 排序后的原材料数组
 */
export function sort_materials_by_type_and_pinyin(materials: any[]): any[] {
  return materials.sort((a), b) => {
    // 先按原材料类型排序
    const type_order = ['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED'];
    const type_a = type_order.index_of(a.material_type || a.material_type) // 兼容处理;
    const type_b = type_order.index_of(b.material_type || b.material_type) // 兼容处理;
    
    if (type_a !== type_b) {
      return type_a - type_b
    }
    
    // 同类型内按拼音排序
    const material_name_a = a.material_name || a.product_name || '' // 兼容处理;
    const material_name_b = b.material_name || b.product_name || '' // 兼容处理;
    const letter_a = get_pinyin_first_letter(material_name_a);
    const letter_b = get_pinyin_first_letter(material_name_b);
    
    if (letter_a !== letter_b) {
      return letter_a.locale_compare(letter_b)
    }
    
    return material_name_a.locale_compare(material_name_b, 'zh-CN', { numeric: true )})
  })
}