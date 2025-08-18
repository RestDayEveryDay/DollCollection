// API工具函数 - 自动添加认证token

// 智能判断API地址：
// 1. 如果设置了环境变量，使用环境变量
// 2. 如果在Vercel上（通过域名判断），使用相对路径（同域）
// 3. 否则使用本地开发地址
const getApiBaseUrl = () => {
  // 如果有环境变量，优先使用
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 如果是生产环境（部署在Vercel），使用相对路径
  // 这样API和前端在同一个域名下
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return ''; // 空字符串表示使用相对路径
  }
  
  // 本地开发环境
  return 'http://localhost:5000';
};

const API_BASE_URL = getApiBaseUrl();

// 带认证的fetch函数
export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  };

  // 如果有token，添加Authorization header
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  // 合并选项
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    }
  };

  const response = await fetch(url, finalOptions);
  
  // 如果返回401，说明token无效，清除本地存储并跳转到登录页
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.reload(); // 重新加载页面，会自动跳转到登录页
  }
  
  return response;
};

// 便捷的GET请求
export const apiGet = async (endpoint) => {
  const response = await authFetch(`${API_BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.json();
};

// 便捷的POST请求
export const apiPost = async (endpoint, data) => {
  const response = await authFetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }
  return response.json();
};

// 便捷的PUT请求
export const apiPut = async (endpoint, data) => {
  const response = await authFetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }
  return response.json();
};

// 便捷的DELETE请求
export const apiDelete = async (endpoint) => {
  const response = await authFetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }
  return response.json();
};

// 文件上传
export const apiUpload = async (endpoint, file) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    },
    body: formData,
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.reload();
  }

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return response.json();
};