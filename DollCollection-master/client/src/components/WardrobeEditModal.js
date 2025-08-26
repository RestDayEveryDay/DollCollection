import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import ImageUpload from './ImageUpload';
import './WardrobeEditModal.css';

const WardrobeEditModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  itemData = null,
  isEditing = false,
  category 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: category || '',
    size_category: '',
    brand: '',
    original_price: '',
    actual_price: '',
    total_price: '',
    deposit: '',
    final_payment: '',
    final_payment_date: '',
    purchase_channel: '',
    ownership_status: 'owned',
    tags: '',
    profile_image_url: ''
  });

  // 当编辑模式或数据变化时，更新表单
  useEffect(() => {
    if (isEditing && itemData) {
      setFormData({
        name: itemData.name || '',
        category: itemData.category || category || '',
        size_category: itemData.size_category || '',
        brand: itemData.brand || '',
        original_price: itemData.original_price || '',
        actual_price: itemData.actual_price || '',
        total_price: itemData.total_price || '',
        deposit: itemData.deposit || '',
        final_payment: itemData.final_payment || '',
        final_payment_date: itemData.final_payment_date || '',
        purchase_channel: itemData.purchase_channel || '',
        ownership_status: itemData.ownership_status || 'owned',
        tags: itemData.tags || '',
        profile_image_url: itemData.profile_image_url || ''
      });
    } else {
      // 重置表单
      setFormData({
        name: '',
        category: category || '',
        size_category: '',
        brand: '',
        original_price: '',
        actual_price: '',
        total_price: '',
        deposit: '',
        final_payment: '',
        final_payment_date: '',
        purchase_channel: '',
        ownership_status: 'owned',
        tags: '',
        profile_image_url: ''
      });
    }
  }, [isEditing, itemData, category, isOpen]);

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

  const getCategoryLabel = () => {
    const labels = {
      'clothes': '服装',
      'shoes': '鞋子',
      'accessories': '配饰',
      'wigs': '假发',
      'props': '道具',
      'other': '其他'
    };
    return labels[formData.category] || '物品';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `编辑${getCategoryLabel()}` : `添加${getCategoryLabel()}`}
      width="700px"
    >
      <form onSubmit={handleSubmit} className="wardrobe-edit-form">
        <div className="form-section">
          <h4 className="section-title">📦 基本信息</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label>名称 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                placeholder={`请输入${getCategoryLabel()}名称`}
              />
            </div>
            
            <div className="form-group">
              <label>品牌</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                placeholder="请输入品牌名称"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>分类</label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                required
              >
                <option value="">选择分类</option>
                <option value="clothes">服装</option>
                <option value="shoes">鞋子</option>
                <option value="accessories">配饰</option>
                <option value="wigs">假发</option>
                <option value="props">道具</option>
                <option value="other">其他</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>购买渠道</label>
              <input
                type="text"
                value={formData.purchase_channel}
                onChange={(e) => handleInputChange('purchase_channel', e.target.value)}
                placeholder="例如：官方、淘宝、咸鱼等"
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label>标签</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="输入标签，用逗号分隔（例如：萝莉塔，日常，正式）"
            />
          </div>
        </div>

        <div className="form-section">
          <h4 className="section-title">💰 价格信息</h4>
          
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

          <div className="form-group">
            <label>拥有状态</label>
            <select
              value={formData.ownership_status}
              onChange={(e) => handleInputChange('ownership_status', e.target.value)}
            >
              <option value="owned">已到家</option>
              <option value="preorder">空气</option>
            </select>
          </div>
        </div>

        <div className="form-section">
          <h4 className="section-title">📏 尺寸分类</h4>
          <div className="size-category-selector">
            <div className="size-category-options">
              {['ob11', '四分', '70', '75', '通用'].map(size => (
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
          <h4 className="section-title">🖼️ 商品图片</h4>
          <ImageUpload
            onImageSelect={(imageUrl) => handleInputChange('profile_image_url', imageUrl)}
            currentImage={formData.profile_image_url}
            placeholder="选择商品图片"
          />
        </div>

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="submit-btn">
            {isEditing ? '保存更改' : `添加${getCategoryLabel()}`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default WardrobeEditModal;