import React, { useState, useEffect } from 'react';
import {
  Search,
  Lock,
  Unlock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Crown,
  Eye,
  Trash2,
  Filter,
  CheckCircle,
  AlertTriangle,
  X,
  UserCheck,
  UserX,
  KeyRound,
  Clock,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import Pagination from './Pagination';

const PAGE_SIZE = 15;

export default function UsersView({ onNotify }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subFilter, setSubFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal States
  const [detailUser, setDetailUser] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [proTarget, setProTarget] = useState(null);
  const [proDays, setProDays] = useState(30);
  const [proPlan, setProPlan] = useState('PRO_MONTHLY');

  // USE CASE: BAN USER STATE
  const [banTarget, setBanTarget] = useState(null);
  const [banDurationDays, setBanDurationDays] = useState('30');
  const [banReason, setBanReason] = useState('Vi phạm tiêu chuẩn cộng đồng SmartMeal');

  // USE CASE: MODERATE ACCOUNT STATE
  const [modTarget, setModTarget] = useState(null);
  const [modFullName, setModFullName] = useState('');
  const [modEmailConfirmed, setModEmailConfirmed] = useState(false);
  const [modClearLockout, setModClearLockout] = useState(false);
  const [modPassword, setModPassword] = useState('');
  const [modRole, setModRole] = useState('User');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        pageSize: PAGE_SIZE,
        search,
        role: roleFilter !== 'all' ? roleFilter : '',
        status: statusFilter !== 'all' ? statusFilter : '',
        subscription: subFilter !== 'all' ? subFilter : ''
      };
      const { items, total: count } = await api.getUsers(params);
      setUsers(items);
      setTotal(count);
    } catch (err) {
      onNotify('Lỗi tải danh sách người dùng: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter, statusFilter, subFilter, page]);

  const handleOpenDetail = async (user) => {
    try {
      setLoadingDetail(true);
      setDetailUser(user);
      const fullDetail = await api.getUserDetail(user.id);
      setDetailUser(fullDetail);
    } catch (err) {
      onNotify('Không thể tải chi tiết người dùng: ' + err.message, 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleChangeRole = async (user) => {
    const nextRole = user.role === 'Admin' ? 'User' : 'Admin';
    if (!window.confirm(`Bạn có chắc chắn muốn đổi quyền của "${user.fullName}" thành ${nextRole}?`)) {
      return;
    }
    try {
      await api.updateUserRole(user.id, nextRole);
      onNotify(`Đã đổi vai trò thành ${nextRole} thành công!`, 'success');
      loadUsers();
    } catch (err) {
      onNotify('Đổi vai trò thất bại: ' + err.message, 'error');
    }
  };

  const handleGrantPro = async () => {
    if (!proTarget) return;
    try {
      await api.updateUserSubscription(proTarget.id, true, proPlan, Number(proDays));
      onNotify(`Đã cấp thành công gói Pro (${proDays} ngày) cho ${proTarget.fullName}!`, 'success');
      setProTarget(null);
      loadUsers();
    } catch (err) {
      onNotify('Cấp gói Pro thất bại: ' + err.message, 'error');
    }
  };

  const handleRevokePro = async (user) => {
    if (!window.confirm(`Hủy quyền Pro của người dùng "${user.fullName}" về tài khoản Miễn phí?`)) {
      return;
    }
    try {
      await api.updateUserSubscription(user.id, false);
      onNotify('Đã hủy gói Pro thành công!', 'success');
      loadUsers();
    } catch (err) {
      onNotify('Hủy Pro thất bại: ' + err.message, 'error');
    }
  };

  const handleOpenBanModal = (user) => {
    setBanTarget(user);
    setBanDurationDays('30');
    setBanReason('Vi phạm tiêu chuẩn cộng đồng SmartMeal');
  };

  const handleExecuteBan = async (isBanned) => {
    if (!banTarget) return;
    try {
      const days = banDurationDays === 'permanent' ? null : parseInt(banDurationDays);
      await api.banUser(banTarget.id, isBanned, banReason, days);
      onNotify(isBanned ? `Đã cấm tài khoản ${banTarget.fullName} thành công.` : `Đã gỡ cấm tài khoản ${banTarget.fullName}.`, 'success');
      setBanTarget(null);
      loadUsers();
    } catch (err) {
      onNotify('Thao tác cấm người dùng thất bại: ' + err.message, 'error');
    }
  };

  const handleOpenModerateModal = (user) => {
    setModTarget(user);
    setModFullName(user.fullName || '');
    setModEmailConfirmed(true);
    // Tài khoản đang bị cấm: không mặc định gỡ khóa — chỉ sửa tên/email mà vô tình bỏ lệnh cấm.
    setModClearLockout(!user.isLocked);
    setModPassword('');
    setModRole(user.role || 'User');
  };

  const handleExecuteModerate = async () => {
    if (!modTarget) return;
    try {
      const payload = {
        fullName: modFullName.trim() || modTarget.fullName,
        isEmailVerified: modEmailConfirmed,
        clearLockout: modClearLockout,
        role: modRole,
        resetPassword: modPassword.trim() ? modPassword.trim() : null
      };
      await api.moderateAccount(modTarget.id, payload);
      onNotify(`Đã kiểm duyệt và cập nhật tài khoản ${modTarget.email} thành công!`, 'success');
      setModTarget(null);
      loadUsers();
    } catch (err) {
      onNotify('Kiểm duyệt tài khoản thất bại: ' + err.message, 'error');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${user.email}"? Thao tác này không thể hoàn tác!`)) {
      return;
    }
    try {
      await api.deleteUser(user.id);
      onNotify('Đã xóa người dùng thành công.', 'success');
      loadUsers();
    } catch (err) {
      onNotify('Xóa người dùng thất bại: ' + err.message, 'error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div>
      {/* Filter & Search Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            className="form-input"
            placeholder="Tìm theo email, họ tên..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className="filter-actions">
          <select
            className="form-select"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            style={{ width: '130px' }}
          >
            <option value="all">Mọi vai trò</option>
            <option value="User">Thành viên</option>
            <option value="Admin">Quản trị viên</option>
          </select>

          <select
            className="form-select"
            value={subFilter}
            onChange={(e) => { setSubFilter(e.target.value); setPage(1); }}
            style={{ width: '140px' }}
          >
            <option value="all">Mọi gói cước</option>
            <option value="premium">Gói Pro VIP</option>
            <option value="free">Gói Miễn phí</option>
            <option value="expired">Đã hết hạn Pro</option>
          </select>

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ width: '140px' }}
          >
            <option value="all">Mọi trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Bị khóa</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Gói Pro</th>
                <th>Hạn Pro</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                    Không tìm thấy người dùng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: 'var(--radius-full)',
                            background: u.role === 'Admin' ? 'linear-gradient(135deg, #10b981, #06b6d4)' : '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: 'white',
                            flexShrink: 0
                          }}
                        >
                          {u.fullName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.fullName || 'Người dùng'}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <button
                        onClick={() => handleChangeRole(u)}
                        className={`badge ${u.role === 'Admin' ? 'badge-info' : 'badge-free'}`}
                        style={{ border: 'none', cursor: 'pointer' }}
                        title="Bấm để đổi quyền"
                      >
                        {u.role === 'Admin' ? '★ Quản trị (Admin)' : 'Người dùng'}
                      </button>
                    </td>

                    <td>
                      {u.isPro ? (
                        <span className="badge badge-pro">
                          <Crown size={12} /> Pro VIP
                        </span>
                      ) : (
                        <span className="badge badge-free">Free</span>
                      )}
                    </td>

                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {formatDate(u.proExpiresAt)}
                    </td>

                    <td>
                      {u.isLocked ? (
                        <span className="badge badge-danger">
                          <Lock size={12} /> Đang bị khóa
                        </span>
                      ) : (
                        <span className="badge badge-success">
                          <CheckCircle size={12} /> Hoạt động
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {/* Chi tiết */}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenDetail(u)}
                          title="Xem chi tiết & Hồ sơ sức khỏe"
                        >
                          <Eye size={14} />
                        </button>

                        {/* USE CASE: Moderate Account */}
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.3)' }}
                          onClick={() => handleOpenModerateModal(u)}
                          title="Kiểm duyệt tài khoản (Moderate Account)"
                        >
                          <UserCheck size={14} />
                        </button>

                        {/* USE CASE: Ban User */}
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: u.isLocked ? '#34d399' : '#f87171', borderColor: u.isLocked ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)' }}
                          onClick={() => handleOpenBanModal(u)}
                          title={u.isLocked ? 'Quản lý cấm / Mở cấm (Unban)' : 'Cấm tài khoản (Ban User)'}
                        >
                          {u.isLocked ? <Unlock size={14} /> : <UserX size={14} />}
                        </button>

                        {/* Cấp Pro */}
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#fbbf24' }}
                          onClick={() => setProTarget(u)}
                          title="Cấp / Gia hạn gói Pro"
                        >
                          <Crown size={14} />
                        </button>

                        {/* Xóa */}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteUser(u)}
                          title="Xóa người dùng"
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

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} itemLabel="người dùng" />
      </div>

      {/* Modal: Chi tiết người dùng */}
      {detailUser && (
        <div className="modal-overlay" onClick={() => setDetailUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Hồ Sơ Chi Tiết: {detailUser.fullName}</h3>
              <button className="btn-close" onClick={() => setDetailUser(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {loadingDetail ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Đang tải thông tin chi tiết...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Account Basics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', background: 'rgba(15,23,42,0.6)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Email:</span>
                      <div style={{ fontWeight: 600 }}>{detailUser.email}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Vai trò:</span>
                      <div style={{ fontWeight: 600 }}>{detailUser.role}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Gói hiện tại:</span>
                      <div style={{ fontWeight: 600, color: detailUser.isPro ? '#fbbf24' : 'var(--text-main)' }}>
                        {detailUser.isPro ? 'Pro VIP' : 'Miễn phí'} {detailUser.proExpiresAt ? `(Hết hạn: ${formatDate(detailUser.proExpiresAt)})` : ''}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Ngày đăng ký:</span>
                      <div>{formatDate(detailUser.createdAt)}</div>
                    </div>
                  </div>

                  {/* Health Profile */}
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '10px', color: 'var(--primary)' }}>
                      Hồ Sơ Sức Khỏe & Dinh Dưỡng
                    </h4>
                    {detailUser.healthProfile ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: 'rgba(15,23,42,0.6)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Giới tính / Tuổi:</span>
                          <div style={{ fontWeight: 600 }}>{detailUser.healthProfile.gender === 'Male' ? 'Nam' : 'Nữ'} / {detailUser.healthProfile.age || '—'} tuổi</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Chiều cao / Cân nặng:</span>
                          <div style={{ fontWeight: 600 }}>{detailUser.healthProfile.heightCm || '—'} cm / {detailUser.healthProfile.currentWeightKg || '—'} kg</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Mục tiêu calo/ngày:</span>
                          <div style={{ fontWeight: 600, color: '#34d399' }}>{detailUser.healthProfile.targetCalories ? `${Math.round(detailUser.healthProfile.targetCalories)} kcal` : '—'}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Cân nặng mục tiêu:</span>
                          <div style={{ fontWeight: 600 }}>{detailUser.healthProfile.targetWeightKg ? `${detailUser.healthProfile.targetWeightKg} kg` : '—'}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Mục đích:</span>
                          <div style={{ fontWeight: 600 }}>{detailUser.healthProfile.goal || 'Duy trì sức khỏe'}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Mức độ vận động:</span>
                          <div style={{ fontWeight: 600 }}>{detailUser.healthProfile.activityLevel || 'Trung bình'}</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.86rem', fontStyle: 'italic' }}>
                        Người dùng chưa hoàn thiện hồ sơ sức khỏe.
                      </div>
                    )}
                  </div>

                  {/* App Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ background: 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{detailUser.favoritesCount || 0}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Món yêu thích</div>
                    </div>
                    <div style={{ background: 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#60a5fa' }}>{detailUser.diariesCount || 0}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Nhật ký ăn uống</div>
                    </div>
                    <div style={{ background: 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{detailUser.mealPlansCount || 0}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Kế hoạch bữa ăn</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetailUser(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cấp Gói Pro VIP */}
      {proTarget && (
        <div className="modal-overlay" onClick={() => setProTarget(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crown size={20} style={{ color: '#fbbf24' }} />
                <span>Cấp Quyền Pro VIP Cho Khách Hàng</span>
              </h3>
              <button className="btn-close" onClick={() => setProTarget(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Khách hàng:</span>
                <div style={{ fontWeight: 600 }}>{proTarget.fullName} ({proTarget.email})</div>
              </div>

              <div className="form-group">
                <label className="form-label">Chọn Gói Cước:</label>
                <select
                  className="form-select"
                  value={proPlan}
                  onChange={(e) => {
                    setProPlan(e.target.value);
                    setProDays(e.target.value === 'PRO_YEARLY' ? 365 : 30);
                  }}
                >
                  <option value="PRO_MONTHLY">Gói Tháng (Pro Monthly - 30 Ngày)</option>
                  <option value="PRO_YEARLY">Gói Năm (Pro Yearly - 365 Ngày)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Thời Hạn Kích Hoạt (Số ngày):</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="3650"
                  value={proDays}
                  onChange={(e) => setProDays(e.target.value)}
                />
              </div>

              {proTarget.isPro && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.82rem', color: '#fca5a5', marginBottom: '6px' }}>
                    Người dùng hiện đang có gói Pro (Hạn đến: {formatDate(proTarget.proExpiresAt)}).
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ width: '100%' }}
                    onClick={() => {
                      handleRevokePro(proTarget);
                      setProTarget(null);
                    }}
                  >
                    Hủy Gói Pro Ngay Lập Tức
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setProTarget(null)}>
                Đóng
              </button>
              <button className="btn btn-primary" onClick={handleGrantPro}>
                Xác Nhận Kích Hoạt Pro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USE CASE: MODAL BAN USER */}
      {banTarget && (
        <div className="modal-overlay" onClick={() => setBanTarget(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} style={{ color: '#ef4444' }} />
                <span>Quản Lý Cấm / Ban Người Dùng</span>
              </h3>
              <button className="btn-close" onClick={() => setBanTarget(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Tài khoản đối tượng:</div>
                <div style={{ fontWeight: 600, fontSize: '0.98rem', marginTop: '2px' }}>
                  {banTarget.fullName}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>{banTarget.email}</div>
              </div>

              {banTarget.isLocked ? (
                <div>
                  <div style={{ padding: '14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                    <div style={{ fontWeight: 600, color: '#fca5a5', marginBottom: '4px' }}>
                      Tài khoản này hiện đang bị cấm!
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Tài khoản bị hạn chế đăng nhập và sử dụng dịch vụ trên thiết bị di động.
                    </div>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Bạn có muốn gỡ bỏ trạng thái cấm và khôi phục quyền truy cập cho người dùng này không?
                  </p>
                </div>
              ) : (
                <div>
                  <div className="form-group">
                    <label className="form-label">Thời Hạn Cấm (Ban Duration):</label>
                    <select
                      className="form-select"
                      value={banDurationDays}
                      onChange={(e) => setBanDurationDays(e.target.value)}
                    >
                      <option value="1">1 Ngày (Cảnh cáo nhẹ)</option>
                      <option value="7">7 Ngày (Tạm đình chỉ 1 tuần)</option>
                      <option value="30">30 Ngày (Đình chỉ 1 tháng)</option>
                      <option value="90">90 Ngày (Vi phạm nghiêm trọng)</option>
                      <option value="365">1 Năm</option>
                      <option value="permanent">Vĩnh Viễn (Khóa hoàn toàn tài khoản)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Lý Do Cấm (Ban Reason):</label>
                    <textarea
                      className="form-input"
                      rows="3"
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Nhập lý do chi tiết (VD: Sử dụng ngôn từ thô tục, gian lận số liệu, spam...)"
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ padding: '10px 12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: '#fcd34d' }}>
                    <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                    Người dùng sẽ bị thu hồi token ngay lập tức và không thể truy cập SmartMeal.
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setBanTarget(null)}>
                Đóng
              </button>
              {banTarget.isLocked ? (
                <button className="btn btn-primary" onClick={() => handleExecuteBan(false)}>
                  Xác Nhận Mở Cấm (Unban)
                </button>
              ) : (
                <button className="btn btn-danger" onClick={() => handleExecuteBan(true)}>
                  Xác Nhận Ban Tài Khoản
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* USE CASE: MODAL MODERATE ACCOUNT */}
      {modTarget && (
        <div className="modal-overlay" onClick={() => setModTarget(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={20} style={{ color: '#06b6d4' }} />
                <span>Kiểm Duyệt Tài Khoản (Moderate Account)</span>
              </h3>
              <button className="btn-close" onClick={() => setModTarget(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Email tài khoản:</div>
                <div style={{ fontWeight: 600 }}>{modTarget.email}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Sửa Đổi Họ & Tên (Kiểm duyệt tên thô tục/spam):</label>
                <input
                  type="text"
                  className="form-input"
                  value={modFullName}
                  onChange={(e) => setModFullName(e.target.value)}
                  placeholder="Nhập tên hợp lệ..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vai Trò Hệ Thống (Role):</label>
                <select
                  className="form-select"
                  value={modRole}
                  onChange={(e) => setModRole(e.target.value)}
                >
                  <option value="User">Người Dùng Tiêu Chuẩn (User)</option>
                  <option value="Admin">Quản Trị Viên Toàn Quyền (Admin)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Đặt Lại Mật Khẩu Mới (Reset Password):</label>
                <input
                  type="password"
                  className="form-input"
                  value={modPassword}
                  onChange={(e) => setModPassword(e.target.value)}
                  placeholder="Để trống nếu không muốn đổi mật khẩu"
                />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                  Nếu người dùng quên hoặc bị xâm phạm, nhập mật khẩu mới tại đây để cấp lại ngay.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px', padding: '12px', background: 'rgba(6, 182, 212, 0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={modEmailConfirmed}
                    onChange={(e) => setModEmailConfirmed(e.target.checked)}
                  />
                  <span>Đánh dấu Email đã xác thực (Verified)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={modClearLockout}
                    onChange={(e) => setModClearLockout(e.target.checked)}
                  />
                  <span>Xóa số lần đăng nhập sai (Reset Brute-force Counter & Lockout)</span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModTarget(null)}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={handleExecuteModerate}>
                Lưu Thay Đổi Kiểm Duyệt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

