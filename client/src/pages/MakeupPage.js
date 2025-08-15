import React, { useState, useEffect } from 'react';
import ImageUpload from '../components/ImageUpload';
import ImageViewer from '../components/ImageViewer';
import CopyableText from '../components/CopyableText';
import './MakeupPage.css';
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

// 可拖拽的妆师卡片组件
const SortableArtistCard = ({ artist, isFavorite, onToggleFavorite, onShowDetails, onEdit, onDelete, onImageClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({id: artist.id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`artist-card ${isFavorite ? 'favorite-card' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      <div className="artist-header">
        <div className="drag-handle" {...listeners}>
          <span>⋮⋮</span>
        </div>
        <h3>{artist.name}</h3>
        <button 
          className={`favorite-btn ${isFavorite ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(artist);
          }}
          title={isFavorite ? "取消收藏" : "设为心仪"}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>
      <div className="artist-info">
        {artist.contact && <p><strong>联系:</strong> {artist.contact}</p>}
        {artist.specialty && <p><strong>擅长:</strong> {artist.specialty}</p>}
        {artist.price_range && <p><strong>价格:</strong> {artist.price_range}</p>}
        {artist.when_available && <p><strong>何时开妆:</strong> {artist.when_available}</p>}
        <div className="card-actions">
          <button 
            className="edit-btn" 
            onClick={(e) => {
              e.stopPropagation();
              onShowDetails(artist);
            }}
          >
            详情
          </button>
          <button 
            className="edit-btn" 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(artist);
            }}
          >
            编辑
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(artist.id);
            }}
            className="delete-btn"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
};

