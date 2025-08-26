import React, { useState, useEffect } from 'react';
import WardrobeCategory from '../components/WardrobeCategory';
import WardrobeEditModal from '../components/WardrobeEditModal';
import ImageViewer from '../components/ImageViewer';
import './WardrobePage.css';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

// 计算倒计时的函数
const calculateDaysRemaining = (finalPaymentDate) => {
  if (!finalPaymentDate) return null;
  
  const today = new Date();
  const paymentDate = new Date(finalPaymentDate);
  const timeDiff = paymentDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  return daysDiff;
};

// 计算是否真正逾期（超过一个月尾款期）
const isReallyOverdue = (finalPaymentDate) => {
  if (!finalPaymentDate) return false;
  
  const today = new Date();
  const paymentDate = new Date(finalPaymentDate);
  const gracePeriodDate = new Date(paymentDate);
  gracePeriodDate.setMonth(gracePeriodDate.getMonth() + 1); // 添加一个月尾款期
  
  return today > gracePeriodDate;
};

// 获取付款状态显示信息
const getPaymentStatusInfo = (item) => {
  const daysRemaining = calculateDaysRemaining(item.final_payment_date);
  
  if (item.ownership_status === 'owned') {
    return { status: '🏠 已到家', className: 'status-badge-owned', showActions: false };
  }
  
  if (item.ownership_status === 'preorder') {
    const paymentStatus = item.payment_status || 'deposit_only';
    
    if (paymentStatus === 'full_paid') {
      return { status: '💰 已付全款', className: 'status-badge-preorder', showActions: true };
    }
    
    if (daysRemaining === null) {
      return { status: '💰 已付定金', className: 'status-badge-preorder', showActions: true };
    }
    
    if (daysRemaining > 3) {
      return { status: '💰 已付定金', className: 'status-badge-preorder', showActions: true };
    } else if (daysRemaining >= 1) {
      return { status: '⏰ 尾款将到期', className: 'status-badge-preorder status-badge-warning', showActions: true };
    } else if (daysRemaining === 0) {
      return { status: '🚨 今日开始尾款期', className: 'status-badge-preorder status-badge-urgent', showActions: true };
    } else if (daysRemaining > -30) {
      // 尾款期内（尾款日期后30天内）
      return { status: `⏰ 尾款期剩 ${30 + daysRemaining} 天`, className: 'status-badge-preorder status-badge-warning', showActions: true };
    } else {
      // 真正逾期（超过宽限期）
      return { status: '📛 已逾期', className: 'status-badge-preorder status-badge-overdue', showActions: true };
    }
  }
  
  return { status: '💰 已付定金', className: 'status-badge-preorder', showActions: true };
};

