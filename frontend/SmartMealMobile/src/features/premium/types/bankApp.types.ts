/** Một app ngân hàng mở được bằng link VietQR (https://api.vietqr.io/v2/android-app-deeplinks). */
export interface BankApp {
  /** appId của VietQR — tham số `app` của link dl.vietqr.io/pay. */
  id: string;
  name: string;
  /** App tự điền số tài khoản, số tiền và nội dung; app khác chỉ được mở lên (SmartMeal chép sẵn nội dung để dán). */
  autofill?: boolean;
  /** Chỉ có trên Android (danh sách iOS của VietQR không có). */
  androidOnly?: boolean;
}

// Danh sách app ngân hàng hỗ trợ link VietQR (lấy từ API công khai của VietQR, 16/10/2026): app tự điền đứng đầu, còn lại
// theo lượt cài hằng tháng. Hằng số tĩnh của UI — cập nhật tay khi VietQR thêm ngân hàng.
export const BANK_APPS: readonly BankApp[] = [
  { id: 'mb', name: 'MB Bank', autofill: true },
  { id: 'icb', name: 'VietinBank iPay', autofill: true },
  { id: 'bidv', name: 'BIDV SmartBanking', autofill: true },
  { id: 'ocb', name: 'OCB OMNI', autofill: true },
  { id: 'acb', name: 'ACB ONE', autofill: true },
  { id: 'vcb', name: 'VCB Digibank' },
  { id: 'vba', name: 'Agribank Plus' },
  { id: 'tcb', name: 'Techcombank Mobile' },
  { id: 'vpb', name: 'VPBank NEO' },
  { id: 'cake', name: 'CAKE - Ngân hàng số' },
  { id: 'tpb', name: 'TPBank Mobile' },
  { id: 'lpb', name: 'LPBank' },
  { id: 'timo', name: 'Timo - Ngân hàng số by BVBank' },
  { id: 'vib-2', name: 'MyVIB' },
  { id: 'hdb', name: 'HDBank' },
  { id: 'shb', name: 'SHB SAHA' },
  { id: 'seab', name: 'SeAMobile' },
  { id: 'shbvn', name: 'Shinhan SOL Việt Nam' },
  { id: 'scb', name: 'SCB Mobile Banking' },
  { id: 'nab', name: 'Nam A Bank Open Banking', androidOnly: true },
  { id: 'abb', name: 'ABBank' },
  { id: 'eib', name: 'Eximbank EDigi' },
  { id: 'coopbank', name: 'Co-opBank Mobile Banking' },
  { id: 'pvcb', name: 'PVConnect' },
  { id: 'wvn', name: 'Woori WON Vietnam' },
  { id: 'klb', name: 'KienlongBank Plus' },
  { id: 'bvb', name: 'BAOVIET Smart' },
  { id: 'vab', name: 'Vietbank Digital Plus' },
  { id: 'ncb', name: 'NCB iziMobile' },
  { id: 'acb-biz', name: 'ACB ONE Biz' },
  { id: 'oceanbank', name: 'Ocean Bank Mobile Banking' },
  { id: 'pbvn', name: 'PB engage VN' },
  { id: 'sgicb', name: 'SAIGONBANK Smart Banking' },
  { id: 'cimb', name: 'Octo by CIMB Vietnam' },
];
