// 安全中间件和验证函数

// SQL注入防护：验证和清理输入
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // 移除危险的SQL关键字和特殊字符
  const dangerousPatterns = [
    /(\b)(DELETE|DROP|EXEC|EXECUTE|INSERT|SELECT|UNION|UPDATE|ALTER|CREATE)(\b)/gi,
    /[;'"\\]/g, // 移除分号、引号和反斜杠
    /--/g, // 移除SQL注释
    /\/\*/g, // 移除多行注释开始
    /\*\//g, // 移除多行注释结束
  ];
  
  let cleaned = input;
  dangerousPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  return cleaned.trim();
}

// 验证ID参数（应该是正整数）
function validateId(id) {
  const numId = parseInt(id);
  if (isNaN(numId) || numId <= 0) {
    throw new Error('无效的ID参数');
  }
  return numId;
}

// 验证价格参数（应该是非负数）
function validatePrice(price) {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice < 0) {
    throw new Error('无效的价格参数');
  }
  return numPrice;
}

// 验证日期格式（YYYY-MM-DD）
function validateDate(date) {
  if (!date) return null;
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new Error('无效的日期格式，应为 YYYY-MM-DD');
  }
  
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    throw new Error('无效的日期');
  }
  
  return date;
}

// 验证月份格式（YYYY-MM）
function validateMonth(month) {
  if (!month) return null;
  
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(month)) {
    throw new Error('无效的月份格式，应为 YYYY-MM');
  }
  
  return month;
}

// 验证枚举值
function validateEnum(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} 的值必须是以下之一: ${allowedValues.join(', ')}`);
  }
  return value;
}

// 验证字符串长度
function validateStringLength(str, maxLength, fieldName) {
  if (typeof str !== 'string') {
    throw new Error(`${fieldName} 必须是字符串`);
  }
  
  if (str.length > maxLength) {
    throw new Error(`${fieldName} 长度不能超过 ${maxLength} 个字符`);
  }
  
  return str;
}

// 验证必填字段
function validateRequired(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${fieldName} 是必填项`);
  }
  return value;
}

// 验证文件URL（防止路径遍历攻击）
function validateFileUrl(url) {
  if (!url) return null;
  
  // 检查是否包含危险的路径遍历模式
  const dangerousPatterns = [
    /\.\./g, // 父目录遍历
    /^\//, // 绝对路径
    /^[A-Z]:/i, // Windows驱动器路径
    /[<>"|?*]/g, // 非法文件名字符
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(url)) {
      throw new Error('文件URL包含非法字符或路径');
    }
  }
  
  return url;
}

