/** 1 nguồn vận động và việc nó có được cộng vào ngân sách hay không (BR-042 — không cộng 2 lần). */
export interface ActivitySourceDetail {
  id: string;
  label: string;
  /** Backend chỉ trả tên nguồn, không trả calo theo từng nguồn → chỉ có ở bản mock. */
  calories?: number;
  /** false = bị bỏ qua vì trùng khung giờ với nguồn khác. */
  countsTowardBudget: boolean;
  note: string;
}

/** 1 hoạt động được tính (đi bộ, đạp xe...). */
export interface ActivityLogItem {
  label: string;
  windowLabel: string;
  calories: number;
}

/** Số liệu vận động 1 ngày (health-sync) — nguồn của calo vận động cộng vào ngân sách (BR-040→042). */
export interface DailyActivity {
  /** ISO date yyyy-MM-dd (giờ máy). */
  dateIso: string;
  steps: number;
  stepGoal: number;
  /** Calo vận động thô, CHƯA áp công tắc "Cộng calo vận động vào ngân sách". */
  caloriesBurned: number;
  distanceMeters: number;
  /** Tên các nguồn đã đồng bộ (vd. "GoogleFit"); chưa đồng bộ lần nào → rỗng. */
  sources: string[];
  /** Thời điểm đồng bộ gần nhất (ISO UTC); null khi chưa từng đồng bộ ngày này. */
  lastSyncedAt: string | null;
  /** false khi chưa có lần đồng bộ nào — UI không được hiện "vừa đồng bộ". */
  hasSyncedData: boolean;
  /** Chi tiết theo nguồn (CalorieBudget). Rỗng khi chưa đồng bộ. */
  sourceDetails: ActivitySourceDetail[];
  /** Danh sách hoạt động được tính — backend không có (chỉ mock); rỗng → UI ẩn khối này. */
  activities: ActivityLogItem[];
}
