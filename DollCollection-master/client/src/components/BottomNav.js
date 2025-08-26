import React, { useState, useRef, useEffect } from 'react';
import './BottomNav.css';

const BottomNav = ({ activeTab, onTabChange, onAddDollHead, onAddDollBody, onAddMakeupArtist, onAddWardrobe }) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showWardrobeSubmenu, setShowWardrobeSubmenu] = useState(false);
  const menuRef = useRef(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowAddMenu(false);
        setShowWardrobeSubmenu(false);
      }
    };

    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddMenu]);
  const tabs = [
    { id: 'dolls', label: '娃柜', icon: '🎎' },
    { id: 'makeup', label: '妆师', icon: '💄' },
    { id: 'wardrobe', label: '衣柜', icon: '👗' },
    { id: 'profile', label: '我的', icon: '👤' }
  ];

  const wardrobeCategories = [
    { id: 'body_accessories', name: '身体配件', icon: '💍' },
    { id: 'eyes', name: '眼珠', icon: '👁️' },
    { id: 'wigs', name: '假发', icon: '💇' },
    { id: 'headwear', name: '头饰', icon: '👑' },
    { id: 'sets', name: '套装', icon: '👗' },
    { id: 'single_items', name: '单品', icon: '👕' },
    { id: 'handheld', name: '手持物', icon: '🎀' }
  ];

  const handleAddClick = () => {
    setShowAddMenu(!showAddMenu);
    if (!showAddMenu) {
      setShowWardrobeSubmenu(false);
    }
  };

  const handleOptionClick = (callback) => {
    if (callback) {
      callback();
    }
    setShowAddMenu(false);
    setShowWardrobeSubmenu(false);
  };

  return (
    <nav className="bottom-nav">
      <div className="nav-container">
        {tabs.slice(0, 2).map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
        
        {/* 中间的添加按钮 */}
        <div className="add-button-container" ref={menuRef}>
          {/* 添加菜单 */}
          {showAddMenu && (
            <div className="add-menu">
              {/* 主菜单 */}
              <div className={`add-menu-items ${showWardrobeSubmenu ? 'hidden' : ''}`}>
                <button 
                  className="add-menu-item"
                  onClick={() => handleOptionClick(onAddDollHead)}
                >
                  <span className="add-menu-icon">👤</span>
                  <span className="add-menu-text">添加娃头</span>
                </button>
                
                <button 
                  className="add-menu-item"
                  onClick={() => handleOptionClick(onAddDollBody)}
                >
                  <span className="add-menu-icon">👔</span>
                  <span className="add-menu-text">添加娃身</span>
                </button>
                
                <button 
                  className="add-menu-item"
                  onClick={() => handleOptionClick(onAddMakeupArtist)}
                >
                  <span className="add-menu-icon">💄</span>
                  <span className="add-menu-text">添加妆师</span>
                </button>
                
                <button 
                  className="add-menu-item"
                  onClick={() => setShowWardrobeSubmenu(true)}
                >
                  <span className="add-menu-icon">👗</span>
                  <span className="add-menu-text">添加配件</span>
                  <span className="add-menu-arrow">›</span>
                </button>
              </div>

              {/* 衣柜子菜单 */}
              {showWardrobeSubmenu && (
                <div className="add-submenu">
                  <button 
                    className="add-back-button"
                    onClick={() => setShowWardrobeSubmenu(false)}
                  >
                    <span className="add-back-arrow">‹</span>
                    <span>返回</span>
                  </button>
                  
                  <div className="add-submenu-items">
                    {wardrobeCategories.map(category => (
                      <button 
                        key={category.id}
                        className="add-menu-item"
                        onClick={() => handleOptionClick(() => onAddWardrobe(category.id))}
                      >
                        <span className="add-menu-icon">{category.icon}</span>
                        <span className="add-menu-text">{category.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <button
            className={`nav-tab nav-add ${showAddMenu ? 'active' : ''}`}
            onClick={handleAddClick}
            title="快速添加"
          >
            <span className="nav-icon nav-add-icon">{showAddMenu ? '×' : '+'}</span>
          </button>
        </div>
        
        {tabs.slice(2).map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;