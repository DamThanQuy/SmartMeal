# 📜 SMARTMEAL - TÀI LIỆU HỢP ĐỒNG API (API CONTRACT SPECIFICATION)
> **Phiên bản**: V2.0 (Tương thích ASP.NET Core .NET 8, PostgreSQL & Flutter)  
> **Dự án**: PRM (Mobile Programming) - Đại học FPT  
> **Ngày cập nhật trạng thái**: 2026-09-26  
> **Tài liệu tham chiếu**: [SmartMeal_Overview_V2.md](./SmartMeal_Overview_V2.md)

---

## 🌐 1. QUY CHUẨN CHUNG (GENERAL CONVENTIONS)

### 1.1. Base URL & Protocol
* **Local Development**: `http://localhost:5000/api` hoặc `http://10.0.2.2:5000/api` (Android Emulator)
* **Production / Docker**: `http://api.smartmeal.com/api`
* **Format**: `JSON` (`application/json`), ngoại trừ các API upload ảnh sử dụng `multipart/form-data`.

### 1.2. Chuẩn Header xác thực (Authentication Header)
Đối với các endpoint yêu cầu xác thực (`[Authorize]`):
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### 1.3. Cấu trúc Response chuẩn (Standard Response Envelope)
Mọi API đều trả về định dạng wrapper thống nhất:

```json
{
  "success": true,
  "message": "Thao tác thành công.",
  "data": { ... },
  "errors": []
}
```

* **Thành công (200, 201)**: `success = true`, `data` chứa dữ liệu, `errors = []`.
* **Thất bại (400, 401, 403, 404, 500)**: `success = false`, `data = null`, `errors` chứa danh sách chi tiết lỗi.

---

## 📑 2. BẢNG TỔNG QUAN TIẾN ĐỘ THEO MODULE & ENDPOINTS

