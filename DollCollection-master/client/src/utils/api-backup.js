// API工具函数 - 连接到备份数据库服务器

const getApiBaseUrl = () => {
  // 强制使用备份服务器端口
  return 'http://localhost:5001';
};

const API_BASE_URL = getApiBaseUrl();

// 带认证的fetch函数
export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };
  
  // 如果有token，添加到请求头
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // 合并选项
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };
  
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const response = await fetch(fullUrl, finalOptions);
  
  // 如果是401错误，清除token并跳转到登录页
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
    throw new Error('Unauthorized');
  }
  
  return response;
};

// 便捷的API方法
export const api = {
  get: (url) => authFetch(url),
  
  post: (url, data) => authFetch(url, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  put: (url, data) => authFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  delete: (url) => authFetch(url, {
    method: 'DELETE'
  })
};

export default api;