import type { Recipe } from '../types/recipe.types';

// Mock recipe database khớp shape docs/business_rule.md BR-090. Số liệu "Gà áp chảo rau củ"
// lấy đúng design/RecipeDetail.dc.html; các món còn lại suy ra hợp lý theo design/Discovery.dc.html,
// Fridge.dc.html, Favorites.dc.html (không đối chiếu USDA thật).
export const RECIPE_DATABASE_MOCK: Recipe[] = [
  {
    id: 'ga-ap-chao-rau-cu',
    name: 'Gà áp chảo rau củ',
    durationMinutes: 25,
    rating: 4.8,
    servings: 2,
    nutritionPerServing: { calories: 420, proteinG: 38, carbsG: 24, fatG: 18 },
    tags: ['eatClean'],
    allergenIds: [],
    ingredients: [
      { name: 'Ức gà', amount: '300 g' },
      { name: 'Bông cải xanh', amount: '200 g' },
      { name: 'Cà rốt', amount: '1 củ' },
      { name: 'Dầu ô liu', amount: '1 thìa canh' },
      { name: 'Tỏi', amount: '2 tép' },
      { name: 'Muối, tiêu', amount: 'Vừa đủ' },
    ],
    steps: [
      { order: 1, instruction: 'Ướp ức gà với tỏi băm, muối, tiêu trong 10 phút.' },
      { order: 2, instruction: 'Áp chảo gà với dầu ô liu mỗi mặt 5–6 phút đến khi chín vàng.' },
      { order: 3, instruction: 'Xào nhanh bông cải và cà rốt, bày cùng gà thái lát.' },
    ],
  },
  {
    id: 'salad-uc-ga',
    name: 'Salad ức gà',
    durationMinutes: 15,
    rating: 4.6,
    servings: 1,
    nutritionPerServing: { calories: 320, proteinG: 35, carbsG: 12, fatG: 14 },
    tags: ['lowCarb', 'quick'],
    allergenIds: [],
    ingredients: [
      { name: 'Ức gà luộc xé sợi', amount: '150 g' },
      { name: 'Xà lách', amount: '1 nắm' },
      { name: 'Cà chua bi', amount: '6 quả' },
      { name: 'Dầu ô liu, chanh', amount: 'Vừa đủ' },
    ],
    steps: [
      { order: 1, instruction: 'Xé sợi ức gà đã luộc chín.' },
      { order: 2, instruction: 'Trộn đều với xà lách, cà chua bi, dầu ô liu và chanh.' },
    ],
  },
  {
    id: 'dau-hu-sot-ca-chua',
    name: 'Đậu hũ sốt cà chua',
    durationMinutes: 20,
    rating: 4.4,
    servings: 2,
    nutritionPerServing: { calories: 280, proteinG: 14, carbsG: 20, fatG: 14 },
    tags: ['vegetarian', 'vegan'],
    allergenIds: ['soy'],
    ingredients: [
      { name: 'Đậu hũ', amount: '300 g', allergenId: 'soy' },
      { name: 'Cà chua', amount: '3 quả' },
      { name: 'Hành lá, tỏi', amount: 'Vừa đủ', unknownComposition: true },
    ],
    steps: [
      { order: 1, instruction: 'Chiên sơ đậu hũ cho vàng mặt.' },
      { order: 2, instruction: 'Phi tỏi, xào cà chua nhuyễn thành sốt.' },
      { order: 3, instruction: 'Cho đậu hũ vào rim cùng sốt, rắc hành lá.' },
    ],
  },
  {
    id: 'bo-xao-bong-cai',
    name: 'Bò xào bông cải',
    durationMinutes: 20,
    rating: 4.7,
    servings: 2,
    nutritionPerServing: { calories: 450, proteinG: 32, carbsG: 12, fatG: 30 },
    tags: ['keto'],
    allergenIds: [],
    ingredients: [
      { name: 'Thịt bò', amount: '250 g' },
      { name: 'Bông cải trắng', amount: '250 g' },
      { name: 'Tỏi, dầu hào', amount: 'Vừa đủ' },
    ],
    steps: [
      { order: 1, instruction: 'Ướp thịt bò với tỏi và dầu hào 10 phút.' },
      { order: 2, instruction: 'Xào bò lửa lớn cho săn, để riêng.' },
      { order: 3, instruction: 'Xào bông cải chín tới rồi trộn lại cùng bò.' },
    ],
  },
  {
    id: 'trung-xao-ca-chua',
    name: 'Trứng xào cà chua',
    durationMinutes: 15,
    rating: 4.5,
    servings: 2,
    nutritionPerServing: { calories: 280, proteinG: 16, carbsG: 10, fatG: 20 },
    tags: ['quick'],
    allergenIds: ['egg'],
    ingredients: [
      { name: 'Trứng', amount: '3 quả', allergenId: 'egg' },
      { name: 'Cà chua', amount: '2 quả' },
    ],
    steps: [
      { order: 1, instruction: 'Đánh tan trứng, chiên sơ rồi để riêng.' },
      { order: 2, instruction: 'Xào cà chua chín mềm, cho trứng vào đảo đều.' },
    ],
  },
  {
    id: 'salad-trung',
    name: 'Salad trứng',
    durationMinutes: 10,
    rating: 4.3,
    servings: 1,
    nutritionPerServing: { calories: 240, proteinG: 14, carbsG: 8, fatG: 18 },
    tags: ['quick'],
    allergenIds: ['egg'],
    ingredients: [
      { name: 'Trứng luộc', amount: '2 quả', allergenId: 'egg' },
      { name: 'Xà lách', amount: '1 cây' },
      { name: 'Cà chua', amount: '1 quả' },
    ],
    steps: [
      { order: 1, instruction: 'Luộc chín trứng, bổ múi cau.' },
      { order: 2, instruction: 'Trộn đều với xà lách và cà chua thái lát.' },
    ],
  },
  {
    id: 'sup-bi-do-kem-tuoi',
    name: 'Súp bí đỏ kem tươi',
    durationMinutes: 30,
    rating: 4.6,
    servings: 2,
    nutritionPerServing: { calories: 260, proteinG: 6, carbsG: 28, fatG: 12 },
    tags: ['vegetarian'],
    allergenIds: ['dairy'],
    ingredients: [
      { name: 'Bí đỏ', amount: '400 g' },
      { name: 'Kem tươi', amount: '100 ml', allergenId: 'dairy' },
      { name: 'Hành tây', amount: '1 củ' },
    ],
    steps: [
      { order: 1, instruction: 'Hấp chín bí đỏ và hành tây.' },
      { order: 2, instruction: 'Xay nhuyễn cùng kem tươi, đun nhỏ lửa đến sánh mịn.' },
    ],
  },
  {
    // Đợt 6 (Meal Planner) — khớp đúng số liệu bữa sáng CN trong design/MealPlanner.dc.html
    // (350 kcal · 10 phút). Có sữa tươi → allergenIds ['dairy'] để bộ lọc dị ứng dùng chung
    // (recipeService.filterOutUserAllergens) loại đúng món này khỏi gợi ý AI khi user dị ứng
    // sữa, dù vẫn hiển thị bình thường ở slot đã lên kế hoạch sẵn (không lọc lại dữ liệu đã chọn).
    id: 'yen-mach-chuoi',
    name: 'Yến mạch chuối',
    durationMinutes: 10,
    rating: 4.5,
    servings: 1,
    nutritionPerServing: { calories: 350, proteinG: 10, carbsG: 58, fatG: 9 },
    tags: ['vegetarian', 'quick'],
    allergenIds: ['dairy'],
    ingredients: [
      { name: 'Yến mạch', amount: '50 g' },
      { name: 'Chuối', amount: '1 quả' },
      { name: 'Sữa tươi', amount: '200 ml', allergenId: 'dairy' },
      { name: 'Mật ong', amount: '1 thìa canh', unknownComposition: true },
    ],
    steps: [
      { order: 1, instruction: 'Nấu yến mạch với sữa tươi trên lửa nhỏ khoảng 5 phút.' },
      { order: 2, instruction: 'Cắt chuối lát, trộn cùng yến mạch, rưới mật ong.' },
    ],
  },
];
