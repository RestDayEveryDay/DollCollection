import React, { useState, useEffect, useRef } from 'react';
import './FloatingActionButton.css';

const FloatingActionButton = ({ onAddDollHead, onAddDollBody, onAddMakeupArtist, onAddWardrobe }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showWardrobeSubmenu, setShowWardrobeSubmenu] = useState(false);
  const menuRef = useRef(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowWardrobeSubmenu(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setShowWardrobeSubmenu(false);
    }
  };

  const handleOptionClick = (callback) => {
    if (callback) {
      callback();
    }
    setIsOpen(false);
    setShowWardrobeSubmenu(false);
  };

  const wardrobeCategories = [
    { id: 'body_accessories', name: '身体配件', icon: '💍' },
    { id: 'eyes', name: '眼珠', icon: '👁️' },
    { id: 'wigs', name: '假发', icon: '💇' },
    { id: 'headwear', name: '头饰', icon: '👑' },
    { id: 'sets', name: '套装', icon: '👗' },
    { id: 'single_items', name: '单品', icon: '👕' },
    { id: 'handheld', name: '手持物', icon: '🎀' }
  ];

  return (
    <div className="floating-action-button-container" ref={menuRef}>
      {/* 选项菜单 */}
      {isOpen && (
        <div className="fab-menu">
          {/* 主菜单 */}
          <div className={`fab-menu-items ${showWardrobeSubmenu ? 'hidden' : ''}`}>
            <button 
              className="fab-menu-item"
              onClick={() => handleOptionClick(onAddDollHead)}
            >
              <span className="fab-menu-icon">👤</span>
              <span className="fab-menu-text">添加娃头</span>
            </button>
            
            <button 
              className="fab-menu-item"
              onClick={() => handleOptionClick(onAddDollBody)}
            >
              <span className="fab-menu-icon">👔</span>
              <span className="fab-menu-text">添加娃身</span>
            </button>
            
            <button 
              className="fab-menu-item"
              onClick={() => handleOptionClick(onAddMakeupArtist)}
            >
              <span className="fab-menu-icon">💄</span>
              <span className="fab-menu-text">添加妆师</span>
            </button>
            
            <button 
              className="fab-menu-item"
              onClick={() => setShowWardrobeSubmenu(true)}
            >
              <span className="fab-menu-icon">👗</span>
              <span className="fab-menu-text">添加配件</span>
              <span className="fab-menu-arrow">›</span>
            </button>
          </div>

          {/* 衣柜子菜单 */}
          {showWardrobeSubmenu && (
            <div className="fab-submenu">
              <button 
                className="fab-back-button"
                onClick={() => setShowWardrobeSubmenu(false)}
              >
                <span className="fab-back-arrow">‹</span>
                <span>返回</span>
              </button>
              
              <div className="fab-submenu-items">
                {wardrobeCategories.map(category => (
                  <button 
                    key={category.id}
                    className="fab-menu-item"
                    onClick={() => handleOptionClick(() => onAddWardrobe(category.id))}
                  >
                    <span className="fab-menu-icon">{category.icon}</span>
                    <span className="fab-menu-text">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 主按钮 */}
      <button 
        className={`fab-main ${isOpen ? 'fab-open' : ''}`}
        onClick={handleToggle}
        title="快速添加"
      >
        <span className="fab-icon">
          {isOpen ? '×' : '+'}
        </span>
      </button>
    </div>
  );
};

export default FloatingActionButton;