import React from 'react';
import './BottomNav.css';

const BottomNav = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dolls', label: '娃柜', icon: '🎎' },
    { id: 'makeup', label: '妆师', icon: '💄' },
    { id: 'wardrobe', label: '衣柜', icon: '👗' },
    { id: 'profile', label: '我的', icon: '👤' }
  ];

  return (
    <nav className="bottom-nav">
      <div className="nav-container">
        {tabs.map(tab => (
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