| STT | Module Nghiệp Vụ | Endpoint | Method | Yêu cầu Auth | Trạng thái Backend |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **1** | **Auth** | `/api/auth/register` | `POST` | ❌ Public |  **ĐÃ HOÀN THÀNH** |
| | | `/api/auth/login` | `POST` | ❌ Public |  **ĐÃ HOÀN THÀNH** |
| | | `/api/auth/google` | `POST` | ❌ Public |  **ĐÃ HOÀN THÀNH** |
| | | `/api/auth/me` | `GET` | ✅ Bearer |  **ĐÃ HOÀN THÀNH** |
| | | `/api/auth/profile` | `PUT` | ✅ Bearer | ⏳ *Chưa làm* |
| **2** | **Health Profile** | `/api/healthprofile/survey` | `POST` | ✅ Bearer |  **ĐÃ HOÀN THÀNH** |
| | | `/api/healthprofile` | `GET` | ✅ Bearer |  **ĐÃ HOÀN THÀNH** |
| | | `/api/healthprofile/weight-log` | `POST` | ✅ Bearer | ⏳ *Chưa làm* |
| | | `/api/healthprofile/weight-history`| `GET` | ✅ Bearer | ⏳ *Chưa làm* |
| **3** | **AI Vision & Smart** | `/api/ai/snap-and-track` | `POST` | ✅ Bearer (Tùy chọn) |  **ĐÃ HOÀN THÀNH** |
| | | `/api/ai/fridge-scanner` | `POST` | ❌ Public |  **ĐÃ HOÀN THÀNH** |
| | | `/api/ai/voice-log` | `POST` | ❌ Public |  **ĐÃ HOÀN THÀNH** |
| | | `/api/ai/check-safety` | `POST` | ✅ Bearer (Tùy chọn) |  **ĐÃ HOÀN THÀNH** |
| **4** | **Recipes** | `/api/recipes` | `GET` | ❌ Public |  **ĐÃ HOÀN THÀNH** |
| | | `/api/recipes/{id}` | `GET` | ❌ Public |  **ĐÃ HOÀN THÀNH** |
| | | `/api/recipes/suggest-by-pantry` | `POST` | ❌ Public |  **ĐÃ HOÀN THÀNH** |
| | | `/api/recipes/{id}/favorite` | `POST` | ✅ Bearer | ⏳ *Chưa làm* |
| | | `/api/recipes/favorites` | `GET` | ✅ Bearer | ⏳ *Chưa làm* |
| | | `/api/recipes/collections` | `GET` / `POST` | ✅ Bearer | ⏳ *Chưa làm* |
| **5** | **Nutrition Diary** | `/api/nutritiondiary/log` | `POST` | ✅ Bearer |  **ĐÃ HOÀN THÀNH** |
| | | `/api/nutritiondiary/daily` | `GET` | ✅ Bearer |  **ĐÃ HOÀN THÀNH** |
| | | `/api/nutritiondiary/weekly-progress`| `GET` | ✅ Bearer |  **ĐÃ HOÀN THÀNH** |
| | | `/api/nutritiondiary/items/{id}` | `DELETE` | ✅ Bearer |  **ĐÃ HOÀN THÀNH** |
| | | `/api/nutritiondiary/water` | `POST` | ✅ Bearer | ⏳ *Chưa làm* |
| **6** | **Meal Plan & Grocery**| `/api/mealplanner/week` | `GET` | ✅ Bearer |  **ĐÃ HOÀN THÀNH** |
| | | `/api/mealplanner/assign` | `POST` | ✅ Bearer |  **ĐÃ HOÀN THÀNH** |
| | | `/api/mealplanner/auto-generate` | `POST` | ✅ Bearer |  **ĐÃ HOÀN THÀNH** |
| | | `/api/grocery/generate-from-plan`| `POST` | ✅ Bearer |  **ĐÃ HOÀN THÀNH** |
| | | `/api/grocery/items/{id}/check` | `PATCH` | ✅ Bearer |  **ĐÃ HOÀN THÀNH** |
| **7** | **Health Sync** | `/api/health-sync/steps-and-calories`| `POST`| ✅ Bearer | ⏳ *Chưa làm* |
| **8** | **Gamification** | `/api/gamification/pet` | `GET` | ✅ Bearer | ⏳ *Chưa làm* |
| | | `/api/gamification/streak` | `GET` | ✅ Bearer | ⏳ *Chưa làm* |
| | | `/api/gamification/challenges` | `GET` | ✅ Bearer | ⏳ *Chưa làm* |
| **9** | **Pro Subscription** | `/api/subscription/plans` | `GET` | ❌ Public | ⏳ *Chưa làm* |
| | | `/api/subscription/create-checkout-session`| `POST` | ✅ Bearer | ⏳ *Chưa làm* |
| **10**| **Meta & Foods** | `/api/meta/allergies` | `GET` | ❌ Public |  **ĐÃ HOÀN THÀNH** |
| | | `/api/meta/medical-conditions` | `GET` | ❌ Public |  **ĐÃ HOÀN THÀNH** |
| | | `/api/meta/tags` | `GET` | ❌ Public |  **ĐÃ HOÀN THÀNH** |
| | | `/api/foods` | `GET` | ❌ Public | ⏳ *Chưa làm* |

---

## 📌 3. CHI TIẾT ĐẶC TẢ TỪNG ENDPOINT

---

### MODULE 1: AUTHENTICATION & USER PROFILE (`/api/auth`)

#### 1.1. Đăng ký tài khoản (Register) — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `POST /api/auth/register`
* **Auth**: ❌ Public
* **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123@",
    "fullName": "Nguyen Van A"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Đăng ký tài khoản thành công.",
    "data": {
      "token": "eyJhbGciOi...",
      "user": {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "email": "user@example.com",
        "fullName": "Nguyen Van A",
        "avatarUrl": null,
        "isPro": false,
        "hasCompletedSurvey": false
      }
    }
  }
  ```

#### 1.2. Đăng nhập hệ thống (Login) — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `POST /api/auth/login`
* **Auth**: ❌ Public
* **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123@"
  }
  ```
