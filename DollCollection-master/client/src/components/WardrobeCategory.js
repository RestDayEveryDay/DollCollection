import React, { useState, useEffect } from 'react';
import ImageUpload from './ImageUpload';
import ImageViewer from './ImageViewer';
import PositionableImage from './PositionableImage';
import ImagePositionEditor from './ImagePositionEditor';
import WardrobeEditModal from './WardrobeEditModal';
import { apiGet, apiPost, apiPut, apiDelete, authFetch } from '../utils/api';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import './WardrobeCategory.css';

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

// 可拖拽的服饰卡片组件
const SortableWardrobeCard = ({ item, onImageClick, onEdit, onDelete, onConfirmArrival, onPaymentStatusChange, onEditImagePosition }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    transition: {
      duration: 150,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  const daysRemaining = item.ownership_status === 'preorder' ? calculateDaysRemaining(item.final_payment_date) : null;
  const paymentInfo = getPaymentStatusInfo(item);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`wardrobe-card ${item.ownership_status} ${isDragging ? 'dragging' : ''} ${paymentInfo.className}`}
    >
      {item.profile_image_url && (
        <div className="wardrobe-image-container">
          <PositionableImage
            src={item.profile_image_url}
            alt={item.name}
            className="wardrobe-image clickable-image"
            positionX={item.image_position_x || 50}
            positionY={item.image_position_y || 50}
            scale={item.image_scale || 100}
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(item.profile_image_url, item.name);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="点击查看大图"
          />
          <button 
            className="image-position-btn"
            onClick={(e) => {
              e.stopPropagation();
              console.log('按钮被点击了，item:', item);
              onEditImagePosition(item);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="调整图片显示位置"
          >
            🎯
          </button>
        </div>
      )}
      
      <div className="wardrobe-info">
        <h3>{item.name}</h3>
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onPaymentStatusChange && onPaymentStatusChange(item.id, 'full_paid');
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirmArrival && onConfirmArrival(item.id, true);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    是
                  </button>
                  <button 
                    className="confirm-btn no-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirmArrival && onConfirmArrival(item.id, false);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
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
            className="edit-btn"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            编辑
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="delete-btn"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
};

const WardrobeCategory = ({ category, categoryName }) => {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusSelect, setShowStatusSelect] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState({ url: '', title: '' });
  const [editingImagePosition, setEditingImagePosition] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    platform: '',
    ownership_status: 'owned',
    payment_status: 'deposit_only',
    total_price: '',
    deposit: '',
    final_payment: '',
    final_payment_date: '',
    profile_image_url: '',
    sizes: [],
    image_position_x: 50,
    image_position_y: 50,
    image_scale: 100
  });

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (category) {
      fetchItems();
    }
  }, [category]);

  // 搜索功能
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item => {
        const matchesName = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        // 检查尺寸匹配
        let matchesSizes = false;
        if (item.sizes) {
          try {
            const sizesArray = JSON.parse(item.sizes);
            matchesSizes = sizesArray.some(size => 
              size.toLowerCase().includes(searchTerm.toLowerCase())
            );
          } catch {
            matchesSizes = false;
          }
        }
        
        return matchesName || matchesSizes;
      });
      setFilteredItems(filtered);
    }
  }, [searchTerm, items]);

  const fetchItems = async () => {
    try {
      const data = await apiGet(`/api/wardrobe/${category}`);
      setItems(data);
      setFilteredItems(data); // 初始化过滤数据
    } catch (error) {
      console.error('获取服饰数据失败:', error);
    }
  };

  // 拖拽结束处理
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      // 更新服务器排序
      const sortOrder = newItems.map((item, index) => ({
        id: item.id,
        order: index
      }));

      try {
        await apiPost(`/api/sort/wardrobe/${category}`, { sortOrder });
      } catch (error) {
        console.error('更新排序失败:', error);
      }
    }
  };

  const handleStatusSelect = (status) => {
    setEditingItem({ ownership_status: status });
    setShowEditModal(true);
    setShowStatusSelect(false);
  };

  const handleSubmit = async (formData) => {
    const submitData = {
      ...formData,
      category: category
    };

    try {
      const url = editingItem && editingItem.id
        ? `http://localhost:5000/api/wardrobe/${editingItem.id}`
        : 'http://localhost:5000/api/wardrobe';
      
      const method = editingItem && editingItem.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });
      
      if (response.ok) {
        fetchItems();
        setShowEditModal(false);
        setEditingItem(null);
        resetForm();
      }
    } catch (error) {
      console.error('保存服饰失败:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      platform: '',
      ownership_status: 'owned',
      payment_status: 'deposit_only',
      total_price: '',
      deposit: '',
      final_payment: '',
      final_payment_date: '',
      profile_image_url: '',
      sizes: [],
      image_position_x: 50,
      image_position_y: 50,
      image_scale: 100
    });
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    
    // 处理尺寸数据
    let parsedSizes = [];
    if (item.sizes) {
      try {
        parsedSizes = JSON.parse(item.sizes);
      } catch {
        parsedSizes = [];
      }
    }
    
    setFormData({
      name: item.name || '',
      brand: item.brand || '',
      platform: item.platform || '',
      ownership_status: item.ownership_status || 'owned',
      payment_status: item.payment_status || 'deposit_only',
      total_price: item.total_price || '',
      deposit: item.deposit || '',
      final_payment: item.final_payment || '',
      final_payment_date: item.final_payment_date || '',
      profile_image_url: item.profile_image_url || '',
      sizes: parsedSizes,
      image_position_x: item.image_position_x || 50,
      image_position_y: item.image_position_y || 50,
      image_scale: item.image_scale || 100
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这个服饰吗？')) {
      try {
        await apiDelete(`/api/wardrobe/${id}`);
        fetchItems();
      } catch (error) {
        console.error('删除服饰失败:', error);
      }
    }
  };

  const handleConfirmArrival = async (id, hasArrived) => {
    try {
      const response = await authFetch(`/api/wardrobe/${id}/confirm-arrival`, {
        method: 'PUT',
        body: JSON.stringify({ hasArrived }),
      });

      if (response.ok) {
        fetchItems();
        if (hasArrived) {
          alert('配件状态已更新为已到家！');
        } else {
          alert('配件已标记为逾期状态');
        }
      }
    } catch (error) {
      console.error('确认到达状态失败:', error);
      alert('操作失败，请重试');
    }
  };

  const handlePaymentStatusChange = async (id, newPaymentStatus) => {
    try {
      const response = await authFetch(`/api/wardrobe/${id}/payment-status`, {
        method: 'PUT',
        body: JSON.stringify({ payment_status: newPaymentStatus }),
      });

      if (response.ok) {
        fetchItems();
        if (newPaymentStatus === 'full_paid') {
          alert('已标记为已付尾款！');
        }
      }
    } catch (error) {
      console.error('更新付款状态失败:', error);
      alert('操作失败，请重试');
    }
  };

  const handleCancel = () => {
    setShowEditModal(false);
    setShowStatusSelect(false);
    setEditingItem(null);
    resetForm();
  };

  const handleImageClick = (imageUrl, title) => {
    setViewingImage({ url: imageUrl, title });
    setImageViewerOpen(true);
  };

  const handleCloseImageViewer = () => {
    setImageViewerOpen(false);
    setViewingImage({ url: '', title: '' });
  };

  // 处理图片位置更新
  const handleImagePositionUpdate = async (newPosition) => {
    if (editingItem) {
      try {
        const response = await authFetch(`/api/wardrobe/${editingItem.id}/image-position`, {
          method: 'PUT',
          body: JSON.stringify(newPosition),
        });

        if (response.ok) {
          console.log('图片位置更新成功');
          fetchItems();
        }
      } catch (error) {
        console.error('更新图片位置失败:', error);
      }
    }
  };

  // 处理尺寸选择
  const availableSizes = ['ob11', '四分', '70', '75'];
  
  const handleSizeToggle = (size) => {
    setFormData(prev => {
      const newSizes = prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size];
      return { ...prev, sizes: newSizes };
    });
  };

  // 搜索处理函数
  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  // 处理编辑图片位置
  const handleEditImagePosition = (item) => {
    console.log('编辑图片位置:', item);
    setEditingImagePosition(item);
  };

  // 处理图片位置更新
  const handleSaveImagePosition = async (newPosition) => {
    if (editingImagePosition) {
      try {
        const response = await authFetch(`/api/wardrobe/${editingImagePosition.id}/image-position`, {
          method: 'PUT',
          body: JSON.stringify(newPosition),
        });

        if (response.ok) {
          console.log('图片位置更新成功');
          return true;
        }
      } catch (error) {
        console.error('更新图片位置失败:', error);
        return false;
      }
    }
    return false;
  };

  // 分离已到家和空气商品（使用过滤后的数据）
  const ownedItems = filteredItems.filter(item => item.ownership_status === 'owned');
  const preorderItems = filteredItems.filter(item => item.ownership_status === 'preorder');

  // 计算价格统计
  const ownedTotalPrice = ownedItems.reduce((sum, item) => {
    return sum + (parseFloat(item.total_price) || 0);
  }, 0);

  // 区分不同付款状态的预订商品
  const depositOnlyItems = preorderItems.filter(item => (item.payment_status || 'deposit_only') === 'deposit_only');
  const fullPaidItems = preorderItems.filter(item => (item.payment_status || 'deposit_only') === 'full_paid');

  const preorderPaidPrice = preorderItems.reduce((sum, item) => {
    const paymentStatus = item.payment_status || 'deposit_only';
    if (paymentStatus === 'full_paid') {
      return sum + (parseFloat(item.total_price) || 0);
    } else {
      return sum + (parseFloat(item.deposit) || 0);
    }
  }, 0);

  const preorderRemainingPrice = depositOnlyItems.reduce((sum, item) => {
    return sum + (parseFloat(item.final_payment) || 0);
  }, 0);

  return (
    <div className="wardrobe-category">
      <div className="category-header">
        <div className="add-button-container">
          <button 
            className="header-button"
            onClick={editingItem ? handleCancel : () => {
              if (showEditModal || showStatusSelect) {
                handleCancel();
              } else {
                setShowStatusSelect(true);
              }
            }}
          >
            {editingItem ? '取消编辑' : (showEditModal || showStatusSelect ? '取消' : '添加服饰')}
          </button>
          
          {showStatusSelect && (
            <div className="status-options">
              <button 
                className="status-button owned-button"
                onClick={() => handleStatusSelect('owned')}
              >
                <span className="status-icon">🏠</span>
                <span>已到家</span>
              </button>
              <button 
                className="status-button preorder-button"
                onClick={() => handleStatusSelect('preorder')}
              >
                <span className="status-icon">💭</span>
                <span>空气</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 搜索框 */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder={`搜索${categoryName}名字或尺寸...`}
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
            找到 {filteredItems.length} 个{categoryName}
          </div>
        )}
      </div>


      <div className="wardrobe-items">
        {ownedItems.length > 0 && (
          <div className="items-section">
            <h2 className="section-title owned-title">
              <div className="title-left">
                <span className="title-icon">🏠</span>
                已到家 ({ownedItems.length})
              </div>
              <div className="price-summary">
                <span className="price-label">已付:</span>
                <span className="price-value">¥{ownedTotalPrice.toFixed(2)}</span>
              </div>
            </h2>
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={ownedItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="items-grid">
                  {ownedItems.map(item => (
                    <SortableWardrobeCard
                      key={item.id}
                      item={item}
                      onImageClick={handleImageClick}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onConfirmArrival={handleConfirmArrival}
                      onPaymentStatusChange={handlePaymentStatusChange}
                      onEditImagePosition={handleEditImagePosition}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {preorderItems.length > 0 && (
          <div className="items-section">
            <h2 className="section-title preorder-title">
              <div className="title-left">
                <span className="title-icon">💭</span>
                空气 ({preorderItems.length})
                <span className="status-breakdown">
                  {depositOnlyItems.length > 0 && `定金${depositOnlyItems.length}件`}
                  {fullPaidItems.length > 0 && depositOnlyItems.length > 0 && ' | '}
                  {fullPaidItems.length > 0 && `全款${fullPaidItems.length}件`}
                </span>
              </div>
              <div className="price-summary">
                <span className="price-label">已付:</span>
                <span className="price-value paid">¥{preorderPaidPrice.toFixed(2)}</span>
                <span className="price-separator">|</span>
                <span className="price-label">待付:</span>
                <span className="price-value remaining">¥{preorderRemainingPrice.toFixed(2)}</span>
              </div>
            </h2>
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={preorderItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="items-grid">
                  {preorderItems.map(item => (
                    <SortableWardrobeCard
                      key={item.id}
                      item={item}
                      onImageClick={handleImageClick}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onConfirmArrival={handleConfirmArrival}
                      onPaymentStatusChange={handlePaymentStatusChange}
                      onEditImagePosition={handleEditImagePosition}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👗</div>
            <h3>还没有{categoryName}</h3>
            <p>点击\"添加服饰\"开始收集你的{categoryName}吧！</p>
          </div>
        ) : filteredItems.length === 0 && searchTerm ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>未找到匹配的{categoryName}</h3>
            <p>试试其他关键词，或者<button className="link-btn" onClick={clearSearch}>清除搜索</button></p>
          </div>
        ) : null}
      </div>

      <ImageViewer
        imageUrl={viewingImage.url}
        isOpen={imageViewerOpen}
        onClose={handleCloseImageViewer}
        title={viewingImage.title}
      />

      <ImagePositionEditor
        imageUrl={editingImagePosition?.profile_image_url}
        initialPosition={{
          x: editingImagePosition?.image_position_x || 50,
          y: editingImagePosition?.image_position_y || 50
        }}
        initialScale={editingImagePosition?.image_scale || 100}
        isOpen={!!editingImagePosition}
        onSave={({ position, scale }) => {
          if (editingImagePosition) {
            handleSaveImagePosition({
              image_position_x: position.x,
              image_position_y: position.y,
              image_scale: scale
            }).then(() => {
              setEditingImagePosition(null);
              fetchItems();
            });
          }
        }}
        onCancel={() => {
          setEditingImagePosition(null);
        }}
      />

      <WardrobeEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingItem(null);
        }}
        onSubmit={handleSubmit}
        itemData={editingItem}
        isEditing={editingItem && editingItem.id}
        category={category}
      />
    </div>
  );
};

export default WardrobeCategory;