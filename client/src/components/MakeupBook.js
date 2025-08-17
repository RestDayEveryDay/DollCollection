import React, { useState, useEffect } from 'react';
import MakeupHistory from './MakeupHistory';
import CurrentMakeup from './CurrentMakeup';
import MakeupAppointment from './MakeupAppointment';
import UnmadeMakeup from './UnmadeMakeup';
import CopyableText from './CopyableText';
import './MakeupBook.css';

const MakeupBook = ({ headId }) => {
  const [historyRecords, setHistoryRecords] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const [currentMakeupStatus, setCurrentMakeupStatus] = useState('unmade'); // 'current', 'appointment', 'unmade'
  const [isFlipping, setIsFlipping] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showHistoryForm, setShowHistoryForm] = useState(false);

  useEffect(() => {
    if (headId) {
      fetchHistoryRecords();
      determineCurrentStatus();
    }
  }, [headId]);

  const fetchHistoryRecords = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/makeup-history/${headId}`);
      const data = await response.json();
      setHistoryRecords(data);
      // 默认显示最新的历史记录
      setCurrentHistoryIndex(0);
    } catch (error) {
      console.error('获取历史妆容失败:', error);
    }
  };

  const determineCurrentStatus = async () => {
    try {
      // 检查当前妆容
      const currentResponse = await fetch(`http://localhost:5000/api/current-makeup/${headId}`);
      if (currentResponse.ok) {
        setCurrentMakeupStatus('current');
        return;
      }

      // 检查约妆状态
      const appointmentResponse = await fetch(`http://localhost:5000/api/makeup-appointment/${headId}`);
      if (appointmentResponse.ok) {
        setCurrentMakeupStatus('appointment');
        return;
      }

      // 默认为未约妆状态
      setCurrentMakeupStatus('unmade');
    } catch (error) {
      console.error('检查当前状态失败:', error);
      setCurrentMakeupStatus('unmade');
    }
  };

  const handlePrevHistory = () => {
    if (currentHistoryIndex < historyRecords.length - 1) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentHistoryIndex(prev => prev + 1);
        setIsFlipping(false);
      }, 300);
    }
  };

  const handleNextHistory = () => {
    if (currentHistoryIndex > 0) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentHistoryIndex(prev => prev - 1);
        setIsFlipping(false);
      }, 300);
    }
  };

  const getCurrentHistoryRecord = () => {
    return historyRecords[currentHistoryIndex] || null;
  };

  const renderCurrentStatus = () => {
    switch (currentMakeupStatus) {
      case 'current':
        return <CurrentMakeup headId={headId} onStatusChange={determineCurrentStatus} />;
      case 'appointment':
        return <MakeupAppointment headId={headId} onStatusChange={determineCurrentStatus} />;
      case 'unmade':
        return <UnmadeMakeup headId={headId} onStatusChange={determineCurrentStatus} />;
      default:
        return <UnmadeMakeup headId={headId} onStatusChange={determineCurrentStatus} />;
    }
  };

  const handleActionClick = (actionType) => {
    switch (actionType) {
      case 'history':
        setShowHistoryForm(true);
        setShowActions(false);
        break;
      case 'current':
        // 触发当前妆容设置
        setCurrentMakeupStatus('current');
        setShowActions(false);
        break;
      case 'appointment':
        // 触发约妆设置
        setCurrentMakeupStatus('appointment');  
        setShowActions(false);
        break;
      case 'unmade':
        // 触发心仪妆师管理
        setCurrentMakeupStatus('unmade');
        setShowActions(false);
        break;
      default:
        break;
    }
  };

  const renderHistoryPage = () => {
    const currentRecord = getCurrentHistoryRecord();
    
    if (!currentRecord) {
      return (
        <div className="empty-history-page">
          <div className="empty-icon">📖</div>
          <p>还没有历史妆容记录</p>
        </div>
      );
    }

    return (
      <div className="history-page-content">
        <div className="history-header">
          <h4>历史妆容</h4>
          <div className="history-pagination">
            <span>{currentHistoryIndex + 1} / {historyRecords.length}</span>
          </div>
        </div>
        
        <div className="history-record">
          <div className="record-artist">
            <span className="artist-name">
              {currentRecord.makeup_artist_name || currentRecord.artist_name || '未知妆师'}
            </span>
            {currentRecord.makeup_fee && (
              <span className="makeup-fee">¥{currentRecord.makeup_fee}</span>
            )}
          </div>
          
          <div className="record-dates">
            {currentRecord.makeup_date && (
              <div className="date-info">
                上妆: {new Date(currentRecord.makeup_date).toLocaleDateString()}
              </div>
            )}
            {currentRecord.removal_date && (
              <div className="date-info">
                卸妆: {new Date(currentRecord.removal_date).toLocaleDateString()}
              </div>
            )}
          </div>

          {currentRecord.image_url && (
            <div className="record-image">
              <img src={currentRecord.image_url} alt="妆容照片" />
            </div>
          )}

          {currentRecord.notes && (
            <CopyableText 
              text={currentRecord.notes} 
              className="record-notes"
              placeholder="暂无备注" 
            />
          )}
        </div>

        {historyRecords.length > 1 && (
          <div className="history-nav">
            <button 
              className={`nav-btn prev-btn ${currentHistoryIndex >= historyRecords.length - 1 ? 'disabled' : ''}`}
              onClick={handlePrevHistory}
              disabled={currentHistoryIndex >= historyRecords.length - 1}
            >
              ← 更早
            </button>
            <button 
              className={`nav-btn next-btn ${currentHistoryIndex <= 0 ? 'disabled' : ''}`}
              onClick={handleNextHistory}
              disabled={currentHistoryIndex <= 0}
            >
              更新 →
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="makeup-book">
      <div className="book-container">
        <div className={`book ${isFlipping ? 'flipping' : ''}`}>
          {/* 左页 - 历史妆容 */}
          <div className="book-page left-page">
            {renderHistoryPage()}
          </div>
          
          {/* 右页 - 当前状态 */}
          <div className="book-page right-page">
            <div className="current-status-header">
              <h4>当前状态</h4>
              <div className="status-indicators">
                <span className={`status-dot ${currentMakeupStatus === 'current' ? 'current' : ''}`}>
                  {currentMakeupStatus === 'current' ? '有妆' : ''}
                </span>
                <span className={`status-dot ${currentMakeupStatus === 'appointment' ? 'appointment' : ''}`}>
                  {currentMakeupStatus === 'appointment' ? '约妆中' : ''}
                </span>
                <span className={`status-dot ${currentMakeupStatus === 'unmade' ? 'unmade' : ''}`}>
                  {currentMakeupStatus === 'unmade' ? '待约妆' : ''}
                </span>
              </div>
            </div>
            
            <div className="current-status-content">
              {renderCurrentStatus()}
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作区域 */}
      <div className="book-actions">
        <button 
          className="action-toggle-btn"
          onClick={() => setShowActions(!showActions)}
        >
          {showActions ? '收起操作' : '展开操作'} {showActions ? '↑' : '↓'}
        </button>
        
        {showActions && (
          <div className="action-buttons">
            <button 
              className="action-btn history-btn"
              onClick={() => handleActionClick('history')}
            >
              添加历史记录
            </button>
            <button 
              className="action-btn current-btn"
              onClick={() => handleActionClick('current')}
            >
              设置当前妆容
            </button>
            <button 
              className="action-btn appointment-btn"
              onClick={() => handleActionClick('appointment')}
            >
              预约妆师
            </button>
            <button 
              className="action-btn unmade-btn"
              onClick={() => handleActionClick('unmade')}
            >
              管理心仪妆师
            </button>
          </div>
        )}
      </div>

      {/* 历史妆容表单模态框 */}
      {showHistoryForm && (
        <div className="history-form-modal">
          <div className="modal-overlay" onClick={() => setShowHistoryForm(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h4>添加历史妆容记录</h4>
                <button 
                  className="close-modal-btn"
                  onClick={() => setShowHistoryForm(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <MakeupHistory 
                  headId={headId} 
                  onUpdate={() => {
                    fetchHistoryRecords();
                    determineCurrentStatus();
                    setShowHistoryForm(false);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MakeupBook;