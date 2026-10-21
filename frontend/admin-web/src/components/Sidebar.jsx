import React from 'react';
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  CreditCard,
  LogOut,
  ShieldCheck,
  Trophy,
  Activity,
  TrendingUp,
  BarChart3
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Tổng Quan', icon: LayoutDashboard },
    { id: 'users', label: 'Quản Lý Người Dùng', icon: Users },
    { id: 'recipes', label: 'Quản Lý Món Ăn', icon: UtensilsCrossed },
    { id: 'rewards', label: 'Hệ Thống Phần Thưởng', icon: Trophy },
    { id: 'system', label: 'Giám Sát Hệ Thống', icon: Activity },
    { id: 'revenue', label: 'Báo Cáo Doanh Thu', icon: TrendingUp },
    { id: 'engagement', label: 'Phân Tích Tương Tác', icon: BarChart3 },
    { id: 'subscriptions', label: 'Gói Member & Giao Dịch', icon: CreditCard },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge">
          <UtensilsCrossed size={22} />
        </div>
        <div className="logo-text">
          <h1>SmartMeal</h1>
          <span>Admin Portal</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="admin-profile">
          <div className="admin-avatar">
            {user?.fullName?.charAt(0) || 'A'}
          </div>
          <div className="admin-info">
            <div className="admin-name">{user?.fullName || 'Administrator'}</div>
            <div className="admin-role">
              <ShieldCheck size={12} style={{ display: 'inline', marginRight: 4 }} />
              {user?.role || 'Admin'}
            </div>
          </div>
        </div>

        <button
          className="btn-logout"
          onClick={onLogout}
          title="Đăng xuất"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