// 品牌统计卡片组件
const BrandStatsCard = ({ brand, data }) => {
  return (
    <div className="stats-card brand-card">
      <div className="stats-header">
        <h3 className="stats-name">🏷️ {brand}</h3>
        <div className="stats-badge">
          {data.count} 件
        </div>
      </div>
      
      <div className="stats-details">
        <div className="stats-row">
          <div className="stats-item">
            <span className="stats-label">已到家:</span>
            <span className="stats-value owned">{data.owned_count} 件</span>
          </div>
          <div className="stats-item">
            <span className="stats-label">空气:</span>
            <span className="stats-value preorder">{data.preorder_count} 件</span>
          </div>
        </div>
        
        <div className="stats-amount">
          <div className="amount-row">
            <span className="amount-label">总金额:</span>
            <span className="amount-value">¥{data.total_amount.toFixed(2)}</span>
          </div>
          {data.total_amount_owned > 0 && (
            <div className="amount-breakdown">
              <span>已到家: ¥{data.total_amount_owned.toFixed(2)}</span>
            </div>
          )}
          {data.total_amount_preorder > 0 && (
            <div className="amount-breakdown">
              <span>空气: ¥{data.total_amount_preorder.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 尺寸统计卡片组件
const SizeStatsCard = ({ size, data }) => {
  return (
    <div className="stats-card size-card">
      <div className="stats-header">
        <h3 className="stats-name">📏 {size}</h3>
        <div className="stats-badge">
          {data.count} 件
        </div>
      </div>
      
      <div className="stats-details">
        <div className="stats-row">
          <div className="stats-item">
            <span className="stats-label">已到家:</span>
            <span className="stats-value owned">{data.owned_count} 件</span>
          </div>
          <div className="stats-item">
            <span className="stats-label">空气:</span>
            <span className="stats-value preorder">{data.preorder_count} 件</span>
          </div>
        </div>
        
        <div className="stats-amount">
          <div className="amount-row">
            <span className="amount-label">总金额:</span>
            <span className="amount-value">¥{data.total_amount.toFixed(2)}</span>
          </div>
          {data.total_amount_owned > 0 && (
            <div className="amount-breakdown">
              <span>已到家: ¥{data.total_amount_owned.toFixed(2)}</span>
            </div>
          )}
          {data.total_amount_preorder > 0 && (
            <div className="amount-breakdown">
              <span>空气: ¥{data.total_amount_preorder.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 状态统计卡片组件
const StatusStatsCard = ({ status, data }) => {
  return (
    <div className={`stats-card status-card ${status === 'owned' ? 'owned-status-card' : 'preorder-status-card'}`}>
      <div className="stats-header">
        <h3 className="stats-name">
          {data.status_icon} {data.status_name}
        </h3>
        <div className="stats-badge">
          {data.count} 件
        </div>
      </div>
      
      <div className="stats-details">
        <div className="category-info-section">
          <div className="category-summary">
            <span className="category-label">涉及分类:</span>
            <span className="category-count">{data.category_count} 个</span>
          </div>
        </div>
        
        <div className="stats-amount">
          <div className="amount-row">
            <span className="amount-label">总金额:</span>
            <span className="amount-value">¥{data.total_amount.toFixed(2)}</span>
          </div>
          <div className="amount-breakdown">
            <span>平均单价: ¥{(data.total_amount / data.count).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 简化的配件卡片组件（用于状态视图）
const SimpleWardrobeCard = ({ item, categoryName, onImageClick, onDelete, onConfirmArrival, onPaymentStatusChange }) => {
  const daysRemaining = item.ownership_status === 'preorder' ? calculateDaysRemaining(item.final_payment_date) : null;
  const paymentInfo = getPaymentStatusInfo(item);

  return (
    <div className={`search-result-card ${item.ownership_status === 'owned' ? 'status-owned' : 'status-preorder'}`}>
      {item.profile_image_url && (
        <img 
          src={item.profile_image_url} 
          alt={item.name} 
          className="search-result-image clickable-image"
          onClick={() => onImageClick(item.profile_image_url, item.name)}
          title="点击查看大图"
        />
      )}
      
      <div className="search-result-info">
        <h4>{item.name}</h4>
        <p className="category-tag">📁 {categoryName}</p>
        {item.brand && <p><strong>品牌:</strong> {item.brand}</p>}
        {item.platform && <p><strong>平台:</strong> {item.platform}</p>}
        
        {item.sizes && (() => {
          try {
            const sizesArray = JSON.parse(item.sizes);
            return sizesArray.length > 0 && (
              <div className="sizes-display">
                <strong>尺寸:</strong>
                <div className="size-tags">
                  {sizesArray.map((size, index) => (
                    <span key={index} className="size-tag">{size}</span>
                  ))}
                </div>
              </div>
            );
          } catch {
            return null;
          }
        })()}

        <div className="price-info">
          {item.ownership_status === 'owned' ? (
            item.total_price && <p><strong>价格:</strong> ¥{item.total_price}</p>
          ) : (
            <div className="preorder-price">
              {item.deposit && <p><strong>定金:</strong> ¥{item.deposit}</p>}
              {item.final_payment && <p><strong>尾款:</strong> ¥{item.final_payment}</p>}
              {item.total_price && <p><strong>总价:</strong> ¥{item.total_price}</p>}
            </div>
          )}
        </div>

        <p className={`status-badge ${paymentInfo.className}`}>
          {paymentInfo.status}
        </p>

        {item.ownership_status === 'preorder' && (
          <div className="payment-info-section">
            {item.final_payment_date && (item.payment_status || 'deposit_only') !== 'full_paid' && (
              <div className="countdown-info">
                <p className="payment-date">
                  <strong>尾款时间:</strong> {new Date(item.final_payment_date).toLocaleDateString()}
                </p>
                {daysRemaining !== null && (
                  <div className={`countdown ${daysRemaining <= 7 ? 'countdown-urgent' : daysRemaining <= 30 ? 'countdown-warning' : ''}`}>
                    {daysRemaining > 0 ? (
                      <span>还有 {daysRemaining} 天</span>
                    ) : daysRemaining === 0 ? (
                      <span className="today">今天开始尾款期！</span>
                    ) : daysRemaining > -30 ? (
                      <span className="grace-period">尾款期还剩 {30 + daysRemaining} 天</span>
                    ) : (
                      <span className="overdue">已逾期 {Math.abs(daysRemaining + 30)} 天</span>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {paymentInfo.showActions && (item.payment_status || 'deposit_only') === 'deposit_only' && (
              <div className="payment-actions">
                <button 
                  className="payment-btn mark-paid-btn"
                  onClick={() => onPaymentStatusChange && onPaymentStatusChange(item.id, 'full_paid')}
                >
                  💰 标记已付尾款
                </button>
              </div>
            )}
            
            {((item.payment_status === 'full_paid' && item.ownership_status === 'preorder') || 
              (daysRemaining !== null && daysRemaining < -30 && (item.payment_status || 'deposit_only') !== 'full_paid')) && (
              <div className="arrival-confirm">
                <div className="confirm-buttons">
                  <span className="confirm-question">是否已到家？</span>
                  <button 
                    className="confirm-btn yes-btn"
                    onClick={() => onConfirmArrival && onConfirmArrival(item.id, true)}
                  >
                    是
                  </button>
                  <button 
                    className="confirm-btn no-btn"
                    onClick={() => onConfirmArrival && onConfirmArrival(item.id, false)}
                  >
                    否
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="card-actions">
          <button 
            onClick={() => onDelete(item.id)}
            className="delete-btn"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
};

// 搜索结果卡片组件
const SearchResultCard = ({ item, categoryName, onImageClick, onDelete, onConfirmArrival, onPaymentStatusChange }) => {
  const daysRemaining = item.ownership_status === 'preorder' ? calculateDaysRemaining(item.final_payment_date) : null;

  return (
    <div className={`search-result-card ${item.ownership_status === 'owned' ? 'status-owned' : 'status-preorder'}`}>
      {item.profile_image_url && (
        <img 
          src={item.profile_image_url} 
          alt={item.name} 
          className="search-result-image clickable-image"
          onClick={() => onImageClick && onImageClick(item.profile_image_url, item.name)}
          title="点击查看大图"
        />
      )}
      
      <div className="search-result-info">
        <h4>{item.name}</h4>
        <p className="category-tag">📁 {categoryName}</p>
        {item.brand && <p><strong>品牌:</strong> {item.brand}</p>}
        {item.platform && <p><strong>平台:</strong> {item.platform}</p>}
        
        {item.sizes && (() => {
          try {
            const sizesArray = JSON.parse(item.sizes);
            return sizesArray.length > 0 && (
              <div className="sizes-display">
                <strong>尺寸:</strong>
                <div className="size-tags">
                  {sizesArray.map((size, index) => (
                    <span key={index} className="size-tag">{size}</span>
                  ))}
                </div>
              </div>
            );
          } catch {
            return null;
          }
        })()}

        <p className={`status-badge ${item.ownership_status === 'owned' ? 'status-badge-owned' : 'status-badge-preorder'}`}>
          {item.ownership_status === 'owned' ? '🏠 已到家' : '💭 空气'}
        </p>

        {item.ownership_status === 'preorder' && (
          <>
            {item.payment_status === 'full_paid' ? (
              <div className="arrival-confirm">
                <div className="confirm-buttons">
                  <span className="confirm-question">是否已到家？</span>
                  <button 
                    className="confirm-btn yes-btn"
                    onClick={() => onConfirmArrival && onConfirmArrival(item.id, true)}
                  >
                    是
                  </button>
                  <button 
                    className="confirm-btn no-btn"
                    onClick={() => onConfirmArrival && onConfirmArrival(item.id, false)}
                  >
                    否
                  </button>
                </div>
              </div>
            ) : item.final_payment_date && (
              <div className="countdown-info">
                <p className="payment-date">
                  <strong>尾款时间:</strong> {new Date(item.final_payment_date).toLocaleDateString()}
                </p>
                {daysRemaining !== null && (
                  <div className={`countdown ${daysRemaining <= 7 ? 'countdown-urgent' : daysRemaining <= 30 ? 'countdown-warning' : ''}`}>
                    {daysRemaining > 0 ? (
                      <span>还有 {daysRemaining} 天</span>
                    ) : daysRemaining === 0 ? (
                      <span className="today">今天开始尾款期！</span>
                    ) : item.is_overdue ? (
                      <div className="arrival-confirm overdue-confirmed">
                        <div className="overdue-notice">
                          <span>已确认逾期 {Math.abs(daysRemaining)} 天</span>
                        </div>
                        <div className="confirm-buttons">
                          <span className="confirm-question">是否已到家？</span>
                          <button 
                            className="confirm-btn yes-btn"
                            onClick={() => onConfirmArrival && onConfirmArrival(item.id, true)}
                          >
                            是
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="arrival-confirm">
                        <div className="overdue-notice">
                          <span>已逾期 {Math.abs(daysRemaining)} 天</span>
                        </div>
                        <div className="confirm-buttons">
                          <span className="confirm-question">是否已到家？</span>
                          <button 
                            className="confirm-btn yes-btn"
                            onClick={() => onConfirmArrival && onConfirmArrival(item.id, true)}
                          >
                            是
                          </button>
                          <button 
                            className="confirm-btn no-btn"
                            onClick={() => onConfirmArrival && onConfirmArrival(item.id, false)}
                          >
                            否
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="card-actions">
          <button 
            onClick={() => onDelete(item.id)}
            className="delete-btn"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
};

const WardrobePage = ({ currentUser }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [categoryPrices, setCategoryPrices] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState('category'); // 'category', 'brand', 'size', 'status'
  const [brandData, setBrandData] = useState([]);
  const [sizeData, setSizeData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [allWardrobeItems, setAllWardrobeItems] = useState([]);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState({ url: '', title: '' });

  const categories = [
    {
      id: 'body_accessories',
      name: '身体配件',
      icon: '💍',
      description: '项链、手链、戒指等装饰品'
    },
    {
      id: 'eyes',
      name: '眼珠',
      icon: '👁️',
      description: '各种眼珠配件'
    },
    {
      id: 'wigs',
      name: '假发',
      icon: '💇',
      description: '各种假发配件'
    },
    {
      id: 'headwear',
      name: '头饰',
      icon: '👑',
      description: '发饰、帽子、头冠等'
    },
    {
      id: 'sets',
      name: '套装',
      icon: '👗',
      description: '成套的衣物搭配'
    },
    {
      id: 'single_items',
      name: '单品',
      icon: '👕',
      description: '单独的衣物件'
    },
    {
      id: 'handheld',
      name: '手持物',
      icon: '🎀',
      description: '包包、玩具、道具等'
    }
  ];

  useEffect(() => {
    fetchCategoryCounts();
  }, []);

  // 搜索功能
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
    } else {
      setIsSearching(true);
      performSearch(searchTerm);
    }
  }, [searchTerm]);

  const fetchCategoryCounts = async () => {
    const counts = {};
    const prices = {};
    for (const category of categories) {
      try {
        const data = await apiGet(`/api/wardrobe/${category.id}`);
        const ownedItems = data.filter(item => item.ownership_status === 'owned');
        const preorderItems = data.filter(item => item.ownership_status === 'preorder');
          
          // 计算数量
          counts[category.id] = { 
            owned: ownedItems.length, 
            preorder: preorderItems.length, 
            total: data.length 
          };
          
          // 计算价格
          const ownedTotalPrice = ownedItems.reduce((sum, item) => {
            return sum + (parseFloat(item.total_price) || 0);
          }, 0);
          
          const preorderPaidPrice = preorderItems.reduce((sum, item) => {
            return sum + (parseFloat(item.deposit) || 0);
          }, 0);
          
          const preorderRemainingPrice = preorderItems.reduce((sum, item) => {
            return sum + (parseFloat(item.final_payment) || 0);
          }, 0);
          
          prices[category.id] = {
            ownedTotal: ownedTotalPrice,
            preorderPaid: preorderPaidPrice,
            preorderRemaining: preorderRemainingPrice,
            totalPaid: ownedTotalPrice + preorderPaidPrice,
            totalRemaining: preorderRemainingPrice
          };
      } catch (error) {
        console.error(`获取${category.name}数据失败:`, error);
        counts[category.id] = { owned: 0, preorder: 0, total: 0 };
        prices[category.id] = { ownedTotal: 0, preorderPaid: 0, preorderRemaining: 0, totalPaid: 0, totalRemaining: 0 };
      }
    }
    setCategoryCounts(counts);
    setCategoryPrices(prices);
  };

  const performSearch = async (term) => {
    try {
      const data = await apiGet(`/api/wardrobe/search/${encodeURIComponent(term)}`);
      setSearchResults(data || []);
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchResults([]);
      setSearchResults([]);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('确定要删除这个配件吗？')) {
      try {
        await apiDelete(`/api/wardrobe/${id}`);
        // 重新获取数据
        fetchAllWardrobeItems();
        fetchCategoryCounts();
      } catch (error) {
        console.error('删除配件失败:', error);
      }
    }
  };

  const handleConfirmArrival = async (id, hasArrived) => {
    try {
      await apiPut(`/api/wardrobe/${id}/confirm-arrival`, { hasArrived });
      // 重新获取数据
      fetchAllWardrobeItems();
      fetchCategoryCounts();
      if (hasArrived) {
        alert('配件状态已更新为已到家！');
      } else {
        alert('配件已标记为逾期状态');
      }
    } catch (error) {
      console.error('确认到达状态失败:', error);
      alert('操作失败，请重试');
    }
  };

  const handlePaymentStatusChange = async (id, newPaymentStatus) => {
    try {
      await apiPut(`/api/wardrobe/${id}/payment-status`, { payment_status: newPaymentStatus });
      fetchAllWardrobeItems();
      fetchCategoryCounts();
      if (newPaymentStatus === 'full_paid') {
        alert('已标记为已付尾款！');
      }
    } catch (error) {
      console.error('更新付款状态失败:', error);
      alert('操作失败，请重试');
    }
  };

  const handleImageClick = (imageUrl, title) => {
    setViewingImage({ url: imageUrl, title });
    setImageViewerOpen(true);
  };

  const handleCloseImageViewer = () => {
    setImageViewerOpen(false);
    setViewingImage({ url: '', title: '' });
  };

  // 按尺寸分组配件
  const groupItemsBySize = (items) => {
    const sizeGroups = {};
    
    items.forEach(item => {
      if (item.sizes) {
        try {
          const sizesArray = JSON.parse(item.sizes);
          sizesArray.forEach(size => {
            if (!sizeGroups[size]) {
              sizeGroups[size] = [];
            }
            sizeGroups[size].push(item);
          });
        } catch (e) {
          // 忽略无效的JSON数据
        }
      }
    });

    // 按数量排序（从多到少）
    return Object.keys(sizeGroups)
      .sort((a, b) => sizeGroups[b].length - sizeGroups[a].length)
      .map(size => ({
        size,
        items: sizeGroups[size],
        count: sizeGroups[size].length
      }));
  };

  // 按品牌分组配件
  const groupItemsByBrand = (items) => {
    const brandGroups = {};
    
    items.forEach(item => {
      const brand = item.brand || '未知品牌';
      if (!brandGroups[brand]) {
        brandGroups[brand] = [];
      }
      brandGroups[brand].push(item);
    });

    // 按数量排序（从多到少）
    return Object.keys(brandGroups)
      .sort((a, b) => brandGroups[b].length - brandGroups[a].length)
      .map(brand => ({
        brand,
        items: brandGroups[brand],
        count: brandGroups[brand].length
      }));
  };

  const fetchBrandData = async () => {
    try {
      const data = await apiGet('/api/wardrobe/stats/brands');
      setBrandData(data);
    } catch (error) {
      console.error('获取品牌数据失败:', error);
    }
  };

  const fetchSizeData = async () => {
    try {
      const data = await apiGet('/api/wardrobe/stats/sizes');
      setSizeData(data);
    } catch (error) {
      console.error('获取尺寸数据失败:', error);
    }
  };

  const fetchStatusData = async () => {
    try {
      const data = await apiGet('/api/wardrobe/stats/status');
      setStatusData(data);
    } catch (error) {
      console.error('获取状态数据失败:', error);
    }
  };

  const fetchAllWardrobeItems = async () => {
    try {
      const allItems = [];
      // 获取每个分类的数据并合并
      for (const category of categories) {
        try {
          const data = await apiGet(`/api/wardrobe/${category.id}`);
          allItems.push(...data);
        } catch (error) {
          console.error(`获取${category.name}数据失败:`, error);
        }
      }
      setAllWardrobeItems(allItems);
    } catch (error) {
      console.error('获取所有配件数据失败:', error);
    }
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'brand' || mode === 'size' || mode === 'status') {
      fetchAllWardrobeItems();
    }
  };

  if (selectedCategory) {
    return (
      <div className="page-content">
        <div className="page-header">
          <h1>{categories.find(c => c.id === selectedCategory)?.name}</h1>
          <button 
            className="header-button" 
            onClick={() => {
              setSelectedCategory(null);
              fetchCategoryCounts(); // 刷新统计数据
            }}
          >
            返回
          </button>
        </div>
        <WardrobeCategory 
          category={selectedCategory}
          categoryName={categories.find(c => c.id === selectedCategory)?.name}
        />
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>{currentUser?.username || '我'}的衣柜</h1>
        <div className="view-mode-buttons">
          <button 
            className={`view-mode-btn ${viewMode === 'category' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('category')}
          >
            📁 分类
          </button>
          <button 
            className={`view-mode-btn ${viewMode === 'brand' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('brand')}
          >
            🏷️ 品牌
          </button>
          <button 
            className={`view-mode-btn ${viewMode === 'size' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('size')}
          >
            📏 尺寸
          </button>
          <button 
            className={`view-mode-btn ${viewMode === 'status' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('status')}
          >
            📊 状态
          </button>
        </div>
      </div>

      {/* 全局搜索框 */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="搜索所有配件名字或尺寸..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search-btn"
              onClick={clearSearch}
              title="清除搜索"
            >
              ×
            </button>
          )}
          <div className="search-icon">🔍</div>
        </div>
        {searchTerm && (
          <div className="search-results-info">
            找到 {searchResults.length} 个配件
          </div>
        )}
      </div>

      {isSearching ? (
        <div className="search-results">
          {searchResults.length > 0 ? (
            <div className="search-results-content">
              {categories.map(category => {
                const categoryItems = searchResults.filter(item => item.category === category.id);
                if (categoryItems.length === 0) return null;

                return (
                  <div key={category.id} className="search-category-section">
                    <h3 className="search-category-title">
                      <span className="category-icon-small">{category.icon}</span>
                      {category.name} ({categoryItems.length})
                    </h3>
                    <div className="search-items-grid">
                      {categoryItems.map(item => (
                        <SearchResultCard 
                          key={item.id} 
                          item={item} 
                          categoryName={category.name}
                          onImageClick={handleImageClick}
                          onDelete={handleDeleteItem}
                          onConfirmArrival={handleConfirmArrival}
                          onPaymentStatusChange={handlePaymentStatusChange}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-search-results">
              <div className="empty-icon">🔍</div>
              <h3>未找到匹配的配件</h3>
              <p>试试其他关键词，或者<button className="link-btn" onClick={clearSearch}>清除搜索</button></p>
            </div>
          )}
        </div>
      ) : viewMode === 'category' ? (
        <div className="wardrobe-categories">
          <div className="categories-grid">
            {categories.map(category => {
              const counts = categoryCounts[category.id] || { owned: 0, preorder: 0, total: 0 };
              const prices = categoryPrices[category.id] || { totalPaid: 0, totalRemaining: 0 };
              return (
                <div 
                  key={category.id}
                  className="category-card"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <div className="category-icon">
                    {category.icon}
                  </div>
                  <div className="category-info">
                    <h3>{category.name}</h3>
                    {counts.total > 0 && (
                      <div className="category-stats">
                        <span className="stat-item owned">🏠 {counts.owned}</span>
                        {counts.preorder > 0 && (
                          <span className="stat-item preorder">💭 {counts.preorder}</span>
                        )}
                      </div>
                    )}
                    {(prices.totalPaid > 0 || prices.totalRemaining > 0) && (
                      <div className="category-prices">
                        {prices.totalPaid > 0 && (
                          <span className="price-item paid">已付: ¥{prices.totalPaid.toFixed(2)}</span>
                        )}
                        {prices.totalRemaining > 0 && (
                          <span className="price-item remaining">待付: ¥{prices.totalRemaining.toFixed(2)}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="category-arrow">›</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'brand' ? (
        <div className="status-items-view">
          {allWardrobeItems.length > 0 ? (
            <div className="status-sections">
              {groupItemsByBrand(allWardrobeItems).map(({ brand, items, count }) => (
                <div key={brand} className="status-section">
                  <h2 className="section-title brand-title">
                    <span className="title-icon">🏷️</span>
                    {brand} ({count})
                  </h2>
                  <div className="search-items-grid">
                    {items.map(item => {
                      const category = categories.find(cat => cat.id === item.category);
                      return (
                        <SimpleWardrobeCard
                          key={item.id}
                          item={item}
                          categoryName={category ? category.name : '其他'}
                          onImageClick={handleImageClick}
                          onDelete={handleDeleteItem}
                          onConfirmArrival={handleConfirmArrival}
                          onPaymentStatusChange={handlePaymentStatusChange}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-search-results">
              <div className="empty-icon">🏷️</div>
              <h3>还没有配件</h3>
              <p>添加一些配件来查看按品牌分组的视图</p>
            </div>
          )}
        </div>
      ) : viewMode === 'size' ? (
        <div className="status-items-view">
          {allWardrobeItems.length > 0 ? (
            <div className="status-sections">
              {groupItemsBySize(allWardrobeItems).map(({ size, items, count }) => (
                <div key={size} className="status-section">
                  <h2 className="section-title size-title">
                    <span className="title-icon">📏</span>
                    {size} ({count})
                  </h2>
                  <div className="search-items-grid">
                    {items.map(item => {
                      const category = categories.find(cat => cat.id === item.category);
                      return (
                        <SimpleWardrobeCard
                          key={`${item.id}-${size}`}
                          item={item}
                          categoryName={category ? category.name : '其他'}
                          onImageClick={handleImageClick}
                          onDelete={handleDeleteItem}
                          onConfirmArrival={handleConfirmArrival}
                          onPaymentStatusChange={handlePaymentStatusChange}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-search-results">
              <div className="empty-icon">📏</div>
              <h3>还没有配件</h3>
              <p>添加一些配件来查看按尺寸分组的视图</p>
            </div>
          )}
        </div>
      ) : viewMode === 'status' ? (
        <div className="status-items-view">
          {allWardrobeItems.length > 0 ? (
            <div className="status-sections">
              {/* 已到家物品 */}
              {(() => {
                const ownedItems = allWardrobeItems.filter(item => item.ownership_status === 'owned');
                return ownedItems.length > 0 ? (
                  <div className="status-section">
                    <h2 className="section-title owned-title">
                      <span className="title-icon">🏠</span>
                      已到家 ({ownedItems.length})
                    </h2>
                    <div className="search-items-grid">
                      {ownedItems.map(item => {
                        const category = categories.find(cat => cat.id === item.category);
                        return (
                          <SimpleWardrobeCard
                            key={item.id}
                            item={item}
                            categoryName={category ? category.name : '其他'}
                            onImageClick={handleImageClick}
                            onDelete={handleDeleteItem}
                            onConfirmArrival={handleConfirmArrival}
                            onPaymentStatusChange={handlePaymentStatusChange}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* 空气物品 */}
              {(() => {
                const preorderItems = allWardrobeItems.filter(item => item.ownership_status === 'preorder');
                return preorderItems.length > 0 ? (
                  <div className="status-section">
                    <h2 className="section-title preorder-title">
                      <span className="title-icon">💭</span>
                      空气 ({preorderItems.length})
                    </h2>
                    <div className="search-items-grid">
                      {preorderItems.map(item => {
                        const category = categories.find(cat => cat.id === item.category);
                        return (
                          <SimpleWardrobeCard
                            key={item.id}
                            item={item}
                            categoryName={category ? category.name : '其他'}
                            onImageClick={handleImageClick}
                            onDelete={handleDeleteItem}
                            onConfirmArrival={handleConfirmArrival}
                            onPaymentStatusChange={handlePaymentStatusChange}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <div className="no-search-results">
              <div className="empty-icon">📊</div>
              <h3>还没有配件</h3>
              <p>添加一些配件来查看按状态分组的视图</p>
            </div>
          )}
        </div>
      ) : null}

      <div className="wardrobe-summary">
        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-info">
            <h4>衣柜总览</h4>
            <div className="summary-stats">
              {Object.values(categoryCounts).reduce((acc, curr) => ({
                owned: acc.owned + curr.owned,
                preorder: acc.preorder + curr.preorder,
                total: acc.total + curr.total
              }), { owned: 0, preorder: 0, total: 0 }).total > 0 ? (
                <div>
                  <span className="stat-total">
                    共 {Object.values(categoryCounts).reduce((acc, curr) => acc + curr.total, 0)} 件
                  </span>
                  <span className="stat-breakdown">
                    已到家 {Object.values(categoryCounts).reduce((acc, curr) => acc + curr.owned, 0)} 件，
                    空气 {Object.values(categoryCounts).reduce((acc, curr) => acc + curr.preorder, 0)} 件
                  </span>
                  {(() => {
                    const totalPaid = Object.values(categoryPrices).reduce((acc, curr) => acc + curr.totalPaid, 0);
                    const totalRemaining = Object.values(categoryPrices).reduce((acc, curr) => acc + curr.totalRemaining, 0);
                    return (totalPaid > 0 || totalRemaining > 0) && (
                      <div className="summary-prices">
                        {totalPaid > 0 && (
                          <span className="summary-price-item paid">
                            总已付: ¥{totalPaid.toFixed(2)}
                          </span>
                        )}
                        {totalRemaining > 0 && (
                          <span className="summary-price-item remaining">
                            总待付: ¥{totalRemaining.toFixed(2)}
                          </span>
                        )}
                        {totalPaid > 0 && totalRemaining > 0 && (
                          <span className="summary-price-item total">
                            总价值: ¥{(totalPaid + totalRemaining).toFixed(2)}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <p>还没有添加任何服饰，开始建立你的衣柜吧！</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ImageViewer
        imageUrl={viewingImage.url}
        isOpen={imageViewerOpen}
        onClose={handleCloseImageViewer}
        title={viewingImage.title}
      />
    </div>
  );
};

export default WardrobePage;