import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  Activity,
  Flame,
  Droplets,
  Sparkles,
  Trophy,
  Award,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Heart
} from 'lucide-react';
import { api } from '../services/api';

export default function EngagementAnalyticsView({ onNotify }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getEngagementAnalytics();
      setData(res);
    } catch (err) {
      onNotify('Lỗi tải dữ liệu tương tác người dùng: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={26} style={{ color: '#a78bfa' }} />
            <span>Phân Tích Mức Độ Tương Tác (View Engagement Analytics)</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Đo lường mức độ tương tác thực tế của người dùng: DAU/WAU/MAU, tần suất ghi nhận dinh dưỡng, uống nước và thú cưng ảo.
          </p>
        </div>
      </div>

      {/* DAU / WAU / MAU Grid */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--primary)' }}>
            <Activity size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">DAU (Hoạt Động Hằng Ngày)</span>
            <div className="stat-value" style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>
              {data?.estimatedDau || 0}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Người dùng ghi nhật ký / quét AI trong 24h
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
            <Users size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">WAU (Hoạt Động Hằng Tuần)</span>
            <div className="stat-value" style={{ color: '#38bdf8', fontSize: '1.5rem' }}>
              {data?.estimatedWau || 0}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Người dùng hoạt động trong 7 ngày qua
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">MAU (Hoạt Động Hằng Tháng)</span>
            <div className="stat-value" style={{ color: '#c084fc', fontSize: '1.5rem' }}>
              {data?.estimatedMau || 0}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Người dùng hoạt động trong 30 ngày qua
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Trophy size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Tỷ Lệ Hoàn Thành Thử Thách</span>
            <div className="stat-value" style={{ color: '#fbbf24', fontSize: '1.5rem' }}>
              {data?.challengeCompletionRate || 0}%
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Tỷ lệ hoàn thành các thử thách sức khỏe
            </span>
          </div>
        </div>
      </div>

      {/* Engagement Activity Breakdown Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Flame size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Tổng Nhật Ký Bữa Ăn</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {data?.totalDiariesLogged?.toLocaleString() || 0}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4' }}>
            <Droplets size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Lượt Ghi Nhận Uống Nước</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#38bdf8' }}>
              {data?.totalWaterLogs?.toLocaleString() || 0}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899' }}>
            <Heart size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Cấp Độ Thú Cưng TB</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f472b6' }}>
              Lv. {data?.averagePetLevel || 1}
            </div>
          </div>
        </div>
      </div>

      {/* Top Engaged Users Leaderboard */}
      <div className="card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} style={{ color: '#fbbf24' }} />
            <span>Bảng Xếp Hạng Người Dùng Tích Cực Nhất (Top Engaged Users)</span>
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sắp xếp theo Tổng điểm thưởng XP</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Hạng</th>
                <th>Người dùng</th>
                <th>Số nhật ký bữa ăn</th>
                <th>Cấp thú cưng (Pet Level)</th>
                <th>Tổng điểm XP</th>
                <th>Hoạt động gần nhất</th>
              </tr>
            </thead>
            <tbody>
              {!data?.topEngagedUsers || data.topEngagedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                    Chưa có dữ liệu người dùng tích cực.
                  </td>
                </tr>
              ) : (
                data.topEngagedUsers.map((u, idx) => (
                  <tr key={u.userId}>
                    <td>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-full)',
                          background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#1e293b',
                          color: idx < 3 ? '#0f172a' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.82rem'
                        }}
                      >
                        {idx + 1}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.fullName || 'Người dùng'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{u.diariesCount}</span> bữa ăn
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontWeight: 700 }}>
                        🐾 Lv. {u.petLevel}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-warning" style={{ fontWeight: 700 }}>
                        +{u.totalXp?.toLocaleString() || 0} XP
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {formatDate(u.lastActiveAt)}
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
