// Query key của dữ liệu gói thành viên, tách riêng để hook thanh toán và hook đọc dùng chung.
export const SUBSCRIPTION_QUERY_KEY = ['subscription'] as const;
export const SUBSCRIPTION_PLANS_QUERY_KEY = [...SUBSCRIPTION_QUERY_KEY, 'plans'] as const;
export const SUBSCRIPTION_STATUS_QUERY_KEY = [...SUBSCRIPTION_QUERY_KEY, 'status'] as const;
export const SUBSCRIPTION_TRANSACTIONS_QUERY_KEY = [
  ...SUBSCRIPTION_QUERY_KEY,
  'transactions',
] as const;
