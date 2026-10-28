import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Crown,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../services/api';
import { useConfirm } from './useConfirm';
import Pagination from './Pagination';

const PAGE_SIZE = 20;

export default function SubscriptionsView({ onNotify }) {
  const { confirm, dialog } = useConfirm();
  const [plans, setPlans] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [approvingId, setApprovingId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, txPage] = await Promise.all([
        api.getPlans(),
        api.getTransactions({ page, pageSize: PAGE_SIZE, status: statusFilter !== 'all' ? statusFilter : '', search })
      ]);
      setPlans(plansData);
      setTransactions(txPage.items);
      setTotal(txPage.total);
    } catch (err) {
      onNotify('Lỗi tải dữ liệu gói & giao dịch: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, search, page]);

  const handleApprove = async (tx) => {
    if (!(await confirm(`Duyệt thanh toán đơn hàng #${tx.orderCode || tx.sessionId} cho khách hàng ${tx.userFullName}? Gói Pro được kích hoạt ngay lập tức.`, { title: 'Duyệt thanh toán', confirmLabel: 'Duyệt và kích hoạt Pro' }))) {
      return;
    }

    try {
      setApprovingId(tx.id);
      await api.approveTransaction(tx.id);
      onNotify('Đã duyệt đơn và kích hoạt gói Pro thành công!', 'success');
      loadData();
    } catch (err) {
      onNotify('Duyệt giao dịch thất bại: ' + err.message, 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const formatVnd = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
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
    <div>
      {dialog}
      {/* 1. Member Plans Grid */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Crown size={22} style={{ color: '#fbbf24' }} />
          <span>Danh Sách Gói Hội Viên SmartMeal Pro</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '22px' }}>
          {plans.map((p) => (
            <div
              key={p.id}
              className="card"
              style={{
                position: 'relative',
                border: p.isPopular ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-glass)',
                background: p.isPopular
                  ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(245, 158, 11, 0.05))'
                  : 'var(--bg-surface)'
              }}
            >
              {p.isPopular && (
                <div style={{ position: 'absolute', top: '-10px', right: '20px' }}>
                  <span className="badge badge-pro" style={{ boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)' }}>
                    ★ Gói Phổ Biến Nhất
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{p.name}</h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Chu kỳ: {p.durationDays} ngày ({p.billingCycle === 'Yearly' ? 'Hàng năm' : 'Hàng tháng'})
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {formatVnd(p.priceVnd)}
                  </div>
                </div>
              </div>

              {/* Stats of this plan */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  background: 'rgba(15,23,42,0.6)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Số người đang dùng:</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#60a5fa' }}>
                    {p.activeSubscribers} thành viên
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Doanh thu mang lại:</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>
                    {formatVnd(p.totalRevenueVnd)}
                  </div>
                </div>
              </div>

              {/* Features List */}
              <div style={{ fontSize: '0.84rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>Đặc quyền gói:</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(p.features || []).map((feat, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <CheckCircle size={15} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ color: 'var(--text-main)', lineHeight: 1.4 }}>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Transactions Management */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="card-title">Quản Lý Giao Dịch & Thanh Toán VietQR</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Theo dõi tiền vào qua PayOS, SePay và duyệt đơn hàng nhanh chóng.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="search-box" style={{ minWidth: '220px' }}>
              <Search size={16} />
              <input
                type="text"
                className="form-input"
                placeholder="Tìm mã đơn, email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ width: '150px' }}
            >
              <option value="all">Mọi trạng thái</option>
              <option value="Paid">Đã thanh toán (Paid)</option>
              <option value="Pending">Đang chờ (Pending)</option>
              <option value="Failed">Thất bại (Failed)</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã Đơn / Phiên</th>
                <th>Khách hàng</th>
                <th>Gói đăng ký</th>
                <th>Số tiền</th>
                <th>Cổng</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Đang tải danh sách giao dịch...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                    Không tìm thấy giao dịch nào.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                        #{tx.orderCode || tx.sessionId?.substring(0, 16)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {tx.sessionId}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600 }}>{tx.userFullName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{tx.userEmail}</div>
                    </td>

                    <td>
                      <span style={{ fontWeight: 500, color: '#fbbf24' }}>{tx.planName}</span>
                    </td>

                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {formatVnd(tx.amountVnd)}
                    </td>

                    <td>
                      <span className="badge badge-info">{tx.paymentMethod}</span>
                    </td>

                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div>{formatDate(tx.createdAt)}</div>
                      {tx.paidAt && (
                        <div style={{ fontSize: '0.72rem', color: '#34d399' }}>
                          Khớp: {formatDate(tx.paidAt)}
                        </div>
                      )}
                    </td>

                    <td>
                      {tx.status === 'Paid' ? (
                        <span className="badge badge-success">
                          <CheckCircle size={12} /> Đã thanh toán
                        </span>
                      ) : tx.status === 'Pending' ? (
                        <span className="badge badge-warning">
                          <Clock size={12} /> Đang chờ
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          <AlertCircle size={12} /> Thất bại
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      {tx.status !== 'Paid' ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApprove(tx)}
                          disabled={approvingId === tx.id}
                        >
                          <Zap size={13} />
                          <span>{approvingId === tx.id ? 'Đang duyệt...' : 'Duyệt Đơn'}</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Đã hoàn tất</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} itemLabel="giao dịch" />
      </div>
    </div>
  );
}
