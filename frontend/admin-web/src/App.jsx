import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardView from './components/DashboardView';
import UsersView from './components/UsersView';
import RecipesView from './components/RecipesView';
import SubscriptionsView from './components/SubscriptionsView';
import RewardsView from './components/RewardsView';
import SystemActivityView from './components/SystemActivityView';
import RevenueReportView from './components/RevenueReportView';
import EngagementAnalyticsView from './components/EngagementAnalyticsView';
import LoginView from './components/LoginView';
import { authStorage, api } from './services/api';
import { CheckCircle2, AlertCircle } from 'lucide-react';

// Tiêu đề từng trang quản trị. Tab đang mở nằm trên URL (#/users…) để F5 không mất trang và gửi được liên kết.
const TAB_TITLES = {
  dashboard: 'Bảng Điều Khiển Tổng Quan',
  users: 'Quản Lý Người Dùng & Kiểm Duyệt Tài Khoản',
  recipes: 'Quản Lý Thực Đơn & Món Ăn',
  rewards: 'Quản Lý Hệ Thống Phần Thưởng (Rewards)',
  system: 'Giám Sát Hoạt Động Hệ Thống (System Activity)',
  revenue: 'Báo Cáo Doanh Thu Tài Chính (Revenue Report)',
  engagement: 'Phân Tích Mức Độ Tương Tác (Engagement Analytics)',
  subscriptions: 'Quản Lý Gói Hội Viên & Giao Dịch',
};

function tabFromHash() {
  const id = window.location.hash.replace(/^#\/?/, '');
  return Object.prototype.hasOwnProperty.call(TAB_TITLES, id) ? id : 'dashboard';
}

export default function App() {
  const [user, setUser] = useState(authStorage.getUser());
  const [activeTab, setActiveTabState] = useState(tabFromHash);
  const [stats, setStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [triggerAddRecipe, setTriggerAddRecipe] = useState(false);
  const [toast, setToast] = useState(null);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    if (tabFromHash() !== tab) window.location.hash = `/${tab}`;
  };

  // Nút Back/Forward của trình duyệt đổi hash → mở đúng trang.
  useEffect(() => {
    const handleHashChange = () => setActiveTabState(tabFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    document.title = user ? `${TAB_TITLES[activeTab]} · SmartMeal Admin` : 'Đăng nhập · SmartMeal Admin';
  }, [activeTab, user]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const loadStats = async () => {
    if (!user) return;
    try {
      setIsRefreshing(true);
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      showToast('Lỗi nạp thống kê: ' + err.message, 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadStats();
    }

    const handleUnauthorized = () => {
      setUser(null);
      showToast('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.', 'error');
    };

    window.addEventListener('smartmeal_admin_unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('smartmeal_admin_unauthorized', handleUnauthorized);
    };
  }, [user]);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    showToast(`Chào mừng Quản trị viên ${loggedInUser.fullName}!`, 'success');
  };

  const handleLogout = () => {
    authStorage.clear();
    setUser(null);
    showToast('Đã đăng xuất khỏi hệ thống quản trị.', 'info');
  };

  const handleOpenAddRecipeFromTopbar = () => {
    setActiveTab('recipes');
    setTriggerAddRecipe(true);
  };

  if (!user) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        {toast && (
          <div className="toast-container">
            <div className={`toast toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
              {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <span>{toast.message}</span>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      <div className="main-content">
        <Topbar
          title={TAB_TITLES[activeTab]}
          onRefresh={loadStats}
          isRefreshing={isRefreshing}
          onOpenAddRecipe={handleOpenAddRecipeFromTopbar}
        />

        <main className="content-body">
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenAddRecipe={handleOpenAddRecipeFromTopbar}
            />
          )}

          {activeTab === 'users' && (
            <UsersView onNotify={showToast} />
          )}

          {activeTab === 'recipes' && (
            <RecipesView
              onNotify={showToast}
              initialOpenAdd={triggerAddRecipe}
              onResetAddTrigger={() => setTriggerAddRecipe(false)}
            />
          )}

          {activeTab === 'rewards' && (
            <RewardsView onNotify={showToast} />
          )}

          {activeTab === 'system' && (
            <SystemActivityView onNotify={showToast} />
          )}

          {activeTab === 'revenue' && (
            <RevenueReportView onNotify={showToast} />
          )}

          {activeTab === 'engagement' && (
            <EngagementAnalyticsView onNotify={showToast} />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionsView onNotify={showToast} />
          )}
        </main>
      </div>


      {/* Global Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
