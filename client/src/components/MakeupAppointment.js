import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import CopyableText from './CopyableText';
import './MakeupAppointment.css';

const MakeupAppointment = ({ headId, onStatusChange }) => {
  const [appointment, setAppointment] = useState(null);
  const [makeupArtists, setMakeupArtists] = useState([]);
  const [showSetForm, setShowSetForm] = useState(false);

  const [formData, setFormData] = useState({
    makeup_artist_id: '',
    makeup_artist_name: '',
    makeup_fee: '',
    notes: '',
    expected_arrival: ''
  });

  useEffect(() => {
    if (headId) {
      fetchAppointment();
      fetchMakeupArtists();
    }
  }, [headId]);

  const fetchAppointment = async () => {
    try {
      const data = await apiGet(`/api/makeup-appointment/${headId}`);
      setAppointment(data);
    } catch (error) {
      console.error('获取约妆信息失败:', error);
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

  const resetForm = () => {
    setFormData({
      makeup_artist_id: '',
      makeup_artist_name: '',
      makeup_fee: '',
      notes: '',
      expected_arrival: ''
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
      await apiPost('/api/makeup-appointment', submitData);
      fetchAppointment();
      setShowSetForm(false);
      resetForm();
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error('设置约妆失败:', error);
    }
  };

  const handleCancelAppointment = async () => {
    if (!window.confirm('确定要取消约妆吗？')) return;

    try {
      await apiDelete(`/api/makeup-appointment/${headId}`);
      setAppointment(null);
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error('取消约妆失败:', error);
    }
  };

  const handleEditAppointment = () => {
    if (appointment) {
      setFormData({
        makeup_artist_id: appointment.makeup_artist_id || '',
        makeup_artist_name: appointment.makeup_artist_name || '',
        makeup_fee: appointment.makeup_fee || '',
        notes: appointment.notes || '',
        expected_arrival: appointment.expected_arrival ? 
          new Date(appointment.expected_arrival).toISOString().slice(0, 16) : ''
      });
      setShowSetForm(true);
    }
  };

  const handleCancel = () => {
    setShowSetForm(false);
    resetForm();
  };

  const isOverdue = (expectedArrival) => {
    return new Date(expectedArrival) < new Date();
  };

  return (
    <div className="makeup-appointment">
      <div className="appointment-header">
        <h4>约妆状态</h4>
        {appointment ? (
          <div className="appointment-actions">
            <button 
              className="edit-appointment-btn"
              onClick={handleEditAppointment}
            >
              编辑
            </button>
            <button 
              className="cancel-appointment-btn"
              onClick={handleCancelAppointment}
            >
              取消约妆
            </button>
          </div>
        ) : (
          <button 
            className="set-appointment-btn"
            onClick={() => setShowSetForm(true)}
          >
            设置约妆
          </button>
        )}
      </div>

      {appointment ? (
        <div className={`appointment-display ${isOverdue(appointment.expected_arrival) ? 'overdue' : ''}`}>
          <div className="appointment-status">
            {isOverdue(appointment.expected_arrival) ? (
              <span className="status-badge overdue-badge">已逾期</span>
            ) : (
              <span className="status-badge active-badge">约妆中</span>
            )}
          </div>

          <div className="appointment-info">
            <div className="appointment-artist">
              <span className="artist-name">
                {appointment.makeup_artist_name || appointment.artist_name || '未知妆师'}
              </span>
              {appointment.makeup_fee && (
                <span className="makeup-fee">¥{appointment.makeup_fee}</span>
              )}
            </div>
            
            {appointment.expected_arrival && (
              <div className="expected-arrival">
                预计到达时间: {new Date(appointment.expected_arrival).toLocaleString()}
              </div>
            )}

            {appointment.notes && (
              <CopyableText 
                text={appointment.notes} 
                className="appointment-notes"
                placeholder="暂无备注" 
              />
            )}

            <div className="appointment-date">
              约妆时间: {new Date(appointment.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      ) : (
        <div className="no-appointment">
          <div className="empty-icon">⏰</div>
          <p>暂无约妆安排，点击"设置约妆"开始预约吧！</p>
        </div>
      )}

      {showSetForm && (
        <div className="appointment-form">
          <h5>{appointment ? '编辑约妆信息' : '设置约妆信息'}</h5>
          
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
                <label>预估妆费</label>
                <input
                  type="number"
                  placeholder="预估妆费"
                  value={formData.makeup_fee}
                  onChange={(e) => setFormData({...formData, makeup_fee: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>预计到达时间</label>
                <input
                  type="datetime-local"
                  value={formData.expected_arrival}
                  onChange={(e) => setFormData({...formData, expected_arrival: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>备注</label>
              <textarea
                placeholder="特殊要求、联系方式等..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleCancel} className="cancel-btn">
                取消
              </button>
              <button type="submit" className="save-btn">
                {appointment ? '更新约妆' : '设置约妆'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MakeupAppointment;