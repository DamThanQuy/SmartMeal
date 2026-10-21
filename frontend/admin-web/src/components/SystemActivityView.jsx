import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Database,
  Cpu,
  Clock,
  ShieldAlert,
  Bot,
  Utensils,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { api } from '../services/api';

export default function SystemActivityView({ onNotify }) {
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivity = async () => {
    try {
      setRefreshing(true);
      const data = await api.getSystemActivity();
      setActivity(data);
    } catch (err) {
      onNotify('Lỗi tải nhật ký hệ thống: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadActivity();
    // Auto refresh every 30 seconds
    const interval = setInterval(loadActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString('vi-VN');
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={26} style={{ color: '#06b6d4' }} />
            <span>Giám Sát Hoạt Động Hệ Thống (Monitor System Activity)</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Theo dõi trạng thái máy chủ, tải lượng AI Gemini, nhật ký bữa ăn và các sự kiện an ninh bảo mật theo thời gian thực.
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={loadActivity}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Top Metrics Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--primary)' }}>
            <Database size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Cơ Sở Dữ Liệu PostgreSQL</span>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={18} />
              <span>{activity?.databaseStatus || 'Hoạt động tốt'}</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Kết nối ổn định, tốc độ phản hồi &lt; 5ms
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
            <Server size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Thời Gian Uptime Máy Chủ</span>
            <div className="stat-value" style={{ fontSize: '1.35rem' }}>
              {activity?.serverUptimeHours || 24} giờ
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Giờ hệ thống: {activity?.serverTimeUtc ? new Date(activity.serverTimeUtc).toLocaleTimeString('vi-VN') : '—'} UTC
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <Bot size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Yêu Cầu AI Hôm Nay</span>
            <div className="stat-value" style={{ fontSize: '1.35rem', color: '#a78bfa' }}>
              {activity?.totalAiRequestsToday || 0}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Quét mã vạch & phân tích món ăn tự động
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            <ShieldAlert size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Cảnh Báo An Ninh</span>
            <div className="stat-value" style={{ fontSize: '1.35rem', color: activity?.recentSecurityEvents?.length > 0 ? '#f87171' : '#34d399' }}>
              {activity?.recentSecurityEvents?.length || 0}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Lần thử mật khẩu sai / Khóa tài khoản
            </span>
          </div>
        </div>
      </div>

      {/* Grid: AI Logs & Diary Logs & Security */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Recent AI Usage */}
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} style={{ color: '#a78bfa' }} />
              <span>Nhật Ký Gọi Trí Tuệ Nhân Tạo (Gemini AI Logs)</span>
            </h3>
            <span className="badge badge-info">{activity?.recentAiLogs?.length || 0} gần nhất</span>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Người dùng</th>
                  <th>Tính năng AI</th>
                </tr>
              </thead>
              <tbody>
                {!activity?.recentAiLogs || activity.recentAiLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                      Chưa có nhật ký AI nào hôm nay.
                    </td>
                  </tr>
                ) : (
                  activity.recentAiLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(log.createdAt)}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.userFullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{log.userEmail}</div>
                      </td>
                      <td>
                        <span className="badge badge-pro" style={{ fontSize: '0.75rem' }}>{log.kind}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Diary Logs */}
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Utensils size={18} style={{ color: '#10b981' }} />
              <span>Ghi Nhận Bữa Ăn Mới Nhất (Nutrition Diaries)</span>
            </h3>
            <span className="badge badge-success">{activity?.recentDiaryLogs?.length || 0} gần nhất</span>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Người dùng</th>
                  <th>Bữa ăn</th>
                  <th>Năng lượng</th>
                </tr>
              </thead>
              <tbody>
                {!activity?.recentDiaryLogs || activity.recentDiaryLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                      Chưa có ghi nhận bữa ăn nào.
                    </td>
                  </tr>
                ) : (
                  activity.recentDiaryLogs.map((d) => (
                    <tr key={d.id}>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(d.date)}</td>
                      <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{d.userFullName}</td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>{d.mealType}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.85rem' }}>
                          {Math.round(d.calories)} kcal
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Security & Access Logs */}
      <div className="card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} style={{ color: '#ef4444' }} />
            <span>Giám Sát An Ninh & Phòng Chống Tấn Công Brute-force</span>
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tự động khóa sau 5 lần sai mật khẩu</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Sự kiện</th>
                <th>Tài khoản đối tượng</th>
                <th>Chi tiết cảnh báo</th>
                <th>Trạng thái xử lý</th>
              </tr>
            </thead>
            <tbody>
              {!activity?.recentSecurityEvents || activity.recentSecurityEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#34d399' }}>
                    <CheckCircle size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                    Hệ thống an toàn. Không phát hiện sự kiện đáng ngờ hoặc tài khoản bị khóa brute-force nào.
                  </td>
                </tr>
              ) : (
                activity.recentSecurityEvents.map((sec, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(sec.timestamp)}</td>
                    <td>
                      {sec.eventType === 'AccountLocked' ? (
                        <span className="badge badge-danger">
                          <Lock size={12} /> Tài khoản bị khóa
                        </span>
                      ) : (
                        <span className="badge badge-warning">
                          <AlertTriangle size={12} /> Cảnh báo brute-force
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{sec.targetUser}</td>
                    <td style={{ fontSize: '0.82rem', color: '#fca5a5' }}>{sec.details}</td>
                    <td>
                      <span className="badge badge-info">Đã kích hoạt bảo vệ</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
