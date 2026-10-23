const API_BASE = '/api';

export const authStorage = {
  getToken: () => localStorage.getItem('smartmeal_admin_token'),
  setToken: (token) => localStorage.setItem('smartmeal_admin_token', token),
  getUser: () => {
    try {
      const u = localStorage.getItem('smartmeal_admin_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem('smartmeal_admin_user', JSON.stringify(user)),
  clear: () => {
    localStorage.removeItem('smartmeal_admin_token');
    localStorage.removeItem('smartmeal_admin_user');
  }
};

// anonymous: request không gửi token (đăng nhập) — 401 lúc đó là sai mật khẩu, không phải phiên hết hạn.
async function send(endpoint, options = {}, { anonymous = false } = {}) {
  const token = anonymous ? null : authStorage.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token) {
      authStorage.clear();
      window.dispatchEvent(new Event('smartmeal_admin_unauthorized'));
    }
    const errorMsg = data?.message || (data?.errors && data.errors.join(', ')) || `Lỗi yêu cầu (${response.status})`;
    throw new Error(errorMsg);
  }

  return { data, response };
}

async function request(endpoint, options = {}, config = {}) {
  return (await send(endpoint, options, config)).data;
}

// Danh sách phân trang: backend trả trang hiện tại trong `data` và tổng số bản ghi ở header X-Total-Count.
async function requestPage(endpoint) {
  const { data, response } = await send(endpoint);
  const items = data?.data || [];
  const header = response.headers?.get?.('X-Total-Count');
  const total = header ? Number(header) : NaN;
  return { items, total: Number.isFinite(total) ? total : items.length };
}

export const api = {
  // Auth
  login: async (email, password) => {
    const res = await request('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, { anonymous: true });
    if (res.data?.token) {
      authStorage.setToken(res.data.token);
      authStorage.setUser(res.data.user);
    }
    return res.data;
  },

  // Dashboard Stats
  getStats: async () => {
    const res = await request('/admin/stats');
    return res.data;
  },

  // Users Management — trả { items, total }
  getUsers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return requestPage(`/admin/users?${query}`);
  },

  getUserDetail: async (id) => {
    const res = await request(`/admin/users/${id}`);
    return res.data;
  },

  updateUserStatus: async (id, isLocked, reason) => {
    const res = await request(`/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isLocked, reason }),
    });
    return res;
  },

  updateUserRole: async (id, role) => {
    const res = await request(`/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
    return res;
  },

  updateUserSubscription: async (id, isPro, planId = 'PRO_MONTHLY', durationDays = 30) => {
    const res = await request(`/admin/users/${id}/subscription`, {
      method: 'PUT',
      body: JSON.stringify({ isPro, planId, durationDays, status: isPro ? 'Premium' : 'Free' }),
    });
    return res;
  },

  deleteUser: async (id) => {
    const res = await request(`/admin/users/${id}`, {
      method: 'DELETE',
    });
    return res;
  },

  // Recipes Management — trả { items, total }
  getRecipes: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return requestPage(`/admin/recipes?${query}`);
  },

  getRecipeDetail: async (id) => {
    const res = await request(`/admin/recipes/${id}`);
    return res.data;
  },

  createRecipe: async (recipeData) => {
    const res = await request('/admin/recipes', {
      method: 'POST',
      body: JSON.stringify(recipeData),
    });
    return res.data;
  },

  updateRecipe: async (id, recipeData) => {
    const res = await request(`/admin/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(recipeData),
    });
    return res.data;
  },

  deleteRecipe: async (id) => {
    const res = await request(`/admin/recipes/${id}`, {
      method: 'DELETE',
    });
    return res;
  },

  bulkImportRecipes: async (recipes, overwriteExisting = false) => {
    const res = await request('/admin/recipes/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ recipes, overwriteExisting }),
    });
    return res;
  },

  // Plans & Transactions
  getPlans: async () => {
    const res = await request('/admin/plans');
    return res.data || [];
  },

  // trả { items, total }
  getTransactions: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return requestPage(`/admin/transactions?${query}`);
  },

  approveTransaction: async (id) => {
    const res = await request(`/admin/transactions/${id}/approve`, {
      method: 'PUT',
    });
    return res;
  },

  // USE CASE 1 & 2: MANAGE USER (BAN USER & MODERATE ACCOUNT)
  banUser: async (id, isBanned, reason = '', durationDays = null) => {
    const res = await request(`/admin/users/${id}/ban`, {
      method: 'PUT',
      body: JSON.stringify({ isBanned, reason, durationDays }),
    });
    return res;
  },

  moderateAccount: async (id, data) => {
    const res = await request(`/admin/users/${id}/moderate`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res;
  },

  // USE CASE 3: MANAGE REWARD SYSTEM
  getChallenges: async () => {
    const res = await request('/admin/rewards/challenges');
    return res.data || [];
  },

  createChallenge: async (challengeData) => {
    const res = await request('/admin/rewards/challenges', {
      method: 'POST',
      body: JSON.stringify(challengeData),
    });
    return res.data;
  },

  updateChallenge: async (id, challengeData) => {
    const res = await request(`/admin/rewards/challenges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(challengeData),
    });
    return res.data;
  },

  deleteChallenge: async (id) => {
    const res = await request(`/admin/rewards/challenges/${id}`, {
      method: 'DELETE',
    });
    return res;
  },

  getBadges: async () => {
    const res = await request('/admin/rewards/badges');
    return res.data || [];
  },

  getXpEvents: async () => {
    const res = await request('/admin/rewards/xp-events');
    return res.data || [];
  },

  grantXp: async (userId, xp, reason = 'Admin thưởng điểm chuyên cần') => {
    const res = await request('/admin/rewards/grant-xp', {
      method: 'POST',
      body: JSON.stringify({ userId, xp, reason }),
    });
    return res;
  },

  // USE CASE 4: MONITOR SYSTEM ACTIVITY
  getSystemActivity: async () => {
    const res = await request('/admin/system/activity');
    return res.data;
  },

  // USE CASE 5: VIEW REVENUE REPORT
  getRevenueReport: async (startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await request(`/admin/reports/revenue${query}`);
    return res.data;
  },

  // USE CASE 6: VIEW ENGAGEMENT ANALYTICS
  getEngagementAnalytics: async () => {
    const res = await request('/admin/reports/engagement');
    return res.data;
  },
};

