import React from 'react';
import './PositionableImage.css';

const PositionableImage = ({ 
  src, 
  alt, 
  className = '', 
  positionX = 50, 
  positionY = 50, 
  scale = 100,
  onClick,
  onMouseDown,
  title,
  ...props 
}) => {
  if (!src) return null;

  // 使用background方式实现图片显示和位置控制
  // scale=100时应该等同于background-size: cover的效果
  // 需要计算合适的background-size值
  const backgroundSize = scale === 100 ? 'cover' : `${scale * 2}%`;
  
  const containerStyle = {
    backgroundImage: `url(${src})`,
    backgroundSize: backgroundSize,
    backgroundPosition: `${positionX}% ${positionY}%`,
    backgroundRepeat: 'no-repeat',
    width: '100%',
    height: '100%',
    cursor: 'inherit'
  };

  return (
    <div 
      className={`positionable-image-container ${className}`}
      style={containerStyle}
      onClick={onClick}
      onMouseDown={onMouseDown}
      title={title}
      {...props}
    />
  );
};

export default PositionableImage;