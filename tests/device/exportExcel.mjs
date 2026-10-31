import ExcelJS from 'exceljs';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Xuất báo cáo kiểm thử E2E sang định dạng Excel (.xlsx) chuyên nghiệp
 * @param {Object} options
 * @param {string} options.reportPath - Đường dẫn file .xlsx xuất ra
 * @param {string} options.deviceModel - Model thiết bị
 * @param {string} options.androidVer - Phiên bản Android
 * @param {string} options.deviceId - Serial thiết bị
 * @param {string} options.resolution - Độ phân giải màn hình
 * @param {string} options.timestamp - Thời gian chạy kiểm thử
 * @param {Array} options.results - Mảng kết quả các bước kiểm thử
 */
export async function exportTestReportToExcel({
  reportPath,
  deviceModel = 'Android Device',
  androidVer = 'Unknown',
  deviceId = '',
  resolution = '1216x2688',
  timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
  results = []
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SmartMeal QA Automation';
  workbook.lastModifiedBy = 'SmartMeal E2E Runner';
  workbook.created = new Date();
  workbook.modified = new Date();

  const totalTests = results.length;
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = totalTests - passCount;
  const passRate = totalTests > 0 ? Math.round((passCount / totalTests) * 100) : 0;

  // ==========================================
  // SHEET 1: TỔNG QUAN KIỂM THỬ (OVERVIEW)
  // ==========================================
  const summarySheet = workbook.addWorksheet('Tổng quan kiểm thử', {
    views: [{ showGridLines: true }]
  });

  // Độ rộng cột Sheet 1
  summarySheet.columns = [
    { width: 4 },
    { width: 28 },
    { width: 35 },
    { width: 18 },
    { width: 25 },
    { width: 4 }
  ];

  // Header Tiêu đề lớn
  summarySheet.mergeCells('B2:E2');
  const titleCell = summarySheet.getCell('B2');
  titleCell.value = '🥗 SMARTMEAL - BÁO CÁO KIỂM THỬ E2E TỰ ĐỘNG';
  titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } }; // Teal-600
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(2).height = 40;

  // Subtitle
  summarySheet.mergeCells('B3:E3');
  const subCell = summarySheet.getCell('B3');
  subCell.value = `Thời gian thực thi: ${timestamp}  |  Dự án: SmartMeal Mobile App (React Native / Expo SDK 58)`;
  subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF475569' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(3).height = 24;

  // --- THÔNG TIN THIẾT BỊ ---
  summarySheet.getCell('B5').value = '📱 THÔNG TIN THIẾT BỊ KIỂM THỬ';
  summarySheet.getCell('B5').font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF0F766E' } };

  const infoRows = [
    ['Thiết bị kiểm định:', `${deviceModel} (Serial: ${deviceId})`],
    ['Hệ điều hành:', `Android ${androidVer}`],
    ['Độ phân giải màn hình:', `${resolution} (Tỉ lệ chuẩn 20:9)`],
    ['Môi trường ứng dụng:', 'Expo Go Metro Bundler + ASP.NET Core (.NET 9)'],
    ['Cổng kết nối ADB Reverse:', 'tcp:8081 (Metro) & tcp:5000 (Backend API)']
  ];

  let currRow = 6;
  for (const [label, val] of infoRows) {
    summarySheet.getCell(`B${currRow}`).value = label;
    summarySheet.getCell(`B${currRow}`).font = { name: 'Segoe UI', bold: true, size: 10, color: { argb: 'FF334155' } };
    summarySheet.getCell(`C${currRow}`).value = val;
    summarySheet.getCell(`C${currRow}`).font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1E293B' } };
    summarySheet.getRow(currRow).height = 22;
    currRow++;
  }

  // --- KPI CARDS (TỔNG HỢP KẾT QUẢ) ---
  currRow += 1;
  summarySheet.getCell(`B${currRow}`).value = '📊 KẾT QUẢ TỔNG QUAN';
  summarySheet.getCell(`B${currRow}`).font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF0F766E' } };

  currRow += 1;
  const kpiStartRow = currRow;

  // Box 1: Tổng số ca test
  summarySheet.getCell(`B${kpiStartRow}`).value = 'TỔNG SỐ CA TEST';
  summarySheet.getCell(`B${kpiStartRow + 1}`).value = totalTests;
  summarySheet.getCell(`B${kpiStartRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } }; // Sky-600
  summarySheet.getCell(`B${kpiStartRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getCell(`B${kpiStartRow + 1}`).font = { name: 'Segoe UI', size: 24, bold: true, color: { argb: 'FF0369A1' } };

  // Box 2: Số ca ĐẠT (PASS)
  summarySheet.getCell(`C${kpiStartRow}`).value = 'ĐẠT (PASS)';
  summarySheet.getCell(`C${kpiStartRow + 1}`).value = `${passCount} (${passRate}%)`;
  summarySheet.getCell(`C${kpiStartRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }; // Green-600
  summarySheet.getCell(`C${kpiStartRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getCell(`C${kpiStartRow + 1}`).font = { name: 'Segoe UI', size: 24, bold: true, color: { argb: 'FF15803D' } };

  // Box 3: Số ca LỖI (FAIL)
  summarySheet.getCell(`D${kpiStartRow}`).value = 'LỖI (FAIL)';
  summarySheet.getCell(`D${kpiStartRow + 1}`).value = failCount;
  summarySheet.getCell(`D${kpiStartRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: failCount > 0 ? 'FFE11D48' : 'FF64748B' } };
  summarySheet.getCell(`D${kpiStartRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getCell(`D${kpiStartRow + 1}`).font = { name: 'Segoe UI', size: 24, bold: true, color: { argb: failCount > 0 ? 'FFBE123C' : 'FF475569' } };

  // Box 4: Đánh giá chất lượng
  summarySheet.getCell(`E${kpiStartRow}`).value = 'KẾT LUẬN';
  summarySheet.getCell(`E${kpiStartRow + 1}`).value = failCount === 0 ? '100% PASS' : 'CÓ LỖI';
  summarySheet.getCell(`E${kpiStartRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: failCount === 0 ? 'FF0D9488' : 'FFE11D48' } };
  summarySheet.getCell(`E${kpiStartRow}`).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getCell(`E${kpiStartRow + 1}`).font = { name: 'Segoe UI', size: 20, bold: true, color: { argb: failCount === 0 ? 'FF0F766E' : 'FFBE123C' } };

  for (const col of ['B', 'C', 'D', 'E']) {
    summarySheet.getCell(`${col}${kpiStartRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
    summarySheet.getCell(`${col}${kpiStartRow + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
    summarySheet.getCell(`${col}${kpiStartRow + 1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    summarySheet.getCell(`${col}${kpiStartRow + 1}`).border = {
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
  }
  summarySheet.getRow(kpiStartRow).height = 26;
  summarySheet.getRow(kpiStartRow + 1).height = 50;

  // ==========================================
  // SHEET 2: CHI TIẾT CÁC BƯỚC TEST (TEST CASES)
  // ==========================================
  const detailSheet = workbook.addWorksheet('Chi tiết ca kiểm thử', {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: true }]
  });

  // Header bảng chi tiết
  detailSheet.columns = [
    { key: 'stt', header: 'STT', width: 8 },
    { key: 'id', header: 'Mã Test', width: 14 },
    { key: 'group', header: 'Nhóm tính năng', width: 26 },
    { key: 'name', header: 'Màn hình / Tính năng kiểm thử', width: 38 },
    { key: 'status', header: 'Trạng thái', width: 15 },
    { key: 'description', header: 'Mô tả nghiệp vụ & Kiểm định', width: 55 },
    { key: 'file', header: 'File ảnh minh chứng', width: 30 }
  ];

  // Tiêu đề Sheet 2
  detailSheet.mergeCells('A1:G1');
  const sheet2Title = detailSheet.getCell('A1');
  sheet2Title.value = 'DANH SÁCH CHI TIẾT 21 KỊCH BẢN KIỂM THỬ GIAO DIỆN END-TO-END';
  sheet2Title.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF0F766E' } };
  sheet2Title.alignment = { vertical: 'middle', horizontal: 'left' };
  detailSheet.getRow(1).height = 30;

  // Style Header Row (Row 3)
  const headerRow = detailSheet.getRow(3);
  headerRow.height = 32;

  const getFeatureGroup = (id) => {
    const num = parseInt(id.replace(/\D/g, ''), 10);
    if (num <= 7) return 'Trang chủ & Thao tác nhanh';
    if (num <= 9) return 'Thực đơn tuần & Đi chợ';
    if (num <= 12) return 'Khám phá & Gợi ý công thức';
    if (num <= 14) return 'Nhật ký dinh dưỡng & Tiến độ';
    if (num <= 20) return 'Hồ sơ cá nhân & Sức khỏe';
    return 'Chu kỳ hoàn tất điều hướng';
  };

  // Nạp dữ liệu vào bảng
  results.forEach((r, idx) => {
    const rowNum = idx + 4;
    const row = detailSheet.addRow({
      stt: idx + 1,
      id: r.id,
      group: getFeatureGroup(r.id),
      name: r.name,
      status: r.status,
      description: r.description,
      file: r.file
    });

    row.height = 26;

    // Zebra striping
    const isEven = idx % 2 === 0;
    const bgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      cell.font = { name: 'Segoe UI', size: 10 };
      cell.alignment = { vertical: 'middle' };
    }

    // Căn giữa STT, Mã test, Trạng thái
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).font = { name: 'Segoe UI', size: 10, bold: true };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

    // Format Badge PASS/FAIL
    if (r.status === 'PASS') {
      row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Green-100
      row.getCell(5).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF15803D' } }; // Green-700
    } else {
      row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Red-100
      row.getCell(5).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFB91C1C' } }; // Red-700
    }

    // Hyperlink tới file ảnh minh chứng
    if (r.file) {
      row.getCell(7).value = {
        text: r.file,
        hyperlink: `./device-e2e/${r.file}`,
        tooltip: 'Nhấp để xem ảnh chụp màn hình'
      };
      row.getCell(7).font = { name: 'Segoe UI', size: 10, color: { argb: 'FF0284C7' }, underline: true };
    }
  });

  // Áp dụng style cho header row 3
  for (let c = 1; c <= 7; c++) {
    const cell = headerRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }; // Teal-700
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: c <= 2 || c === 5 ? 'center' : 'left' };
  }

  // Tự động bật AutoFilter
  detailSheet.autoFilter = {
    from: 'A3',
    to: `G${results.length + 3}`
  };

  // Đảm bảo thư mục đích tồn tại
  const outputDir = path.dirname(reportPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Ghi file Excel
  await workbook.xlsx.writeFile(reportPath);
  return reportPath;
}
