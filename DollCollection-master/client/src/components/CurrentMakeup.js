import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import ImageUpload from './ImageUpload';
import CopyableText from './CopyableText';
import './CurrentMakeup.css';

const CurrentMakeup = ({ headId, onStatusChange }) => {
  const [currentMakeup, setCurrentMakeup] = useState(null);
  const [makeupHistory, setMakeupHistory] = useState([]);
  const [makeupArtists, setMakeupArtists] = useState([]);
  const [showSetForm, setShowSetForm] = useState(false);
  const [selectedTab, setSelectedTab] = useState('from_history'); // 'from_history', 'new', or 'from_appointment'
  const [appointment, setAppointment] = useState(null);

  const [formData, setFormData] = useState({
    makeup_artist_id: '',
    makeup_artist_name: '',
    makeup_fee: '',
    notes: '',
    makeup_date: '',
    image_url: '',
    from_history_id: ''
  });

  useEffect(() => {
    if (headId) {
      fetchCurrentMakeup();
      fetchMakeupHistory();
      fetchMakeupArtists();
      fetchAppointment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headId]);

  const fetchCurrentMakeup = async () => {
    try {
      const data = await apiGet(`/api/current-makeup/${headId}`);
      setCurrentMakeup(data);
    } catch (error) {
      // 404是正常的，表示没有当前妆容
      if (!error.message.includes('404') && !error.message.includes('Not Found')) {
        console.error('获取当前妆容失败:', error);
      }
      setCurrentMakeup(null);
    }
  };

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

  const fetchAppointment = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/makeup-appointment/${headId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAppointment(data);
        // 如果有约妆，自动填充表单数据
        if (data) {
          setFormData(prev => ({
            ...prev,
            makeup_artist_id: data.makeup_artist_id || '',
            makeup_artist_name: data.makeup_artist_name || '',
            makeup_fee: data.makeup_fee || '',
            notes: data.notes || '',
            makeup_date: new Date().toISOString().split('T')[0]
          }));
        }
      } else if (response.status === 404) {
        // 404是正常的，表示没有约妆
        setAppointment(null);
      } else {
        console.error('获取约妆信息失败');
        setAppointment(null);
      }
    } catch (error) {
      // 网络错误等
      console.error('获取约妆信息失败:', error);
      setAppointment(null);
    }
  };

  const handleAppointmentToCurrent = async () => {
    if (!appointment) {
      alert('没有找到约妆信息');
      return;
    }

    try {
      const response = await apiPost(`/api/makeup-appointment/${headId}/to-current`, {
        image_url: formData.image_url,
        makeup_date: formData.makeup_date || new Date().toISOString().split('T')[0]
      });
      
      if (response && response.message) {
        // 刷新数据
        await fetchCurrentMakeup();
        await fetchAppointment();
        setShowSetForm(false);
        resetForm();
        if (onStatusChange) onStatusChange();
        
        alert('成功将约妆转换为当前妆容！');
      }
    } catch (error) {
      console.error('转换失败:', error);
      alert('转换失败：' + (error.message || '请重试'));
    }
  };

  const resetForm = () => {
    setFormData({
      makeup_artist_id: '',
      makeup_artist_name: '',
      makeup_fee: '',
      notes: '',
      makeup_date: '',
      image_url: '',
      from_history_id: ''
    });
  };

  const handleHistorySelect = (historyId) => {
    const history = makeupHistory.find(h => h.id === parseInt(historyId));
    if (history) {
      setFormData({
        makeup_artist_id: history.makeup_artist_id || '',
        makeup_artist_name: history.makeup_artist_name || '',
        makeup_fee: history.makeup_fee || '',
        notes: history.notes || '',
        makeup_date: new Date().toISOString().split('T')[0],
        image_url: history.image_url || '',
        from_history_id: historyId
      });
    }
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
      makeup_artist_id: formData.makeup_artist_id || null,
      from_history_id: selectedTab === 'from_history' ? formData.from_history_id : null
    };

    try {
      await apiPost('/api/current-makeup', submitData);
      fetchCurrentMakeup();
      setShowSetForm(false);
      resetForm();
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error('设置当前妆容失败:', error);
    }
  };

  const handleClearCurrent = async () => {
    if (!window.confirm('确定要清除当前妆容吗？')) return;

    try {
      await apiDelete(`/api/current-makeup/${headId}`);
      setCurrentMakeup(null);
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error('清除当前妆容失败:', error);
    }
  };

  const handleCancel = () => {
    setShowSetForm(false);
    resetForm();
    setSelectedTab('from_history');
  };

  return (
    <div className="current-makeup">
      <div className="current-header">
        <h4>当前妆容</h4>
        {currentMakeup ? (
          <div className="current-actions">
            <button 
              className="change-btn"
              onClick={() => setShowSetForm(true)}
            >
              更换
            </button>
            <button 
              className="clear-btn"
              onClick={handleClearCurrent}
            >
              清除
            </button>
          </div>
        ) : (
          <button 
            className="set-btn"
            onClick={() => setShowSetForm(true)}
          >
            设置妆容
          </button>
        )}
      </div>

      {currentMakeup ? (
        <div className="current-makeup-display">
          <div className="makeup-info">
            <div className="makeup-artist">
              <span className="artist-name">
                {currentMakeup.makeup_artist_name || '未知妆师'}
              </span>
              {currentMakeup.makeup_fee && (
                <span className="makeup-fee">¥{currentMakeup.makeup_fee}</span>
              )}
            </div>
            
            {currentMakeup.makeup_date && (
              <div className="makeup-date">
                上妆日期: {new Date(currentMakeup.makeup_date).toLocaleDateString()}
              </div>
            )}

            {currentMakeup.notes && (
              <CopyableText 
                text={currentMakeup.notes} 
                className="makeup-notes"
                placeholder="暂无备注" 
              />
            )}

            {currentMakeup.from_history_id && (
              <div className="from-history-badge">
                来源于历史记录
              </div>
            )}
          </div>

          {currentMakeup.image_url && (
            <div className="current-image">
              <img src={currentMakeup.image_url} alt="当前妆容" />
            </div>
          )}
        </div>
      ) : (
        <div className="no-current-makeup">
          <div className="empty-icon">✨</div>
          <p>暂无当前妆容，点击"设置妆容"开始吧！</p>
        </div>
      )}

      {showSetForm && (
        <div className="set-makeup-form">
          <div className="form-header">
            <h5>设置当前妆容</h5>
            <div className="tab-buttons">
              <button 
                className={`tab-btn ${selectedTab === 'from_history' ? 'active' : ''}`}
                onClick={() => setSelectedTab('from_history')}
              >
                从历史选择
              </button>
              {appointment && (
                <button 
                  className={`tab-btn ${selectedTab === 'from_appointment' ? 'active' : ''} appointment-tab`}
                  onClick={() => setSelectedTab('from_appointment')}
                >
                  从约妆导入 ⭐
                </button>
              )}
              <button 
                className={`tab-btn ${selectedTab === 'new' ? 'active' : ''}`}
                onClick={() => setSelectedTab('new')}
              >
                新建妆容
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="makeup-form">
            {selectedTab === 'from_history' ? (
              <div className="history-selection">
                {makeupHistory.length === 0 ? (
                  <p className="no-history">还没有历史妆容记录，请先添加历史记录或选择"新建妆容"</p>
                ) : (
                  <>
                    <div className="form-group">
                      <label>选择历史妆容</label>
                      <select
                        value={formData.from_history_id}
                        onChange={(e) => handleHistorySelect(e.target.value)}
                        required
                      >
                        <option value="">选择一个历史妆容记录</option>
                        {makeupHistory.map(history => (
                          <option key={history.id} value={history.id}>
                            {history.makeup_artist_name || history.artist_name || '未知妆师'} 
                            {history.makeup_date && ` - ${new Date(history.makeup_date).toLocaleDateString()}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.from_history_id && (
                      <div className="form-group">
                        <label>应用日期</label>
                        <input
                          type="date"
                          value={formData.makeup_date}
                          onChange={(e) => setFormData({...formData, makeup_date: e.target.value})}
                          required
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : selectedTab === 'from_appointment' ? (
              <div className="appointment-conversion">
                {appointment ? (
                  <>
                    <div className="appointment-preview">
                      <h6>约妆信息</h6>
                      <div className="appointment-details">
                        <div className="detail-row">
                          <span className="label">妆师：</span>
                          <span className="value">{appointment.makeup_artist_name || '未知'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">妆费：</span>
                          <span className="value">¥{appointment.makeup_fee || 0}</span>
                        </div>
                        {appointment.notes && (
                          <div className="detail-row">
                            <span className="label">备注：</span>
                            <span className="value">{appointment.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-group full-width">
                      <label>上妆日期</label>
                      <input
                        type="date"
                        value={formData.makeup_date}
                        onChange={(e) => setFormData({...formData, makeup_date: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>妆容照片（必填）</label>
                      <ImageUpload
                        onImageSelect={(imageUrl) => setFormData({...formData, image_url: imageUrl})}
                        currentImage={formData.image_url}
                        placeholder="请上传妆容照片"
                      />
                    </div>

                    <div className="conversion-note">
                      💡 提示：转换后将自动清除约妆记录
                    </div>
                  </>
                ) : (
                  <p className="no-appointment">没有找到约妆信息</p>
                )}
              </div>
            ) : (
              <div className="new-makeup-form">
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
                      required
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
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={handleCancel} className="cancel-btn">
                取消
              </button>
              <button 
                type={selectedTab === 'from_appointment' ? 'button' : 'submit'}
                onClick={selectedTab === 'from_appointment' ? handleAppointmentToCurrent : undefined}
                className="save-btn"
                disabled={
                  (selectedTab === 'from_history' && (!formData.makeup_date || !formData.from_history_id)) ||
                  (selectedTab === 'from_appointment' && (!formData.makeup_date || !formData.image_url)) ||
                  (selectedTab === 'new' && !formData.makeup_date)
                }
              >
                {selectedTab === 'from_appointment' ? '转换为当前妆容' : '设置为当前妆容'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CurrentMakeup;