// 验证娃头/娃体数据
function validateDollData(data) {
  const validated = {};
  
  // 必填字段
  validated.name = validateRequired(sanitizeInput(data.name), '名称');
  validated.name = validateStringLength(validated.name, 100, '名称');
  
  // 可选字段
  if (data.company !== undefined) {
    validated.company = validateStringLength(sanitizeInput(data.company), 100, '娃社');
  }
  
  if (data.skin_tone !== undefined) {
    validated.skin_tone = validateStringLength(sanitizeInput(data.skin_tone), 50, '肤色');
  }
  
  if (data.size_category !== undefined) {
    validated.size_category = validateEnum(
      data.size_category,
      ['ob11', '四分', '70', '75', ''],
      '尺寸'
    );
  }
  
  if (data.ownership_status !== undefined) {
    validated.ownership_status = validateEnum(
      data.ownership_status,
      ['owned', 'preorder'],
      '拥有状态'
    );
  }
  
  if (data.payment_status !== undefined) {
    validated.payment_status = validateEnum(
      data.payment_status,
      ['deposit_only', 'full_paid'],
      '付款状态'
    );
  }
  
  // 价格字段
  const priceFields = ['original_price', 'actual_price', 'total_price', 'deposit', 'final_payment'];
  priceFields.forEach(field => {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      validated[field] = validatePrice(data[field]);
    }
  });
  
  // 日期字段
  if (data.final_payment_date !== undefined) {
    validated.final_payment_date = validateDate(data.final_payment_date);
  }
  
  if (data.release_date !== undefined) {
    validated.release_date = validateMonth(data.release_date);
  }
  
  if (data.received_date !== undefined) {
    validated.received_date = validateMonth(data.received_date);
  }
  
  // 图片URL
  if (data.profile_image_url !== undefined) {
    validated.profile_image_url = validateFileUrl(data.profile_image_url);
  }
  
  // 图片位置参数
  if (data.image_position_x !== undefined) {
    const x = parseFloat(data.image_position_x);
    if (isNaN(x) || x < -100 || x > 200) {
      throw new Error('图片X位置必须在 -100 到 200 之间');
    }
    validated.image_position_x = x;
  }
  
  if (data.image_position_y !== undefined) {
    const y = parseFloat(data.image_position_y);
    if (isNaN(y) || y < -100 || y > 200) {
      throw new Error('图片Y位置必须在 -100 到 200 之间');
    }
    validated.image_position_y = y;
  }
  
  if (data.image_scale !== undefined) {
    const scale = parseFloat(data.image_scale);
    if (isNaN(scale) || scale < 50 || scale > 300) {
      throw new Error('图片缩放必须在 50 到 300 之间');
    }
    validated.image_scale = scale;
  }
  
  return validated;
}

// 验证衣柜物品数据
function validateWardrobeData(data) {
  const validated = {};
  
  // 必填字段
  validated.name = validateRequired(sanitizeInput(data.name), '名称');
  validated.name = validateStringLength(validated.name, 100, '名称');
  
  validated.category = validateRequired(data.category, '分类');
  validated.category = validateEnum(
    data.category,
    ['body_accessories', 'eyes', 'wigs', 'headwear', 'sets', 'single_items', 'handheld'],
    '分类'
  );
  
  // 其他字段验证类似娃头/娃体
  // ... (可以复用上面的验证逻辑)
  
  return validated;
}

// Express中间件：请求验证
function securityMiddleware(req, res, next) {
  // 记录请求信息（用于审计）
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`[${timestamp}] ${method} ${path} from ${ip}`);
  
  // 限制请求体大小（防止DoS攻击）
  if (req.body && JSON.stringify(req.body).length > 1024 * 1024) { // 1MB限制
    return res.status(413).json({ error: '请求数据过大' });
  }
  
  // 清理所有字符串输入
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    });
  }
  
  if (req.params) {
    Object.keys(req.params).forEach(key => {
      if (typeof req.params[key] === 'string') {
        req.params[key] = sanitizeInput(req.params[key]);
      }
    });
  }
  
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key]);
      }
    });
  }
  
  next();
}

// 速率限制器（防止暴力攻击）
const requestCounts = new Map();
const RATE_LIMIT = 100; // 每分钟最多100个请求
const RATE_WINDOW = 60000; // 1分钟窗口

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, firstRequest: now });
  } else {
    const ipData = requestCounts.get(ip);
    
    // 检查时间窗口
    if (now - ipData.firstRequest > RATE_WINDOW) {
      // 重置计数器
      ipData.count = 1;
      ipData.firstRequest = now;
    } else {
      ipData.count++;
      
      // 检查是否超过限制
      if (ipData.count > RATE_LIMIT) {
        return res.status(429).json({ 
          error: '请求过于频繁，请稍后再试' 
        });
      }
    }
  }
  
  next();
}

// 清理过期的速率限制记录
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now - data.firstRequest > RATE_WINDOW) {
      requestCounts.delete(ip);
    }
  }
}, RATE_WINDOW);

module.exports = {
  sanitizeInput,
  validateId,
  validatePrice,
  validateDate,
  validateMonth,
  validateEnum,
  validateStringLength,
  validateRequired,
  validateFileUrl,
  validateDollData,
  validateWardrobeData,
  securityMiddleware,
  rateLimiter
};