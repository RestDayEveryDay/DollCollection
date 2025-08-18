import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import ImageUpload from './ImageUpload';
import CopyableText from './CopyableText';
import './MakeupHistory.css';

const MakeupHistory = ({ headId, onUpdate }) => {
  const [makeupHistory, setMakeupHistory] = useState([]);
  const [makeupArtists, setMakeupArtists] = useState([]);
  const [currentMakeup, setCurrentMakeup] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHistory, setEditingHistory] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [selectedTab, setSelectedTab] = useState('new'); // 'new' or 'from_current'

  const [formData, setFormData] = useState({
    makeup_artist_id: '',
    makeup_artist_name: '',
    makeup_fee: '',
    notes: '',
    makeup_date: '',
    removal_date: '',
    image_url: ''
  });

  useEffect(() => {
    if (headId) {
      fetchMakeupHistory();
      fetchMakeupArtists();
      fetchCurrentMakeup();
    }
  }, [headId]);

  const fetchMakeupHistory = async () => {
    try {
      const data = await apiGet(`/api/makeup-history/${headId}`);
      setMakeupHistory(data);
    } catch (error) {
      console.error('获取历史妆容失败:', error);
    }
  };

  const fetchMakeupArtists = async () => {
    try {
      const data = await apiGet('/api/makeup-artists');
      setMakeupArtists(data);
    } catch (error) {
      console.error('获取妆师列表失败:', error);
    }
  };

  const fetchCurrentMakeup = async () => {
    try {
      const data = await apiGet(`/api/current-makeup/${headId}`);
      setCurrentMakeup(data);
    } catch (error) {
      console.error('获取当前妆容失败:', error);
      setCurrentMakeup(null);
    }
  };

  const resetForm = () => {
    setFormData({
      makeup_artist_id: '',
      makeup_artist_name: '',
      makeup_fee: '',
      notes: '',
      makeup_date: '',
      removal_date: '',
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
      head_id: headId,
      makeup_artist_id: formData.makeup_artist_id || null
    };

    try {
      if (editingHistory) {
        await apiPut(`/api/makeup-history/${editingHistory.id}`, submitData);
      } else {
        await apiPost('/api/makeup-history', submitData);
      }

      // 如果是从当前妆容添加历史记录，需要清除当前妆容状态
      if (selectedTab === 'from_current' && currentMakeup && !editingHistory) {
        try {
          await apiDelete(`/api/current-makeup/${headId}`);
          setCurrentMakeup(null);
        } catch (error) {
          console.error('清除当前妆容状态失败:', error);
        }
      }

      fetchMakeupHistory();
      setShowAddForm(false);
      setEditingHistory(null);
      setSelectedTab('new');
      resetForm();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('保存历史妆容失败:', error);
    }
  };

  const handleEdit = (history) => {
    setEditingHistory(history);
    setFormData({
      makeup_artist_id: history.makeup_artist_id || '',
      makeup_artist_name: history.makeup_artist_name || '',
      makeup_fee: history.makeup_fee || '',
      notes: history.notes || '',
      makeup_date: history.makeup_date ? history.makeup_date.split('T')[0] : '',
      removal_date: history.removal_date ? history.removal_date.split('T')[0] : '',
      image_url: history.image_url || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (historyId) => {
    if (!window.confirm('确定要删除这个历史妆容记录吗？')) return;

    try {
      await apiDelete(`/api/makeup-history/${historyId}`);
      fetchMakeupHistory();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('删除历史妆容失败:', error);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingHistory(null);
    setSelectedTab('new');
    resetForm();
  };

  const handleFromCurrentSelect = () => {
    if (currentMakeup) {
      setFormData({
        makeup_artist_id: currentMakeup.makeup_artist_id || '',
        makeup_artist_name: currentMakeup.makeup_artist_name || '',
        makeup_fee: currentMakeup.makeup_fee || '',
        notes: currentMakeup.notes || '',
        makeup_date: currentMakeup.makeup_date ? currentMakeup.makeup_date.split('T')[0] : '',
        removal_date: new Date().toISOString().split('T')[0], // 默认今天作为卸妆日期
        image_url: currentMakeup.image_url || ''
      });
    }
  };

  const handleViewImage = (history) => {
    setSelectedHistory(history);
  };

  const closeImageModal = () => {
    setSelectedHistory(null);
  };

  return (
    <div className="makeup-history">
      <div className="history-header">
        <h4>历史妆容记录 ({makeupHistory.length})</h4>
        <button 
          className="add-history-btn"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '取消' : '添加记录'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="history-form">
          <h5>{editingHistory ? '编辑历史妆容' : '添加历史妆容'}</h5>
          
          {!editingHistory && (
            <div className="form-tabs">
              <button
                type="button"
                className={`tab-btn ${selectedTab === 'new' ? 'active' : ''}`}
                onClick={() => setSelectedTab('new')}
              >
                手动输入
              </button>
              {currentMakeup && (
                <button
                  type="button"
                  className={`tab-btn ${selectedTab === 'from_current' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedTab('from_current');
                    handleFromCurrentSelect();
                  }}
                >
                  从当前妆容
                </button>
              )}
            </div>
          )}

          {selectedTab === 'from_current' && currentMakeup && (
            <div className="current-makeup-info">
              <div className="current-makeup-preview">
                <h6>当前妆容信息</h6>
                <div className="current-info">
                  <p><strong>妆师:</strong> {currentMakeup.makeup_artist_name || currentMakeup.artist_name || '未知'}</p>
                  {currentMakeup.makeup_fee && (
                    <p><strong>妆费:</strong> ¥{currentMakeup.makeup_fee}</p>
                  )}
                  {currentMakeup.makeup_date && (
                    <p><strong>上妆日期:</strong> {new Date(currentMakeup.makeup_date).toLocaleDateString()}</p>
                  )}
                  {currentMakeup.notes && (
                    <p><strong>备注:</strong> {currentMakeup.notes}</p>
                  )}
                </div>
                {currentMakeup.image_url && (
                  <div className="current-image-preview">
                    <img src={currentMakeup.image_url} alt="当前妆容" />
                  </div>
                )}
              </div>
            </div>
          )}
          
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
              <label>妆费</label>
              <input
                type="number"
                placeholder="妆费金额"
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

          <div className="form-row">
            <div className="form-group">
              <label>卸妆日期</label>
              <input
                type="date"
                value={formData.removal_date}
                onChange={(e) => setFormData({...formData, removal_date: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label>备注</label>
            <textarea
              placeholder="妆容描述、特殊说明等..."
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
            />
          </div>

          <div className="form-group full-width">
            <label>妆容照片</label>
            <ImageUpload
              onImageSelect={(imageUrl) => setFormData({...formData, image_url: imageUrl})}
              currentImage={formData.image_url}
              placeholder="选择妆容照片"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleCancel} className="cancel-btn">
              取消
            </button>
            <button type="submit" className="save-btn">
              {editingHistory ? '更新' : '添加'}
            </button>
          </div>
        </form>
      )}

      <div className="history-list">
        {makeupHistory.length === 0 && !showAddForm ? (
          <div className="empty-history">
            <div className="empty-icon">💄</div>
            <p>还没有历史妆容记录，点击"添加记录"开始记录美丽瞬间吧！</p>
          </div>
        ) : (
          makeupHistory.map(history => (
            <div key={history.id} className="history-item">
              <div className="history-main">
                <div className="history-info">
                  <div className="history-artist">
                    <span className="artist-name">
                      {history.makeup_artist_name || history.artist_name || '未知妆师'}
                    </span>
                    {history.makeup_fee && (
                      <span className="makeup-fee">¥{history.makeup_fee}</span>
                    )}
                  </div>
                  
                  <div className="history-dates">
                    {history.makeup_date && (
                      <span className="date-info">
                        上妆: {new Date(history.makeup_date).toLocaleDateString()}
                      </span>
                    )}
                    {history.removal_date && (
                      <span className="date-info">
                        卸妆: {new Date(history.removal_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {history.notes && (
                    <CopyableText 
                      text={history.notes} 
                      className="history-notes"
                      placeholder="暂无备注" 
                    />
                  )}
                </div>

                <div className="history-actions">
                  {history.image_url && (
                    <button 
                      className="view-image-btn"
                      onClick={() => handleViewImage(history)}
                    >
                      查看照片
                    </button>
                  )}
                  <button 
                    className="edit-btn"
                    onClick={() => handleEdit(history)}
                  >
                    编辑
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDelete(history.id)}
                  >
                    删除
                  </button>
                </div>
              </div>

              {history.image_url && (
                <div className="history-image-preview">
                  <img 
                    src={history.image_url} 
                    alt="妆容照片"
                    onClick={() => handleViewImage(history)}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 照片查看模态框 */}
      {selectedHistory && selectedHistory.image_url && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={closeImageModal}>×</button>
            <img src={selectedHistory.image_url} alt="妆容照片" />
            <div className="modal-info">
              <h3>{selectedHistory.makeup_artist_name || '历史妆容'}</h3>
              {selectedHistory.makeup_date && (
                <p>上妆日期: {new Date(selectedHistory.makeup_date).toLocaleDateString()}</p>
              )}
              {selectedHistory.notes && (
                <CopyableText 
                  text={selectedHistory.notes} 
                  className="modal-notes"
                  showCopyButton={false}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MakeupHistory;