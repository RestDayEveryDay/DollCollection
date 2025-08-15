import React, { useState, useEffect } from 'react';
import './ImageViewer.css';

const ImageViewer = ({ imageUrl, isOpen, onClose, title }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // 检测是否为触摸设备
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.5, 0.5));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  // 触摸事件处理
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      // 单指触摸 - 开始拖拽
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
    } else if (e.touches.length === 2) {
      // 双指触摸 - 准备缩放
      setIsDragging(false);
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isDragging) {
      // 单指拖拽
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    } else if (e.touches.length === 2) {
      // 双指缩放
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      // 这里可以实现双指缩放逻辑
      // 为了简化，我们使用双指轻点来放大/缩小
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
    
    // 双指轻点缩放
    if (e.changedTouches.length === 2) {
      if (scale < 2) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };


  useEffect(() => {
    const handleKeyDownWrapper = (e) => {
      switch(e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          setScale(prev => Math.min(prev + 0.5, 3));
          break;
        case '-':
          setScale(prev => Math.max(prev - 0.5, 0.5));
          break;
        case '0':
          setScale(1);
          setPosition({ x: 0, y: 0 });
          break;
        case 'ArrowUp':
          setPosition(prev => ({ ...prev, y: prev.y + 50 }));
          break;
        case 'ArrowDown':
          setPosition(prev => ({ ...prev, y: prev.y - 50 }));
          break;
        case 'ArrowLeft':
          setPosition(prev => ({ ...prev, x: prev.x + 50 }));
          break;
        case 'ArrowRight':
          setPosition(prev => ({ ...prev, x: prev.x - 50 }));
          break;
        default:
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDownWrapper);
      return () => {
        document.removeEventListener('keydown', handleKeyDownWrapper);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="image-viewer-overlay" 
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
        <div className="image-viewer-header">
          <div className="header-content">
            <h3>{title || '图片预览'}</h3>
            {isTouchDevice && (
              <p className="touch-hint">单指拖拽 • 双指轻点缩放 • 滚轮或按钮缩放</p>
            )}
            {!isTouchDevice && (
              <p className="desktop-hint">鼠标拖拽 • 滚轮缩放 • 方向键移动</p>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="image-viewer-content">
          <img
            src={imageUrl}
            alt={title || '预览图片'}
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onWheel={handleWheel}
            draggable={false}
          />
        </div>
        
        <div className="image-viewer-controls">
          <div className="zoom-controls">
            <button onClick={handleZoomOut} disabled={scale <= 0.5}>
              🔍-
            </button>
            <span>{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn} disabled={scale >= 3}>
              🔍+
            </button>
            <button onClick={handleReset}>
              重置
            </button>
          </div>
          
          {isTouchDevice && scale > 1 && (
            <div className="direction-controls">
              <div className="direction-row">
                <button 
                  className="direction-btn"
                  onClick={() => setPosition(prev => ({ ...prev, y: prev.y + 50 }))}
                >
                  ↑
                </button>
              </div>
              <div className="direction-row">
                <button 
                  className="direction-btn"
                  onClick={() => setPosition(prev => ({ ...prev, x: prev.x + 50 }))}
                >
                  ←
                </button>
                <button 
                  className="direction-btn"
                  onClick={() => setPosition(prev => ({ ...prev, x: prev.x - 50 }))}
                >
                  →
                </button>
              </div>
              <div className="direction-row">
                <button 
                  className="direction-btn"
                  onClick={() => setPosition(prev => ({ ...prev, y: prev.y - 50 }))}
                >
                  ↓
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;