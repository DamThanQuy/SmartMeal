import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Award,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Users,
  Flame,
  X,
  Gift,
  Search,
  Clock,
  Target
} from 'lucide-react';
import { api } from '../services/api';

export default function RewardsView({ onNotify }) {
  const [activeTab, setActiveTab] = useState('challenges'); // 'challenges' | 'badges' | 'xp'
  const [challenges, setChallenges] = useState([]);
  const [badges, setBadges] = useState([]);
  const [xpEvents, setXpEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Challenge
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    category: 'EatClean',
    durationDays: 7,
    targetValuePerDay: 3,
    rewardExp: 150,
    rewardBadge: 'Clean Eater',
    isActive: true
  });

  // Grant XP Form State
  const [grantUserId, setGrantUserId] = useState('');
  const [grantXpAmount, setGrantXpAmount] = useState(100);
  const [grantReason, setGrantReason] = useState('Admin thưởng sự kiện chuyên cần');
  const [grantLoading, setGrantLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [chData, bdData, xpData, userPage] = await Promise.all([
        api.getChallenges(),
        api.getBadges(),
        api.getXpEvents(),
        api.getUsers({ pageSize: 50 })
      ]);
      const uData = userPage?.items || [];
      setChallenges(chData);
      setBadges(bdData);
      setXpEvents(xpData);
      setUsers(uData);
      if (uData.length > 0 && !grantUserId) {
        setGrantUserId(uData[0].id);
      }
    } catch (err) {
      onNotify('Lỗi tải dữ liệu phần thưởng: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateChallenge = () => {
    setEditingChallenge(null);
    setChallengeForm({
      title: '',
      description: '',
      category: 'EatClean',
      durationDays: 7,
      targetValuePerDay: 3,
      rewardExp: 150,
      rewardBadge: 'Clean Eater',
      isActive: true
    });
    setShowChallengeModal(true);
  };

  const handleOpenEditChallenge = (ch) => {
    setEditingChallenge(ch);
    setChallengeForm({
      title: ch.title,
      description: ch.description,
      category: ch.category,
      durationDays: ch.durationDays,
      targetValuePerDay: ch.targetValuePerDay,
      rewardExp: ch.rewardExp,
      rewardBadge: ch.rewardBadge,
      isActive: ch.isActive
    });
    setShowChallengeModal(true);
  };

  const handleSaveChallenge = async (e) => {
    e.preventDefault();
    if (!challengeForm.title.trim()) {
      onNotify('Vui lòng nhập tiêu đề thử thách.', 'error');
      return;
    }
    try {
      if (editingChallenge) {
        await api.updateChallenge(editingChallenge.id, challengeForm);
        onNotify('Đã cập nhật thử thách thành công!', 'success');
      } else {
        await api.createChallenge(challengeForm);
        onNotify('Đã tạo thử thách mới thành công!', 'success');
      }
      setShowChallengeModal(false);
      const updated = await api.getChallenges();
      setChallenges(updated);
    } catch (err) {
      onNotify('Lưu thử thách thất bại: ' + err.message, 'error');
    }
  };

  const handleDeleteChallenge = async (id, title) => {
    if (!window.confirm(`Bạn có chắc muốn xóa thử thách "${title}"?`)) return;
    try {
      await api.deleteChallenge(id);
      onNotify('Đã xóa thử thách.', 'success');
      setChallenges(challenges.filter((c) => c.id !== id));
    } catch (err) {
      onNotify('Xóa thử thách thất bại: ' + err.message, 'error');
    }
  };

  const handleGrantXp = async (e) => {
    e.preventDefault();
    if (!grantUserId) {
      onNotify('Vui lòng chọn người dùng nhận XP.', 'error');
      return;
    }
    try {
      setGrantLoading(true);
      await api.grantXp(grantUserId, Number(grantXpAmount), grantReason);
      onNotify(`Đã tặng thành công +${grantXpAmount} XP cho người dùng!`, 'success');
      const updatedXp = await api.getXpEvents();
      setXpEvents(updatedXp);
    } catch (err) {
      onNotify('Tặng điểm XP thất bại: ' + err.message, 'error');
    } finally {
      setGrantLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="view-container">
      {/* Top Banner / Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={26} style={{ color: '#f59e0b' }} />
            <span>Quản Lý Hệ Thống Phần Thưởng (Reward System)</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Quản trị các Thử thách rèn luyện sức khỏe, Huy hiệu thành tích và Điểm kinh nghiệm (XP) cho thú cưng ảo.
          </p>
        </div>

        {activeTab === 'challenges' && (
          <button className="btn btn-primary" onClick={handleOpenCreateChallenge}>
            <Plus size={16} />
            <span>Thêm Thử Thách Mới</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-glass)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('challenges')}
          className={`nav-tab-btn ${activeTab === 'challenges' ? 'active' : ''}`}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'challenges' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'challenges' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Target size={16} />
          <span>Thử Thách Sức Khỏe ({challenges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('badges')}
          className={`nav-tab-btn ${activeTab === 'badges' ? 'active' : ''}`}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'badges' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'badges' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Award size={16} />
          <span>Huy Hiệu Hệ Thống ({badges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('xp')}
          className={`nav-tab-btn ${activeTab === 'xp' ? 'active' : ''}`}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'xp' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'xp' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Sparkles size={16} />
          <span>Tặng Điểm XP & Lịch Sử Sự Kiện</span>
        </button>
      </div>

      {/* TAB 1: CHALLENGES */}
      {activeTab === 'challenges' && (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tên thử thách & Mô tả</th>
                  <th>Danh mục</th>
                  <th>Thời hạn</th>
                  <th>Mục tiêu/Ngày</th>
                  <th>Thưởng XP & Huy hiệu</th>
                  <th>Tham gia / Hoàn thành</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      Đang tải danh sách thử thách...
                    </td>
                  </tr>
                ) : challenges.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                      Chưa có thử thách nào. Hãy tạo thử thách đầu tiên!
                    </td>
                  </tr>
                ) : (
                  challenges.map((ch) => (
                    <tr key={ch.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{ch.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ch.description || 'Không có mô tả'}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info">{ch.category}</span>
                      </td>
                      <td style={{ fontSize: '0.88rem' }}>{ch.durationDays} ngày</td>
                      <td style={{ fontSize: '0.88rem' }}>{ch.targetValuePerDay} lần/ngày</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="badge badge-warning">+{ch.rewardExp} XP</span>
                          {ch.rewardBadge && (
                            <span className="badge badge-pro" style={{ fontSize: '0.72rem' }}>
                              <Award size={10} /> {ch.rewardBadge}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 600, color: '#38bdf8' }}>{ch.participantCount}</span> người tham gia
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {ch.completedCount} đã hoàn thành
                        </div>
                      </td>
                      <td>
                        {ch.isActive ? (
                          <span className="badge badge-success">
                            <CheckCircle size={12} /> Đang mở
                          </span>
                        ) : (
                          <span className="badge badge-danger">Đã đóng</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEditChallenge(ch)}
                            title="Chỉnh sửa thử thách"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteChallenge(ch.id, ch.title)}
                            title="Xóa thử thách"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BADGES */}
      {activeTab === 'badges' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {badges.map((b) => (
            <div key={b.badgeId} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Award size={24} />
                </div>
                <span className="badge badge-info">{b.category || 'Thành Tích'}</span>
              </div>

              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  {b.name}
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {b.description}
                </p>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Đã mở khóa:</span>
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>{b.unlockedCount} người dùng</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: GRANT XP & XP EVENTS */}
      {activeTab === 'xp' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '24px' }}>
          {/* Form Grant XP */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Gift size={20} style={{ color: 'var(--primary)' }} />
              <span>Tặng Điểm Thưởng XP Cho Thú Cưng</span>
            </h3>

            <form onSubmit={handleGrantXp}>
              <div className="form-group">
                <label className="form-label">Chọn Người Dùng Nhận Thưởng:</label>
                <select
                  className="form-select"
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  required
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Số Điểm Thưởng (XP):</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="10000"
                  value={grantXpAmount}
                  onChange={(e) => setGrantXpAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lý Do Trao Thưởng:</label>
                <input
                  type="text"
                  className="form-input"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="VD: Tham gia sự kiện ăn uống lành mạnh, chuyên cần 30 ngày..."
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '8px' }}
                disabled={grantLoading}
              >
                <Sparkles size={16} />
                <span>{grantLoading ? 'Đang gửi...' : 'Xác Nhận Tặng XP'}</span>
              </button>
            </form>
          </div>

          {/* Recent XP Events */}
          <div className="card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontWeight: 600, fontSize: '0.98rem' }}>Nhật Ký Tặng & Nhận XP Gần Đây</h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{xpEvents.length} sự kiện</span>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Người dùng</th>
                    <th>Loại sự kiện</th>
                    <th>Điểm XP</th>
                  </tr>
                </thead>
                <tbody>
                  {xpEvents.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                        Chưa có lịch sử nhận XP nào.
                      </td>
                    </tr>
                  ) : (
                    xpEvents.slice(0, 15).map((ev) => (
                      <tr key={ev.id}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(ev.createdAt)}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{ev.userFullName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{ev.userEmail}</div>
                        </td>
                        <td>
                          <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>{ev.kind}</span>
                        </td>
                        <td>
                          <span className="badge badge-warning" style={{ fontWeight: 700 }}>+{ev.xp} XP</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREATE / EDIT CHALLENGE */}
      {showChallengeModal && (
        <div className="modal-overlay" onClick={() => setShowChallengeModal(false)}>
          <div className="modal-content" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingChallenge ? 'Chỉnh Sửa Thử Thách' : 'Tạo Thử Thách Sức Khỏe Mới'}
              </h3>
              <button className="btn-close" onClick={() => setShowChallengeModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveChallenge}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tiêu Đề Thử Thách (*):</label>
                  <input
                    type="text"
                    className="form-input"
                    value={challengeForm.title}
                    onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })}
                    placeholder="VD: 7 Ngày Ăn Sạch Sống Xanh, 2 Lít Nước Mỗi Ngày..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mô Tả Chi Tiết:</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    value={challengeForm.description}
                    onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })}
                    placeholder="Mô tả mục tiêu và hướng dẫn người dùng hoàn thành thử thách..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Danh Mục:</label>
                    <select
                      className="form-select"
                      value={challengeForm.category}
                      onChange={(e) => setChallengeForm({ ...challengeForm, category: e.target.value })}
                    >
                      {/* Chỉ các loại app chấm được tiến độ mỗi ngày (backend: ChallengeCategories). */}
                      <option value="EatClean">Ăn Sạch — số nhóm bữa ghi mỗi ngày</option>
                      <option value="DrinkWater">Uống Nước — ml mỗi ngày</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Thời Hạn (Số ngày):</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      max="365"
                      value={challengeForm.durationDays}
                      onChange={(e) => setChallengeForm({ ...challengeForm, durationDays: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Mục Tiêu Mỗi Ngày (Lần/Lít):</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      value={challengeForm.targetValuePerDay}
                      onChange={(e) => setChallengeForm({ ...challengeForm, targetValuePerDay: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phần Thưởng Kinh Nghiệm (XP):</label>
                    <input
                      type="number"
                      className="form-input"
                      min="10"
                      step="10"
                      value={challengeForm.rewardExp}
                      onChange={(e) => setChallengeForm({ ...challengeForm, rewardExp: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tên Huy Hiệu Trao Thưởng Khi Hoàn Thành:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={challengeForm.rewardBadge}
                    onChange={(e) => setChallengeForm({ ...challengeForm, rewardBadge: e.target.value })}
                    placeholder="VD: Master Eater, Water Champion..."
                  />
                </div>

                <div className="form-group" style={{ marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={challengeForm.isActive}
                      onChange={(e) => setChallengeForm({ ...challengeForm, isActive: e.target.checked })}
                    />
                    <span style={{ fontSize: '0.9rem' }}>Mở thử thách cho toàn bộ người dùng tham gia ngay</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowChallengeModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingChallenge ? 'Lưu Cập Nhật' : 'Tạo Thử Thách'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
