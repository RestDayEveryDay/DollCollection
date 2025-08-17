import React, { useState, useEffect } from 'react';
import './App.css';
import BottomNav from './components/BottomNav';
import Login from './components/Login';
import DollsPage from './pages/DollsPage';
import MakeupPage from './pages/MakeupPage';
import WardrobePage from './pages/WardrobePage';
import MyPage from './pages/MyPage';

function App() {
  const [activeTab, setActiveTab] = useState('dolls');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 检查是否已登录
  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    
    if (token && username) {
      // 验证token是否有效
      fetch('http://localhost:5000/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (response.ok) {
          setIsLoggedIn(true);
          setCurrentUser({ username });
        } else {
          // Token无效，清除本地存储
          localStorage.removeItem('token');
          localStorage.removeItem('username');
        }
      })
      .catch(error => {
        console.error('验证失败:', error);
      })
      .finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (user) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setActiveTab('dolls');
  };

  const renderCurrentPage = () => {
    switch(activeTab) {
      case 'dolls':
        return <DollsPage currentUser={currentUser} />;
      case 'makeup':
        return <MakeupPage currentUser={currentUser} />;
      case 'wardrobe':
        return <WardrobePage currentUser={currentUser} />;
      case 'profile':
        return <MyPage onNavigate={setActiveTab} currentUser={currentUser} onLogout={handleLogout} />;
      default:
        return <DollsPage currentUser={currentUser} />;
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">加载中...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <div className="app-header">
        <span className="welcome-text">欢迎，{currentUser?.username}</span>
        <button className="logout-btn" onClick={handleLogout}>退出</button>
      </div>
      <main className="main-content">
        {renderCurrentPage()}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;