* **Response (200 OK)**: Tương tự `register`.

#### 1.3. Đăng nhập Google (Google Sign-In) — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `POST /api/auth/google`
* **Auth**: ❌ Public
* **Request Body**:
  ```json
  {
    "idToken": "google_oauth_id_token_string"
  }
  ```
* **Response (200 OK)**: Trả về Token và User info.

#### 1.4. Lấy thông tin tài khoản hiện tại (Get Me) — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `GET /api/auth/me`
* **Auth**: ✅ Bearer JWT
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "user@example.com",
      "fullName": "Nguyen Van A",
      "avatarUrl": "https://cdn.smartmeal.com/avatars/user1.jpg",
      "isPro": false,
      "hasCompletedSurvey": true,
      "createdAt": "2026-09-01T08:00:00Z"
    }
  }
  ```

#### 1.5. Cập nhật thông tin cá nhân (Update Profile) — `[TRẠNG THÁI: ⏳ CHƯA LÀM]`
* **Endpoint**: `PUT /api/auth/profile`
* **Auth**: ✅ Bearer JWT
* **Request Body**:
  ```json
  {
    "fullName": "Nguyen Van B",
    "avatarUrl": "https://..."
  }
  ```

---

### MODULE 2: HỒ SƠ SỨC KHỎE & CÁ NHÂN HÓA (`/api/healthprofile`)

#### 2.1. Nộp khảo sát thể trạng ban đầu (Submit Health Survey) — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `POST /api/healthprofile/survey`
* **Auth**: ✅ Bearer JWT
* **Request Body**:
  ```json
  {
    "gender": "Male", // "Male" | "Female"
    "age": 22,
    "height": 175.0, // cm
    "weight": 70.0, // kg
    "activityLevel": "ModeratelyActive", // Sedentary, LightlyActive, ModeratelyActive, VeryActive, ExtraActive
    "dietGoal": "LoseWeight", // LoseWeight, Maintain, GainWeight, BuildMuscle
    "targetWeight": 65.0,
    "allergyIds": ["b1a03fc5-671e-4cba-a18a-9892c575cf2a"],
    "medicalConditionIds": []
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Cập nhật hồ sơ sức khỏe thành công.",
    "data": {
      "bmi": 22.86,
      "bmiClassification": "Bình thường",
      "bmr": 1680.5,
      "tdee": 2604.8,
      "calorieGoal": 2104, // TDEE - 500 nếu giảm cân
      "targetCarbsGrams": 236.7,
      "targetProteinGrams": 131.5,
      "targetFatGrams": 70.1,
      "waterGoalMl": 2500
    }
  }
  ```

#### 2.2. Lấy hồ sơ sức khỏe chi tiết (Get Profile) — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `GET /api/healthprofile`
* **Auth**: ✅ Bearer JWT
* **Response (200 OK)**: Trả về đầy đủ BMI, BMR, TDEE, CalorieGoal, Macros và danh sách Dị ứng / Bệnh lý của User.

#### 2.3. Ghi nhận cân nặng mới (Log Weight Tracking) — `[TRẠNG THÁI: ⏳ CHƯA LÀM]`
* **Endpoint**: `POST /api/healthprofile/weight-log`
* **Auth**: ✅ Bearer JWT
* **Request Body**:
  ```json
  {
    "weight": 69.5,
    "recordedAt": "2026-09-26"
  }
  ```

#### 2.4. Lịch sử biến động cân nặng (Weight Chart Data) — `[TRẠNG THÁI: ⏳ CHƯA LÀM]`
* **Endpoint**: `GET /api/healthprofile/weight-history?days=30`
* **Auth**: ✅ Bearer JWT
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      { "date": "2026-09-01", "weight": 71.0 },
      { "date": "2026-09-15", "weight": 70.2 },
      { "date": "2026-09-26", "weight": 69.5 }
    ]
  }
  ```

