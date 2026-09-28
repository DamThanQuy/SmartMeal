// design/WaterLog.dc.html (BR-031 — Daily Target: Water).

export interface WaterEntry {
  id: string;
  amountMl: number;
  /** "10:15" — giờ ghi nhận. */
  timeLabel: string;
}

export interface WaterDaySummary {
  dateIso: string;
  entries: WaterEntry[];
  totalMl: number;
  goalMl: number;
}

export interface WaterHistoryDay {
  dateIso: string;
  /** "T2"…"CN". */
  label: string;
  totalMl: number;
  goalMl: number;
  isToday?: boolean;
}

export interface WaterWeekSummary {
  days: WaterHistoryDay[];
  daysOnTarget: number;
}
