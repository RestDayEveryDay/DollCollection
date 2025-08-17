import React, { useState, useRef, useCallback, useEffect } from 'react';
import './ImagePositionEditor.css';

const ImagePositionEditor = ({ 
  imageUrl, 
  initialPosition = { x: 50, y: 50 }, 
  initialScale = 100, 
  onPositionChange,
  onSave,
  onCancel,
  isOpen = false 
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [scale, setScale] = useState(initialScale);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showScaleTooltip, setShowScaleTooltip] = useState(false);
  
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    setPosition(initialPosition);
    setScale(initialScale);
  }, [initialPosition, initialScale, imageUrl]);

  const handleMouseDown = useCallback((e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = (e.clientX - rect.left - dragStart.x) / rect.width * 100;
    const deltaY = (e.clientY - rect.top - dragStart.y) / rect.height * 100;
    
    const newX = position.x + deltaX;
    const newY = position.y + deltaY;
    
    // 限制在合理范围内
    const clampedX = Math.max(-50, Math.min(150, newX));
    const clampedY = Math.max(-50, Math.min(150, newY));
    
    const newPosition = { x: clampedX, y: clampedY };
    setPosition(newPosition);
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    if (onPositionChange) {
      onPositionChange({ position: newPosition, scale });
    }
  }, [isDragging, dragStart, position, scale, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleScaleChange = useCallback((newScale) => {
    setScale(newScale);
    setShowScaleTooltip(true);
    
    // 2秒后隐藏百分比提示
    setTimeout(() => {
      setShowScaleTooltip(false);
    }, 2000);
    
    if (onPositionChange) {
      onPositionChange({ position, scale: newScale });
    }
  }, [position, onPositionChange]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    const newScale = Math.max(50, Math.min(300, scale + delta));
    handleScaleChange(newScale);
  }, [scale, handleScaleChange]);

  const resetToDefault = () => {
    const defaultPosition = { x: 50, y: 50 };
    const defaultScale = 100;
    setPosition(defaultPosition);
    setScale(defaultScale);
    if (onPositionChange) {
      onPositionChange({ position: defaultPosition, scale: defaultScale });
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ position, scale });
    }
  };

  // 添加全局事件监听器
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  return (
    <div className="image-position-editor-overlay">
      <div className="image-position-editor">
        <div className="editor-header">
          <h3>调整图片显示区域</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        
        <div className="editor-content">
          <div 
            className="image-preview-container"
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
          >
            <div className="image-frame">
              <div 
                className="image-wrapper"
                style={{
                  transform: `translate(-50%, -50%) translate(${(position.x - 50)}%, ${(position.y - 50)}%) scale(${scale / 100})`,
                  transformOrigin: 'center center',
                  position: 'absolute',
                  top: '50%',
                  left: '50%'
                }}
              >
                <img 
                  ref={imageRef}
                  src={imageUrl} 
                  alt="预览" 
                  className="preview-image"
                  draggable={false}
                />
              </div>
            </div>
            <div className="frame-overlay">
              <div className="frame-border"></div>
              <div className="drag-hint">
                {isDragging ? '松开鼠标确定位置' : '拖拽调整位置，滚轮调整缩放'}
              </div>
            </div>
          </div>

          <div className="controls">
            <div className="scale-control">
              <label>缩放比例: {scale}%</label>
              <div className="scale-slider-container">
                <span>50%</span>
                <div className="scale-slider-wrapper">
                  <input
                    type="range"
                    min="50"
                    max="300"
                    step="5"
                    value={scale}
                    onChange={(e) => handleScaleChange(Number(e.target.value))}
                    className="scale-slider"
                  />
                  <div className="scale-markers">
                    <div className="scale-marker" style={{left: '16.67%'}}>100%</div>
                    <div className="scale-marker" style={{left: '40%'}}>150%</div>
                    <div className="scale-marker" style={{left: '60%'}}>200%</div>
                    <div className="scale-marker" style={{left: '80%'}}>250%</div>
                  </div>
                  {showScaleTooltip && (
                    <div 
                      className="scale-tooltip"
                      style={{
                        left: `${((scale - 50) / 250) * 100}%`
                      }}
                    >
                      {scale}%
                    </div>
                  )}
                </div>
                <span>300%</span>
              </div>
            </div>

            <div className="position-info">
              <div className="position-values">
                <span>X: {position.x.toFixed(1)}%</span>
                <span>Y: {position.y.toFixed(1)}%</span>
              </div>
              <button className="reset-btn" onClick={resetToDefault}>
                重置
              </button>
            </div>
          </div>
        </div>

        <div className="editor-actions">
          <button className="cancel-action-btn" onClick={onCancel}>
            取消
          </button>
          <button className="save-action-btn" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImagePositionEditor;