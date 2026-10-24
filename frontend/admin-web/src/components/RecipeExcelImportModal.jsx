import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  FileCheck,
  Check,
  RefreshCw,
  Info
} from 'lucide-react';
import { api } from '../services/api';

const SAMPLE_TEMPLATE_DATA = [
  {
    TenMonAn: 'Salad Ức Gà Áp Chảo Sốt Mè Rang',
    MoTa: 'Món salad thanh mát giàu đạm tự nhiên, thích hợp cho người theo đuổi lối sống Eat Clean và giảm mỡ.',
    LinkAnh: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    BuaAn: 'Lunch',
    DoKho: 'Easy',
    ThoiGianChuanBiPhut: 10,
    ThoiGianNauPhut: 15,
    KhauPhan: 1,
    GoiProVip: 'FALSE',
    Calo: 380,
    Protein: 35,
    Carbs: 15,
    Fat: 12,
    TheTag: 'eatClean, highProtein',
    NguyenLieu: 'Ức gà phi lê: 150g; Xà lách xoăn: 100g; Cà chua bi: 50g; Dưa leo: 50g; Sốt mè rang: 15ml; Dầu ô liu: 5ml',
    CachLam: '1. Rửa sạch ức gà, ướp với chút muối tiêu trong 10 phút.\n2. Làm nóng chảo với dầu ô liu, áp chảo ức gà vàng đều 2 mặt mỗi mặt 5-6 phút.\n3. Rửa sạch các loại rau củ, cắt vừa ăn.\n4. Thái ức gà thành lát mỏng, xếp lên đĩa rau và rưới sốt mè rang lên trên.'
  },
  {
    TenMonAn: 'Cháo Yến Mạch Táo Quế Hạnh Nhân',
    MoTa: 'Bữa sáng ấm áp, no lâu, dồi dào chất xơ beta-glucan giúp ổn định đường huyết đầu ngày.',
    LinkAnh: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=600&q=80',
    BuaAn: 'Breakfast',
    DoKho: 'Easy',
    ThoiGianChuanBiPhut: 5,
    ThoiGianNauPhut: 10,
    KhauPhan: 1,
    GoiProVip: 'FALSE',
    Calo: 295,
    Protein: 11,
    Carbs: 48,
    Fat: 6,
    TheTag: 'quick, eatClean, vegetarian',
    NguyenLieu: 'Yến mạch cán dẹt: 50g; Sữa hạnh nhân không đường: 200ml; Táo tươi: 0.5 quả; Hạt hạnh nhân: 10g; Bột quế: 2g; Mật ong: 5ml',
    CachLam: '1. Đun sôi nhẹ sữa hạnh nhân trong nồi nhỏ.\n2. Cho yến mạch vào khuấy đều trên lửa nhỏ trong 5 phút đến khi sánh mịn.\n3. Rót cháo ra bát, xếp táo cắt lát và rắc hạnh nhân, bột quế lên trên cùng chút mật ong.'
  },
  {
    TenMonAn: 'Cá Hồi Nướng Măng Tây Pro VIP',
    MoTa: 'Món ăn cao cấp chuẩn nhà hàng giàu axit béo Omega-3 tinh khiết hỗ trợ tim mạch và phát triển cơ bắp.',
    LinkAnh: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80',
    BuaAn: 'Dinner',
    DoKho: 'Medium',
    ThoiGianChuanBiPhut: 15,
    ThoiGianNauPhut: 20,
    KhauPhan: 1,
    GoiProVip: 'TRUE',
    Calo: 510,
    Protein: 42,
    Carbs: 10,
    Fat: 28,
    TheTag: 'keto, highProtein, eatClean',
    NguyenLieu: 'Phi lê cá hồi tươi: 200g; Măng tây xanh: 100g; Bơ lạt: 10g; Tỏi băm: 5g; Chanh vàng: 0.5 quả; Muối tiêu lá hương thảo: 3g',
    CachLam: '1. Thấm khô phi lê cá hồi, ướp muối, tiêu, tỏi băm và lá hương thảo.\n2. Cắt bỏ gốc già của măng tây, trộn đều với chút dầu ô liu.\n3. Làm nóng lò nướng hoặc nồi chiên không dầu ở 190°C.\n4. Nướng cá và măng tây trong 15-18 phút. Thêm bơ lạt và vắt chanh khi còn nóng.'
  }
];