---

### MODULE 3: AI VISION & GỢI Ý THÔNG MINH (`/api/ai`)

#### 3.1. AI Snap & Track đĩa ăn (Scan Meal from Image) — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `POST /api/ai/snap-and-track`
* **Auth**: ✅ Bearer (Tùy chọn, tự động đọc dị ứng nếu có token)
* **Content-Type**: `multipart/form-data`
* **Form-Data**:
  * `image`: File ảnh đĩa ăn (JPG/PNG)
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "AI nhận diện món ăn thành công.",
    "data": {
      "dishName": "Cơm ức gà áp chảo bông cải xanh",
      "estimatedGrams": 350,
      "confidenceScore": 0.94,
      "calories": 420,
      "carbs": 45.0,
      "protein": 38.0,
      "fat": 8.5,
      "detectedIngredients": ["Ức gà", "Cơm gạo lứt", "Bông cải xanh", "Dầu oliu"],
      "allergyWarnings": [],
      "healthTips": "Bữa ăn giàu protein và chất xơ..."
    }
  }
  ```

#### 3.2. Quét tủ lạnh gợi ý món (Fridge Scanner) — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `POST /api/ai/fridge-scanner`
* **Auth**: ❌ Public
* **Content-Type**: `multipart/form-data`
* **Form-Data**:
  * `image`: File ảnh nguyên liệu trong tủ lạnh
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "detectedIngredients": ["Trứng gà", "Cà chua", "Đậu hũ", "Hành lá"],
      "suggestedRecipes": [
        {
          "title": "Đậu hũ sốt cà chua thịt băm",
          "description": "Món ăn thanh đạm, đậm đà đưa cơm...",
          "calories": 280,
          "cookingTimeMinutes": 15,
          "matchingIngredients": ["Đậu hũ", "Cà chua", "Hành lá"],
          "missingIngredients": ["Thịt băm", "Gia vị"],
          "quickInstructions": "1. Cắt đậu hũ... 2. Xào thịt sốt cà..."
        }
      ]
    }
  }
  ```

#### 3.3. Bóc tách ghi nhận bằng giọng nói (Voice Logging NLP) — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `POST /api/ai/voice-log`
* **Auth**: ❌ Public
* **Request Body**:
  ```json
  {
    "transcript": "Sáng nay mình ăn một tô bún bò Huế và uống một ly nước cam ép"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "mealType": "Breakfast",
      "extractedItems": [
        { "name": "Bún bò Huế", "portionDescription": "1 tô vừa", "portionGrams": 450, "calories": 530, "carbs": 60, "protein": 28, "fat": 18 },
        { "name": "Nước cam ép", "portionDescription": "1 ly 250ml", "portionGrams": 250, "calories": 110, "carbs": 26, "protein": 2, "fat": 0.5 }
      ],
      "totalCalories": 640,
      "totalCarbs": 86.0,
      "totalProtein": 30.0,
      "totalFat": 18.5
    }
  }
  ```

#### 3.4. Quét mã vạch / OCR kiểm tra an toàn dinh dưỡng (Safety Alert) — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `POST /api/ai/check-safety`
* **Auth**: ✅ Bearer (Tùy chọn)
* **Request Body**:
  ```json
  {
    "barcode": "8934567890123",
    "ocrRawText": "Thành phần: Bột mì, đường tinh luyện, đậu phộng, muối ăn..."
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "isSafe": false,
      "alerts": [
        { "type": "ALLERGY", "message": "CẢNH BÁO: Sản phẩm có chứa 'Đậu phộng' nằm trong danh sách dị ứng của bạn!", "severity": "DANGER" }
      ],
      "detectedIngredients": ["Bột mì", "Đường tinh luyện", "Đậu phộng"],
      "extractedNutrition": {
        "caloriesPerServing": 240,
        "servingSize": "50g",
        "sugarGrams": 18.0,
        "sodiumMg": 180.0,
        "totalFatGrams": 11.0
      }
    }
  }
  ```

