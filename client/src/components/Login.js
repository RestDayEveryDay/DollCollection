import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isLoginMode && formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 保存token到localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.user.username);
        
        // 调用父组件的登录成功回调
        onLogin(data.user);
        
        if (!isLoginMode) {
          alert('注册成功！已自动登录');
        }
      } else {
        setError(data.error || (isLoginMode ? '登录失败' : '注册失败'));
      }
    } catch (error) {
      console.error('认证失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
    setFormData({
      username: '',
      password: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">
            {isLoginMode ? '🎎 欢迎回来' : '🌸 加入我们'}
          </h1>
          <p className="login-subtitle">
            {isLoginMode ? '登录你的娃娃收藏系统' : '创建新的收藏账户'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="请输入用户名"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="请输入密码"
              required
              autoComplete={isLoginMode ? "current-password" : "new-password"}
            />
          </div>

          {!isLoginMode && (
            <div className="form-group">
              <label htmlFor="confirmPassword">确认密码</label>
              <input
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="请再次输入密码"
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? '处理中...' : (isLoginMode ? '登录' : '注册')}
          </button>
        </form>

        <div className="switch-mode">
          <span>
            {isLoginMode ? '还没有账户？' : '已有账户？'}
          </span>
          <button 
            onClick={switchMode}
            className="switch-btn"
            type="button"
          >
            {isLoginMode ? '立即注册' : '立即登录'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Login;