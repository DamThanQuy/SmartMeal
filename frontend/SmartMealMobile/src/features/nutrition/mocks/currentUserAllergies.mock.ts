// TODO: Đợt 7 (HealthSettings) sẽ có store hồ sơ user đã đăng nhập (dị ứng/bệnh lý/chế độ ăn)
// dùng chung cho Recipes/MealPlanner/Nutrition/Scanner — thay hằng số này bằng giá trị đọc từ
// đó. Hiện tại hard-code 2 dị ứng mẫu để minh hoạ cảnh báo (BR-101, BR-102, BR-140) ở nhiều
// màn: "sữa" (Sữa chua — Đợt 3, Súp bí đỏ kem tươi — Đợt 5), "đậu phộng" (Bánh quy bơ đậu
// phộng — Đợt 4 Barcode). Phở bò tái/Gà áp chảo rau củ không chứa 2 chất này → vẫn hiện đúng
// thông báo "không chứa dị ứng đã khai báo".
export const CURRENT_USER_ALLERGY_IDS: string[] = ['dairy', 'peanut'];
