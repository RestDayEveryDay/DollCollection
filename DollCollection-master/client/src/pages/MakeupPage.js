import React, { useState, useEffect } from 'react';
import ImageViewer from '../components/ImageViewer';
import CopyableText from '../components/CopyableText';
import MakeupArtistEditModal from '../components/MakeupArtistEditModal';
import './MakeupPage.css';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
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

const MakeupPage = ({ currentUser }) => {
  const [makeupArtists, setMakeupArtists] = useState([]);
  const [filteredArtists, setFilteredArtists] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingArtist, setEditingArtist] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState({ url: '', title: '' });
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('artists'); // 'appointments' or 'artists'

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
      const data = await apiGet('/api/makeup-artists');
      setMakeupArtists(data || []);
      setFilteredArtists(data || []); // 初始化过滤结果
    } catch (error) {
      console.error('获取妆师数据失败:', error);
      setMakeupArtists([]);
      setFilteredArtists([]);
    }
  };

  const fetchAppointments = async () => {
    try {
      const data = await apiGet('/api/makeup-appointments');
      setAppointments(data || []);
    } catch (error) {
      console.error('获取约妆数据失败:', error);
      setAppointments([]);
    }
  };

  // 统一的拖拽结束处理 - 所有妆师作为一个列表
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = makeupArtists.findIndex((item) => item.id === active.id);
      const newIndex = makeupArtists.findIndex((item) => item.id === over.id);

      const newList = arrayMove(makeupArtists, oldIndex, newIndex);
      
      // 更新本地状态
      setMakeupArtists(newList);

      // 更新服务器排序
      const sortOrder = newList.map((artist, index) => ({
        id: artist.id,
        order: index
      }));

      try {
        await apiPost('/api/sort/makeup-artists', { sortOrder });
      } catch (error) {
        console.error('更新妆师排序失败:', error);
      }
    }
  };

  const handleSubmit = async (formData) => {
    try {
      console.log('前端发送数据:', { formData });

      if (editingArtist) {
        await apiPut(`/api/makeup-artists/${editingArtist.id}`, formData);
      } else {
        await apiPost('/api/makeup-artists', formData);
      }
      
      fetchMakeupArtists();
      setShowEditModal(false);
      setEditingArtist(null);
    } catch (error) {
      console.error(editingArtist ? '更新妆师失败:' : '添加妆师失败:', error);
    }
  };


  const deleteMakeupArtist = async (id) => {
    if (window.confirm('确定要删除这个妆师吗？')) {
      try {
        await apiDelete(`/api/makeup-artists/${id}`);
        fetchMakeupArtists();
      } catch (error) {
        console.error('删除妆师失败:', error);
      }
    }
  };

  const handleEdit = (artist) => {
    setEditingArtist(artist);
    setShowEditModal(true);
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
      await apiPut(`/api/makeup-artists/${artist.id}`, updatedArtist);
      fetchMakeupArtists();
    } catch (error) {
      console.error('更新妆师收藏状态失败:', error);
    }
  };

  const cancelAppointment = async (headId) => {
    if (!window.confirm('确定要取消这个约妆吗？')) return;

    try {
      await apiDelete(`/api/makeup-appointment/${headId}`);
      fetchAppointments(); // 刷新约妆列表
    } catch (error) {
      console.error('取消约妆失败:', error);
    }
  };

  // 从约妆记录创建妆师卡片
  const createArtistFromAppointment = async (appointmentId, artistName) => {
    try {
      const result = await apiPost('/api/makeup-artists/create-from-appointment', { appointment_id: appointmentId });
      
      if (result.existed) {
        alert(`妆师 "${artistName}" 已存在妆师簿子中！`);
      } else if (result.created) {
        alert(`成功为 "${artistName}" 创建妆师卡片！`);
        fetchMakeupArtists(); // 刷新妆师列表
        setActiveTab('artists'); // 切换到妆师列表标签
      }
    } catch (error) {
      console.error('创建妆师卡片失败:', error);
      alert('创建妆师卡片失败，请重试');
    }
  };

  // 批量创建所有约妆妆师的档案
  const batchCreateArtistsFromAppointments = async () => {
    if (!window.confirm('确定要为所有未建档的约妆妆师创建档案吗？')) return;
    
    try {
      const result = await apiPost('/api/makeup-artists/batch-create-from-appointments', {});
      
      if (result.created > 0) {
        alert(`成功创建 ${result.created} 个妆师档案！\n${result.skipped > 0 ? `已跳过 ${result.skipped} 个已存在的妆师` : ''}`);
        fetchMakeupArtists(); // 刷新妆师列表
        fetchAppointments(); // 刷新约妆列表
        setActiveTab('artists'); // 切换到妆师列表标签
      } else {
        alert('所有约妆妆师都已有档案，无需创建新档案');
      }
      
      if (result.errors && result.errors.length > 0) {
        console.error('批量创建妆师档案时的错误:', result.errors);
      }
    } catch (error) {
      console.error('批量创建妆师档案失败:', error);
      alert('批量创建失败，请重试');
    }
  };

  // 使用过滤后的数据
  const displayArtists = filteredArtists;

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
        <h1>{currentUser?.username || '我'}的妆师簿子</h1>
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
          <button 
            className="header-button"
            onClick={() => setShowEditModal(true)}
          >
            添加妆师
          </button>
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


      <div className="makeup-artists-container">
        {/* 正在约妆选项卡内容 */}
        {activeTab === 'appointments' && (
          <div className="appointments-section">
            {appointments.length > 0 ? (
              <>
                <div className="batch-create-container">
                  <button 
                    className="batch-create-btn"
                    onClick={batchCreateArtistsFromAppointments}
                    title="为所有未建档的约妆妆师创建档案"
                  >
                    🎯 一键构建所有妆师簿子
                  </button>
                  <span className="batch-create-hint">将自动为所有未建档的约妆妆师创建档案</span>
                </div>
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
                      <div className="appointment-actions">
                        <button 
                          className="create-artist-btn"
                          onClick={() => createArtistFromAppointment(appointment.id, appointment.makeup_artist_name)}
                          title="创建妆师卡片"
                        >
                          💳
                        </button>
                        <button 
                          className="cancel-appointment-btn"
                          onClick={() => cancelAppointment(appointment.head_id)}
                          title="取消约妆"
                        >
                          ×
                        </button>
                      </div>
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
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h3>暂无约妆信息</h3>
                <p>当前没有正在进行的约妆，去娃柜页面为娃头约妆吧！</p>
              </div>
            )}
          </div>
        )}

        {/* 妆师列表选项卡内容 - 统一列表 */}
        {activeTab === 'artists' && displayArtists.length > 0 && (
          <div className="artist-section">
            <h2 className="section-title">
              <span className="title-icon">💄</span>
              全部妆师
            </h2>
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={displayArtists.map(artist => artist.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="artists-grid">
                  {displayArtists.map(artist => (
                    <SortableArtistCard
                      key={artist.id}
                      artist={artist}
                      isFavorite={artist.is_favorite}
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

      <MakeupArtistEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingArtist(null);
        }}
        onSubmit={handleSubmit}
        artistData={editingArtist}
        isEditing={editingArtist && editingArtist.id}
      />
    </div>
  );
};

export default MakeupPage;