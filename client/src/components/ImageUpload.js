import React, { useState, useRef } from 'react';
import './ImageUpload.css';

const ImageUpload = ({ onImageSelect, currentImage, placeholder = "点击上传图片" }) => {
  const [preview, setPreview] = useState(currentImage || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件！');
      return;
    }

    // 文件大小限制已移除

    // 创建预览
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    // 上传文件
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const fullImageUrl = `http://localhost:5000${result.imageUrl}`;
        
        // 通知父组件
        if (onImageSelect) {
          onImageSelect(fullImageUrl, result.filename);
        }
        
        console.log('图片上传成功:', result);
      } else {
        const error = await response.json();
        alert(`上传失败: ${error.error}`);
        setPreview(currentImage || null);
      }
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败，请重试');
      setPreview(currentImage || null);
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview(null);
    if (onImageSelect) {
      onImageSelect(null, null);
    }
  };

  return (
    <div className="image-upload">
      <div className="upload-area" onClick={handleClick}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {preview ? (
          <div className="image-preview">
            <img src={preview} alt="预览" />
            <div className="image-overlay">
              {uploading ? (
                <div className="uploading">
                  <span className="loading-spinner">⏳</span>
                  <span>上传中...</span>
                </div>
              ) : (
                <div className="image-actions">
                  <button 
                    type="button"
                    className="change-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClick();
                    }}
                  >
                    更换
                  </button>
                  <button 
                    type="button"
                    className="remove-btn"
                    onClick={handleRemove}
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="upload-placeholder">
            <div className="upload-icon">📷</div>
            <div className="upload-text">
              {uploading ? '上传中...' : placeholder}
            </div>
            <div className="upload-hint">
              支持 JPG、PNG、GIF 等图片格式
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;