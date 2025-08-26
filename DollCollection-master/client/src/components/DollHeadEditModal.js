import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import ImageUpload from './ImageUpload';
import './DollHeadEditModal.css';

const DollHeadEditModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  headData = null,
  isEditing = false 
}) => {
  const [formData, setFormData] = useState({
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

  // 当编辑模式或数据变化时，更新表单
  useEffect(() => {
    if (isEditing && headData) {
      setFormData({
        name: headData.name || '',
        company: headData.company || '',
        skin_tone: headData.skin_tone || '',
        head_circumference: headData.head_circumference || '',
        size_category: headData.size_category || '',
        original_price: headData.original_price || '',
        actual_price: headData.actual_price || '',
        total_price: headData.total_price || '',
        deposit: headData.deposit || '',
        final_payment: headData.final_payment || '',
        final_payment_date: headData.final_payment_date || '',
        release_date: headData.release_date || '',
        received_date: headData.received_date || '',
        purchase_channel: headData.purchase_channel || '',
        ownership_status: headData.ownership_status || 'owned',
        profile_image_url: headData.profile_image_url || '',
        image_position_x: headData.image_position_x || 50,
        image_position_y: headData.image_position_y || 50,
        image_scale: headData.image_scale || 100
      });
    } else {
      // 重置表单
      setFormData({
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
  }, [isEditing, headData, isOpen]);

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
      title={isEditing ? '编辑娃头' : '添加娃头'}
      width="700px"
    >
      <form onSubmit={handleSubmit} className="doll-head-edit-form">
        <div className="form-section">
          <h4 className="section-title">基本信息</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label>名字 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                placeholder="请输入娃头名字"
              />
            </div>
            
            <div className="form-group">
              <label>娃社</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="请输入娃社名称"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>肤色</label>
              <input
                type="text"
                value={formData.skin_tone}
                onChange={(e) => handleInputChange('skin_tone', e.target.value)}
                placeholder="例如：白肌、粉白、小麦等"
              />
            </div>
            
            <div className="form-group">
              <label>头围</label>
              <input
                type="text"
                value={formData.head_circumference}
                onChange={(e) => handleInputChange('head_circumference', e.target.value)}
                placeholder="例如：16cm"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4 className="section-title">价格信息</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label>原价</label>
              <input
                type="number"
                value={formData.original_price}
                onChange={(e) => handleInputChange('original_price', e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div className="form-group">
              <label>到手价</label>
              <input
                type="number"
                value={formData.actual_price}
                onChange={(e) => handleInputChange('actual_price', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {formData.ownership_status === 'preorder' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>总价</label>
                  <input
                    type="number"
                    value={formData.total_price}
                    onChange={(e) => handleInputChange('total_price', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="form-group">
                  <label>定金</label>
                  <input
                    type="number"
                    value={formData.deposit}
                    onChange={(e) => handleInputChange('deposit', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>尾款</label>
                  <input
                    type="number"
                    value={formData.final_payment}
                    onChange={(e) => handleInputChange('final_payment', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="form-group">
                  <label>尾款时间</label>
                  <input
                    type="date"
                    value={formData.final_payment_date}
                    onChange={(e) => handleInputChange('final_payment_date', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="form-section">
          <h4 className="section-title">其他信息</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label>开仓年月</label>
              <input
                type="month"
                value={formData.release_date}
                onChange={(e) => handleInputChange('release_date', e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>到手年月</label>
              <input
                type="month"
                value={formData.received_date}
                onChange={(e) => handleInputChange('received_date', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>购买渠道</label>
              <input
                type="text"
                value={formData.purchase_channel}
                onChange={(e) => handleInputChange('purchase_channel', e.target.value)}
                placeholder="例如：官方、淘宝、咸鱼等"
              />
            </div>
            
            <div className="form-group">
              <label>状态</label>
              <select
                value={formData.ownership_status}
                onChange={(e) => handleInputChange('ownership_status', e.target.value)}
              >
                <option value="owned">已到家</option>
                <option value="preorder">空气娃</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4 className="section-title">尺寸分类</h4>
          <div className="size-category-selector">
            <div className="size-category-options">
              {['ob11', '四分', '70', '75'].map(size => (
                <button
                  key={size}
                  type="button"
                  className={`size-category-btn ${formData.size_category === size ? 'selected' : ''}`}
                  onClick={() => handleInputChange('size_category', size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4 className="section-title">官方图片</h4>
          <ImageUpload
            onImageSelect={(imageUrl) => handleInputChange('profile_image_url', imageUrl)}
            currentImage={formData.profile_image_url}
            placeholder="选择官方图片"
          />
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="submit-btn">
            {isEditing ? '保存更改' : '添加娃头'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DollHeadEditModal;