const MakeupPage = () => {
  const [makeupArtists, setMakeupArtists] = useState([]);
  const [filteredArtists, setFilteredArtists] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingArtist, setEditingArtist] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState({ url: '', title: '' });
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('artists'); // 'appointments' or 'artists'
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    specialty: '',
    price_range: '',
    makeup_rules_image: '',
    note_template: '',
    when_available: '',
    is_favorite: false
  });

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchMakeupArtists();
    fetchAppointments();
  }, []);

  // 搜索功能
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredArtists(makeupArtists);
    } else {
      const filtered = makeupArtists.filter(artist => 
        artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (artist.specialty && artist.specialty.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (artist.when_available && artist.when_available.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredArtists(filtered);
    }
  }, [searchTerm, makeupArtists]);

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const fetchMakeupArtists = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/makeup-artists');
      const data = await response.json();
      setMakeupArtists(data);
      setFilteredArtists(data); // 初始化过滤结果
    } catch (error) {
      console.error('获取妆师数据失败:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/makeup-appointments');
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error('获取约妆数据失败:', error);
    }
  };

  // 拖拽结束处理 - 收藏妆师
  const handleDragEndFavorites = async (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const favoriteList = makeupArtists.filter(artist => artist.is_favorite);
      const oldIndex = favoriteList.findIndex((item) => item.id === active.id);
      const newIndex = favoriteList.findIndex((item) => item.id === over.id);

      const newFavoriteList = arrayMove(favoriteList, oldIndex, newIndex);
      
      // 更新本地状态 - 保持普通妆师不变，只更新收藏妆师的顺序
      const regularArtists = makeupArtists.filter(artist => !artist.is_favorite);
      const updatedArtists = [...newFavoriteList, ...regularArtists];
      setMakeupArtists(updatedArtists);

      // 更新服务器排序
      const sortOrder = newFavoriteList.map((artist, index) => ({
        id: artist.id,
        order: index
      }));

      try {
        await fetch('http://localhost:5000/api/sort/makeup-artists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sortOrder }),
        });
      } catch (error) {
        console.error('更新收藏妆师排序失败:', error);
      }
    }
  };

  // 拖拽结束处理 - 普通妆师
  const handleDragEndRegular = async (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const regularList = makeupArtists.filter(artist => !artist.is_favorite);
      const oldIndex = regularList.findIndex((item) => item.id === active.id);
      const newIndex = regularList.findIndex((item) => item.id === over.id);

      const newRegularList = arrayMove(regularList, oldIndex, newIndex);
      
      // 更新本地状态 - 保持收藏妆师不变，只更新普通妆师的顺序
      const favoriteArtists = makeupArtists.filter(artist => artist.is_favorite);
      const updatedArtists = [...favoriteArtists, ...newRegularList];
      setMakeupArtists(updatedArtists);

      // 更新服务器排序 - 为普通妆师设置从收藏妆师数量开始的排序号
      const favoriteCount = favoriteArtists.length;
      const sortOrder = newRegularList.map((artist, index) => ({
        id: artist.id,
        order: favoriteCount + index
      }));

      try {
        await fetch('http://localhost:5000/api/sort/makeup-artists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sortOrder }),
        });
      } catch (error) {
        console.error('更新普通妆师排序失败:', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingArtist 
        ? `http://localhost:5000/api/makeup-artists/${editingArtist.id}`
        : 'http://localhost:5000/api/makeup-artists';
      
      const method = editingArtist ? 'PUT' : 'POST';

      console.log('前端发送数据:', { method, url, formData });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        fetchMakeupArtists();
        setShowAddForm(false);
        setEditingArtist(null);
        resetForm();
      } else {
        const errorData = await response.json();
        console.error('服务器错误响应:', errorData);
      }
    } catch (error) {
      console.error(editingArtist ? '更新妆师失败:' : '添加妆师失败:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact: '',
      specialty: '',
      price_range: '',
      makeup_rules_image: '',
      note_template: '',
      when_available: '',
      is_favorite: false
    });
  };

  const deleteMakeupArtist = async (id) => {
    if (window.confirm('确定要删除这个妆师吗？')) {
      try {
        await fetch(`http://localhost:5000/api/makeup-artists/${id}`, {
          method: 'DELETE'
        });
        fetchMakeupArtists();
      } catch (error) {
        console.error('删除妆师失败:', error);
      }
    }
  };

  const handleEdit = (artist) => {
    setEditingArtist(artist);
    setFormData({
      name: artist.name || '',
      contact: artist.contact || '',
      specialty: artist.specialty || '',
      price_range: artist.price_range || '',
      makeup_rules_image: artist.makeup_rules_image || '',
      note_template: artist.note_template || '',
      when_available: artist.when_available || '',
      is_favorite: artist.is_favorite || false
    });
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setEditingArtist(null);
    setShowAddForm(false);
    resetForm();
  };

  const handleShowDetails = (artist) => {
    setSelectedArtist(artist);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setSelectedArtist(null);
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

  const toggleFavorite = async (artist) => {
    try {
      const updatedArtist = { ...artist, is_favorite: !artist.is_favorite };
      const response = await fetch(`http://localhost:5000/api/makeup-artists/${artist.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedArtist),
      });
      if (response.ok) {
        fetchMakeupArtists();
      }
    } catch (error) {
      console.error('更新妆师收藏状态失败:', error);
    }
  };

  const cancelAppointment = async (headId) => {
    if (!window.confirm('确定要取消这个约妆吗？')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/makeup-appointment/${headId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchAppointments(); // 刷新约妆列表
      }
    } catch (error) {
      console.error('取消约妆失败:', error);
    }
  };

  const handleAutoCreateArtists = async () => {
    if (!window.confirm('确定要自动创建妆师卡吗？这将会添加一些预设的妆师模板。')) return;

    try {
      const response = await fetch('http://localhost:5001/api/auto-create-makeup-artists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`成功创建了 ${result.count} 个妆师卡！`);
        fetchMakeupArtists(); // 刷新妆师列表
      } else {
        alert('自动创建失败，请稍后重试');
      }
    } catch (error) {
      console.error('自动创建妆师卡失败:', error);
      alert('自动创建失败，请稍后重试');
    }
  };

  // 分离收藏和普通妆师（使用过滤后的数据）
  const favoriteArtists = filteredArtists.filter(artist => artist.is_favorite);
  const regularArtists = filteredArtists.filter(artist => !artist.is_favorite);

  if (showDetails && selectedArtist) {
    return (
      <div className="page-content">
        <div className="page-header">
          <h1>妆师详情</h1>
          <button className="header-button" onClick={handleCloseDetails}>
            返回
          </button>
        </div>
        <div className="artist-detail-view">
          <div className="detail-card">
            <div className="detail-info">
              <h2>{selectedArtist.name}</h2>
              {selectedArtist.contact && <p><strong>联系方式:</strong> {selectedArtist.contact}</p>}
              {selectedArtist.specialty && <p><strong>擅长风格:</strong> {selectedArtist.specialty}</p>}
              {selectedArtist.price_range && <p><strong>价格区间:</strong> {selectedArtist.price_range}</p>}
              {selectedArtist.when_available && <p><strong>何时开妆:</strong> {selectedArtist.when_available}</p>}
              
              {selectedArtist.makeup_rules_image && (
                <div className="makeup-rules-detail">
                  <h3><strong>妆则:</strong></h3>
                  <img 
                    src={selectedArtist.makeup_rules_image} 
                    alt="妆则图片" 
                    className="rules-image-large clickable-image"
                    onClick={() => handleImageClick(selectedArtist.makeup_rules_image, `${selectedArtist.name} - 妆则`)}
                    title="点击查看大图"
                  />
                </div>
              )}

              {selectedArtist.note_template && (
                <div className="note-template-detail">
                  <h3><strong>小纸条模板:</strong></h3>
                  <CopyableText 
                    text={selectedArtist.note_template} 
                    className="template-content-large"
                    placeholder="暂无小纸条模板" 
                  />
                </div>
              )}

              <div className="detail-actions">
                <button className="edit-btn" onClick={() => {
                  handleEdit(selectedArtist);
                  handleCloseDetails();
                }}>编辑妆师</button>
                <button 
                  className="favorite-btn-action"
                  onClick={() => toggleFavorite(selectedArtist)}
                >
                  {selectedArtist.is_favorite ? '取消收藏' : '设为心仪'}
                </button>
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
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>妆师工坊</h1>
        <div className="header-tabs">
          <button 
            className={`tab-button ${activeTab === 'artists' ? 'active' : ''}`}
            onClick={() => setActiveTab('artists')}
          >
            💄 妆师列表 ({makeupArtists.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            📅 正在约妆 ({appointments.length})
          </button>
        </div>
        {activeTab === 'artists' && (
          <div className="header-buttons-group">
            <button 
              className="header-button"
              onClick={editingArtist ? handleCancelEdit : () => setShowAddForm(!showAddForm)}
            >
              {editingArtist ? '取消编辑' : (showAddForm ? '取消' : '添加妆师')}
            </button>
            
            {!editingArtist && !showAddForm && (
              <button 
                className="header-button auto-create-btn"
                onClick={handleAutoCreateArtists}
              >
                🎨 自动创建妆师卡
              </button>
            )}
          </div>
        )}
      </div>

      {/* 搜索框 - 只在妆师列表选项卡显示 */}
      {activeTab === 'artists' && (
        <div className="search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="搜索妆师名字、擅长风格或开妆时间..."
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
              找到 {filteredArtists.length} 个妆师
            </div>
          )}
        </div>
      )}

      {activeTab === 'artists' && showAddForm && (
        <form onSubmit={handleSubmit} className="add-form">
          <h3>{editingArtist ? '编辑妆师' : '添加妆师'}</h3>
          <div className="form-group">
            <label className="form-label">妆师姓名 *</label>
            <input
              type="text"
              placeholder="请输入妆师姓名"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">联系方式</label>
            <input
              type="text"
              placeholder="微信、QQ或手机号"
              value={formData.contact}
              onChange={(e) => setFormData({...formData, contact: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">擅长风格</label>
            <input
              type="text"
              placeholder="如：古风、现代、甜美等"
              value={formData.specialty}
              onChange={(e) => setFormData({...formData, specialty: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">价格区间</label>
            <input
              type="text"
              placeholder="如：200-500元"
              value={formData.price_range}
              onChange={(e) => setFormData({...formData, price_range: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">何时开妆</label>
            <input
              type="text"
              placeholder="如：每月15号后、工作日、春节后等"
              value={formData.when_available}
              onChange={(e) => setFormData({...formData, when_available: e.target.value})}
            />
          </div>

          <div className="form-group full-width">
            <label className="form-label">妆则图片</label>
            <ImageUpload
              onImageSelect={(imageUrl) => setFormData({...formData, makeup_rules_image: imageUrl})}
              currentImage={formData.makeup_rules_image}
              placeholder="上传妆师的妆则图片"
            />
          </div>

          <div className="form-group full-width">
            <label className="form-label">小纸条模板</label>
            <textarea
              placeholder="请输入小纸条模板内容，支持多行文字&#10;按Enter键可换行&#10;例如：&#10;亲爱的～这是xxx妆师&#10;妆容风格：xxx&#10;注意事项：xxx"
              value={formData.note_template}
              onChange={(e) => setFormData({...formData, note_template: e.target.value})}
              rows={5}
              className="note-template-textarea"
            />
          </div>

          <div className="checkbox-container">
            <label>
              <input
                type="checkbox"
                checked={formData.is_favorite}
                onChange={(e) => setFormData({...formData, is_favorite: e.target.checked})}
              />
              <span className="checkbox-label">设为心仪妆师</span>
            </label>
          </div>
          <button type="submit">{editingArtist ? '保存更改' : '添加妆师'}</button>
        </form>
      )}

      <div className="makeup-artists-container">
        {/* 正在约妆选项卡内容 */}
        {activeTab === 'appointments' && (
          <div className="appointments-section">
            {appointments.length > 0 ? (
              <div className="appointments-grid">
                {appointments.map(appointment => (
                  <div key={appointment.id} className="appointment-card">
                    <div className="appointment-header">
                      <div className="appointment-info">
                        <h4 className="head-name">
                          {appointment.head_name} 
                          {appointment.head_company && <span className="head-company">({appointment.head_company})</span>}
                        </h4>
                        <div className="artist-info">
                          <span className="artist-name">
                            约妆师: {appointment.makeup_artist_name || appointment.artist_name || '未知妆师'}
                          </span>
                          {appointment.makeup_fee && (
                            <span className="makeup-fee">¥{appointment.makeup_fee}</span>
                          )}
                        </div>
                      </div>
                      <button 
                        className="cancel-appointment-btn"
                        onClick={() => cancelAppointment(appointment.head_id)}
                        title="取消约妆"
                      >
                        ×
                      </button>
                    </div>
                    
                    {appointment.expected_arrival && (
                      <div className="expected-date">
                        预期到达: {new Date(appointment.expected_arrival).toLocaleDateString()}
                      </div>
                    )}
                    
                    {appointment.notes && (
                      <div className="appointment-notes">
                        <div className="notes-label">备注:</div>
                        <div className="notes-content">
                          {appointment.notes}
                        </div>
                      </div>
                    )}
                    
                    <div className="appointment-date">
                      约妆时间: {new Date(appointment.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h3>暂无约妆信息</h3>
                <p>当前没有正在进行的约妆，去娃柜页面为娃头约妆吧！</p>
              </div>
            )}
          </div>
        )}

        {/* 妆师列表选项卡内容 */}
        {activeTab === 'artists' && favoriteArtists.length > 0 && (
          <div className="artist-section">
            <h2 className="section-title favorite-title">
              <span className="title-icon">💖</span>
              心仪妆师
            </h2>
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndFavorites}
            >
              <SortableContext 
                items={favoriteArtists.map(artist => artist.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="artists-grid">
                  {favoriteArtists.map(artist => (
                    <SortableArtistCard
                      key={artist.id}
                      artist={artist}
                      isFavorite={true}
                      onToggleFavorite={toggleFavorite}
                      onShowDetails={handleShowDetails}
                      onEdit={handleEdit}
                      onDelete={deleteMakeupArtist}
                      onImageClick={handleImageClick}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {activeTab === 'artists' && regularArtists.length > 0 && (
          <div className="artist-section">
            <h2 className="section-title">
              <span className="title-icon">💄</span>
              全部妆师
            </h2>
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndRegular}
            >
              <SortableContext 
                items={regularArtists.map(artist => artist.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="artists-grid">
                  {regularArtists.map(artist => (
                    <SortableArtistCard
                      key={artist.id}
                      artist={artist}
                      isFavorite={false}
                      onToggleFavorite={toggleFavorite}
                      onShowDetails={handleShowDetails}
                      onEdit={handleEdit}
                      onDelete={deleteMakeupArtist}
                      onImageClick={handleImageClick}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {activeTab === 'artists' && (
          makeupArtists.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💄</div>
              <h3>还没有妆师信息</h3>
              <p>添加你认识的妆师，方便后续约妆管理</p>
            </div>
          ) : filteredArtists.length === 0 && searchTerm ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>未找到匹配的妆师</h3>
              <p>试试其他关键词，或者<button className="link-btn" onClick={clearSearch}>清除搜索</button></p>
            </div>
          ) : null
        )}
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

export default MakeupPage;