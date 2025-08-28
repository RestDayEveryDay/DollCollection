import React, { useState, useEffect } from 'react';
import { authFetch } from './utils/api';
import './theme.css';
import './App.css';
import './dark-mode.css';
import { ThemeProvider } from './contexts/ThemeContext';
import BottomNav from './components/BottomNav';
import Login from './components/Login';
import DollsPage from './pages/DollsPage';
import MakeupPage from './pages/MakeupPage';
import WardrobePage from './pages/WardrobePage';
import MyPage from './pages/MyPage';
import DollHeadEditModal from './components/DollHeadEditModal';
import DollBodyEditModal from './components/DollBodyEditModal';
import MakeupArtistEditModal from './components/MakeupArtistEditModal';
import WardrobeEditModal from './components/WardrobeEditModal';
import { apiPost } from './utils/api';

function App() {
  const [activeTab, setActiveTab] = useState('dolls');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal states for quick add
  const [showDollHeadModal, setShowDollHeadModal] = useState(false);
  const [showDollBodyModal, setShowDollBodyModal] = useState(false);
  const [showMakeupArtistModal, setShowMakeupArtistModal] = useState(false);
  const [showWardrobeModal, setShowWardrobeModal] = useState(false);
  const [wardrobeCategory, setWardrobeCategory] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // 检查是否已登录
  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    
    if (token && username) {
      // 验证token是否有效
      authFetch('/api/auth/verify')
      .then(() => {
        setIsLoggedIn(true);
        setCurrentUser({ username });
      })
      .catch(error => {
        console.error('验证失败:', error);
        // Token无效，清除本地存储
        localStorage.removeItem('token');
        localStorage.removeItem('username');
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

  // Quick add handlers
  const handleAddDollHead = () => {
    setShowDollHeadModal(true);
  };

  const handleAddDollBody = () => {
    setShowDollBodyModal(true);
  };

  const handleAddMakeupArtist = () => {
    setShowMakeupArtistModal(true);
  };

  const handleAddWardrobe = (category) => {
    setWardrobeCategory(category);
    setShowWardrobeModal(true);
  };

  // Submit handlers
  const handleSubmitDollHead = async (formData) => {
    try {
      await apiPost('/api/dolls/heads', formData);
      setShowDollHeadModal(false);
      setRefreshKey(prev => prev + 1); // 触发页面刷新
      if (activeTab !== 'dolls') {
        setActiveTab('dolls');
      }
    } catch (error) {
      console.error('添加娃头失败:', error);
    }
  };

  const handleSubmitDollBody = async (formData) => {
    try {
      await apiPost('/api/dolls/bodies', formData);
      setShowDollBodyModal(false);
      setRefreshKey(prev => prev + 1);
      if (activeTab !== 'dolls') {
        setActiveTab('dolls');
      }
    } catch (error) {
      console.error('添加娃身失败:', error);
    }
  };

  const handleSubmitMakeupArtist = async (formData) => {
    try {
      await apiPost('/api/makeup-artists', formData);
      setShowMakeupArtistModal(false);
      setRefreshKey(prev => prev + 1);
      if (activeTab !== 'makeup') {
        setActiveTab('makeup');
      }
    } catch (error) {
      console.error('添加妆师失败:', error);
    }
  };

  const handleSubmitWardrobe = async (formData) => {
    try {
      const submitData = {
        ...formData,
        category: wardrobeCategory
      };
      await apiPost('/api/wardrobe', submitData);
      setShowWardrobeModal(false);
      setWardrobeCategory(null);
      setRefreshKey(prev => prev + 1);
      if (activeTab !== 'wardrobe') {
        setActiveTab('wardrobe');
      }
    } catch (error) {
      console.error('添加配件失败:', error);
    }
  };

  const renderCurrentPage = () => {
    switch(activeTab) {
      case 'dolls':
        return <DollsPage key={refreshKey} currentUser={currentUser} />;
      case 'makeup':
        return <MakeupPage key={refreshKey} currentUser={currentUser} />;
      case 'wardrobe':
        return <WardrobePage key={refreshKey} currentUser={currentUser} />;
      case 'profile':
        return <MyPage onNavigate={setActiveTab} currentUser={currentUser} onLogout={handleLogout} />;
      default:
        return <DollsPage key={refreshKey} currentUser={currentUser} />;
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
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onAddDollHead={handleAddDollHead}
        onAddDollBody={handleAddDollBody}
        onAddMakeupArtist={handleAddMakeupArtist}
        onAddWardrobe={handleAddWardrobe}
      />
      
      {/* 快速添加的 Modals */}
      <DollHeadEditModal
        isOpen={showDollHeadModal}
        onClose={() => setShowDollHeadModal(false)}
        onSubmit={handleSubmitDollHead}
        headData={null}
        isEditing={false}
      />
      
      <DollBodyEditModal
        isOpen={showDollBodyModal}
        onClose={() => setShowDollBodyModal(false)}
        onSubmit={handleSubmitDollBody}
        bodyData={null}
        isEditing={false}
      />
      
      <MakeupArtistEditModal
        isOpen={showMakeupArtistModal}
        onClose={() => setShowMakeupArtistModal(false)}
        onSubmit={handleSubmitMakeupArtist}
        artistData={null}
        isEditing={false}
      />
      
      <WardrobeEditModal
        isOpen={showWardrobeModal}
        onClose={() => {
          setShowWardrobeModal(false);
          setWardrobeCategory(null);
        }}
        onSubmit={handleSubmitWardrobe}
        itemData={{ ownership_status: 'preorder' }}
        isEditing={false}
        category={wardrobeCategory}
      />
    </div>
  );
}

// 包装App组件使用ThemeProvider
function AppWithTheme() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

export default AppWithTheme;