import React, { useState, useEffect } from 'react';
import ImageUpload from '../components/ImageUpload';
import PhotoGallery from '../components/PhotoGallery';
import MakeupBook from '../components/MakeupBook';
import BodyMakeup from '../components/BodyMakeup';
import ImageViewer from '../components/ImageViewer';
import PositionableImage from '../components/PositionableImage';
import ImagePositionEditor from '../components/ImagePositionEditor';
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '../utils/api';
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
      return { status: '🚨 今日截止', className: 'status-badge-preorder status-badge-urgent', showActions: true };
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

// 统计卡片组件
const DollStatsCard = ({ title, icon, data, type }) => {
  // 为data提供默认值，避免undefined错误
  const safeData = data || {};
  
  return (
    <div className={`stats-card doll-${type}-card`}>
      <div className="stats-header">
        <h3 className="stats-name">{icon} {title}</h3>
        <div className="stats-badge">
          {type === 'makeup' ? `${safeData.total_makeup_count || 0} 次` : `${safeData.total_count || 0} 件`}
        </div>
      </div>
      
      <div className="stats-details">
        {type === 'makeup' ? (
          // 妆费统计显示
          <>
            <div className="stats-row">
              <div className="stats-item">
                <span className="stats-label">历史妆容:</span>
                <span className="stats-value makeup">¥{(safeData.head_history_cost || 0).toFixed(2)}</span>
              </div>
              <div className="stats-item">
                <span className="stats-label">当前妆容:</span>
                <span className="stats-value makeup">¥{(safeData.head_current_cost || 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="stats-row">
              <div className="stats-item">
                <span className="stats-label">约妆费用:</span>
                <span className="stats-value appointment">¥{(safeData.head_appointment_cost || 0).toFixed(2)}</span>
              </div>
              <div className="stats-item">
                <span className="stats-label">娃体妆费:</span>
                <span className="stats-value body-makeup">¥{(safeData.body_makeup_cost || 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="stats-amount">
              <div className="amount-row">
                <span className="amount-label">总妆费:</span>
                <span className="amount-value makeup-total">¥{(safeData.total_makeup_cost || 0).toFixed(2)}</span>
              </div>
            </div>
          </>
        ) : (
          // 原有的娃娃统计显示
          <>
            <div className="stats-row">
              <div className="stats-item">
                <span className="stats-label">已到家:</span>
                <span className="stats-value owned">{safeData.owned_count || 0} 件</span>
              </div>
              <div className="stats-item">
                <span className="stats-label">空气:</span>
                <span className="stats-value preorder">{safeData.preorder_count || 0} 件</span>
              </div>
            </div>
            
            <div className="stats-amount">
              <div className="amount-row">
                <span className="amount-label">总金额:</span>
                <span className="amount-value">¥{(safeData.total_amount || 0).toFixed(2)}</span>
              </div>
              {(safeData.total_amount_owned || 0) > 0 && (
                <div className="amount-breakdown">
                  <span>已到家: ¥{(safeData.total_amount_owned || 0).toFixed(2)}</span>
                </div>
              )}
              {(safeData.total_amount_preorder || 0) > 0 && (
                <div className="amount-breakdown preorder-amount">
                  <span>空气: ¥{(safeData.total_amount_preorder || 0).toFixed(2)}</span>
                  <div className="payment-info">
                    <span className="paid">已付: ¥{(safeData.total_paid || 0).toFixed(2)}</span>
                    <span className="remaining">待付: ¥{(safeData.total_remaining || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// 可拖拽的娃头卡片组件
const SortableDollCard = ({ head, type, onImageClick, onShowDetails, onEdit, onDelete, onEditImagePosition, onPaymentStatusChange, onConfirmArrival }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: head.id,
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
    boxShadow: isDragging ? '0 20px 40px rgba(0, 0, 0, 0.15)' : undefined,
  };

  const daysRemaining = (head.ownership_status === 'preorder') ? calculateDaysRemaining(head.final_payment_date) : null;
  const paymentInfo = getPaymentStatusInfo(head);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`doll-card ${type === 'head' ? 'head-card' : 'body-card'} ${isDragging ? 'dragging' : ''} ${head.ownership_status === 'owned' ? 'status-owned' : 'status-preorder'}`}
    >
      {head.profile_image_url && (
        <div className="doll-image-container">
          <PositionableImage
            src={head.profile_image_url} 
            alt={head.name} 
            className="doll-image clickable-image"
            positionX={head.image_position_x}
            positionY={head.image_position_y}
            scale={head.image_scale}
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(head.profile_image_url, `${head.name} - ${type === 'head' ? '娃头' : '娃体'}`);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="点击查看大图"
          />
          <button 
            className="image-position-btn"
            onClick={(e) => {
              e.stopPropagation();
              onEditImagePosition(head, type);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="调整图片显示位置"
          >
            🎯
          </button>
        </div>
      )}
      <div className="doll-info">
        <h3>{head.name}</h3>
        <p><strong>娃社:</strong> {head.company}</p>
        <p><strong>肤色:</strong> {head.skin_tone}</p>
        {head.size_category && <p><strong>尺寸:</strong> {head.size_category}</p>}
        {head.head_circumference && <p><strong>头围:</strong> {head.head_circumference}</p>}
        {head.original_price && <p><strong>原价:</strong> ¥{head.original_price}</p>}
        {head.actual_price && <p><strong>到手价:</strong> ¥{head.actual_price}</p>}
        {head.purchase_channel && <p><strong>渠道:</strong> {head.purchase_channel}</p>}
        <p className={`status-badge ${paymentInfo.className}`}>
          {paymentInfo.status}
        </p>
        
        {(head.ownership_status === 'preorder') && (
          <div className="payment-info-section">
            {head.final_payment_date && (head.payment_status || 'deposit_only') !== 'full_paid' && (
              <div className="countdown-info">
                <p className="payment-date">
                  <strong>尾款时间:</strong> {new Date(head.final_payment_date).toLocaleDateString()}
                </p>
                {daysRemaining !== null && (
                  <div className={`countdown ${daysRemaining <= 7 ? 'countdown-urgent' : daysRemaining <= 30 ? 'countdown-warning' : ''}`}>
                    {daysRemaining > 0 ? (
                      <span>还有 {daysRemaining} 天</span>
                    ) : daysRemaining === 0 ? (
                      <span className="today">今天截止！</span>
                    ) : daysRemaining > -30 ? (
                      <span className="grace-period">尾款期还剩 {30 + daysRemaining} 天</span>
                    ) : (
                      <span className="overdue">已逾期 {Math.abs(daysRemaining + 30)} 天</span>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {paymentInfo.showActions && (head.payment_status || 'deposit_only') === 'deposit_only' && (
              <div className="payment-actions">
                <button 
                  className="payment-btn mark-paid-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPaymentStatusChange && onPaymentStatusChange(head.id, 'full_paid');
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  💰 标记已付尾款
                </button>
              </div>
            )}
            
            {(head.payment_status === 'full_paid' && head.ownership_status === 'preorder') && (
              <div className="arrival-confirm">
                <div className="confirm-buttons">
                  <span className="confirm-question">是否已到家？</span>
                  <button 
                    className="confirm-btn yes-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirmArrival && onConfirmArrival(head.id, true);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    是
                  </button>
                  <button 
                    className="confirm-btn no-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirmArrival && onConfirmArrival(head.id, false);
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

        {head.neck_circumference && (
          <p><strong>脖围:</strong> {head.neck_circumference}cm</p>
        )}
        {head.shoulder_width && (
          <p><strong>肩宽:</strong> {head.shoulder_width}cm</p>
        )}
        <div className="card-actions">
          <button 
            className="edit-btn"
            onClick={(e) => {
              e.stopPropagation();
              onShowDetails(head, type);
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            详情
          </button>
          <button 
            className="edit-btn"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(head);
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            编辑
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(head.id);
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

const DollsPage = ({ currentUser }) => {
  const [dollHeads, setDollHeads] = useState([]);
  const [dollBodies, setDollBodies] = useState([]);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [showAddForm, setShowAddForm] = useState(null); // 'head' or 'body'
  const [showStatusSelect, setShowStatusSelect] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedDoll, setSelectedDoll] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState({ url: '', title: '' });
  const [editingHead, setEditingHead] = useState(null);
  const [editingBody, setEditingBody] = useState(null);
  
  // 搜索相关状态
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // 添加分类视图状态
  const [viewMode, setViewMode] = useState('type'); // 'type', 'size', 'company', or 'stats'
  
  // 统计数据状态
  const [dollStats, setDollStats] = useState(null);
  
  // 娃社展开/折叠状态
  const [expandedCompanies, setExpandedCompanies] = useState(() => {
    // 从 localStorage 读取保存的展开状态
    const saved = localStorage.getItem('expandedCompanies');
    return saved ? JSON.parse(saved) : {};
  });
  
  // 处理视图模式变化
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };
  
  // 按娃社分组函数
  const groupDollsByCompany = (heads, bodies) => {
    const companyGroups = {};
    
    // 分组娃头
    heads.forEach(head => {
      const company = head.company || '未知娃社';
      if (!companyGroups[company]) {
        companyGroups[company] = { heads: [], bodies: [], stats: {} };
      }
      companyGroups[company].heads.push(head);
    });
    
    // 分组娃体
    bodies.forEach(body => {
      const company = body.company || '未知娃社';
      if (!companyGroups[company]) {
        companyGroups[company] = { heads: [], bodies: [], stats: {} };
      }
      companyGroups[company].bodies.push(body);
    });
    
    // 计算每个娃社的统计信息
    Object.keys(companyGroups).forEach(company => {
      const group = companyGroups[company];
      const allItems = [...group.heads, ...group.bodies];
      
      group.stats = {
        total: allItems.length,
        owned: allItems.filter(item => item.ownership_status === 'owned').length,
        air: allItems.filter(item => item.ownership_status === 'preorder').length, // 空气娃
        totalValue: allItems.reduce((sum, item) => {
          const price = parseFloat(item.actual_price || item.total_price || 0);
          return sum + price;
        }, 0),
        heads: group.heads.length,
        bodies: group.bodies.length
      };
    });
    
    return companyGroups;
  };
  
  // 切换娃社展开/折叠状态
  const toggleCompanyExpanded = (company) => {
    const newExpanded = {
      ...expandedCompanies,
      [company]: !expandedCompanies[company]
    };
    setExpandedCompanies(newExpanded);
    // 保存到 localStorage
    localStorage.setItem('expandedCompanies', JSON.stringify(newExpanded));
  };
  
  // 全部展开/折叠
  const toggleAllCompanies = (expand) => {
    const companyGroups = groupDollsByCompany(dollHeads, dollBodies);
    const newExpanded = {};
    Object.keys(companyGroups).forEach(company => {
      newExpanded[company] = expand;
    });
    setExpandedCompanies(newExpanded);
    localStorage.setItem('expandedCompanies', JSON.stringify(newExpanded));
  };
  
  // 按尺寸分组函数
  const groupDollsBySize = () => {
    const allDolls = [...dollHeads, ...dollBodies];
    const sizeGroups = {};
    
    allDolls.forEach(doll => {
      const size = doll.size_category || '未分类';
      if (!sizeGroups[size]) {
        sizeGroups[size] = { heads: [], bodies: [] };
      }
      
      if (dollHeads.includes(doll)) {
        sizeGroups[size].heads.push(doll);
      } else {
        sizeGroups[size].bodies.push(doll);
      }
    });
    
    // 按尺寸顺序排序
    const sizeOrder = ['ob11', '四分', '70', '75', '未分类'];
    const sortedGroups = {};
    
    sizeOrder.forEach(size => {
      if (sizeGroups[size]) {
        sortedGroups[size] = sizeGroups[size];
      }
    });
    
    // 添加其他未在预定义列表中的尺寸
    Object.keys(sizeGroups).forEach(size => {
      if (!sizeOrder.includes(size)) {
        sortedGroups[size] = sizeGroups[size];
      }
    });
    
    return sortedGroups;
  };
  
  // 图片位置编辑器状态
  const [imagePositionEditorOpen, setImagePositionEditorOpen] = useState(false);
  const [editingImageItem, setEditingImageItem] = useState(null);
  
  const [headFormData, setHeadFormData] = useState({
    name: '',
    company: '',
    skin_tone: '',
    head_circumference: '',
    size_category: '',
    original_price: '',
    actual_price: '',
    total_price: '',
    deposit: '',
    final_payment: '',
    final_payment_date: '',
    release_date: '',
    received_date: '',
    purchase_channel: '',
    ownership_status: 'owned',
    profile_image_url: '',
    image_position_x: 50,
    image_position_y: 50,
    image_scale: 100
  });

  const [bodyFormData, setBodyFormData] = useState({
    name: '',
    company: '',
    skin_tone: '',
    head_circumference: '',
    size_category: '',
    neck_circumference: '',
    shoulder_width: '',
    original_price: '',
    actual_price: '',
    total_price: '',
    deposit: '',
    final_payment: '',
    final_payment_date: '',
    release_date: '',
    received_date: '',
    purchase_channel: '',
    ownership_status: 'owned',
    profile_image_url: '',
    image_position_x: 50,
    image_position_y: 50,
    image_scale: 100
  });

  // 拖拽传感器配置 - Apple风格
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
    fetchDollHeads();
    fetchDollBodies();
    fetchDollStats();
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

  const fetchDollHeads = async () => {
    try {
      const data = await apiGet('/api/doll-heads');
      setDollHeads(data || []);
    } catch (error) {
      console.error('获取娃头数据失败:', error);
      setDollHeads([]);
    }
  };

  const fetchDollBodies = async () => {
    try {
      const data = await apiGet('/api/doll-bodies');
      setDollBodies(data || []);
    } catch (error) {
      console.error('获取娃体数据失败:', error);
      setDollBodies([]);
    }
  };
  
  const fetchDollStats = async () => {
    try {
      const data = await apiGet('/api/dolls/stats');
      setDollStats(data);
    } catch (error) {
      console.error('获取娃娃统计数据失败:', error);
    }
  };

  // 执行搜索
  const performSearch = async (term) => {
    try {
      const data = await apiGet(`/api/dolls/search/${encodeURIComponent(term)}`);
      setSearchResults(data || []);
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchResults([]);
      setSearchResults([]);
    }
  };

  // 处理搜索输入
  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  // 清除搜索
  const clearSearch = () => {
    setSearchTerm('');
  };

  // 拖拽结束处理 - 娃头
  const handleDragEndHeads = async (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = dollHeads.findIndex((item) => item.id === active.id);
      const newIndex = dollHeads.findIndex((item) => item.id === over.id);

      const newDollHeads = arrayMove(dollHeads, oldIndex, newIndex);
      setDollHeads(newDollHeads);

      // 更新服务器排序
      const sortOrder = newDollHeads.map((head, index) => ({
        id: head.id,
        order: index
      }));

      try {
        await fetch('http://localhost:5000/api/sort/doll-heads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sortOrder }),
        });
      } catch (error) {
        console.error('更新娃头排序失败:', error);
        // 如果更新失败，可以选择重新获取数据或显示错误
      }
    }
  };

  // 拖拽结束处理 - 娃体
  const handleDragEndBodies = async (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = dollBodies.findIndex((item) => item.id === active.id);
      const newIndex = dollBodies.findIndex((item) => item.id === over.id);

      const newDollBodies = arrayMove(dollBodies, oldIndex, newIndex);
      setDollBodies(newDollBodies);

      // 更新服务器排序
      const sortOrder = newDollBodies.map((body, index) => ({
        id: body.id,
        order: index
      }));

      try {
        await fetch('http://localhost:5000/api/sort/doll-bodies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sortOrder }),
        });
      } catch (error) {
        console.error('更新娃体排序失败:', error);
      }
    }
  };

  const handleAddClick = () => {
    setShowAddOptions(!showAddOptions);
    if (showAddOptions) {
      setShowAddForm(null);
      setShowStatusSelect(false);
      setSelectedType(null);
    }
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setShowAddOptions(false);
    setShowStatusSelect(true);
  };

  const handleStatusSelect = (status) => {
    if (selectedType === 'head') {
      setHeadFormData(prev => ({ ...prev, ownership_status: status }));
    } else if (selectedType === 'body') {
      setBodyFormData(prev => ({ ...prev, ownership_status: status }));
    }
    setShowAddForm(selectedType);
    setShowStatusSelect(false);
  };

  const handleHeadSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingHead 
        ? `http://localhost:5000/api/doll-heads/${editingHead.id}`
        : 'http://localhost:5000/api/doll-heads';
      
      const method = editingHead ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(headFormData),
      });
      
      if (response.ok) {
        if (!editingHead) {
          // 只有在创建新娃头时才添加到相册
          const result = await response.json();
          const newHeadId = result.id;
          
          // 如果有素头图片，自动添加到相册并设为封面
          if (headFormData.profile_image_url) {
            try {
              await fetch('http://localhost:5000/api/photos', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  entity_type: 'head',
                  entity_id: newHeadId,
                  photo_type: 'profile',
                  image_url: headFormData.profile_image_url,
                  caption: '官方图片',
                  is_cover: true
                }),
              });
            } catch (error) {
              console.error('添加官方图片到相册失败:', error);
            }
          }
        }
        
        fetchDollHeads();
        fetchDollStats();
        setShowAddForm(null);
        setEditingHead(null);
        setHeadFormData({
          name: '',
          company: '',
          skin_tone: '',
          head_circumference: '',
          size_category: '',
          original_price: '',
          actual_price: '',
          total_price: '',
          deposit: '',
          final_payment: '',
          final_payment_date: '',
          release_date: '',
          received_date: '',
          purchase_channel: '',
          ownership_status: 'owned',
          profile_image_url: '',
          image_position_x: 50,
          image_position_y: 50,
          image_scale: 100
        });
      }
    } catch (error) {
      console.error('添加娃头失败:', error);
    }
  };

  const handleBodySubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingBody 
        ? `http://localhost:5000/api/doll-bodies/${editingBody.id}`
        : 'http://localhost:5000/api/doll-bodies';
      
      const method = editingBody ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyFormData),
      });
      
      if (response.ok) {
        if (!editingBody) {
          // 只有在创建新娃体时才添加到相册
          const result = await response.json();
          const newBodyId = result.id;
          
          // 如果有素体图片，自动添加到相册并设为封面
          if (bodyFormData.profile_image_url) {
            try {
              await fetch('http://localhost:5000/api/photos', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  entity_type: 'body',
                  entity_id: newBodyId,
                  photo_type: 'profile',
                  image_url: bodyFormData.profile_image_url,
                  caption: '官方图片',
                  is_cover: true
                }),
              });
            } catch (error) {
              console.error('添加官方图片到相册失败:', error);
            }
          }
        }
        
        fetchDollBodies();
        fetchDollStats();
        setShowAddForm(null);
        setEditingBody(null);
        setBodyFormData({
          name: '',
          company: '',
          skin_tone: '',
          head_circumference: '',
          size_category: '',
          neck_circumference: '',
          shoulder_width: '',
          original_price: '',
          actual_price: '',
          total_price: '',
          deposit: '',
          final_payment: '',
          final_payment_date: '',
          release_date: '',
          received_date: '',
          purchase_channel: '',
          ownership_status: 'owned',
          profile_image_url: '',
          image_position_x: 50,
          image_position_y: 50,
          image_scale: 100
        });
      }
    } catch (error) {
      console.error('添加娃体失败:', error);
    }
  };

  const deleteDollHead = async (id) => {
    if (window.confirm('确定要删除这个娃头吗？')) {
      try {
        await fetch(`http://localhost:5000/api/doll-heads/${id}`, {
          method: 'DELETE'
        });
        fetchDollHeads();
        fetchDollStats();
      } catch (error) {
        console.error('删除娃头失败:', error);
      }
    }
  };

  const deleteDollBody = async (id) => {
    if (window.confirm('确定要删除这个娃体吗？')) {
      try {
        await fetch(`http://localhost:5000/api/doll-bodies/${id}`, {
          method: 'DELETE'
        });
        fetchDollBodies();
        fetchDollStats();
      } catch (error) {
        console.error('删除娃体失败:', error);
      }
    }
  };

  const handlePaymentStatusChange = async (id, newPaymentStatus, type) => {
    const endpoint = type === 'head' ? 'doll-heads' : 'doll-bodies';
    try {
      const response = await fetch(`http://localhost:5000/api/${endpoint}/${id}/payment-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payment_status: newPaymentStatus }),
      });

      if (response.ok) {
        if (type === 'head') {
          fetchDollHeads();
        } else {
          fetchDollBodies();
        }
        fetchDollStats();
        if (newPaymentStatus === 'full_paid') {
          alert('已标记为已付尾款！');
        }
      }
    } catch (error) {
      console.error('更新付款状态失败:', error);
      alert('操作失败，请重试');
    }
  };

  const handleConfirmArrival = async (id, hasArrived, type) => {
    const endpoint = type === 'head' ? 'doll-heads' : 'doll-bodies';
    try {
      const response = await fetch(`http://localhost:5000/api/${endpoint}/${id}/confirm-arrival`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hasArrived }),
      });

      if (response.ok) {
        if (type === 'head') {
          fetchDollHeads();
        } else {
          fetchDollBodies();
        }
        fetchDollStats();
        if (hasArrived) {
          alert('娃娃状态已更新为已到家！');
        } else {
          alert('娃娃已标记为逾期状态');
        }
      }
    } catch (error) {
      console.error('确认到达状态失败:', error);
      alert('操作失败，请重试');
    }
  };

  const handleShowDetails = (doll, type) => {
    setSelectedDoll({ ...doll, type });
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setSelectedDoll(null);
    setShowDetails(false);
  };

  const handleImageClick = (imageUrl, title) => {
    setViewingImage({ url: imageUrl, title });
    setImageViewerOpen(true);
  };

  const handleCloseImageViewer = () => {
    setImageViewerOpen(false);
    setViewingImage({ url: '', title: '' });
  };

  // 图片位置编辑相关处理函数
  const handleEditImagePosition = (item, type) => {
    setEditingImageItem({ ...item, type });
    setImagePositionEditorOpen(true);
  };

  const handleImagePositionSave = async ({ position, scale }) => {
    if (!editingImageItem) return;

    try {
      const endpoint = editingImageItem.type === 'head' 
        ? `/api/doll-heads/${editingImageItem.id}/image-position`
        : `/api/doll-bodies/${editingImageItem.id}/image-position`;

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_position_x: position.x,
          image_position_y: position.y,
          image_scale: scale,
        }),
      });

      if (response.ok) {
        // 刷新数据
        if (editingImageItem.type === 'head') {
          fetchDollHeads();
        fetchDollStats();
        } else {
          fetchDollBodies();
        fetchDollStats();
        }
        setImagePositionEditorOpen(false);
        setEditingImageItem(null);
      } else {
        console.error('更新图片位置失败');
      }
    } catch (error) {
      console.error('更新图片位置失败:', error);
    }
  };

  const handleImagePositionCancel = () => {
    setImagePositionEditorOpen(false);
    setEditingImageItem(null);
  };

  const handleEditHead = (head) => {
    setEditingHead(head);
    setHeadFormData({
      name: head.name || '',
      company: head.company || '',
      skin_tone: head.skin_tone || '',
      head_circumference: head.head_circumference || '',
      size_category: head.size_category || '',
      original_price: head.original_price || '',
      actual_price: head.actual_price || '',
      total_price: head.total_price || '',
      deposit: head.deposit || '',
      final_payment: head.final_payment || '',
      final_payment_date: head.final_payment_date || '',
      release_date: head.release_date || '',
      received_date: head.received_date || '',
      purchase_channel: head.purchase_channel || '',
      ownership_status: head.ownership_status || 'owned',
      profile_image_url: head.profile_image_url || '',
      image_position_x: head.image_position_x || 50,
      image_position_y: head.image_position_y || 50,
      image_scale: head.image_scale || 100
    });
    setShowAddForm('head');
  };

  const handleEditBody = (body) => {
    setEditingBody(body);
    setBodyFormData({
      name: body.name || '',
      company: body.company || '',
      skin_tone: body.skin_tone || '',
      head_circumference: body.head_circumference || '',
      size_category: body.size_category || '',
      neck_circumference: body.neck_circumference || '',
      shoulder_width: body.shoulder_width || '',
      original_price: body.original_price || '',
      actual_price: body.actual_price || '',
      total_price: body.total_price || '',
      deposit: body.deposit || '',
      final_payment: body.final_payment || '',
      final_payment_date: body.final_payment_date || '',
      release_date: body.release_date || '',
      received_date: body.received_date || '',
      purchase_channel: body.purchase_channel || '',
      ownership_status: body.ownership_status || 'owned',
      profile_image_url: body.profile_image_url || '',
      image_position_x: body.image_position_x || 50,
      image_position_y: body.image_position_y || 50,
      image_scale: body.image_scale || 100
    });
    setShowAddForm('body');
  };

  const handleCancelEdit = () => {
    setEditingHead(null);
    setEditingBody(null);
    setShowAddForm(null);
    setShowStatusSelect(false);
    setSelectedType(null);
    setHeadFormData({
      name: '',
      company: '',
      skin_tone: '',
      head_circumference: '',
      size_category: '',
      original_price: '',
      actual_price: '',
      total_price: '',
      deposit: '',
      final_payment: '',
      final_payment_date: '',
      release_date: '',
      received_date: '',
      purchase_channel: '',
      ownership_status: 'owned',
      profile_image_url: '',
      image_position_x: 50,
      image_position_y: 50,
      image_scale: 100
    });
    setBodyFormData({
      name: '',
      company: '',
      skin_tone: '',
      head_circumference: '',
      size_category: '',
      neck_circumference: '',
      shoulder_width: '',
      original_price: '',
      actual_price: '',
      total_price: '',
      deposit: '',
      final_payment: '',
      final_payment_date: '',
      release_date: '',
      received_date: '',
      purchase_channel: '',
      ownership_status: 'owned',
      profile_image_url: '',
      image_position_x: 50,
      image_position_y: 50,
      image_scale: 100
    });
  };

  const handleCoverChange = async (newCoverUrl) => {
    if (selectedDoll && selectedDoll.type === 'head') {
      try {
        const updateData = {
          name: selectedDoll.name,
          company: selectedDoll.company || '',
          skin_tone: selectedDoll.skin_tone || '',
          size: selectedDoll.size || '',
          original_price: selectedDoll.original_price || '',
          actual_price: selectedDoll.actual_price || '',
          release_date: selectedDoll.release_date || '',
          received_date: selectedDoll.received_date || '',
          purchase_channel: selectedDoll.purchase_channel || '',
          ownership_status: selectedDoll.ownership_status || 'owned',
          profile_image_url: newCoverUrl
        };

        const response = await fetch(`http://localhost:5000/api/doll-heads/${selectedDoll.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });
        if (response.ok) {
          // 更新本地状态
          setSelectedDoll(prev => ({...prev, profile_image_url: newCoverUrl}));
          // 刷新列表
          fetchDollHeads();
        fetchDollStats();
        }
      } catch (error) {
        console.error('更新娃头封面失败:', error);
      }
    } else if (selectedDoll && selectedDoll.type === 'body') {
      try {
        const updateData = {
          name: selectedDoll.name,
          company: selectedDoll.company || '',
          skin_tone: selectedDoll.skin_tone || '',
          size: selectedDoll.size || '',
          neck_circumference: selectedDoll.neck_circumference || '',
          shoulder_width: selectedDoll.shoulder_width || '',
          original_price: selectedDoll.original_price || '',
          actual_price: selectedDoll.actual_price || '',
          release_date: selectedDoll.release_date || '',
          received_date: selectedDoll.received_date || '',
          purchase_channel: selectedDoll.purchase_channel || '',
          ownership_status: selectedDoll.ownership_status || 'owned',
          profile_image_url: newCoverUrl
        };

        const response = await fetch(`http://localhost:5000/api/doll-bodies/${selectedDoll.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });
        if (response.ok) {
          setSelectedDoll(prev => ({...prev, profile_image_url: newCoverUrl}));
          fetchDollBodies();
        fetchDollStats();
        }
      } catch (error) {
        console.error('更新娃体封面失败:', error);
      }
    }
  };

  if (showDetails && selectedDoll) {
    return (
      <div className="page-content">
        <div className="page-header">
          <h1>{selectedDoll.type === 'head' ? '娃头详情' : '娃体详情'}</h1>
          <button className="header-button" onClick={handleCloseDetails}>
            返回
          </button>
        </div>
        <div className="detail-view">
          <div className="top-row">
            <div className="detail-card">
              {selectedDoll.profile_image_url && (
                <img 
                  src={selectedDoll.profile_image_url} 
                  alt={selectedDoll.name} 
                  className="detail-image clickable-image" 
                  onClick={() => handleImageClick(selectedDoll.profile_image_url, `${selectedDoll.name} - ${selectedDoll.type === 'head' ? '娃头' : '娃体'}`)}
                  title="点击查看大图"
                />
              )}
              <div className="detail-info">
                <h2>{selectedDoll.name}</h2>
                <p><strong>娃社:</strong> {selectedDoll.company}</p>
                <p><strong>肤色:</strong> {selectedDoll.skin_tone}</p>
                {selectedDoll.size_category && <p><strong>尺寸:</strong> {selectedDoll.size_category}</p>}
                {selectedDoll.head_circumference && <p><strong>头围:</strong> {selectedDoll.head_circumference}</p>}
                {selectedDoll.original_price && <p><strong>原价:</strong> ¥{selectedDoll.original_price}</p>}
                {selectedDoll.actual_price && <p><strong>到手价:</strong> ¥{selectedDoll.actual_price}</p>}
                {selectedDoll.release_date && <p><strong>开仓年月:</strong> {selectedDoll.release_date}</p>}
                {selectedDoll.received_date && <p><strong>到手年月:</strong> {selectedDoll.received_date}</p>}
                {selectedDoll.purchase_channel && <p><strong>购买渠道:</strong> {selectedDoll.purchase_channel}</p>}
                <p><strong>拥有状态:</strong> {selectedDoll.ownership_status === 'preorder' ? '💭 空气娃' : '🏠 已到家'}</p>
                {selectedDoll.neck_circumference && (
                  <p><strong>脖围:</strong> {selectedDoll.neck_circumference}cm</p>
                )}
                {selectedDoll.shoulder_width && (
                  <p><strong>肩宽:</strong> {selectedDoll.shoulder_width}cm</p>
                )}
              </div>

              {selectedDoll.type === 'body' && (
                <div className="body-measurements">
                  <h3>身体数据</h3>
                  <div className="measurements-grid">
                    <div className="measurement-item">
                      <span className="measurement-label">脖围</span>
                      <span className="measurement-value">
                        {selectedDoll.neck_circumference ? `${selectedDoll.neck_circumference}cm` : '未设置'}
                      </span>
                    </div>
                    <div className="measurement-item">
                      <span className="measurement-label">肩宽</span>
                      <span className="measurement-value">
                        {selectedDoll.shoulder_width ? `${selectedDoll.shoulder_width}cm` : '未设置'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="gallery-section">
              <PhotoGallery
                entityType={selectedDoll.type}
                entityId={selectedDoll.id}
                onCoverChange={handleCoverChange}
              />
            </div>
          </div>

          <div className="book-section">
            {selectedDoll.type === 'head' ? (
              <MakeupBook headId={selectedDoll.id} />
            ) : (
              <BodyMakeup bodyId={selectedDoll.id} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>{currentUser?.username || '我'}的娃柜</h1>
        
        <div className="view-mode-buttons">
          <button 
            className={`view-mode-btn ${viewMode === 'type' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('type')}
          >
            🎭 头体
          </button>
          <button 
            className={`view-mode-btn ${viewMode === 'company' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('company')}
          >
            🏢 娃社
          </button>
          <button 
            className={`view-mode-btn ${viewMode === 'size' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('size')}
          >
            📏 尺寸
          </button>
          <button 
            className={`view-mode-btn ${viewMode === 'stats' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('stats')}
          >
            📊 总览
          </button>
        </div>
        
        <div className="add-button-container">
          <button className="header-button" onClick={editingHead || editingBody ? handleCancelEdit : handleAddClick}>
            {editingHead ? '取消编辑' : editingBody ? '取消编辑' : (showAddOptions || showAddForm ? '取消' : '添加')}
          </button>
          
          {showAddOptions && (
            <div className="add-options">
              <button 
                className="option-button head-button"
                onClick={() => handleTypeSelect('head')}
              >
                <span className="option-icon">👱‍♀️</span>
                <span>头</span>
              </button>
              <button 
                className="option-button body-button"
                onClick={() => handleTypeSelect('body')}
              >
                <span className="option-icon">👤</span>
                <span>体</span>
              </button>
            </div>
          )}

          {showStatusSelect && (
            <div className="add-options status-options">
              <button 
                className="option-button preorder-button"
                onClick={() => handleStatusSelect('preorder')}
              >
                <span className="option-icon">💭</span>
                <span>空气娃</span>
              </button>
              <button 
                className="option-button owned-button"
                onClick={() => handleStatusSelect('owned')}
              >
                <span className="option-icon">🏠</span>
                <span>已到家</span>
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
            placeholder="搜索娃头或娃体名字、娃社、肤色等..."
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
            找到 {searchResults.length} 个娃娃
          </div>
        )}
      </div>

      {showAddForm === 'head' && (
        <form onSubmit={handleHeadSubmit} className="add-form">
          <h3>{editingHead ? '编辑娃头' : '添加娃头'}</h3>
          <input
            type="text"
            placeholder="名字"
            value={headFormData.name}
            onChange={(e) => setHeadFormData({...headFormData, name: e.target.value})}
            required
          />
          <input
            type="text"
            placeholder="娃社"
            value={headFormData.company}
            onChange={(e) => setHeadFormData({...headFormData, company: e.target.value})}
          />
          <input
            type="text"
            placeholder="肤色"
            value={headFormData.skin_tone}
            onChange={(e) => setHeadFormData({...headFormData, skin_tone: e.target.value})}
          />
          <input
            type="text"
            placeholder="头围"
            value={headFormData.head_circumference}
            onChange={(e) => setHeadFormData({...headFormData, head_circumference: e.target.value})}
          />
          <input
            type="number"
            placeholder="原价"
            value={headFormData.original_price}
            onChange={(e) => setHeadFormData({...headFormData, original_price: e.target.value})}
          />
          <input
            type="number"
            placeholder="到手价"
            value={headFormData.actual_price}
            onChange={(e) => setHeadFormData({...headFormData, actual_price: e.target.value})}
          />
          
          {headFormData.ownership_status === 'preorder' && (
            <>
              <input
                type="number"
                placeholder="总价"
                value={headFormData.total_price}
                onChange={(e) => setHeadFormData({...headFormData, total_price: e.target.value})}
              />
              <input
                type="number"
                placeholder="定金"
                value={headFormData.deposit}
                onChange={(e) => setHeadFormData({...headFormData, deposit: e.target.value})}
              />
              <input
                type="number"
                placeholder="尾款"
                value={headFormData.final_payment}
                onChange={(e) => setHeadFormData({...headFormData, final_payment: e.target.value})}
              />
              <input
                type="date"
                placeholder="尾款时间"
                value={headFormData.final_payment_date}
                onChange={(e) => setHeadFormData({...headFormData, final_payment_date: e.target.value})}
              />
            </>
          )}
          
          <input
            type="month"
            placeholder="开仓年月"
            value={headFormData.release_date}
            onChange={(e) => setHeadFormData({...headFormData, release_date: e.target.value})}
          />
          <input
            type="month"
            placeholder="到手年月"
            value={headFormData.received_date}
            onChange={(e) => setHeadFormData({...headFormData, received_date: e.target.value})}
          />
          <input
            type="text"
            placeholder="购买渠道"
            value={headFormData.purchase_channel}
            onChange={(e) => setHeadFormData({...headFormData, purchase_channel: e.target.value})}
          />
          <select
            value={headFormData.ownership_status}
            onChange={(e) => setHeadFormData({...headFormData, ownership_status: e.target.value})}
          >
            <option value="owned">已到家</option>
            <option value="preorder">空气娃</option>
          </select>
          
          <div className="size-category-selector">
            <label className="form-label">尺寸数据</label>
            <div className="size-category-options">
              {['ob11', '四分', '70', '75'].map(size => (
                <button
                  key={size}
                  type="button"
                  className={`size-category-option ${headFormData.size_category === size ? 'selected' : ''}`}
                  onClick={() => setHeadFormData({...headFormData, size_category: size})}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="image-upload-container">
            <label className="form-label">官方图片</label>
            <ImageUpload
              onImageSelect={(imageUrl) => setHeadFormData({...headFormData, profile_image_url: imageUrl})}
              currentImage={headFormData.profile_image_url}
              placeholder="选择官方图片"
            />
          </div>
          <button type="submit">{editingHead ? '保存更改' : '添加娃头'}</button>
        </form>
      )}

      {showAddForm === 'body' && (
        <form onSubmit={handleBodySubmit} className="add-form">
          <h3>{editingBody ? '编辑娃体' : '添加娃体'}</h3>
          <input
            type="text"
            placeholder="名字"
            value={bodyFormData.name}
            onChange={(e) => setBodyFormData({...bodyFormData, name: e.target.value})}
            required
          />
          <input
            type="text"
            placeholder="娃社"
            value={bodyFormData.company}
            onChange={(e) => setBodyFormData({...bodyFormData, company: e.target.value})}
          />
          <input
            type="text"
            placeholder="肤色"
            value={bodyFormData.skin_tone}
            onChange={(e) => setBodyFormData({...bodyFormData, skin_tone: e.target.value})}
          />
          <input
            type="text"
            placeholder="头围"
            value={bodyFormData.head_circumference}
            onChange={(e) => setBodyFormData({...bodyFormData, head_circumference: e.target.value})}
          />
          <input
            type="number"
            step="0.1"
            placeholder="脖围 (cm)"
            value={bodyFormData.neck_circumference}
            onChange={(e) => setBodyFormData({...bodyFormData, neck_circumference: e.target.value})}
          />
          <input
            type="number"
            step="0.1"
            placeholder="肩宽 (cm)"
            value={bodyFormData.shoulder_width}
            onChange={(e) => setBodyFormData({...bodyFormData, shoulder_width: e.target.value})}
          />
          <input
            type="number"
            placeholder="原价"
            value={bodyFormData.original_price}
            onChange={(e) => setBodyFormData({...bodyFormData, original_price: e.target.value})}
          />
          <input
            type="number"
            placeholder="到手价"
            value={bodyFormData.actual_price}
            onChange={(e) => setBodyFormData({...bodyFormData, actual_price: e.target.value})}
          />
          
          {bodyFormData.ownership_status === 'preorder' && (
            <>
              <input
                type="number"
                placeholder="总价"
                value={bodyFormData.total_price}
                onChange={(e) => setBodyFormData({...bodyFormData, total_price: e.target.value})}
              />
              <input
                type="number"
                placeholder="定金"
                value={bodyFormData.deposit}
                onChange={(e) => setBodyFormData({...bodyFormData, deposit: e.target.value})}
              />
              <input
                type="number"
                placeholder="尾款"
                value={bodyFormData.final_payment}
                onChange={(e) => setBodyFormData({...bodyFormData, final_payment: e.target.value})}
              />
              <input
                type="date"
                placeholder="尾款时间"
                value={bodyFormData.final_payment_date}
                onChange={(e) => setBodyFormData({...bodyFormData, final_payment_date: e.target.value})}
              />
            </>
          )}
          
          <input
            type="month"
            placeholder="开仓年月"
            value={bodyFormData.release_date}
            onChange={(e) => setBodyFormData({...bodyFormData, release_date: e.target.value})}
          />
          <input
            type="month"
            placeholder="到手年月"
            value={bodyFormData.received_date}
            onChange={(e) => setBodyFormData({...bodyFormData, received_date: e.target.value})}
          />
          <input
            type="text"
            placeholder="购买渠道"
            value={bodyFormData.purchase_channel}
            onChange={(e) => setBodyFormData({...bodyFormData, purchase_channel: e.target.value})}
          />
          <select
            value={bodyFormData.ownership_status}
            onChange={(e) => setBodyFormData({...bodyFormData, ownership_status: e.target.value})}
          >
            <option value="owned">已到家</option>
            <option value="preorder">空气娃</option>
          </select>
          
          <div className="size-category-selector">
            <label className="form-label">尺寸数据</label>
            <div className="size-category-options">
              {['ob11', '四分', '70', '75'].map(size => (
                <button
                  key={size}
                  type="button"
                  className={`size-category-option ${bodyFormData.size_category === size ? 'selected' : ''}`}
                  onClick={() => setBodyFormData({...bodyFormData, size_category: size})}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="image-upload-container">
            <label className="form-label">官方图片</label>
            <ImageUpload
              onImageSelect={(imageUrl) => setBodyFormData({...bodyFormData, profile_image_url: imageUrl})}
              currentImage={bodyFormData.profile_image_url}
              placeholder="选择官方图片"
            />
          </div>
          <button type="submit">{editingBody ? '保存更改' : '添加娃体'}</button>
        </form>
      )}

      <div className="dolls-container">
        {isSearching ? (
          // 搜索结果视图
          <div className="search-results">
            {searchResults.length > 0 ? (
              <div className="search-results-content">
                {/* 搜索到的娃头 */}
                {searchResults.filter(item => item.type === 'head').length > 0 && (
                  <div className="search-section">
                    <h2 className="section-title">娃头 ({searchResults.filter(item => item.type === 'head').length})</h2>
                    <div className="dolls-grid">
                      {searchResults.filter(item => item.type === 'head').map(head => (
                        <SortableDollCard
                          key={head.id}
                          head={head}
                          type="head"
                          onImageClick={handleImageClick}
                          onShowDetails={handleShowDetails}
                          onEdit={handleEditHead}
                          onDelete={deleteDollHead}
                          onEditImagePosition={handleEditImagePosition}
                          onPaymentStatusChange={(id, status) => handlePaymentStatusChange(id, status, 'head')}
                          onConfirmArrival={(id, hasArrived) => handleConfirmArrival(id, hasArrived, 'head')}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 搜索到的娃体 */}
                {searchResults.filter(item => item.type === 'body').length > 0 && (
                  <div className="search-section">
                    <h2 className="section-title">娃体 ({searchResults.filter(item => item.type === 'body').length})</h2>
                    <div className="dolls-grid">
                      {searchResults.filter(item => item.type === 'body').map(body => (
                        <SortableDollCard
                          key={body.id}
                          head={body}
                          type="body"
                          onImageClick={handleImageClick}
                          onShowDetails={handleShowDetails}
                          onEdit={handleEditBody}
                          onDelete={deleteDollBody}
                          onEditImagePosition={handleEditImagePosition}
                          onPaymentStatusChange={(id, status) => handlePaymentStatusChange(id, status, 'body')}
                          onConfirmArrival={(id, hasArrived) => handleConfirmArrival(id, hasArrived, 'body')}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-search-results">
                <div className="empty-icon">🔍</div>
                <h3>未找到匹配的娃娃</h3>
                <p>试试其他关键词，或者<button className="link-btn" onClick={clearSearch}>清除搜索</button></p>
              </div>
            )}
          </div>
        ) : viewMode === 'stats' ? (
          // 统计总览
          <div className="stats-overview">
            {dollStats && (
              <>
                <div className="overview-section">
                  <h2 className="section-title">📊 娃柜总览</h2>
                  <div className="stats-grid">
                    <DollStatsCard 
                      title="总计" 
                      icon="🎎" 
                      data={dollStats.total} 
                      type="total"
                    />
                    <DollStatsCard 
                      title="娃头" 
                      icon="👱‍♀️" 
                      data={dollStats.byType.head} 
                      type="head"
                    />
                    <DollStatsCard 
                      title="娃体" 
                      icon="👤" 
                      data={dollStats.byType.body} 
                      type="body"
                    />
                    <DollStatsCard 
                      title="妆费统计" 
                      icon="💄" 
                      data={dollStats.total} 
                      type="makeup"
                    />
                  </div>
                </div>
                
                <div className="overview-section">
                  <h2 className="section-title">📏 尺寸统计</h2>
                  <div className="stats-grid">
                    {Object.entries(dollStats.bySize).map(([size, data]) => (
                      <DollStatsCard 
                        key={size}
                        title={size} 
                        icon="📏" 
                        data={data} 
                        type="size"
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : viewMode === 'company' ? (
          // 按娃社分组视图
          <div className="company-view">
            {/* 全部展开/折叠按钮 */}
            <div className="company-controls">
              <button 
                className="expand-all-btn"
                onClick={() => toggleAllCompanies(true)}
              >
                📂 全部展开
              </button>
              <button 
                className="collapse-all-btn"
                onClick={() => toggleAllCompanies(false)}
              >
                📁 全部折叠
              </button>
            </div>
            
            {/* 娃社分组 */}
            {Object.entries(groupDollsByCompany(dollHeads, dollBodies))
              .sort((a, b) => {
                // 按数量降序排列（数量多的在前）
                const countDiff = b[1].stats.total - a[1].stats.total;
                // 如果数量相同，按名称排序
                return countDiff !== 0 ? countDiff : a[0].localeCompare(b[0]);
              })
              .map(([company, group]) => (
                <div key={company} className="company-group">
                  <div 
                    className="company-header"
                    onClick={() => toggleCompanyExpanded(company)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="company-info">
                      <span className="expand-icon">
                        {expandedCompanies[company] ? '📂' : '📁'}
                      </span>
                      <h3 className="company-name">{company}</h3>
                      <span className="company-count">
                        ({group.stats.total}个: 娃头{group.stats.heads} 娃体{group.stats.bodies})
                      </span>
                    </div>
                    <div className="company-stats">
                      {group.stats.owned > 0 && (
                        <span className="stat-badge owned">🏠 已到家 {group.stats.owned}</span>
                      )}
                      {group.stats.air > 0 && (
                        <span className="stat-badge preorder">💭 空气 {group.stats.air}</span>
                      )}
                      {group.stats.totalValue > 0 && (
                        <span className="stat-badge value">💰 ¥{group.stats.totalValue.toFixed(0)}</span>
                      )}
                    </div>
                  </div>
                  
                  {expandedCompanies[company] && (
                    <div className="company-content">
                      {/* 娃头部分 */}
                      {group.heads.length > 0 && (
                        <div className="company-section">
                          <h4 className="section-subtitle">娃头 ({group.heads.length})</h4>
                          <div className="dolls-grid">
                            {group.heads.map(head => (
                              <SortableDollCard
                                key={head.id}
                                head={head}
                                type="head"
                                onImageClick={handleImageClick}
                                onShowDetails={handleShowDetails}
                                onEdit={handleEditHead}
                                onDelete={deleteDollHead}
                                onEditImagePosition={handleEditImagePosition}
                                onPaymentStatusChange={(id, status) => handlePaymentStatusChange(id, status, 'head')}
                                onConfirmArrival={(id, hasArrived) => handleConfirmArrival(id, hasArrived, 'head')}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* 娃体部分 */}
                      {group.bodies.length > 0 && (
                        <div className="company-section">
                          <h4 className="section-subtitle">娃体 ({group.bodies.length})</h4>
                          <div className="dolls-grid">
                            {group.bodies.map(body => (
                              <SortableDollCard
                                key={body.id}
                                head={body}
                                type="body"
                                onImageClick={handleImageClick}
                                onShowDetails={handleShowDetails}
                                onEdit={handleEditBody}
                                onDelete={deleteDollBody}
                                onEditImagePosition={handleEditImagePosition}
                                onPaymentStatusChange={(id, status) => handlePaymentStatusChange(id, status, 'body')}
                                onConfirmArrival={(id, hasArrived) => handleConfirmArrival(id, hasArrived, 'body')}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : viewMode === 'type' ? (
          <>
            {dollHeads.length > 0 && (
              <div className="doll-section">
                <h2 className="section-title">娃头</h2>
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEndHeads}
                >
                  <SortableContext 
                    items={dollHeads.map(head => head.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="dolls-grid">
                      {dollHeads.map(head => (
                        <SortableDollCard
                          key={head.id}
                          head={head}
                          type="head"
                          onImageClick={handleImageClick}
                          onShowDetails={handleShowDetails}
                          onEdit={handleEditHead}
                          onDelete={deleteDollHead}
                          onEditImagePosition={handleEditImagePosition}
                          onPaymentStatusChange={(id, status) => handlePaymentStatusChange(id, status, 'head')}
                          onConfirmArrival={(id, hasArrived) => handleConfirmArrival(id, hasArrived, 'head')}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {dollBodies.length > 0 && (
              <div className="doll-section">
                <h2 className="section-title">娃体</h2>
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEndBodies}
                >
                  <SortableContext 
                    items={dollBodies.map(body => body.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="dolls-grid">
                      {dollBodies.map(body => (
                        <SortableDollCard
                          key={body.id}
                          head={body}
                          type="body"
                          onImageClick={handleImageClick}
                          onShowDetails={handleShowDetails}
                          onEdit={handleEditBody}
                          onDelete={deleteDollBody}
                          onEditImagePosition={handleEditImagePosition}
                          onPaymentStatusChange={(id, status) => handlePaymentStatusChange(id, status, 'body')}
                          onConfirmArrival={(id, hasArrived) => handleConfirmArrival(id, hasArrived, 'body')}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {dollHeads.length === 0 && dollBodies.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🎎</div>
                <h3>娃柜还是空的呢</h3>
                <p>点击上方"添加"按钮开始收集你的第一个娃娃吧！</p>
              </div>
            )}
          </>
        ) : (
          // 按尺寸分组显示
          <div className="size-grouped-view">
            {Object.entries(groupDollsBySize()).map(([size, { heads, bodies }]) => (
              <div key={size} className="size-section">
                <h2 className="section-title">📏 {size}</h2>
                
                {heads.length > 0 && (
                  <div className="subsection">
                    <h3 className="subsection-title">娃头</h3>
                    <div className="dolls-grid">
                      {heads.map(head => (
                        <SortableDollCard
                          key={head.id}
                          head={head}
                          type="head"
                          onImageClick={handleImageClick}
                          onShowDetails={handleShowDetails}
                          onEdit={handleEditHead}
                          onDelete={deleteDollHead}
                          onEditImagePosition={handleEditImagePosition}
                          onPaymentStatusChange={(id, status) => handlePaymentStatusChange(id, status, 'head')}
                          onConfirmArrival={(id, hasArrived) => handleConfirmArrival(id, hasArrived, 'head')}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {bodies.length > 0 && (
                  <div className="subsection">
                    <h3 className="subsection-title">娃体</h3>
                    <div className="dolls-grid">
                      {bodies.map(body => (
                        <SortableDollCard
                          key={body.id}
                          head={body}
                          type="body"
                          onImageClick={handleImageClick}
                          onShowDetails={handleShowDetails}
                          onEdit={handleEditBody}
                          onDelete={deleteDollBody}
                          onEditImagePosition={handleEditImagePosition}
                          onPaymentStatusChange={(id, status) => handlePaymentStatusChange(id, status, 'body')}
                          onConfirmArrival={(id, hasArrived) => handleConfirmArrival(id, hasArrived, 'body')}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {dollHeads.length === 0 && dollBodies.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">🎎</div>
                <h3>娃柜还是空的呢</h3>
                <p>点击上方"添加"按钮开始收集你的第一个娃娃吧！</p>
              </div>
            )}
          </div>
        )}
      </div>

      <ImageViewer
        imageUrl={viewingImage.url}
        isOpen={imageViewerOpen}
        onClose={handleCloseImageViewer}
        title={viewingImage.title}
      />

      <ImagePositionEditor
        imageUrl={editingImageItem?.profile_image_url}
        initialPosition={{
          x: editingImageItem?.image_position_x || 50,
          y: editingImageItem?.image_position_y || 50
        }}
        initialScale={editingImageItem?.image_scale || 100}
        isOpen={imagePositionEditorOpen}
        onSave={handleImagePositionSave}
        onCancel={handleImagePositionCancel}
      />
    </div>
  );
};

export default DollsPage;