---

### MODULE 4: CÔNG THỨC MÓN ĂN & BỘ SƯU TẬP (`/api/recipes`)

#### 4.1. Tìm kiếm & Lọc công thức — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `GET /api/recipes`
* **Auth**: ❌ Public
* **Query Params**:
  * `search`: Từ khóa món ăn
  * `tag`: "EatClean", "Keto", "LowCarb", "Vegan"
  * `mealType`: "Breakfast", "Lunch", "Dinner", "Snack"
  * `difficulty`: "Easy", "Medium", "Hard"
  * `maxCalories`: Số calo tối đa (ví dụ `500`)
  * `page`: Trang (mặc định 1)
  * `pageSize`: Kích thước trang (mặc định 10)
* **Response (200 OK)**: Danh sách danh mục công thức kèm macro, ảnh và thời gian nấu.

#### 4.2. Chi tiết công thức nấu ăn — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `GET /api/recipes/{id}`
* **Auth**: ❌ Public
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "4d1b8277-22d7-4b7c-a496-c11c47012345",
      "title": "Salad ức gà sốt mè rang",
      "description": "Món ăn thanh đạm, giàu protein, chuẩn Eat Clean...",
      "imageUrl": "https://cdn.smartmeal.com/recipes/chicken_salad.jpg",
      "cookingTimeMinutes": 20,
      "difficulty": "Easy",
      "calories": 320,
      "carbs": 12.0,
      "protein": 35.0,
      "fat": 14.0,
      "ingredients": [
        { "name": "Ức gà phi lê", "amount": 200, "unit": "g" },
        { "name": "Xà lách Romaine", "amount": 100, "unit": "g" },
        { "name": "Sốt mè rang Kewpie", "amount": 2, "unit": "muỗng canh" }
      ],
      "instructions": [
        "Bước 1: Áp chảo ức gà vàng đều 2 mặt với lửa vừa...",
        "Bước 2: Rửa sạch rau xà lách, cà chua bi và cắt miếng vừa ăn...",
        "Bước 3: Trộn đều với sốt mè rang và thưởng thức."
      ],
      "tags": ["Eat Clean", "High Protein", "Low Carb"]
    }
  }
  ```

#### 4.3. Gợi ý theo nguyên liệu tủ lạnh (Pantry Suggestion) — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `POST /api/recipes/suggest-by-pantry`
* **Auth**: ❌ Public
* **Request Body**:
  ```json
  {
    "ingredients": ["Trứng", "Cà chua"]
  }
  ```

#### 4.4. Yêu thích & Bộ sưu tập công thức (Collections) — `[TRẠNG THÁI: ⏳ CHƯA LÀM]`
* `POST /api/recipes/{id}/favorite`: Thêm/Hủy đánh dấu yêu thích món ăn.
* `GET /api/recipes/favorites`: Lấy danh sách các món ăn đã yêu thích.
* `GET /api/recipes/collections`: Lấy danh sách các bộ sưu tập do người dùng tạo.
* `POST /api/recipes/collections`: Tạo bộ sưu tập mới (Tên, Mô tả, Ảnh bìa).
* `POST /api/recipes/collections/{collectionId}/items`: Thêm món ăn vào bộ sưu tập.

---

### MODULE 5: NHẬT KÝ DINH DƯỠNG & NƯỚC UỐNG (`/api/nutritiondiary`)

#### 5.1. Ghi nhận bữa ăn (Log Meal) — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `POST /api/nutritiondiary/log`
* **Auth**: ✅ Bearer JWT
* **Request Body**:
  ```json
  {
    "date": "2026-09-26",
    "mealType": "Lunch", // Breakfast, Lunch, Dinner, Snack
    "foodName": "Cơm gạo lứt thịt bò xào ớt chuông",
    "portionGrams": 300,
    "calories": 480,
    "carbs": 52.0,
    "protein": 34.0,
    "fat": 12.0,
    "recipeId": null,
    "imageUrl": "https://..."
  }
  ```

#### 5.2. Lấy tổng quan dinh dưỡng trong ngày (Daily Summary) — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `GET /api/nutritiondiary/daily?date=2026-09-26`
* **Auth**: ✅ Bearer JWT
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "date": "2026-09-26",
      "calorieGoal": 2100,
      "caloriesConsumed": 1450,
      "activeCaloriesBurned": 0,
      "netCalories": 1450,
      "remainingCalories": 650,
      "carbsConsumed": 150.0,
      "carbsGoal": 236.0,
      "proteinConsumed": 95.0,
      "proteinGoal": 131.0,
      "fatConsumed": 45.0,
      "fatGoal": 70.0,
      "waterIntakeMl": 0,
      "waterGoalMl": 2500,
      "meals": {
        "breakfast": [ ... ],
        "lunch": [ ... ],
        "dinner": [ ... ],
        "snack": [ ... ]
      }
    }
  }
  ```

