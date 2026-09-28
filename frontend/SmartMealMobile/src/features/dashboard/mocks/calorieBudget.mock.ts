export interface ActivityCalorieSourceMock {
  id: string;
  label: string;
  calories: number;
  /** true = nguồn đang được tính vào ngân sách; false = bị bỏ qua vì trùng khung giờ (BR-042). */
  countsTowardBudget: boolean;
  note: string;
}

export interface ActivityLogEntryMock {
  label: string;
  windowLabel: string;
  calories: number;
}

// design/CalorieBudget.dc.html "Nguồn vận động"/"Hoạt động được tính" — Health Connect là nguồn
// DUY NHẤT được cộng; đồng hồ thông minh báo cùng khung giờ (06:30–17:20) nên bị bỏ qua, minh
// hoạ trực quan cho BR-042 (chỉ dữ liệu tĩnh hiển thị, không cộng thêm vào ngân sách thật —
// ngân sách thật chỉ dùng TODAY_ACTIVITY_CALORIES_BURNED_MOCK qua calculateCalorieBudget).
export const ACTIVITY_CALORIE_SOURCES_MOCK: ActivityCalorieSourceMock[] = [
  {
    id: 'health-connect',
    label: 'Health Connect',
    calories: 180,
    countsTowardBudget: true,
    note: 'Nguồn đang dùng cho hôm nay',
  },
  {
    id: 'smart-watch',
    label: 'Đồng hồ thông minh',
    calories: 180,
    countsTowardBudget: false,
    note: 'Cùng khung giờ với Health Connect nên không cộng lần hai',
  },
];

export const ACTIVITY_LOG_ENTRIES_MOCK: ActivityLogEntryMock[] = [
  { label: 'Đi bộ', windowLabel: '06:30 – 07:10', calories: 120 },
  { label: 'Đạp xe', windowLabel: '17:00 – 17:20', calories: 60 },
];
