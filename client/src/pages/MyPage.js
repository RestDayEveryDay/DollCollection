import React, { useState, useEffect } from 'react';
import './MyPage.css';
import { apiGet } from '../utils/api';

// 花费统计卡片组件
const ExpenseCard = ({ title, icon, amount, color, percentage, details }) => {
  return (
    <div className="expense-card">
      <div className="expense-header">
        <div className="expense-icon" style={{ color }}>
          {icon}
        </div>
        <div className="expense-info">
          <h3 className="expense-title">{title}</h3>
          <div className="expense-amount">¥{amount.toFixed(2)}</div>
          {percentage > 0 && (
            <div className="expense-percentage">{percentage.toFixed(1)}%</div>
          )}
        </div>
      </div>
      {details && details.length > 0 && (
        <div className="expense-details">
          {details.map((detail, index) => (
            <div key={index} className="expense-detail">
              <span className="detail-label">{detail.label}:</span>
              <span className="detail-value">¥{detail.value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


const MyPage = ({ onNavigate, currentUser, onLogout }) => {
  const [expenseStats, setExpenseStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState([]);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');

  useEffect(() => {
    fetchExpenseStats();
    fetchPaymentReminders();
    setLoading(false);
  }, []);

  const fetchExpenseStats = async () => {
    try {
      const data = await apiGet('/api/stats/total-expenses');
      setExpenseStats(data);
    } catch (error) {
      console.error('获取花费统计失败:', error);
    }
  };

  // 处理修改用户名
  const handleChangeUsername = async () => {
    if (!newUsername.trim()) {
      setUsernameError('用户名不能为空');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/change-username', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ newUsername: newUsername.trim() })
      });

      const data = await response.json();
      
      if (response.ok) {
        // 更新本地存储
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        
        // 关闭弹窗
        setShowUsernameModal(false);
        setNewUsername('');
        setUsernameError('');
        
        // 刷新页面以更新用户名显示
        window.location.reload();
      } else {
        setUsernameError(data.error || '修改失败');
      }
    } catch (error) {
      console.error('修改用户名失败:', error);
      setUsernameError('网络错误，请重试');
    }
  };


  // 获取尾款提醒数据
  const fetchPaymentReminders = async () => {
    try {
      const reminders = [];
      
      // 获取娃头数据
      try {
        const dollHeads = await apiGet('/api/doll-heads');
        dollHeads.forEach(head => {
          if (head.ownership_status === 'preorder' && 
              (head.payment_status || 'deposit_only') !== 'full_paid') {
            reminders.push({
              id: head.id,
              name: head.name,
              type: '娃头',
              finalPaymentDate: head.final_payment_date,
              finalPayment: head.final_payment,
              profileImage: head.profile_image_url
            });
          }
        });
      } catch (error) {
        console.error('获取娃头数据失败:', error);
      }
      
      // 获取娃体数据
      try {
        const dollBodies = await apiGet('/api/doll-bodies');
        dollBodies.forEach(body => {
          if (body.ownership_status === 'preorder' && 
              (body.payment_status || 'deposit_only') !== 'full_paid') {
            reminders.push({
              id: body.id,
              name: body.name,
              type: '娃体',
              finalPaymentDate: body.final_payment_date,
              finalPayment: body.final_payment,
              profileImage: body.profile_image_url
            });
          }
        });
      } catch (error) {
        console.error('获取娃体数据失败:', error);
      }
      
      // 获取衣柜数据
      const categories = ['body_accessories', 'eyes', 'wigs', 'headwear', 'sets', 'single_items', 'handheld'];
      for (const category of categories) {
        try {
          const wardrobeItems = await apiGet(`/api/wardrobe/${category}`);
          wardrobeItems.forEach(item => {
            if (item.ownership_status === 'preorder' && 
                (item.payment_status || 'deposit_only') !== 'full_paid') {
              reminders.push({
                id: item.id,
                name: item.name,
                type: '配饰',
                finalPaymentDate: item.final_payment_date,
                finalPayment: item.final_payment,
                profileImage: item.profile_image_url
              });
            }
          });
        } catch (error) {
          console.error(`获取${category}数据失败:`, error);
        }
      }
      
      // 排序：逾期 > 今日 > 紧急(≤3天) > 无日期 > 正常 > 已付尾款
      const sortedReminders = reminders.sort((a, b) => {
        const aDate = a.finalPaymentDate ? new Date(a.finalPaymentDate) : null;
        const bDate = b.finalPaymentDate ? new Date(b.finalPaymentDate) : null;
        const today = new Date();
        
        const getDaysRemaining = (date) => {
          if (!date) return null;
          const timeDiff = date.getTime() - today.getTime();
          return Math.ceil(timeDiff / (1000 * 3600 * 24));
        };
        
        const aDays = getDaysRemaining(aDate);
        const bDays = getDaysRemaining(bDate);
        
        // 真正逾期（超过30天）优先级最高
        if (aDays !== null && aDays < -30 && (bDays === null || bDays >= -30)) return -1;
        if (bDays !== null && bDays < -30 && (aDays === null || aDays >= -30)) return 1;
        
        // 尾款期内（-30到-1天）
        if (aDays !== null && aDays < 0 && aDays >= -30 && (bDays === null || bDays >= 0 || bDays < -30)) return -1;
        if (bDays !== null && bDays < 0 && bDays >= -30 && (aDays === null || aDays >= 0 || aDays < -30)) return 1;
        
        // 今日截止优先级次高
        if (aDays === 0 && bDays !== 0) return -1;
        if (bDays === 0 && aDays !== 0) return 1;
        
        // 紧急（≤3天）
        if (aDays !== null && aDays > 0 && aDays <= 3 && (bDays === null || bDays > 3)) return -1;
        if (bDays !== null && bDays > 0 && bDays <= 3 && (aDays === null || aDays > 3)) return 1;
        
        // 无日期设置的
        if (aDays === null && bDays !== null && bDays > 3) return -1;
        if (bDays === null && aDays !== null && aDays > 3) return 1;
        
        // 其他按日期排序
        if (aDays !== null && bDays !== null) {
          return aDays - bDays;
        }
        
        return 0;
      });
      
      setPaymentReminders(sortedReminders);
    } catch (error) {
      console.error('获取尾款提醒数据失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-container">
          <div className="loading-spinner">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* 顶部用户信息区域 */}
      <div className="profile-header">
        <div className="profile-header-content">
          <div className="profile-avatar">
            <span className="avatar-icon">👤</span>
          </div>
          <div className="profile-info">
            <div className="profile-username">
              <span className="username-text">{currentUser?.username || localStorage.getItem('username')}</span>
              <button 
                className="edit-username-btn"
                onClick={() => {
                  setShowUsernameModal(true);
                  setNewUsername('');
                  setUsernameError('');
                }}
                title="修改用户名"
              >
                ✏️
              </button>
            </div>
            <div className="profile-subtitle">收藏管理 & 花费统计</div>
          </div>
          <button 
            className="header-logout-btn"
            onClick={onLogout}
          >
            退出登录
          </button>
        </div>
      </div>

      {/* 修改用户名弹窗 */}
      {showUsernameModal && (
        <div className="modal-overlay" onClick={() => setShowUsernameModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>修改用户名</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowUsernameModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                className="username-input"
                placeholder="请输入新用户名"
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value);
                  setUsernameError('');
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleChangeUsername()}
                autoFocus
              />
              {usernameError && (
                <div className="error-message">{usernameError}</div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => setShowUsernameModal(false)}
              >
                取消
              </button>
              <button 
                className="confirm-btn"
                onClick={handleChangeUsername}
              >
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 花费统计 */}
      {expenseStats && (
        <div className="expense-section">
          <h2 className="section-title">
            花费统计
          </h2>
          
          {/* 总花费卡片 */}
          <div className="total-expense-card">
            <div className="total-expense-header">
              <div className="total-expense-info">
                <h3>总花费</h3>
                <div className="total-expense-amount">¥{expenseStats.grandTotal.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* 分类花费 */}
          <div className="expense-breakdown">
            <ExpenseCard
              title="娃柜花费"
              icon=""
              amount={expenseStats.dolls.total}
              color="#e91e63"
              percentage={(expenseStats.dolls.total / expenseStats.grandTotal) * 100}
              details={[
                { label: '娃头', value: expenseStats.dolls.heads },
                { label: '娃体', value: expenseStats.dolls.bodies }
              ]}
            />
            <ExpenseCard
              title="妆容花费"
              icon=""
              amount={expenseStats.makeup.total}
              color="#9c27b0"
              percentage={(expenseStats.makeup.total / expenseStats.grandTotal) * 100}
              details={[
                { label: '历史妆容', value: expenseStats.makeup.history },
                { label: '当前妆容', value: expenseStats.makeup.current },
                { label: '约妆费用', value: expenseStats.makeup.appointment },
                { label: '娃体妆容', value: expenseStats.makeup.body }
              ]}
            />
            <ExpenseCard
              title="衣柜花费"
              icon=""
              amount={expenseStats.wardrobe.total}
              color="#4caf50"
              percentage={(expenseStats.wardrobe.total / expenseStats.grandTotal) * 100}
              details={[
                { label: '配饰', value: expenseStats.wardrobe.body_accessories || 0 },
                { label: '眼睛', value: expenseStats.wardrobe.eyes || 0 },
                { label: '假发', value: expenseStats.wardrobe.wigs || 0 },
                { label: '头饰', value: expenseStats.wardrobe.headwear || 0 },
                { label: '套装', value: expenseStats.wardrobe.sets || 0 },
                { label: '单品', value: expenseStats.wardrobe.single_items || 0 },
                { label: '手持物', value: expenseStats.wardrobe.handheld || 0 }
              ].filter(item => item.value > 0)}
            />
          </div>
        </div>
      )}

      {/* 尾款顺序 */}
      {paymentReminders.length > 0 && (
        <div className="payment-reminders-section">
          <h2 className="section-title">
            💰 尾款顺序
          </h2>
          <div className="payment-reminders-grid">
            {paymentReminders.map(reminder => {
              const finalDate = reminder.finalPaymentDate ? new Date(reminder.finalPaymentDate) : null;
              const today = new Date();
              const daysRemaining = finalDate ? Math.ceil((finalDate.getTime() - today.getTime()) / (1000 * 3600 * 24)) : null;
              
              let statusClass = '';
              let statusText = '';
              
              if (daysRemaining === null) {
                statusClass = 'no-date';
                statusText = '未设置尾款日期';
              } else if (daysRemaining < -30) {
                statusClass = 'overdue';
                statusText = `已逾期 ${Math.abs(daysRemaining + 30)} 天`;
              } else if (daysRemaining < 0) {
                statusClass = 'urgent';
                statusText = `尾款期剩 ${30 + daysRemaining} 天`;
              } else if (daysRemaining === 0) {
                statusClass = 'today';
                statusText = '今日截止';
              } else if (daysRemaining <= 3) {
                statusClass = 'urgent';
                statusText = `还有 ${daysRemaining} 天`;
              } else {
                statusClass = 'normal';
                statusText = `还有 ${daysRemaining} 天`;
              }
              
              return (
                <div key={`${reminder.type}-${reminder.id}`} className={`payment-reminder-card ${statusClass}`}>
                  {reminder.profileImage && (
                    <img 
                      src={reminder.profileImage} 
                      alt={reminder.name} 
                      className="reminder-image"
                    />
                  )}
                  <div className="reminder-info">
                    <h3>{reminder.name}</h3>
                    <p className="reminder-type">{reminder.type}</p>
                    <div className="reminder-status">
                      {finalDate && (
                        <p className="payment-date">
                          <strong>尾款时间:</strong> {finalDate.toLocaleDateString()}
                        </p>
                      )}
                      <p className={`status-text ${statusClass}`}>{statusText}</p>
                      {reminder.finalPayment && (
                        <p className="payment-amount">
                          <strong>尾款:</strong> ¥{reminder.finalPayment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

export default MyPage;