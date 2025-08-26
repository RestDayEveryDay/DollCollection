// Vercel Serverless Function - 处理所有API请求
// 这是一个通配符路由，可以处理所有/api/*请求

export default function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 获取请求路径
  const path = req.query.all ? req.query.all.join('/') : '';
  
  console.log('API Request:', path, req.method);

  // 模拟数据响应
  const mockResponses = {
    'doll-heads': [],
    'doll-bodies': [],
    'dolls/stats': { total: 0, heads: 0, bodies: 0 },
    'makeup-artists': [],
    'makeup-appointments': [],
    'stats/total-expenses': { total: 0 },
    'wardrobe/body_accessories': [],
    'wardrobe/eyes': [],
    'wardrobe/wigs': [],
    'wardrobe/headwear': [],
    'wardrobe/sets': [],
    'wardrobe/single_items': [],
    'wardrobe/handheld': [],
    'auth/verify': { valid: true, user: { username: '访客' } }
  };

  // 特殊处理登录请求
  if (path === 'auth/login' && req.method === 'POST') {
    const { username, password } = req.body || {};
    if (username === '休息日' && password === '200703') {
      return res.status(200).json({
        token: 'mock-token-' + Date.now(),
        user: { id: 1, username: '休息日' }
      });
    }
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  // 特殊处理注册请求
  if (path === 'auth/register' && req.method === 'POST') {
    const { username } = req.body || {};
    return res.status(200).json({
      token: 'mock-token-' + Date.now(),
      user: { id: Date.now(), username }
    });
  }

  // 返回模拟数据
  const responseData = mockResponses[path];
  if (responseData !== undefined) {
    return res.status(200).json(responseData);
  }

  // 对于未定义的路径，返回空数组或空对象
  if (path.includes('wardrobe') || path.includes('doll') || path.includes('makeup')) {
    return res.status(200).json([]);
  }

  // 默认返回
  res.status(200).json({ message: 'API endpoint: ' + path });
}