// Vercel Serverless Function - 处理所有/api/wardrobe/*请求
// 这是一个动态路由，可以处理wardrobe的所有子路径

export default function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 临时返回模拟数据，实际应该连接数据库
  // 这里只是为了解决401错误，让前端能正常显示
  const mockData = {
    body_accessories: [],
    eyes: [],
    wigs: [],
    headwear: [],
    sets: [],
    single_items: [],
    handheld: []
  };

  const path = req.query.path?.join('/') || '';
  const category = path.split('/')[0];

  // 检查是否有token（简单验证）
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 如果没有token，返回空数组而不是401
    // 这样至少页面能显示
    return res.status(200).json([]);
  }

  // 返回对应分类的数据
  res.status(200).json(mockData[category] || []);
}