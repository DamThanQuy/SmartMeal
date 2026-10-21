import React from 'react';
import {
  Users,
  Crown,
  UtensilsCrossed,
  DollarSign,
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertCircle,
  PlusCircle,
  ArrowRight
} from 'lucide-react';

export default function DashboardView({ stats, onNavigate, onOpenAddRecipe }) {
  if (!stats) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        Đang tải dữ liệu tổng quan...
      </div>
    );
  }

  const formatVnd = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const proPercentage = stats.totalUsers > 0
    ? Math.round((stats.proUsers / stats.totalUsers) * 100)
    : 0;

  return (
    <div>
      {/* 4 Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>Tổng Người Dùng</span>
            <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="stat-value">{stats.totalUsers.toLocaleString()}</div>
          <div className="stat-footer">
            <span style={{ color: '#34d399' }}>{stats.activeUsers} đang hoạt động</span>
            {stats.lockedUsers > 0 && (
              <span style={{ color: '#f87171' }}>• {stats.lockedUsers} bị khóa</span>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Thành Viên Pro / VIP</span>
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <Crown size={20} />
            </div>
          </div>
          <div className="stat-value">{stats.proUsers.toLocaleString()}</div>
          <div className="stat-footer">
            <span style={{ color: '#fbbf24' }}>Tỉ lệ chuyển đổi: {proPercentage}%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Thực Đơn Món Ăn</span>
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <UtensilsCrossed size={20} />
            </div>
          </div>
          <div className="stat-value">{stats.totalRecipes.toLocaleString()}</div>
          <div className="stat-footer">
            <span>Đầy đủ ảnh & dinh dưỡng calo/macro</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Doanh Thu Thành Viên</span>
            <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>{formatVnd(stats.totalRevenueVnd)}</div>
          <div className="stat-footer">
            <span style={{ color: '#34d399' }}>Tháng này: {formatVnd(stats.monthlyRevenueVnd)}</span>
          </div>
        </div>
      </div>

      {/* Grid 2 Columns: Phân bổ thực đơn & Hành động nhanh */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Phân bổ thực đơn */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Phân Bổ Thực Đơn Theo Bữa</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('recipes')}>
              <span>Xem tất cả</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(stats.recipesByMealType || {}).map(([meal, count]) => {
              const mealLabel = meal === 'Breakfast' ? 'Bữa Sáng' : meal === 'Lunch' ? 'Bữa Trưa' : meal === 'Dinner' ? 'Bữa Tối' : 'Bữa Phụ (Snack)';
              const percentage = stats.totalRecipes > 0 ? Math.round((count / stats.totalRecipes) * 100) : 0;
              return (
                <div key={meal}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 500 }}>{mealLabel}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{count} món ({percentage}%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: meal === 'Breakfast' ? '#38bdf8' : meal === 'Lunch' ? '#10b981' : meal === 'Dinner' ? '#f59e0b' : '#ec4899',
                        borderRadius: '4px',
                        transition: 'width 0.5s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Thống kê Gói Pro */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Gói Thành Viên Đang Phát Hành</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('subscriptions')}>
              <span>Chi tiết</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(stats.popularPlans || []).map((plan) => (
              <div
                key={plan.id}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{plan.name}</span>
                    {plan.isPopular && <span className="badge badge-pro">Phổ biến</span>}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {formatVnd(plan.priceVnd)} / {plan.durationDays} ngày
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {plan.activeSubscribers} người
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    {formatVnd(plan.totalRevenueVnd)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid 2 Columns: Giao dịch gần đây & Người dùng mới */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* Giao dịch gần đây */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Giao Dịch Gần Đây</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('subscriptions')}>
              <span>Xem tất cả</span>
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Gói</th>
                  <th>Số tiền</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentTransactions && stats.recentTransactions.length > 0 ? (
                  stats.recentTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{tx.userFullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{tx.userEmail}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tx.planName}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatVnd(tx.amountVnd)}</td>
                      <td>
                        {tx.status === 'Paid' ? (
                          <span className="badge badge-success">Đã thanh toán</span>
                        ) : tx.status === 'Pending' ? (
                          <span className="badge badge-warning">Đang chờ</span>
                        ) : (
                          <span className="badge badge-danger">Thất bại</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                      Chưa có giao dịch nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Người dùng mới */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Người Dùng Mới Đăng Ký</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('users')}>
              <span>Quản lý</span>
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Vai trò</th>
                  <th>Gói</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers && stats.recentUsers.length > 0 ? (
                  stats.recentUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.fullName || 'Người dùng'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{u.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'Admin' ? 'badge-info' : 'badge-free'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {u.isPro ? (
                          <span className="badge badge-pro">Pro VIP</span>
                        ) : (
                          <span className="badge badge-free">Free</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatDate(u.createdAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                      Chưa có người dùng
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
