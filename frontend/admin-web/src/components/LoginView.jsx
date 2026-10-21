import React, { useState } from 'react';
import { UtensilsCrossed, Lock, Mail, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function LoginView({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@smartmeal.com');
  const [password, setPassword] = useState('Admin@123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    try {
      setLoading(true);
      const data = await api.login(email, password);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Đăng nhập không thành công.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@smartmeal.com');
    setPassword('Admin@123456');
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="logo-badge">
            <UtensilsCrossed size={28} />
          </div>
          <h2>SmartMeal Admin</h2>
          <p>Hệ Thống Quản Trị Hệ Thống Toàn Diện</p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.86rem',
              marginBottom: '20px',
              lineHeight: 1.4
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Quản Trị Viên:</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="admin@smartmeal.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '22px' }}>
            <label className="form-label">Mật Khẩu:</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.96rem' }}
            disabled={loading}
          >
            <span>{loading ? 'Đang xác thực...' : 'Đăng Nhập Quản Trị'}</span>
            <ArrowRight size={17} />
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border-glass)', textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={handleFillDemo}
          >
            <Sparkles size={14} style={{ color: '#fbbf24' }} />
            <span>Điền Tài Khoản Admin Mặc Định</span>
          </button>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '8px' }}>
            Tài khoản mẫu: <code>admin@smartmeal.com</code> / <code>Admin@123456</code>
          </div>
        </div>
      </div>
    </div>
  );
}
