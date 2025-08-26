import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import ImageUpload from './ImageUpload';
import './PhotoGallery.css';

const PhotoGallery = ({ entityType, entityId, onCoverChange }) => {
  const [photos, setPhotos] = useState([]);
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoCaption, setPhotoCaption] = useState('');

  useEffect(() => {
    fetchPhotos();
  }, [entityType, entityId]);

  const fetchPhotos = async () => {
    try {
      const data = await apiGet(`/api/photos/${entityType}/${entityId}`);
      setPhotos(data);
    } catch (error) {
      console.error('获取照片失败:', error);
    }
  };

  const handleAddPhoto = async (imageUrl) => {
    if (!imageUrl) return;

    try {
      await apiPost('/api/photos', {
        entity_type: entityType,
        entity_id: entityId,
        photo_type: 'album',
        image_url: imageUrl,
        caption: photoCaption,
        is_cover: false
      });

      fetchPhotos();
      setShowAddPhoto(false);
      setPhotoCaption('');
    } catch (error) {
      console.error('添加照片失败:', error);
    }
  };

  const handleSetCover = async (photoId) => {
    try {
      await apiPut(`/api/photos/${photoId}`, {
        caption: photos.find(p => p.id === photoId)?.caption || '',
        is_cover: true
      });

      fetchPhotos();
      if (onCoverChange) {
        const photo = photos.find(p => p.id === photoId);
        onCoverChange(photo.image_url);
      }
    } catch (error) {
      console.error('设置封面失败:', error);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('确定要删除这张照片吗？')) return;

    try {
      await apiDelete(`/api/photos/${photoId}`);
      fetchPhotos();
    } catch (error) {
      console.error('删除照片失败:', error);
    }
  };

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
  };

  const closeModal = () => {
    setSelectedPhoto(null);
  };

  return (
    <div className="photo-gallery">
      <div className="gallery-header">
        <h4>相册 ({photos.length})</h4>
        <button 
          className="add-photo-btn"
          onClick={() => setShowAddPhoto(!showAddPhoto)}
        >
          {showAddPhoto ? '取消' : '添加照片'}
        </button>
      </div>

      {showAddPhoto && (
        <div className="add-photo-form">
          <input
            type="text"
            placeholder="照片描述（可选）"
            value={photoCaption}
            onChange={(e) => setPhotoCaption(e.target.value)}
            className="caption-input"
          />
          <ImageUpload
            onImageSelect={handleAddPhoto}
            placeholder="选择要添加到相册的照片"
          />
        </div>
      )}

      <div className="photos-grid">
        {photos.map(photo => (
          <div key={photo.id} className="photo-item">
            <div className="photo-container">
              <img 
                src={photo.image_url} 
                alt={photo.caption || '相册照片'} 
                onClick={() => handlePhotoClick(photo)}
              />
              {photo.is_cover && (
                <div className="cover-badge">封面</div>
              )}
              <div className="photo-overlay">
                <div className="photo-actions">
                  <button
                    className="action-btn set-cover"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetCover(photo.id);
                    }}
                    disabled={photo.is_cover}
                  >
                    {photo.is_cover ? '已是封面' : '设为封面'}
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo.id);
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
            {photo.caption && (
              <p className="photo-caption">{photo.caption}</p>
            )}
          </div>
        ))}
      </div>

      {photos.length === 0 && !showAddPhoto && (
        <div className="empty-gallery">
          <div className="empty-icon">📸</div>
          <p>还没有照片，点击"添加照片"开始收集美好瞬间吧！</p>
        </div>
      )}

      {/* 照片查看模态框 */}
      {selectedPhoto && (
        <div className="photo-modal" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={closeModal}>×</button>
            <img 
              src={selectedPhoto.image_url} 
              alt={selectedPhoto.caption || '照片'} 
            />
            {selectedPhoto.caption && (
              <div className="modal-caption">
                <p>{selectedPhoto.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;