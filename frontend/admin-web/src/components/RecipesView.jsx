import React, { useState, useEffect } from 'react';
import {
  Search,
  PlusCircle,
  Edit,
  Trash2,
  Clock,
  Flame,
  Crown,
  ChefHat,
  Filter,
  X,
  ExternalLink,
  Plus,
  Minus,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import RecipeExcelImportModal from './RecipeExcelImportModal';

const PAGE_SIZE = 16;

// Đúng tên tag ở backend (bảng Tags) — app mobile hiển thị và lọc theo cùng định nghĩa.
const AVAILABLE_TAGS = [
  { code: 'eatClean', name: 'Eat Clean' },
  { code: 'keto', name: 'Keto' },
  { code: 'vegan', name: 'Thuần Chay (Vegan)' },
  { code: 'highProtein', name: 'Tăng Cơ (High Protein)' },
  { code: 'quick', name: 'Nhanh Gọn (< 15 phút)' },
  { code: 'budget', name: 'Tiết Kiệm Ngân Sách' },
  { code: 'lowCarb', name: 'Low-Carb' },
  { code: 'vegetarian', name: 'Ăn Chay (Vegetarian)' },
];

export default function RecipesView({ onNotify, initialOpenAdd = false, onResetAddTrigger }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mealFilter, setMealFilter] = useState('all');
  const [diffFilter, setDiffFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const initialFormData = {
    title: '',
    description: '',
    imageUrl: '',
    instructions: '',
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    servings: 1,
    difficulty: 'Easy',
    isPremium: false,
    mealTypes: ['Lunch'],
    caloriesPerServing: 350,
    proteinPerServing: 25,
    carbsPerServing: 30,
    fatPerServing: 10,
    tagCodes: ['eatClean'],
    ingredients: [
      { name: 'Ức gà phi lê', category: 'Meat', unit: 'g', amount: 150, caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, estimatedPriceVnd: 20000 }
    ]
  };
  const [formData, setFormData] = useState(initialFormData);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        pageSize: PAGE_SIZE,
        search,
        mealType: mealFilter !== 'all' ? mealFilter : '',
        difficulty: diffFilter !== 'all' ? diffFilter : ''
      };
      const { items, total: count } = await api.getRecipes(params);
      setRecipes(items);
      setTotal(count);
    } catch (err) {
      onNotify('Lỗi tải danh sách món ăn: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, [search, mealFilter, diffFilter, page]);

  useEffect(() => {
    if (initialOpenAdd) {
      handleOpenCreate();
      if (onResetAddTrigger) onResetAddTrigger();
    }
  }, [initialOpenAdd]);

  const handleOpenCreate = () => {
    setEditingRecipe(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const handleOpenEdit = async (recipe) => {
    try {
      setEditingRecipe(recipe);
      // Lấy chi tiết món để có đầy đủ nguyên liệu
      const detail = await api.getRecipeDetail(recipe.id);
      const mealArr = detail.mealTypes ? detail.mealTypes.split(',').map(m => m.trim()) : ['Lunch'];
      setFormData({
        title: detail.title,
        description: detail.description,
        imageUrl: detail.imageUrl,
        instructions: detail.instructions,
        prepTimeMinutes: detail.prepTimeMinutes,
        cookTimeMinutes: detail.cookTimeMinutes,
        servings: detail.servings,
        difficulty: detail.difficulty,
        isPremium: detail.isPremium,
        mealTypes: mealArr,
        caloriesPerServing: detail.caloriesPerServing,
        proteinPerServing: detail.proteinPerServing,
        carbsPerServing: detail.carbsPerServing,
        fatPerServing: detail.fatPerServing,
        tagCodes: detail.tagCodes || [],
        ingredients: detail.ingredients && detail.ingredients.length > 0 ? detail.ingredients.map(i => ({
          name: i.name,
          category: i.category || 'Other',
          unit: i.unit || 'g',
          amount: i.amount || 100,
          caloriesPer100g: i.caloriesPer100g || 0,
          proteinPer100g: i.proteinPer100g || 0,
          carbsPer100g: i.carbsPer100g || 0,
          fatPer100g: i.fatPer100g || 0,
          estimatedPriceVnd: i.estimatedPriceVnd || 0
        })) : initialFormData.ingredients
      });
      setShowModal(true);
    } catch (err) {
      onNotify('Không thể tải chi tiết món ăn: ' + err.message, 'error');
    }
  };

  const handleDelete = async (recipe) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa món ăn "${recipe.title}"?`)) {
      return;
    }
    try {
      await api.deleteRecipe(recipe.id);
      onNotify('Đã xóa món ăn thành công!', 'success');
      loadRecipes();
    } catch (err) {
      onNotify('Xóa món ăn thất bại: ' + err.message, 'error');
    }
  };

  const handleToggleTag = (code) => {
    setFormData(prev => {
      const exists = prev.tagCodes.includes(code);
      return {
        ...prev,
        tagCodes: exists ? prev.tagCodes.filter(c => c !== code) : [...prev.tagCodes, code]
      };
    });
  };

  const handleToggleMeal = (meal) => {
    setFormData(prev => {
      const exists = prev.mealTypes.includes(meal);
      if (exists && prev.mealTypes.length === 1) return prev; // ít nhất 1 bữa
      return {
        ...prev,
        mealTypes: exists ? prev.mealTypes.filter(m => m !== meal) : [...prev.mealTypes, meal]
      };
    });
  };

  const handleAddIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { name: '', category: 'Vegetable', unit: 'g', amount: 100, caloriesPer100g: 30, proteinPer100g: 1, carbsPer100g: 5, fatPer100g: 0, estimatedPriceVnd: 5000 }
      ]
    }));
  };

  const handleRemoveIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const handleIngredientChange = (index, field, value) => {
    setFormData(prev => {
      const list = [...prev.ingredients];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, ingredients: list };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      onNotify('Vui lòng nhập tên món ăn.', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        mealTypes: formData.mealTypes.join(',')
      };

      if (editingRecipe) {
        await api.updateRecipe(editingRecipe.id, payload);
        onNotify('Đã cập nhật món ăn thành công!', 'success');
      } else {
        await api.createRecipe(payload);
        onNotify('Đã thêm món ăn mới vào thực đơn thành công!', 'success');
      }

      setShowModal(false);
      loadRecipes();
    } catch (err) {
      onNotify('Lỗi lưu món ăn: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Action and Filter Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            className="form-input"
            placeholder="Tìm theo tên món ăn, mô tả..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div className="filter-actions">
          <select
            className="form-select"
            value={mealFilter}
            onChange={(e) => { setMealFilter(e.target.value); setPage(1); }}
            style={{ width: '135px' }}
          >
            <option value="all">Mọi bữa ăn</option>
            <option value="Breakfast">Bữa Sáng</option>
            <option value="Lunch">Bữa Trưa</option>
            <option value="Dinner">Bữa Tối</option>
            <option value="Snack">Bữa Phụ</option>
          </select>

          <select
            className="form-select"
            value={diffFilter}
            onChange={(e) => { setDiffFilter(e.target.value); setPage(1); }}
            style={{ width: '130px' }}
          >
            <option value="all">Mọi độ khó</option>
            <option value="Easy">Dễ làm</option>
            <option value="Medium">Trung bình</option>
            <option value="Hard">Cầu kỳ / Khó</option>
          </select>

          <button
            className="btn btn-secondary"
            onClick={() => setShowExcelModal(true)}
            style={{
              color: '#10b981',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              background: 'rgba(16, 185, 129, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            title="Thêm hàng loạt món ăn bằng file Excel (.xlsx, .xls, .csv)"
          >
            <FileSpreadsheet size={17} />
            <span>Nhập File Excel</span>
          </button>

          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <PlusCircle size={17} />
            <span>Thêm Món Ăn Mới</span>
          </button>
        </div>
      </div>

      {/* Recipe Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Đang tải danh sách món ăn...
        </div>
      ) : recipes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
          <ChefHat size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <h3>Không tìm thấy món ăn nào</h3>
          <p style={{ marginTop: '6px' }}>Thử thay đổi từ khóa tìm kiếm hoặc bấm Thêm Món Ăn Mới.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '22px' }}>
          {recipes.map((r) => (
            <div
              key={r.id}
              className="card"
              style={{
                padding: '0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
            >
              {/* Image Thumbnail */}
              <div style={{ position: 'relative', height: '170px', overflow: 'hidden' }}>
                <img
                  src={r.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'}
                  alt={r.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                  }}
                />

                {/* Pro Badge */}
                {r.isPremium && (
                  <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                    <span className="badge badge-pro">
                      <Crown size={12} /> Pro
                    </span>
                  </div>
                )}

                {/* Difficulty */}
                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <span
                    className={`badge ${
                      r.difficulty === 'Easy' ? 'badge-success' : r.difficulty === 'Medium' ? 'badge-warning' : 'badge-danger'
                    }`}
                  >
                    {r.difficulty === 'Easy' ? 'Dễ' : r.difficulty === 'Medium' ? 'Vừa' : 'Khó'}
                  </span>
                </div>
              </div>

              {/* Recipe Info */}
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    marginBottom: '6px',
                    lineHeight: 1.3
                  }}
                >
                  {r.title}
                </h4>

                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    marginBottom: '14px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.4
                  }}
                >
                  {r.description || 'Chưa có mô tả ngắn cho món ăn này.'}
                </p>

                {/* Nutrition & Time Chips */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px', borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontWeight: 600 }}>
                    <Flame size={14} />
                    {Math.round(r.caloriesPerServing)} kcal
                  </span>

                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} />
                    {r.totalTimeMinutes} phút
                  </span>

                  <span style={{ color: '#34d399', fontWeight: 600 }}>
                    {r.proteinPerServing}g P
                  </span>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px', flex: 1 }}>
                  {(r.tags || []).slice(0, 3).map((t, idx) => (
                    <span key={idx} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                      #{t}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => handleOpenEdit(r)}
                  >
                    <Edit size={14} />
                    <span>Sửa</span>
                  </button>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(r)}
                    title="Xóa món ăn"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} itemLabel="món ăn" />
      )}

      {/* Modal: Thêm / Sửa Món Ăn */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingRecipe ? 'Chỉnh Sửa Món Ăn' : 'Thêm Món Ăn Mới Vào Cơ Sở Dữ Liệu'}
              </h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. Tên món & Mô tả */}
                <div className="form-group">
                  <label className="form-label">Tên Món Ăn (*):</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Salad ức gà sốt mè rang bơ sáp"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mô Tả Hấp Dẫn:</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Giới thiệu hương vị, lợi ích sức khỏe và nguyên liệu chính..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* 2. Link Ảnh & Preview */}
                <div className="form-group">
                  <label className="form-label">Link Hình Ảnh (Unsplash / Web URL):</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  />
                  {formData.imageUrl && (
                    <img
                      src={formData.imageUrl}
                      alt="Xem trước ảnh món ăn"
                      className="img-preview"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                </div>

                {/* 3. Thời gian & Thông số */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Chuẩn Bị (phút):</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={formData.prepTimeMinutes}
                      onChange={(e) => setFormData({ ...formData, prepTimeMinutes: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nấu (phút):</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={formData.cookTimeMinutes}
                      onChange={(e) => setFormData({ ...formData, cookTimeMinutes: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Khẩu Phần:</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={formData.servings}
                      onChange={(e) => setFormData({ ...formData, servings: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Độ Khó:</label>
                    <select
                      className="form-select"
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    >
                      <option value="Easy">Dễ (Easy)</option>
                      <option value="Medium">Trung bình (Medium)</option>
                      <option value="Hard">Cầu kỳ (Hard)</option>
                    </select>
                  </div>
                </div>

                {/* 4. Dinh dưỡng Macros per serving */}
                <div style={{ background: 'rgba(15,23,42,0.6)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '10px', color: '#f59e0b' }}>
                    Chỉ Số Dinh Dưỡng Cho Mỗi Khẩu Phần:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    <div>
                      <label className="form-label">Calo (kcal):</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.caloriesPerServing}
                        onChange={(e) => setFormData({ ...formData, caloriesPerServing: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="form-label">Protein (g):</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.proteinPerServing}
                        onChange={(e) => setFormData({ ...formData, proteinPerServing: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="form-label">Carbs (g):</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.carbsPerServing}
                        onChange={(e) => setFormData({ ...formData, carbsPerServing: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="form-label">Fat (g):</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.fatPerServing}
                        onChange={(e) => setFormData({ ...formData, fatPerServing: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Phân Loại Bữa Ăn & Gói Pro */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label className="form-label">Bữa Ăn Phù Hợp:</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((m) => {
                        const isSelected = formData.mealTypes.includes(m);
                        const label = m === 'Breakfast' ? 'Bữa Sáng' : m === 'Lunch' ? 'Bữa Trưa' : m === 'Dinner' ? 'Bữa Tối' : 'Bữa Phụ';
                        return (
                          <button
                            type="button"
                            key={m}
                            className={`tag-chip ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleToggleMeal(m)}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Quyền Truy Cập Hội Viên:</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.isPremium}
                        onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                      />
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: formData.isPremium ? '#fbbf24' : 'var(--text-main)' }}>
                        Chỉ dành riêng cho thành viên Pro / VIP
                      </span>
                    </label>
                  </div>
                </div>

                {/* 6. Chọn Thẻ Tags Dinh Dưỡng */}
                <div>
                  <label className="form-label">Thẻ Phân Loại Dinh Dưỡng (Tags):</label>
                  <div className="tags-selector">
                    {AVAILABLE_TAGS.map((t) => {
                      const isSelected = formData.tagCodes.includes(t.code);
                      return (
                        <div
                          key={t.code}
                          className={`tag-chip ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleToggleTag(t.code)}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {t.name}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 7. Danh sách nguyên liệu */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label className="form-label">Danh Sách Nguyên Liệu:</label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddIngredient}>
                      <Plus size={14} />
                      <span>Thêm nguyên liệu</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {formData.ingredients.map((ing, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                          gap: '8px',
                          alignItems: 'center',
                          background: 'rgba(15,23,42,0.4)',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Tên nguyên liệu (VD: Ức gà)"
                          value={ing.name}
                          onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Số lượng"
                          value={ing.amount}
                          onChange={(e) => handleIngredientChange(idx, 'amount', Number(e.target.value))}
                        />
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Đơn vị (g, quả...)"
                          value={ing.unit}
                          onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                        />
                        <input
                          type="number"
                          className="form-input"
                          placeholder="Giá VND"
                          value={ing.estimatedPriceVnd}
                          onChange={(e) => handleIngredientChange(idx, 'estimatedPriceVnd', Number(e.target.value))}
                        />
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRemoveIngredient(idx)}
                          disabled={formData.ingredients.length === 1}
                        >
                          <Minus size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 8. Hướng dẫn chế biến */}
                <div className="form-group">
                  <label className="form-label">Các Bước Chế Biến:</label>
                  <textarea
                    className="form-textarea"
                    style={{ minHeight: '110px' }}
                    placeholder="1. Sơ chế sạch nguyên liệu...&#10;2. Ướp gia vị vừa ăn...&#10;3. Nấu ở lửa vừa trong 15 phút..."
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : editingRecipe ? 'Lưu Thay Đổi' : 'Tạo Món Ăn Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Nhập Món Ăn Bằng File Excel */}
      <RecipeExcelImportModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        onSuccess={() => {
          loadRecipes();
        }}
        onNotify={onNotify}
      />
    </div>
  );
}

