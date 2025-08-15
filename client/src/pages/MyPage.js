import React, { useState, useEffect } from 'react';
import './MyPage.css';

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

// 统计总览卡片组件
const OverviewCard = ({ title, value, unit, icon, color }) => {
  return (
    <div className="overview-card">
      <div className="overview-icon" style={{ color }}>
        {icon}
      </div>
      <div className="overview-content">
        <div className="overview-value">{value}</div>
        <div className="overview-label">{title}</div>
        {unit && <div className="overview-unit">{unit}</div>}
      </div>
    </div>
  );
};

// 简单的趋势图组件
const TrendChart = ({ data }) => {
  const maxAmount = Math.max(...data.map(d => d.total)) || 1;
  
  return (
    <div className="trend-chart">
      <div className="chart-header">
        <h3>近期花费趋势</h3>
      </div>
      <div className="chart-container">
        <div className="chart-bars">
          {data.slice(-6).map((item, index) => (
            <div key={index} className="chart-bar-container">
              <div className="chart-bar">
                <div 
                  className="bar-fill"
                  style={{ 
                    height: `${(item.total / maxAmount) * 100}%`,
                    background: 'linear-gradient(135deg, #5A4FCF 0%, #4A3FCF 100%)'
                  }}
                ></div>
              </div>
              <div className="bar-label">{item.display}</div>
              <div className="bar-value">¥{item.total.toFixed(0)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MyPage = ({ onNavigate }) => {
  const [expenseStats, setExpenseStats] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overviewStats, setOverviewStats] = useState({
    totalItems: 0,
    dollCount: 0,
    makeupCount: 0,
    wardrobeCount: 0
  });
  const [paymentReminders, setPaymentReminders] = useState([]);

  useEffect(() => {
    fetchExpenseStats();
    fetchMonthlyTrend();
    fetchOverviewStats();
    fetchPaymentReminders();
  }, []);

  const fetchExpenseStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/stats/total-expenses');
      const data = await response.json();
      setExpenseStats(data);
    } catch (error) {
      console.error('获取花费统计失败:', error);
    }
  };

  const fetchMonthlyTrend = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/stats/monthly-trend');
      const data = await response.json();
      setMonthlyTrend(data);
    } catch (error) {
      console.error('获取月度趋势失败:', error);
    }
  };

  const fetchOverviewStats = async () => {
    try {
      // 获取娃柜统计
      const dollsResponse = await fetch('http://localhost:5000/api/dolls/stats');
      const dollsData = await dollsResponse.json();
      
      // 获取约妆统计
      const appointmentsResponse = await fetch('http://localhost:5000/api/makeup-appointments');
      const appointmentsData = await appointmentsResponse.json();
      
      // 获取衣柜统计
      const wardrobeResponse = await fetch('http://localhost:5000/api/wardrobe/stats/status');
      const wardrobeData = await wardrobeResponse.json();
      
      const totalWardrobe = wardrobeData.reduce((sum, item) => sum + item.count, 0);
      
      setOverviewStats({
        totalItems: dollsData.total.total_count + appointmentsData.length + totalWardrobe,
        dollCount: dollsData.total.total_count || 0,
        makeupCount: appointmentsData.length || 0,
        wardrobeCount: totalWardrobe
      });
    } catch (error) {
      console.error('获取总览统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取尾款提醒数据
  const fetchPaymentReminders = async () => {
    try {
      const reminders = [];
      
      // 获取娃头数据
      const dollHeadsResponse = await fetch('http://localhost:5000/api/doll-heads');
      if (dollHeadsResponse.ok) {
        const dollHeads = await dollHeadsResponse.json();
        dollHeads.forEach(head => {
          if ((head.ownership_status === 'wishlist' || head.ownership_status === 'preorder') && 
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
      }
      
      // 获取娃体数据
      const dollBodiesResponse = await fetch('http://localhost:5000/api/doll-bodies');
      if (dollBodiesResponse.ok) {
        const dollBodies = await dollBodiesResponse.json();
        dollBodies.forEach(body => {
          if ((body.ownership_status === 'wishlist' || body.ownership_status === 'preorder') && 
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
      }
      
      // 获取衣柜数据
      const categories = ['body_accessories', 'eyes', 'wigs', 'headwear', 'sets', 'single_items', 'handheld'];
      for (const category of categories) {
        const wardrobeResponse = await fetch(`http://localhost:5000/api/wardrobe/${category}`);
        if (wardrobeResponse.ok) {
          const wardrobeItems = await wardrobeResponse.json();
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
        
        // 逾期优先级最高
        if (aDays !== null && aDays < 0 && (bDays === null || bDays >= 0)) return -1;
        if (bDays !== null && bDays < 0 && (aDays === null || aDays >= 0)) return 1;
        
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
      <div className="page-header">
        <h1>我的收藏</h1>
        <div className="header-subtitle">
          收藏管理 & 花费统计
        </div>
      </div>

      {/* 总览统计 */}
      <div className="overview-section">
        <h2 className="section-title">
          收藏概览
        </h2>
        <div className="overview-grid">
          <OverviewCard
            title="总收藏"
            value={overviewStats.totalItems}
            unit="件"
            icon=""
            color="#7c7c7c"
          />
          <OverviewCard
            title="娃娃"
            value={overviewStats.dollCount}
            unit="个"
            icon=""
            color="#e91e63"
          />
          <OverviewCard
            title="约妆"
            value={overviewStats.makeupCount}
            unit="个"
            icon=""
            color="#9c27b0"
          />
          <OverviewCard
            title="配饰"
            value={overviewStats.wardrobeCount}
            unit="件"
            icon=""
            color="#4caf50"
          />
        </div>
      </div>

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
            />
          </div>
        </div>
      )}

      {/* 月度趋势 */}
      {monthlyTrend.length > 0 && (
        <div className="trend-section">
          <h2 className="section-title">
            花费趋势
          </h2>
          <TrendChart data={monthlyTrend} />
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
              } else if (daysRemaining < 0) {
                statusClass = 'overdue';
                statusText = `已逾期 ${Math.abs(daysRemaining)} 天`;
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

      {/* 快速导航 */}
      <div className="quick-nav-section">
        <h2 className="section-title">
          快速导航
        </h2>
        <div className="quick-nav-grid">
          <div className="quick-nav-card" onClick={() => onNavigate && onNavigate('dolls')}>
            <div className="nav-card-icon"></div>
            <div className="nav-card-title">娃柜管理</div>
            <div className="nav-card-desc">查看和管理你的娃娃收藏</div>
          </div>
          <div className="quick-nav-card" onClick={() => onNavigate && onNavigate('makeup')}>
            <div className="nav-card-icon"></div>
            <div className="nav-card-title">妆师工坊</div>
            <div className="nav-card-desc">管理妆师和约妆信息</div>
          </div>
          <div className="quick-nav-card" onClick={() => onNavigate && onNavigate('wardrobe')}>
            <div className="nav-card-icon"></div>
            <div className="nav-card-title">配饰衣柜</div>
            <div className="nav-card-desc">整理你的配饰和服装</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPage;