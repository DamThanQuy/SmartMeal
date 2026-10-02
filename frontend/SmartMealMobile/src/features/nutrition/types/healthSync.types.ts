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
}