#### 5.3. Biểu đồ tiến độ tuần (Weekly Progress) — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `GET /api/nutritiondiary/weekly-progress?startDate=2026-09-20`
* **Auth**: ✅ Bearer JWT
* **Response (200 OK)**: Trả về mảng 7 ngày kèm Calo mục tiêu và Calo thực nạp để vẽ biểu đồ `fl_chart`.

#### 5.4. Xóa món ăn khỏi nhật ký (Delete Diary Item) — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* **Endpoint**: `DELETE /api/nutritiondiary/items/{itemId}`
* **Auth**: ✅ Bearer JWT

#### 5.5. Ghi nhận lượng nước uống (Water Log) — `[TRẠNG THÁI: ⏳ CHƯA LÀM]`
* **Endpoint**: `POST /api/nutritiondiary/water`
* **Auth**: ✅ Bearer JWT
* **Request Body**:
  ```json
  {
    "amountMl": 250,
    "date": "2026-09-26"
  }
  ```

---

### MODULE 6: THỰC ĐƠN TUẦN & DANH SÁCH ĐI CHỢ (`/api/mealplanner` & `/api/grocery`) — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`

#### 6.1. Lấy kế hoạch thực đơn theo tuần (Get Weekly Meal Plan)
* **Endpoint**: `GET /api/mealplanner/week?startDate=2026-09-28`
* **Auth**: ✅ Bearer JWT

#### 6.2. Gán món ăn vào lịch tuần (Assign Meal to Plan)
* **Endpoint**: `POST /api/mealplanner/assign`
* **Auth**: ✅ Bearer JWT

#### 6.3. AI Tự động sinh thực đơn 7 ngày (AI Auto-Generate Plan)
* **Endpoint**: `POST /api/mealplanner/auto-generate`
* **Auth**: ✅ Bearer JWT

#### 6.4. Tự động sinh danh sách đi chợ từ thực đơn tuần (Generate Smart Grocery List)
* **Endpoint**: `POST /api/grocery/generate-from-plan`
* **Auth**: ✅ Bearer JWT

#### 6.5. Đánh dấu đã mua nguyên liệu (Toggle Grocery Item)
* **Endpoint**: `PATCH /api/grocery/items/{itemId}/check`
* **Auth**: ✅ Bearer JWT

---

### MODULE 7: ĐỒNG BỘ THIẾT BỊ ĐEO (HEALTH SYNC) (`/api/health-sync`) — `[TRẠNG THÁI: ⏳ CHƯA LÀM]`