export default function RecipeExcelImportModal({ isOpen, onClose, onSuccess, onNotify }) {
  const [file, setFile] = useState(null);
  const [parsedRecipes, setParsedRecipes] = useState([]);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // 1. Tải File Excel Mẫu
  const handleDownloadTemplate = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE_DATA);
      
      // Định dạng độ rộng cột (Column widths)
      ws['!cols'] = [
        { wch: 32 }, // TenMonAn
        { wch: 45 }, // MoTa
        { wch: 35 }, // LinkAnh
        { wch: 12 }, // BuaAn
        { wch: 10 }, // DoKho
        { wch: 18 }, // ThoiGianChuanBiPhut
        { wch: 18 }, // ThoiGianNauPhut
        { wch: 10 }, // KhauPhan
        { wch: 12 }, // GoiProVip
        { wch: 10 }, // Calo
        { wch: 10 }, // Protein
        { wch: 10 }, // Carbs
        { wch: 10 }, // Fat
        { wch: 25 }, // TheTag
        { wch: 45 }, // NguyenLieu
        { wch: 55 }, // CachLam
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'DanhSachMonAn');
      XLSX.writeFile(wb, 'SmartMeal_Mau_Nhap_Mon_An.xlsx');
      onNotify('Đã tải xuống file Excel mẫu thành công!', 'success');
    } catch (err) {
      onNotify('Lỗi khi tải file mẫu: ' + err.message, 'error');
    }
  };

  // 2. Phân tích cú pháp chuỗi nguyên liệu (vd: "Ức gà: 150g; Rau xà lách: 50g")
  const parseIngredientsString = (raw) => {
    if (!raw || typeof raw !== 'string') return [];
    
    // Tách bằng dấu chấm phẩy hoặc dấu phẩy hoặc xuống dòng
    const parts = raw.split(/[;\n]/).map(p => p.trim()).filter(Boolean);
    const list = [];

    for (const part of parts) {
      let name = part;
      let amount = 100;
      let unit = 'g';

      if (part.includes(':')) {
        const [n, qty] = part.split(':').map(s => s.trim());
        name = n;
        if (qty) {
          const match = qty.match(/^([\d.,]+)\s*([a-zA-Zà-ỹÀ-Ỹ\s]*)$/);
          if (match) {
            amount = parseFloat(match[1].replace(',', '.')) || 100;
            unit = match[2].trim() || 'g';
          } else {
            unit = qty;
          }
        }
      } else {
        // Thử match định dạng: "Ức gà 150g"
        const match = part.match(/^(.*?)\s+([\d.,]+)\s*([a-zA-Zà-ỹÀ-Ỹ]*)$/);
        if (match) {
          name = match[1].trim();
          amount = parseFloat(match[2].replace(',', '.')) || 100;
          unit = match[3].trim() || 'g';
        }
      }

      if (name) {
        list.push({
          name,
          category: 'Other',
          unit: unit || 'g',
          amount: amount > 0 ? amount : 100,
          caloriesPer100g: 0,
          proteinPer100g: 0,
          carbsPer100g: 0,
          fatPer100g: 0,
          estimatedPriceVnd: 0
        });
      }
    }

    return list;
  };

  // 3. Phân tích chuỗi thẻ Tag (vd: "eatClean, highProtein")
  const parseTagsString = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return String(raw)
      .split(/[;,]/)
      .map(t => t.trim())
      .filter(Boolean);
  };

  // 4. Xử lý tải và đọc file Excel
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsedRecipes([]);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          onNotify('File Excel không có dữ liệu.', 'error');
          return;
        }

        // Chuẩn hóa và map linh hoạt tên cột (hỗ trợ cả tiếng Việt và tiếng Anh)
        const parsed = rawJson.map((row, idx) => {
          const getVal = (keys, fallback = '') => {
            for (const k of keys) {
              if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
                return row[k];
              }
            }
            return fallback;
          };

          const title = String(getVal(['TenMonAn', 'Tên món ăn', 'Title', 'Name', 'Ten'], '')).trim();
          const description = String(getVal(['MoTa', 'Mô tả', 'Description', 'Desc'], '')).trim();
          const imageUrl = String(getVal(['LinkAnh', 'Hình ảnh', 'ImageUrl', 'Image', 'Anh'], '')).trim();
          const mealTypes = String(getVal(['BuaAn', 'Bữa ăn', 'MealType', 'MealTypes'], 'Lunch')).trim();
          const difficulty = String(getVal(['DoKho', 'Độ khó', 'Difficulty'], 'Easy')).trim();
          const parseMinutes = (keys, fallback) => {
            const value = parseInt(getVal(keys, fallback), 10);
            return Number.isNaN(value) ? fallback : value;
          };
          const prepTime = parseMinutes(['ThoiGianChuanBiPhut', 'Chuẩn bị', 'PrepTime', 'PrepTimeMinutes'], 10);
          const cookTime = parseMinutes(['ThoiGianNauPhut', 'Nấu', 'CookTime', 'CookTimeMinutes'], 15);
          const servings = parseInt(getVal(['KhauPhan', 'Khẩu phần', 'Servings'], 1)) || 1;
          
          const rawPro = String(getVal(['GoiProVip', 'Pro', 'VIP', 'IsPremium', 'Premium'], 'FALSE')).toUpperCase();
          const isPremium = rawPro === 'TRUE' || rawPro === 'YES' || rawPro === '1' || rawPro === 'VIP';

          const calories = parseFloat(getVal(['Calo', 'Calories', 'Kcal', 'CaloriesPerServing'], 0)) || 0;
          const protein = parseFloat(getVal(['Protein', 'Đạm', 'ProteinPerServing'], 0)) || 0;
          const carbs = parseFloat(getVal(['Carbs', 'Tinh bột', 'CarbsPerServing'], 0)) || 0;
          const fat = parseFloat(getVal(['Fat', 'Chất béo', 'FatPerServing'], 0)) || 0;

          const rawTags = getVal(['TheTag', 'Thẻ', 'Tags', 'TagCodes'], '');
          const tagCodes = parseTagsString(rawTags);

          const rawIngredients = getVal(['NguyenLieu', 'Nguyên liệu', 'Ingredients'], '');
          const ingredients = parseIngredientsString(rawIngredients);

          const instructions = String(getVal(['CachLam', 'Hướng dẫn', 'Instructions', 'Steps'], '')).trim();

          const errors = [];
          if (!title) errors.push('Thiếu tên món ăn');
          if (calories <= 0) errors.push('Calo phải lớn hơn 0');

          return {
            rowNumber: idx + 2, // header là dòng 1
            isValid: errors.length === 0,
            errors,
            data: {
              title,
              description,
              imageUrl,
              mealTypes,
              difficulty,
              prepTimeMinutes: prepTime,
              cookTimeMinutes: cookTime,
              servings,
              isPremium,
              caloriesPerServing: calories,
              proteinPerServing: protein,
              carbsPerServing: carbs,
              fatPerServing: fat,
              tagCodes,
              ingredients,
              instructions
            }
          };
        });

        setParsedRecipes(parsed);
        const validCount = parsed.filter(p => p.isValid).length;
        onNotify(`Đã phân tích xong ${parsed.length} dòng dữ liệu (${validCount} món hợp lệ).`, 'info');
      } catch (err) {
        onNotify('Không thể đọc file Excel: ' + err.message, 'error');
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  // 5. Gửi danh sách món hợp lệ lên backend
  const handleExecuteImport = async () => {
    const validItems = parsedRecipes.filter(r => r.isValid).map(r => r.data);
    if (validItems.length === 0) {
      onNotify('Không có món ăn nào hợp lệ để nhập.', 'error');
      return;
    }

    try {
      setImporting(true);
      const res = await api.bulkImportRecipes(validItems, overwriteExisting);
      setImportResult(res.data);
      onNotify(res.message || `Đã nhập thành công ${res.data?.totalImported || 0} món ăn!`, 'success');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      onNotify('Nhập file thất bại: ' + err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedRecipes.filter(r => r.isValid).length;
  const invalidCount = parsedRecipes.length - validCount;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '960px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                Thêm Món Ăn Bằng File Excel (.xlsx, .xls, .csv)
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Tải file mẫu, điền công thức và nhập hàng loạt món ăn vào cơ sở dữ liệu SmartMeal
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
          {/* Top Actions: Template download + Upload area */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '16px', marginBottom: '20px' }}>
            {/* Download Template Box */}
            <div
              style={{
                padding: '18px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 600, fontSize: '0.92rem', marginBottom: '6px' }}>
                  <Download size={16} />
                  <span>Bước 1: Tải File Mẫu Chuẩn</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  File mẫu đã được cài đặt sẵn 16 cột tiêu chuẩn, hỗ trợ đầy đủ nguyên liệu, thẻ tag và 3 món ăn mẫu chuẩn Eat Clean.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleDownloadTemplate}
                style={{ marginTop: '12px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--primary)', borderColor: 'rgba(16, 185, 129, 0.4)' }}
              >
                <Download size={14} />
                <span>Tải File Excel Mẫu (.xlsx)</span>
              </button>
            </div>

            {/* Upload Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '18px 24px',
                border: '2px dashed rgba(16, 185, 129, 0.35)',
                borderRadius: 'var(--radius-md)',
                background: file ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <UploadCloud size={32} style={{ color: file ? 'var(--primary)' : 'var(--text-muted)', marginBottom: '8px' }} />
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {file ? file.name : 'Bước 2: Chọn hoặc kéo thả File Excel vào đây'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                {file ? `Dung lượng: ${(file.size / 1024).toFixed(1)} KB — Bấm để chọn file khác` : 'Hỗ trợ định dạng .xlsx, .xls, .csv'}
              </div>
            </div>
          </div>

          {/* Import Result Banner (if completed) */}
          {importResult && (
            <div
              style={{
                marginBottom: '20px',
                padding: '16px 20px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700, fontSize: '1rem', marginBottom: '8px' }}>
                <CheckCircle2 size={18} />
                <span>Kết Quả Nhập Dữ Liệu Thành Công</span>
              </div>
              <div style={{ display: 'flex', gap: '20px', fontSize: '0.88rem', color: 'var(--text-main)', flexWrap: 'wrap' }}>
                <div>Tổng số xử lý: <strong>{importResult.totalSubmitted}</strong></div>
                <div>Thêm mới: <strong style={{ color: '#34d399' }}>+{importResult.totalImported}</strong></div>
                <div>Cập nhật đè: <strong style={{ color: '#38bdf8' }}>{importResult.totalUpdated}</strong></div>
                <div>Bỏ qua: <strong style={{ color: '#f59e0b' }}>{importResult.totalSkipped}</strong></div>
              </div>
              {importResult.messages && importResult.messages.length > 0 && (
                <div style={{ marginTop: '10px', maxHeight: '100px', overflowY: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                  {importResult.messages.map((m, idx) => (
                    <div key={idx} style={{ lineHeight: 1.5 }}>• {m}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedRecipes.length > 0 && (
            <div>
              {/* Summary KPIs & Options */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Xem Trước Dữ Liệu ({parsedRecipes.length} dòng):</span>
                  <span className="badge badge-success" style={{ fontSize: '0.8rem' }}>
                    <Check size={12} /> {validCount} hợp lệ
                  </span>
                  {invalidCount > 0 && (
                    <span className="badge badge-danger" style={{ fontSize: '0.8rem' }}>
                      <AlertCircle size={12} /> {invalidCount} dòng lỗi
                    </span>
                  )}
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                  />
                  <span>Chỉ bật nếu muốn cập nhật thông tin món cũ đã trùng tên (Mặc định: Thêm món mới, bảo toàn 100% món cũ)</span>
                </label>
              </div>

              {/* Table */}
              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="table-container" style={{ maxHeight: '340px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>Dòng</th>
                        <th>Trạng thái</th>
                        <th>Tên món ăn</th>
                        <th>Bữa ăn</th>
                        <th>Độ khó</th>
                        <th>Năng lượng</th>
                        <th>Macros (P/C/F)</th>
                        <th>Nguyên liệu</th>
                        <th>Thẻ tags</th>
                        <th>Loại món</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRecipes.map((item, idx) => (
                        <tr key={idx} style={{ background: !item.isValid ? 'rgba(239, 68, 68, 0.05)' : undefined }}>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{item.rowNumber}</td>
                          <td>
                            {item.isValid ? (
                              <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                                Hợp lệ
                              </span>
                            ) : (
                              <span className="badge badge-danger" style={{ fontSize: '0.72rem' }} title={item.errors.join(', ')}>
                                {item.errors[0]}
                              </span>
                            )}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                            {item.data.title || <span style={{ color: '#ef4444' }}>[Trống tên]</span>}
                          </td>
                          <td>
                            <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>{item.data.mealTypes}</span>
                          </td>
                          <td style={{ fontSize: '0.82rem' }}>{item.data.difficulty}</td>
                          <td style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.85rem' }}>
                            {item.data.caloriesPerServing} kcal
                          </td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {item.data.proteinPerServing}g / {item.data.carbsPerServing}g / {item.data.fatPerServing}g
                          </td>
                          <td style={{ fontSize: '0.8rem' }}>
                            {item.data.ingredients.length} nguyên liệu
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {item.data.tagCodes.map((tc, tIdx) => (
                                <span key={tIdx} className="badge badge-free" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                  {tc}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            {item.data.isPremium ? (
                              <span className="badge badge-pro" style={{ fontSize: '0.72rem' }}>VIP</span>
                            ) : (
                              <span className="badge badge-free" style={{ fontSize: '0.72rem' }}>Free</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-glass)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={importing}>
            Đóng
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExecuteImport}
            disabled={importing || validCount === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {importing ? (
              <>
                <RefreshCw size={16} className="spin" />
                <span>Đang nhập dữ liệu...</span>
              </>
            ) : (
              <>
                <FileCheck size={16} />
                <span>Bắt Đầu Nhập {validCount > 0 ? `${validCount} Món Ăn Hợp Lệ` : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
