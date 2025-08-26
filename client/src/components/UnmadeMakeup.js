import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import './UnmadeMakeup.css';

const UnmadeMakeup = ({ headId, onStatusChange }) => {
  const [makeupArtists, setMakeupArtists] = useState([]);
  const [favoriteArtists, setFavoriteArtists] = useState([]);
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [showArtistSelector, setShowArtistSelector] = useState(false);

  useEffect(() => {
    if (headId) {
      fetchMakeupArtists();
      fetchSelectedArtists();
    }
  }, [headId]);

  const fetchMakeupArtists = async () => {
    try {
      const data = await apiGet('/api/makeup-artists');
      setMakeupArtists(data);
      // 分离出收藏的妆师
      setFavoriteArtists(data.filter(artist => artist.is_favorite));
    } catch (error) {
      console.error('获取妆师列表失败:', error);
    }
  };

  const fetchSelectedArtists = async () => {
    try {
      const data = await apiGet(`/api/unmade-preferences/${headId}`);
      setSelectedArtists(data.map(item => item.makeup_artist_id));
    } catch (error) {
      console.error('获取心仪妆师失败:', error);
    }
  };

  const handleArtistToggle = async (artistId) => {
    const isSelected = selectedArtists.includes(artistId);
    
    try {
      if (isSelected) {
        // 移除选择
        await apiDelete(`/api/unmade-preferences/${headId}/${artistId}`);
        setSelectedArtists(prev => prev.filter(id => id !== artistId));
      } else {
        // 添加选择
        await apiPost('/api/unmade-preferences', {
          head_id: headId,
          makeup_artist_id: artistId
        });
        setSelectedArtists(prev => [...prev, artistId]);
      }
    } catch (error) {
      console.error('更新心仪妆师失败:', error);
    }
  };

  const getSelectedArtistDetails = () => {
    return makeupArtists.filter(artist => selectedArtists.includes(artist.id));
  };

  const getUnselectedArtists = () => {
    return makeupArtists.filter(artist => !selectedArtists.includes(artist.id));
  };

  return (
    <div className="unmade-makeup">
      <div className="unmade-header">
        <h4>未约妆状态</h4>
        <div className="header-actions">
          <span className="selected-count">
            已选择 {selectedArtists.length} 位心仪妆师
          </span>
          <button 
            className="manage-artists-btn"
            onClick={() => setShowArtistSelector(!showArtistSelector)}
          >
            {showArtistSelector ? '完成选择' : '管理心仪妆师'}
          </button>
        </div>
      </div>

      <div className="unmade-status">
        <div className="status-indicator">
          <span className="status-icon">💭</span>
          <span className="status-text">待约妆状态</span>
        </div>
        <p className="status-description">
          未上妆，可在下方标记心选妆师
        </p>
      </div>

      {selectedArtists.length > 0 ? (
        <div className="selected-artists">
          <h5>心仪妆师</h5>
          <div className="artists-grid">
            {getSelectedArtistDetails().map(artist => (
              <div key={artist.id} className={`artist-card selected ${artist.is_favorite ? 'favorite' : ''}`}>
                <div className="artist-header">
                  <h6>{artist.name}</h6>
                  {artist.is_favorite && (
                    <span className="favorite-star">⭐</span>
                  )}
                  <button 
                    className="remove-btn"
                    onClick={() => handleArtistToggle(artist.id)}
                    title="移除"
                  >
                    ×
                  </button>
                </div>
                <div className="artist-details">
                  {artist.specialty && (
                    <p className="specialty">专长: {artist.specialty}</p>
                  )}
                  {artist.price_range && (
                    <p className="price-range">价格: {artist.price_range}</p>
                  )}
                  {artist.contact && (
                    <p className="contact">联系: {artist.contact}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-selected-artists">
          <div className="empty-icon">👤</div>
          <p>还没有选择心仪的妆师，点击"管理心仪妆师"开始选择吧！</p>
        </div>
      )}

      {showArtistSelector && (
        <div className="artist-selector">
          <div className="selector-header">
            <h5>选择心仪妆师</h5>
            <p className="selector-tip">点击妆师卡片来添加或移除选择</p>
          </div>

          {favoriteArtists.length > 0 && (
            <div className="favorite-section">
              <h6>⭐ 收藏妆师</h6>
              <div className="artists-grid">
                {favoriteArtists.map(artist => (
                  <div 
                    key={artist.id} 
                    className={`artist-card favorite ${selectedArtists.includes(artist.id) ? 'selected' : 'unselected'}`}
                    onClick={() => handleArtistToggle(artist.id)}
                  >
                    <div className="artist-header">
                      <h6>{artist.name}</h6>
                      <span className="favorite-star">⭐</span>
                      {selectedArtists.includes(artist.id) && (
                        <span className="selected-check">✓</span>
                      )}
                    </div>
                    <div className="artist-details">
                      {artist.specialty && (
                        <p className="specialty">专长: {artist.specialty}</p>
                      )}
                      {artist.price_range && (
                        <p className="price-range">价格: {artist.price_range}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {getUnselectedArtists().filter(artist => !artist.is_favorite).length > 0 && (
            <div className="other-section">
              <h6>其他妆师</h6>
              <div className="artists-grid">
                {getUnselectedArtists()
                  .filter(artist => !artist.is_favorite)
                  .map(artist => (
                    <div 
                      key={artist.id} 
                      className="artist-card unselected"
                      onClick={() => handleArtistToggle(artist.id)}
                    >
                      <div className="artist-header">
                        <h6>{artist.name}</h6>
                      </div>
                      <div className="artist-details">
                        {artist.specialty && (
                          <p className="specialty">专长: {artist.specialty}</p>
                        )}
                        {artist.price_range && (
                          <p className="price-range">价格: {artist.price_range}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {makeupArtists.length === 0 && (
            <div className="no-artists">
              <p>还没有妆师信息，请先在妆师页面添加妆师。</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UnmadeMakeup;