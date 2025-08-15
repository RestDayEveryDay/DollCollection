import React, { useState, useEffect } from 'react';
import ImageUpload from './ImageUpload';
import './BodyMakeup.css';

const BodyMakeup = ({ bodyId, onStatusChange }) => {
  const [bodyMakeup, setBodyMakeup] = useState(null);
  const [makeupArtists, setMakeupArtists] = useState([]);
  const [showSetForm, setShowSetForm] = useState(false);

  const [formData, setFormData] = useState({
    makeup_artist_id: '',
    makeup_artist_name: '',
    makeup_fee: '',
    makeup_date: '',
    image_url: ''
  });

  useEffect(() => {
    if (bodyId) {
      fetchBodyMakeup();
      fetchMakeupArtists();
    }
  }, [bodyId]);

  const fetchBodyMakeup = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/body-makeup/${bodyId}`);
      if (response.ok) {
        const data = await response.json();
        setBodyMakeup(data);
      } else {
        setBodyMakeup(null);
      }
    } catch (error) {
      console.error('获取体妆信息失败:', error);
      setBodyMakeup(null);
    }
  };

  const fetchMakeupArtists = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/makeup-artists');
      const data = await response.json();
      setMakeupArtists(data);
    } catch (error) {
      console.error('获取妆师列表失败:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      makeup_artist_id: '',
      makeup_artist_name: '',
      makeup_fee: '',
      makeup_date: '',
      image_url: ''
    });
  };

  const handleArtistChange = (artistId) => {
    const artist = makeupArtists.find(a => a.id === parseInt(artistId));
    setFormData({
      ...formData,
      makeup_artist_id: artistId,
      makeup_artist_name: artist ? artist.name : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      body_id: bodyId,
      makeup_artist_id: formData.makeup_artist_id || null
    };

    try {
      const url = bodyMakeup 
        ? `http://localhost:5000/api/body-makeup/${bodyId}`
        : 'http://localhost:5000/api/body-makeup';
      
      const method = bodyMakeup ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        fetchBodyMakeup();
        setShowSetForm(false);
        resetForm();
        if (onStatusChange) onStatusChange();
      }
    } catch (error) {
      console.error('保存体妆信息失败:', error);
    }
  };

  const handleEdit = () => {
    if (bodyMakeup) {
      setFormData({
        makeup_artist_id: bodyMakeup.makeup_artist_id || '',
        makeup_artist_name: bodyMakeup.makeup_artist_name || '',
        makeup_fee: bodyMakeup.makeup_fee || '',
        makeup_date: bodyMakeup.makeup_date ? bodyMakeup.makeup_date.split('T')[0] : '',
        image_url: bodyMakeup.image_url || ''
      });
    }
    setShowSetForm(true);
  };

  const handleClear = async () => {
    if (!window.confirm('确定要清除体妆信息吗？')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/body-makeup/${bodyId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setBodyMakeup(null);
        if (onStatusChange) onStatusChange();
      }
    } catch (error) {
      console.error('清除体妆信息失败:', error);
    }
  };

  const handleCancel = () => {
    setShowSetForm(false);
    resetForm();
  };

  return (
    <div className="body-makeup">
      <div className="body-makeup-header">
        <h4>体妆信息</h4>
        <div className="body-makeup-actions">
          {bodyMakeup ? (
            <>
              <button className="edit-makeup-btn" onClick={handleEdit}>
                编辑
              </button>
              <button className="clear-makeup-btn" onClick={handleClear}>
                清除
              </button>
            </>
          ) : (
            <button className="set-makeup-btn" onClick={() => setShowSetForm(true)}>
              设置体妆
            </button>
          )}
        </div>
      </div>

      {bodyMakeup ? (
        <div className="body-makeup-info">
          <div className="makeup-details">
            <div className="makeup-artist">
              <span className="artist-name">
                {bodyMakeup.makeup_artist_name || bodyMakeup.artist_name || '未知妆师'}
              </span>
              {bodyMakeup.makeup_fee && (
                <span className="makeup-fee">¥{bodyMakeup.makeup_fee}</span>
              )}
            </div>
            
            {bodyMakeup.makeup_date && (
              <div className="makeup-date">
                上妆日期: {new Date(bodyMakeup.makeup_date).toLocaleDateString()}
              </div>
            )}
          </div>

          {bodyMakeup.image_url && (
            <div className="body-makeup-image">
              <img src={bodyMakeup.image_url} alt="体妆照片" />
            </div>
          )}
        </div>
      ) : (
        <div className="no-body-makeup">
          <div className="empty-icon">💅</div>
          <p>暂无体妆信息，点击"设置体妆"开始记录吧！</p>
        </div>
      )}

      {showSetForm && (
        <div className="body-makeup-form">
          <h5>{bodyMakeup ? '编辑体妆信息' : '设置体妆信息'}</h5>
          
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>妆师</label>
                <select
                  value={formData.makeup_artist_id}
                  onChange={(e) => handleArtistChange(e.target.value)}
                >
                  <option value="">选择妆师（可选）</option>
                  {makeupArtists.map(artist => (
                    <option key={artist.id} value={artist.id}>
                      {artist.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>自定义妆师名</label>
                <input
                  type="text"
                  placeholder="或手动输入妆师名"
                  value={formData.makeup_artist_name}
                  onChange={(e) => setFormData({...formData, makeup_artist_name: e.target.value})}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>体妆价格</label>
                <input
                  type="number"
                  placeholder="体妆价格"
                  value={formData.makeup_fee}
                  onChange={(e) => setFormData({...formData, makeup_fee: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>上妆日期</label>
                <input
                  type="date"
                  value={formData.makeup_date}
                  onChange={(e) => setFormData({...formData, makeup_date: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>体妆照片</label>
              <ImageUpload
                onImageSelect={(imageUrl) => setFormData({...formData, image_url: imageUrl})}
                currentImage={formData.image_url}
                placeholder="选择体妆照片"
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleCancel} className="cancel-btn">
                取消
              </button>
              <button type="submit" className="save-btn">
                {bodyMakeup ? '更新' : '设置'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default BodyMakeup;