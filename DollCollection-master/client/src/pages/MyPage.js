import React, { useState, useEffect } from 'react';
import './MyPage.css';
import { apiGet, apiPut, apiPost } from '../utils/api';
import ImageUpload from '../components/ImageUpload';
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

// 可拖拽的相册卡片组件
const SortableAlbumCard = ({ album, onTogglePin, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({id: `${album.type}-${album.id}`});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`album-card ${album.isPinned ? 'pinned' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      <div className="album-card-header">
        <div className="drag-handle" {...attributes} {...listeners}>
          ⋮⋮
        </div>
        <button 
          className="pin-btn"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(album);
          }}
          title={album.isPinned ? "取消置顶" : "置顶"}
        >
          {album.isPinned ? '★' : '☆'}
        </button>
      </div>
      <div 
        className="album-card-body"
        onClick={() => onClick(album)}
      >
        <div className="album-cover">
          {album.coverImage ? (
            <img src={album.coverImage} alt={album.name} />
          ) : (
            <div className="album-placeholder">相册</div>
          )}
          <div className="album-type-badge">
            {album.type === 'head' ? '娃头' : '娃体'}
          </div>
        </div>
        <div className="album-info">
          <h3 className="album-name">{album.name}</h3>
          {album.company && (
            <p className="album-company">{album.company}</p>
          )}
          <div className="album-stats">
            <span className="photo-count">照片: {album.photoCount}张</span>
            {album.lastUpdate && (
              <span className="last-update">
                更新于 {new Date(album.lastUpdate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
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
  const [userAvatar, setUserAvatar] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [albumsData, setAlbumsData] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [showAlbumDetail, setShowAlbumDetail] = useState(false);
  const [headAlbums, setHeadAlbums] = useState([]);
  const [bodyAlbums, setBodyAlbums] = useState([]);
  
  // 折叠状态管理
  const [collapsedSections, setCollapsedSections] = useState(() => {
    // 从localStorage读取用户的折叠偏好
    const saved = localStorage.getItem('myPageCollapsedSections');
    return saved ? JSON.parse(saved) : {
      expense: false,  // 默认展开花费统计
      payment: true,   // 默认折叠尾款顺序
      albums: true     // 默认折叠相册集
    };
  });
  
  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // 切换折叠状态
  const toggleSection = (section) => {
    const newState = {
      ...collapsedSections,
      [section]: !collapsedSections[section]
    };
    setCollapsedSections(newState);
    // 保存到localStorage
    localStorage.setItem('myPageCollapsedSections', JSON.stringify(newState));
  };
  
  // 导出所有数据
  const exportAllData = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5001/api/export/all-data'
        : '/api/export/all-data';
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('导出失败');
      }
      
      // 获取文件名
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `doll_collection_${new Date().toISOString().split('T')[0]}.csv`;
      
      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert('数据导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请稍后重试');
    }
  };

  useEffect(() => {
    fetchExpenseStats();
    fetchPaymentReminders();
    fetchUserInfo();
    fetchAlbumsData();
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

  const fetchUserInfo = async () => {
    try {
      const data = await apiGet('/api/auth/user-info');
      if (data.avatar) {
        setUserAvatar(data.avatar);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  // 处理修改用户名
  const handleChangeUsername = async () => {
    if (!newUsername.trim()) {
      setUsernameError('用户名不能为空');
      return;
    }

    try {
      const data = await apiPut('/api/auth/change-username', { 
        newUsername: newUsername.trim() 
      });
      
      // 更新本地存储
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      
      // 关闭弹窗
      setShowUsernameModal(false);
      setNewUsername('');
      setUsernameError('');
      
      // 刷新页面以更新用户名显示
      window.location.reload();
    } catch (error) {
      console.error('修改用户名失败:', error);
      setUsernameError(error.message || '网络错误，请重试');
    }
  };

  // 处理头像更新
  const handleAvatarUpdate = async (imageUrl) => {
    try {
      await apiPut('/api/auth/update-avatar', { avatar: imageUrl });
      setUserAvatar(imageUrl);
      setShowAvatarModal(false);
      // 更新当前用户信息
      if (currentUser) {
        currentUser.avatar = imageUrl;
      }
    } catch (error) {
      console.error('更新头像失败:', error);
      alert('更新头像失败，请重试');
    }
  };

  // 获取相册集数据
  const fetchAlbumsData = async () => {
    try {
      const headsArr = [];
      const bodiesArr = [];
      
      // 获取所有娃头的照片数据
      const dollHeads = await apiGet('/api/doll-heads');
      for (const head of dollHeads) {
        const photoCount = await apiGet(`/api/albums/photo-count/${head.id}?type=head`);
        if (photoCount.total > 0) {
          headsArr.push({
            id: head.id,
            type: 'head',
            name: head.name,
            company: head.company,
            coverImage: head.profile_image_url,
            photoCount: photoCount.total,
            lastUpdate: photoCount.lastUpdate,
            photos: photoCount.photos || [],
            isPinned: head.album_is_pinned || false,
            sortOrder: head.album_sort_order || 999999
          });
        }
      }
      
      // 获取所有娃体的照片数据
      const dollBodies = await apiGet('/api/doll-bodies');
      for (const body of dollBodies) {
        const photoCount = await apiGet(`/api/albums/photo-count/${body.id}?type=body`);
        if (photoCount.total > 0) {
          bodiesArr.push({
            id: body.id,
            type: 'body',
            name: body.name,
            company: body.company,
            coverImage: body.profile_image_url,
            photoCount: photoCount.total,
            lastUpdate: photoCount.lastUpdate,
            photos: photoCount.photos || [],
            isPinned: body.album_is_pinned || false,
            sortOrder: body.album_sort_order || 999999
          });
        }
      }
      
      // 分别排序：置顶的在前，然后按sortOrder排序
      headsArr.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return a.sortOrder - b.sortOrder;
      });
      
      bodiesArr.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return a.sortOrder - b.sortOrder;
      });
      
      setHeadAlbums(headsArr);
      setBodyAlbums(bodiesArr);
      setAlbumsData([...headsArr, ...bodiesArr]);
    } catch (error) {
      console.error('获取相册集数据失败:', error);
    }
  };

  // 获取尾款提醒数据
  // 处理相册拖拽结束
  const handleAlbumDragEnd = async (event, type) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const albums = type === 'head' ? headAlbums : bodyAlbums;
      const setAlbums = type === 'head' ? setHeadAlbums : setBodyAlbums;
      
      const oldIndex = albums.findIndex((item) => `${item.type}-${item.id}` === active.id);
      const newIndex = albums.findIndex((item) => `${item.type}-${item.id}` === over.id);
      
      const newList = arrayMove(albums, oldIndex, newIndex);
      setAlbums(newList);
      
      // 更新服务器排序
      const sortOrder = newList.map((album, index) => ({
        id: album.id,
        type: album.type,
        order: index
      }));
      
      try {
        await apiPost('/api/albums/sort', { sortOrder });
        // 更新整体数据
        if (type === 'head') {
          setAlbumsData([...newList, ...bodyAlbums]);
        } else {
          setAlbumsData([...headAlbums, ...newList]);
        }
      } catch (error) {
        console.error('更新相册排序失败:', error);
        fetchAlbumsData(); // 失败时重新获取数据
      }
    }
  };

  // 切换相册置顶状态
  const toggleAlbumPin = async (album) => {
    try {
      const result = await apiPut(`/api/albums/toggle-pin/${album.type}/${album.id}`);
      
      // 更新本地状态
      const updateAlbum = (albums) => 
        albums.map(a => 
          a.id === album.id && a.type === album.type 
            ? { ...a, isPinned: result.isPinned } 
            : a
        );
      
      if (album.type === 'head') {
        const updated = updateAlbum(headAlbums);
        // 重新排序：置顶的在前
        updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return a.sortOrder - b.sortOrder;
        });
        setHeadAlbums(updated);
        setAlbumsData([...updated, ...bodyAlbums]);
      } else {
        const updated = updateAlbum(bodyAlbums);
        // 重新排序：置顶的在前
        updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return a.sortOrder - b.sortOrder;
        });
        setBodyAlbums(updated);
        setAlbumsData([...headAlbums, ...updated]);
      }
    } catch (error) {
      console.error('切换置顶状态失败:', error);
    }
  };

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
          <div 
            className="profile-avatar clickable"
            onClick={() => setShowAvatarModal(true)}
            title="点击修改头像"
          >
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt="用户头像" 
                className="avatar-image"
              />
            ) : (
              <span className="avatar-icon">用户</span>
            )}
            <div className="avatar-overlay">
              <span className="avatar-edit-icon">编辑</span>
            </div>
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
                编辑
              </button>
            </div>
            <div className="profile-subtitle">收藏管理 & 花费统计</div>
          </div>
          <div className="header-actions">
            <button 
              className="header-export-btn"
              onClick={exportAllData}
              title="导出所有数据到CSV文件"
            >
              导出数据
            </button>
            <button 
              className="header-logout-btn"
              onClick={onLogout}
            >
              退出登录
            </button>
          </div>
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

      {/* 修改头像弹窗 */}
      {showAvatarModal && (
        <div className="modal-overlay" onClick={() => setShowAvatarModal(false)}>
          <div className="modal-content avatar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>修改头像</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowAvatarModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <ImageUpload
                onImageSelect={handleAvatarUpdate}
                currentImage={userAvatar}
                placeholder="选择新头像"
              />
              <div className="avatar-preview">
                {userAvatar && (
                  <div>
                    <p>当前头像：</p>
                    <img src={userAvatar} alt="当前头像" className="preview-image" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 花费统计 */}
      {expenseStats && (
        <div className="expense-section">
          <h2 className="section-title collapsible" onClick={() => toggleSection('expense')}>
            <span className="collapse-icon">{collapsedSections.expense ? '▶' : '▼'}</span>
            花费统计
            {collapsedSections.expense && (
              <span className="section-summary">总计: ¥{expenseStats.grandTotal.toFixed(2)}</span>
            )}
          </h2>
          
          {!collapsedSections.expense && (
            <div className="expense-cards-grid">
              {/* 总花费卡片 */}
              <div className="expense-card total-card">
                <div className="total-card-content">
                  <div className="card-info">
                    <h3 className="card-title">总花费</h3>
                    <div className="card-amount">¥{expenseStats.grandTotal.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* 娃柜花费卡片 */}
              <div className="expense-card dolls-card">
                <div className="card-info">
                  <h3 className="card-title">娃柜花费</h3>
                  <div className="card-amount">¥{expenseStats.dolls.total.toFixed(2)}</div>
                  <div className="card-percentage">{((expenseStats.dolls.total / expenseStats.grandTotal) * 100).toFixed(1)}%</div>
                </div>
                <div className="card-details">
                  <div className="detail-item">
                    <span className="detail-label">娃头</span>
                    <span className="detail-value">¥{expenseStats.dolls.heads.toFixed(2)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">娃体</span>
                    <span className="detail-value">¥{expenseStats.dolls.bodies.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 妆容花费卡片 */}
              <div className="expense-card makeup-card">
                <div className="card-info">
                  <h3 className="card-title">妆容花费</h3>
                  <div className="card-amount">¥{expenseStats.makeup.total.toFixed(2)}</div>
                  <div className="card-percentage">{((expenseStats.makeup.total / expenseStats.grandTotal) * 100).toFixed(1)}%</div>
                </div>
                <div className="card-details">
                  {expenseStats.makeup.history > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">历史妆容</span>
                      <span className="detail-value">¥{expenseStats.makeup.history.toFixed(2)}</span>
                    </div>
                  )}
                  {expenseStats.makeup.current > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">当前妆容</span>
                      <span className="detail-value">¥{expenseStats.makeup.current.toFixed(2)}</span>
                    </div>
                  )}
                  {expenseStats.makeup.appointment > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">约妆费用</span>
                      <span className="detail-value">¥{expenseStats.makeup.appointment.toFixed(2)}</span>
                    </div>
                  )}
                  {expenseStats.makeup.body > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">娃体妆容</span>
                      <span className="detail-value">¥{expenseStats.makeup.body.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 衣柜花费卡片 */}
              <div className="expense-card wardrobe-card">
                <div className="card-info">
                  <h3 className="card-title">衣柜花费</h3>
                  <div className="card-amount">¥{expenseStats.wardrobe.total.toFixed(2)}</div>
                  <div className="card-percentage">{((expenseStats.wardrobe.total / expenseStats.grandTotal) * 100).toFixed(1)}%</div>
                </div>
                <div className="card-details">
                  {expenseStats.wardrobe.body_accessories > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">配饰</span>
                      <span className="detail-value">¥{expenseStats.wardrobe.body_accessories.toFixed(2)}</span>
                    </div>
                  )}
                  {expenseStats.wardrobe.eyes > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">眼睛</span>
                      <span className="detail-value">¥{expenseStats.wardrobe.eyes.toFixed(2)}</span>
                    </div>
                  )}
                  {expenseStats.wardrobe.wigs > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">假发</span>
                      <span className="detail-value">¥{expenseStats.wardrobe.wigs.toFixed(2)}</span>
                    </div>
                  )}
                  {expenseStats.wardrobe.headwear > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">头饰</span>
                      <span className="detail-value">¥{expenseStats.wardrobe.headwear.toFixed(2)}</span>
                    </div>
                  )}
                  {expenseStats.wardrobe.sets > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">套装</span>
                      <span className="detail-value">¥{expenseStats.wardrobe.sets.toFixed(2)}</span>
                    </div>
                  )}
                  {expenseStats.wardrobe.single_items > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">单品</span>
                      <span className="detail-value">¥{expenseStats.wardrobe.single_items.toFixed(2)}</span>
                    </div>
                  )}
                  {expenseStats.wardrobe.handheld > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">手持物</span>
                      <span className="detail-value">¥{expenseStats.wardrobe.handheld.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 尾款顺序 */}
      {paymentReminders.length > 0 && (
        <div className="payment-reminders-section">
          <h2 className="section-title collapsible" onClick={() => toggleSection('payment')}>
            <span className="collapse-icon">{collapsedSections.payment ? '▶' : '▼'}</span>
            尾款顺序
            {collapsedSections.payment && (
              <span className="section-summary">待付: {paymentReminders.length}项</span>
            )}
          </h2>
          {!collapsedSections.payment && (
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
              } else if (daysRemaining === 0) {
                statusClass = 'today';
                statusText = '今日开始尾款期';
              } else if (daysRemaining < 0) {
                statusClass = 'urgent';
                statusText = `尾款期剩 ${30 + daysRemaining} 天`;
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
          )}
        </div>
      )}

      {/* 相册集 */}
      {albumsData.length > 0 && (
        <div className="albums-section">
          <h2 className="section-title collapsible" onClick={() => toggleSection('albums')}>
            <span className="collapse-icon">{collapsedSections.albums ? '▶' : '▼'}</span>
            相册集
            {collapsedSections.albums && (
              <span className="section-summary">共 {albumsData.length} 个相册</span>
            )}
          </h2>
          
          {!collapsedSections.albums && (
            <>
          {/* 娃头相册 */}
          {headAlbums.length > 0 && (
            <div className="album-category">
              <h3 className="category-title">娃头相册</h3>
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleAlbumDragEnd(event, 'head')}
              >
                <SortableContext 
                  items={headAlbums.map(album => `${album.type}-${album.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="albums-grid">
                    {headAlbums.map(album => (
                      <SortableAlbumCard
                        key={`${album.type}-${album.id}`}
                        album={album}
                        onTogglePin={toggleAlbumPin}
                        onClick={(album) => {
                          setSelectedAlbum(album);
                          setShowAlbumDetail(true);
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
          
          {/* 娃体相册 */}
          {bodyAlbums.length > 0 && (
            <div className="album-category">
              <h3 className="category-title">娃体相册</h3>
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleAlbumDragEnd(event, 'body')}
              >
                <SortableContext 
                  items={bodyAlbums.map(album => `${album.type}-${album.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="albums-grid">
                    {bodyAlbums.map(album => (
                      <SortableAlbumCard
                        key={`${album.type}-${album.id}`}
                        album={album}
                        onTogglePin={toggleAlbumPin}
                        onClick={(album) => {
                          setSelectedAlbum(album);
                          setShowAlbumDetail(true);
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* 相册详情弹窗 */}
      {showAlbumDetail && selectedAlbum && (
        <div className="modal-overlay" onClick={() => setShowAlbumDetail(false)}>
          <div className="album-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="album-detail-header">
              <h2>{selectedAlbum.name} 的相册</h2>
              <button 
                className="modal-close-btn"
                onClick={() => setShowAlbumDetail(false)}
              >
                ×
              </button>
            </div>
            <div className="album-detail-body">
              <div className="album-photos-grid">
                {selectedAlbum.photos && selectedAlbum.photos.map((photo, index) => (
                  <div key={index} className="album-photo-item">
                    <img 
                      src={photo.url} 
                      alt={`${selectedAlbum.name} - ${index + 1}`}
                      onClick={() => {
                        // 可以调用ImageViewer组件查看大图
                      }}
                    />
                    {photo.type && (
                      <div className="photo-type-badge">{photo.type}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MyPage;