#### 7.1. Đồng bộ bước chân & Calo tiêu hao (Sync Wearable Metrics)
* **Endpoint**: `POST /api/health-sync/steps-and-calories`
* **Auth**: ✅ Bearer JWT
* **Request Body**:
  ```json
  {
    "date": "2026-09-26",
    "stepCount": 8520,
    "activeCaloriesBurned": 345.5,
    "distanceMeters": 6100.0,
    "source": "HealthConnect"
  }
  ```

---

### MODULE 8: GAMIFICATION - LINH VẬT & THỬ THÁCH (`/api/gamification`) — `[TRẠNG THÁI: ⏳ CHƯA LÀM]`

#### 8.1. Lấy thông tin Linh vật sức khỏe (Get Health Pet Status)
* **Endpoint**: `GET /api/gamification/pet`
* **Auth**: ✅ Bearer JWT

#### 8.2. Lấy chuỗi Streak & Huy hiệu thành tích (Get Streak & Badges)
* **Endpoint**: `GET /api/gamification/streak`
* **Auth**: ✅ Bearer JWT

#### 8.3. Danh sách thử thách cộng đồng (Community Challenges)
* `GET /api/gamification/challenges`: Lấy danh sách thử thách.
* `POST /api/gamification/challenges/{id}/join`: Tham gia thử thách.

---

### MODULE 9: GÓI NÂNG CAO (PRO SUBSCRIPTION) (`/api/subscription`) — `[TRẠNG THÁI: ⏳ CHƯA LÀM]`

#### 9.1. Lấy danh sách gói thuê bao
* **Endpoint**: `GET /api/subscription/plans`
* **Auth**: ❌ Public

#### 9.2. Tạo phiên thanh toán (Checkout Session)
* **Endpoint**: `POST /api/subscription/create-checkout-session`
* **Auth**: ✅ Bearer JWT

---

### MODULE 10: DANH MỤC HỆ THỐNG & CƠ SỞ THỰC PHẨM (`/api/meta` & `/api/foods`)

#### 10.1. Danh mục dị ứng, bệnh lý và tags — `[TRẠNG THÁI: ✅ ĐÃ HOÀN THÀNH]`
* `GET /api/meta/allergies`: Lấy danh sách các loại dị ứng (Hải sản, Đậu phộng, Gluten,...).
* `GET /api/meta/medical-conditions`: Lấy danh mục bệnh lý (Tiểu đường, Gout, Cao huyết áp,...).
* `GET /api/meta/tags`: Lấy danh mục nhãn dinh dưỡng (Keto, Eat Clean, Chay,...).

#### 10.2. Tra cứu cơ sở dữ liệu thực phẩm chuẩn (Standard Food Database) — `[TRẠNG THÁI: ⏳ CHƯA LÀM]`
* **Endpoint**: `GET /api/foods?search=ức gà`
* **Auth**: ❌ Public

---

## 🔒 4. MÃ TRẠNG THÁI HTTP & XỬ LÝ LỖI (ERROR CODES)

| HTTP Code | Định nghĩa | Trường hợp xảy ra |
| :---: | :--- | :--- |
| **200 OK** | Thành công | Thao tác truy vấn hoặc cập nhật thành công. |
| **201 Created** | Tạo mới thành công | Tạo tài khoản, tạo bản ghi nhật ký/công thức thành công. |
| **400 Bad Request** | Dữ liệu không hợp lệ | Thiếu trường bắt buộc, dữ liệu sai định dạng validation. |
| **401 Unauthorized** | Chưa xác thực | Không truyền Bearer Token hoặc Token đã hết hạn. |
| **403 Forbidden** | Không có quyền | Cố gắng chỉnh sửa hoặc xóa dữ liệu của User khác; Tính năng yêu cầu Pro. |
| **404 Not Found** | Không tìm thấy | ID món ăn, bài khảo sát hoặc User không tồn tại trong Database. |
| **500 Server Error** | Lỗi máy chủ | Lỗi xử lý backend hoặc lỗi kết nối dịch vụ bên thứ 3 (Gemini/PostgreSQL). |
