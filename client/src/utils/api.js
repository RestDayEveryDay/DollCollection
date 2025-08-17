// API工具函数 - 自动添加认证token

const API_BASE_URL = 'http://localhost:5000';

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