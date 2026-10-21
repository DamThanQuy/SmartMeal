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

export default function App() {
  const [user, setUser] = useState(authStorage.getUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [triggerAddRecipe, setTriggerAddRecipe] = useState(false);
  const [toast, setToast] = useState(null);

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
            <div className={`toast toast-${toast.type}`}>
              {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <span>{toast.message}</span>
            </div>
          </div>
        )}
      </>
    );
  }

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Bảng Điều Khiển Tổng Quan';
      case 'users': return 'Quản Lý Người Dùng & Kiểm Duyệt Tài Khoản';
      case 'recipes': return 'Quản Lý Thực Đơn & Món Ăn';
      case 'rewards': return 'Quản Lý Hệ Thống Phần Thưởng (Rewards)';
      case 'system': return 'Giám Sát Hoạt Động Hệ Thống (System Activity)';
      case 'revenue': return 'Báo Cáo Doanh Thu Tài Chính (Revenue Report)';
      case 'engagement': return 'Phân Tích Mức Độ Tương Tác (Engagement Analytics)';
      case 'subscriptions': return 'Quản Lý Gói Hội Viên & Giao Dịch';
      default: return 'SmartMeal Admin';
    }
  };

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
          title={getTabTitle()}
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
          <div className={`toast toast-${toast.type}`}>
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
