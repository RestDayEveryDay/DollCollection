import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import ImageUpload from './ImageUpload';
import './MakeupArtistEditModal.css';

const MakeupArtistEditModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  artistData = null,
  isEditing = false 
}) => {
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

  // 当编辑模式或数据变化时，更新表单
  useEffect(() => {
    if (isEditing && artistData) {
      setFormData({
        name: artistData.name || '',
        contact: artistData.contact || '',
        specialty: artistData.specialty || '',
        price_range: artistData.price_range || '',
        makeup_rules_image: artistData.makeup_rules_image || '',
        note_template: artistData.note_template || '',
        when_available: artistData.when_available || '',
        is_favorite: artistData.is_favorite || false
      });
    } else {
      // 重置表单
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
    }
  }, [isEditing, artistData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? '编辑妆师' : '添加妆师'}
      width="700px"
    >
      <form onSubmit={handleSubmit} className="makeup-artist-edit-form">
        <div className="form-section">
          <h4 className="section-title">💄 基本信息</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label>妆师名称 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                placeholder="请输入妆师名称"
              />
            </div>
            
            <div className="form-group">
              <label>联系方式</label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => handleInputChange('contact', e.target.value)}
                placeholder="微信号、QQ号或电话"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>擅长风格</label>
              <input
                type="text"
                value={formData.specialty}
                onChange={(e) => handleInputChange('specialty', e.target.value)}
                placeholder="例如：日系清新、欧美浓妆等"
              />
            </div>
            
            <div className="form-group">
              <label>价格区间</label>
              <input
                type="text"
                value={formData.price_range}
                onChange={(e) => handleInputChange('price_range', e.target.value)}
                placeholder="例如：100-300元"
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label>何时开妆</label>
            <input
              type="text"
              value={formData.when_available}
              onChange={(e) => handleInputChange('when_available', e.target.value)}
              placeholder="例如：每月15号、周末、不定期等"
            />
          </div>
        </div>

        <div className="form-section">
          <h4 className="section-title">📝 备注模板</h4>
          <div className="form-group full-width">
            <label>备注模板（约妆时自动填充）</label>
            <textarea
              value={formData.note_template}
              onChange={(e) => handleInputChange('note_template', e.target.value)}
              placeholder="输入常用的约妆备注，例如妆容要求、注意事项等..."
              rows={4}
            />
          </div>
        </div>

        <div className="form-section">
          <h4 className="section-title">🖼️ 妆造规则图</h4>
          <ImageUpload
            onImageSelect={(imageUrl) => handleInputChange('makeup_rules_image', imageUrl)}
            currentImage={formData.makeup_rules_image}
            placeholder="上传妆师的妆造规则或作品集"
          />
        </div>

        <div className="form-section">
          <h4 className="section-title">⭐ 收藏设置</h4>
          <div className="favorite-selector">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_favorite}
                onChange={(e) => handleInputChange('is_favorite', e.target.checked)}
              />
              <span className="checkbox-text">设为心仪妆师</span>
              {formData.is_favorite && <span className="favorite-icon">❤️</span>}
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="submit-btn">
            {isEditing ? '保存更改' : '添加妆师'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default MakeupArtistEditModal;