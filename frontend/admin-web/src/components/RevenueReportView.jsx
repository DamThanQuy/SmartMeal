import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Percent,
  PieChart,
  ArrowUpRight,
  Filter,
  Download
} from 'lucide-react';
import { api } from '../services/api';

export default function RevenueReportView({ onNotify }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await api.getRevenueReport(startDate, endDate);
      setReport(data);
    } catch (err) {
      onNotify('Lỗi tải báo cáo doanh thu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const formatVnd = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const handleExportCsv = () => {
    if (!report || !report.revenueByPeriod) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'MocThoiGian,DoanhThuVND,SoGiaoDich\n' +
      report.revenueByPeriod.map((p) => `"${p.periodLabel}",${p.amountVnd},${p.transactionCount}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SmartMeal_BaoCaoDoanhThu_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify('Đã xuất file báo cáo CSV thành công!', 'success');
  };

  const maxPeriodAmount = report?.revenueByPeriod?.reduce((max, p) => Math.max(max, p.amountVnd), 0) || 1;

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={26} style={{ color: 'var(--primary)' }} />
            <span>Báo Cáo Doanh Thu Tài Chính (View Revenue Report)</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Phân tích số liệu dòng tiền, hiệu suất cổng thanh toán SePay / PayOS và chỉ số giá trị khách hàng ARPPU.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleExportCsv}>
            <Download size={16} />
            <span>Xuất Báo Cáo CSV</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Khoảng thời gian:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Từ ngày:</span>
          <input
            type="date"
            className="form-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '6px 10px', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Đến ngày:</span>
          <input
            type="date"
            className="form-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: '6px 10px', fontSize: '0.85rem' }}
          />
        </div>

        <button className="btn btn-primary btn-sm" onClick={loadReport}>
          <Filter size={14} />
          <span>Lọc Báo Cáo</span>
        </button>

        {(startDate || endDate) && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setTimeout(loadReport, 50);
            }}
          >
            Đặt lại
          </button>
        )}
      </div>

      {/* Key Metric Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--primary)' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Tổng Doanh Thu Đã Thu</span>
            <div className="stat-value" style={{ color: 'var(--primary)', fontSize: '1.4rem' }}>
              {formatVnd(report?.totalRevenue)}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Tích lũy từ tất cả giao dịch thành công
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
            <Calendar size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Doanh Thu Tháng Này</span>
            <div className="stat-value" style={{ color: '#38bdf8', fontSize: '1.4rem' }}>
              {formatVnd(report?.monthlyRevenue)}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Năm nay: {formatVnd(report?.yearlyRevenue)}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <ArrowUpRight size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Doanh Thu TB / Khách Trả Phí (ARPPU)</span>
            <div className="stat-value" style={{ color: '#fbbf24', fontSize: '1.4rem' }}>
              {formatVnd(report?.averageRevenuePerPayingUser)}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Mức chi tiêu trung bình của 1 khách hàng VIP
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <Percent size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Tỷ Lệ Thanh Toán Thành Công</span>
            <div className="stat-value" style={{ color: '#c084fc', fontSize: '1.4rem' }}>
              {report?.successRatePercentage || 0}%
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {report?.successfulTransactions || 0} thành công / {report?.totalTransactions || 0} tổng đơn
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown Charts & Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Revenue by Period Bar Chart */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Biểu Đồ Doanh Thu Theo Mốc Thời Gian</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mới nhất</span>
          </h3>

          {!report?.revenueByPeriod || report.revenueByPeriod.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-dim)' }}>
              Chưa có dữ liệu giao dịch trong khoảng thời gian này.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {report.revenueByPeriod.map((p, idx) => {
                const percent = Math.min(100, Math.round((p.amountVnd / maxPeriodAmount) * 100));
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600 }}>{p.periodLabel}</span>
                      <span>
                        <strong>{formatVnd(p.amountVnd)}</strong>{' '}
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>({p.transactionCount} đơn)</span>
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.max(5, percent)}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.5s ease'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Breakdown by Method & Plan */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* By Gateway */}
          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} style={{ color: '#06b6d4' }} />
              <span>Cơ Cấu Cổng Thanh Toán</span>
            </h4>

            {report?.revenueByMethod && Object.keys(report.revenueByMethod).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(report.revenueByMethod).map(([method, amount]) => (
                  <div key={method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{method || 'Cổng Trực Tiếp'}</div>
                    <div style={{ fontWeight: 700, color: '#38bdf8' }}>{formatVnd(amount)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textAlign: 'center', padding: '16px' }}>
                Chưa có dữ liệu cổng thanh toán
              </div>
            )}
          </div>

          {/* By Plan */}
          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={18} style={{ color: '#a78bfa' }} />
              <span>Cơ Cấu Theo Gói Thành Viên</span>
            </h4>

            {report?.revenueByPlan && Object.keys(report.revenueByPlan).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(report.revenueByPlan).map(([plan, amount]) => (
                  <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{plan}</div>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatVnd(amount)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textAlign: 'center', padding: '16px' }}>
                Chưa có dữ liệu gói thành viên
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
