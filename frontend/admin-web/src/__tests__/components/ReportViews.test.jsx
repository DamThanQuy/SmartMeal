import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EngagementAnalyticsView from '../../components/EngagementAnalyticsView'
import RevenueReportView from '../../components/RevenueReportView'
import SystemActivityView from '../../components/SystemActivityView'
import { api } from '../../services/api'
import { activity, engagement, revenue, setupApi } from '../../test/fixtures'

vi.mock('../../services/api', async (importOriginal) => (await import('../../test/mockApi.js')).mockApiModule(importOriginal))

let onNotify

const statCard = (label) => screen.getByText(label).closest('.stat-card')
const tableUnder = (title) => screen.getByText(title).closest('.card').querySelector('table')

beforeEach(() => {
  setupApi(api)
  onNotify = vi.fn()
})

// ───────────────────────────── UC4: Monitor System Activity ─────────────────────────────
describe('SystemActivityView', () => {
  it('hiển thị trạng thái DB, uptime, số yêu cầu AI hôm nay và số cảnh báo an ninh', async () => {
    render(<SystemActivityView onNotify={onNotify} />)

    expect(await within(statCard('Cơ Sở Dữ Liệu PostgreSQL')).findByText('Healthy')).toBeInTheDocument()
    expect(within(statCard('Thời Gian Uptime Máy Chủ')).getByText('31.5 giờ')).toBeInTheDocument()
    expect(within(statCard('Yêu Cầu AI Hôm Nay')).getByText('17')).toBeInTheDocument()
    expect(within(statCard('Cảnh Báo An Ninh')).getByText('2')).toBeInTheDocument()
  })

  it('nhật ký AI, bữa ăn (kcal làm tròn) và sự kiện an ninh phân loại khóa / dò mật khẩu', async () => {
    render(<SystemActivityView onNotify={onNotify} />)
    await screen.findByText('Healthy')

    const ai = tableUnder('Nhật Ký Gọi Trí Tuệ Nhân Tạo (Gemini AI Logs)')
    expect(within(ai).getByText('snap')).toBeInTheDocument()
    expect(within(ai).getByText('lan@example.com')).toBeInTheDocument()
    const diary = tableUnder('Ghi Nhận Bữa Ăn Mới Nhất (Nutrition Diaries)')
    expect(within(diary).getByText('513 kcal')).toBeInTheDocument()
    const security = within(tableUnder('Giám Sát An Ninh & Phòng Chống Tấn Công Brute-force')).getAllByRole('row').slice(1)
    expect(within(security[0]).getByText(/Tài khoản bị khóa$/)).toBeInTheDocument()
    expect(within(security[1]).getByText(/Cảnh báo brute-force/)).toBeInTheDocument()
    expect(within(security[1]).getByText('Nhập sai mật khẩu 3 lần liên tiếp')).toBeInTheDocument()
  })

  it('không có dữ liệu → các bảng hiện thông báo trống, hệ thống an toàn', async () => {
    api.getSystemActivity.mockResolvedValue({ ...activity, recentAiLogs: [], recentDiaryLogs: [], recentSecurityEvents: [], totalAiRequestsToday: 0 })
    render(<SystemActivityView onNotify={onNotify} />)

    expect(await screen.findByText('Chưa có nhật ký AI nào hôm nay.')).toBeInTheDocument()
    expect(screen.getByText('Chưa có ghi nhận bữa ăn nào.')).toBeInTheDocument()
    expect(screen.getByText(/Hệ thống an toàn/)).toBeInTheDocument()
    expect(within(statCard('Cảnh Báo An Ninh')).getByText('0')).toBeInTheDocument()
  })

  it('nút "Làm mới dữ liệu" gọi lại API', async () => {
    const user = userEvent.setup()
    render(<SystemActivityView onNotify={onNotify} />)
    await screen.findByText('Healthy')

    await user.click(screen.getByRole('button', { name: /Làm mới dữ liệu/ }))

    await waitFor(() => expect(api.getSystemActivity).toHaveBeenCalledTimes(2))
  })

  it('tự làm mới mỗi 30 giây và dừng khi rời màn hình', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { unmount } = render(<SystemActivityView onNotify={onNotify} />)
    await waitFor(() => expect(api.getSystemActivity).toHaveBeenCalledTimes(1))

    await act(async () => { vi.advanceTimersByTime(30000) })
    expect(api.getSystemActivity).toHaveBeenCalledTimes(2)

    unmount()
    await act(async () => { vi.advanceTimersByTime(60000) })
    expect(api.getSystemActivity).toHaveBeenCalledTimes(2)
  })

  it('lỗi tải → onNotify error', async () => {
    api.getSystemActivity.mockRejectedValue(new Error('500'))
    render(<SystemActivityView onNotify={onNotify} />)

    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Lỗi tải nhật ký hệ thống: 500', 'error'))
  })
})

// ───────────────────────────── UC5: View Revenue Report ─────────────────────────────
describe('RevenueReportView', () => {
  it('hiển thị tổng doanh thu, tháng/năm, ARPPU và tỷ lệ thanh toán thành công', async () => {
    render(<RevenueReportView onNotify={onNotify} />)

    expect(await within(statCard('Tổng Doanh Thu Đã Thu')).findByText(/^1\.250\.000\s₫$/)).toBeInTheDocument()
    expect(within(statCard('Doanh Thu Tháng Này')).getByText(/^158\.000\s₫$/)).toBeInTheDocument()
    expect(within(statCard('Doanh Thu Tháng Này')).getByText(/Năm nay: 1\.250\.000\s₫/)).toBeInTheDocument()
    expect(within(statCard('Doanh Thu TB / Khách Trả Phí (ARPPU)')).getByText(/^312\.500\s₫$/)).toBeInTheDocument()
    expect(within(statCard('Tỷ Lệ Thanh Toán Thành Công')).getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('6 thành công / 8 tổng đơn')).toBeInTheDocument()
    expect(api.getRevenueReport).toHaveBeenCalledWith('', '')
  })

  it('biểu đồ theo ngày: thanh dài nhất 100%, ngày 0đ vẫn hiện tối thiểu 5%', async () => {
    const { container } = render(<RevenueReportView onNotify={onNotify} />)
    await screen.findByText('22/10')

    const bars = [...container.querySelectorAll('div[style*="linear-gradient(90deg"]')].map((b) => b.style.width)
    expect(bars).toEqual(['5%', '50%', '100%'])
    expect(screen.getByText('(2 đơn)')).toBeInTheDocument()
  })

  it('cơ cấu theo cổng thanh toán và theo gói', async () => {
    render(<RevenueReportView onNotify={onNotify} />)

    expect(await screen.findByText('PAYOS')).toBeInTheDocument()
    expect(screen.getByText(/^778\.000\s₫$/)).toBeInTheDocument()
    expect(screen.getByText('Gói Năm (Pro Yearly)')).toBeInTheDocument()
  })

  it('chưa có giao dịch → thông báo trống ở biểu đồ và hai bảng cơ cấu', async () => {
    api.getRevenueReport.mockResolvedValue({ ...revenue, revenueByPeriod: [], revenueByMethod: {}, revenueByPlan: {} })
    render(<RevenueReportView onNotify={onNotify} />)

    expect(await screen.findByText('Chưa có dữ liệu giao dịch trong khoảng thời gian này.')).toBeInTheDocument()
    expect(screen.getByText('Chưa có dữ liệu cổng thanh toán')).toBeInTheDocument()
    expect(screen.getByText('Chưa có dữ liệu gói thành viên')).toBeInTheDocument()
  })

  it('chọn khoảng ngày rồi "Lọc Báo Cáo" gửi startDate / endDate', async () => {
    const user = userEvent.setup()
    const { container } = render(<RevenueReportView onNotify={onNotify} />)
    await screen.findByText('22/10')
    const [from, to] = container.querySelectorAll('input[type="date"]')

    await user.type(from, '2026-10-01')
    await user.type(to, '2026-10-15')
    await user.click(screen.getByRole('button', { name: /Lọc Báo Cáo/ }))

    await waitFor(() => expect(api.getRevenueReport).toHaveBeenLastCalledWith('2026-10-01', '2026-10-15'))
  })

  it('"Đặt lại" xóa ngày đã chọn và nạp lại báo cáo KHÔNG lọc', async () => {
    const user = userEvent.setup()
    const { container } = render(<RevenueReportView onNotify={onNotify} />)
    await screen.findByText('22/10')
    const [from, to] = container.querySelectorAll('input[type="date"]')
    await user.type(from, '2026-10-01')
    await user.type(to, '2026-10-15')
    await user.click(screen.getByRole('button', { name: /Lọc Báo Cáo/ }))

    await user.click(screen.getByRole('button', { name: 'Đặt lại' }))

    expect(from).toHaveValue('')
    await waitFor(() => expect(api.getRevenueReport).toHaveBeenCalledTimes(3))
    // setTimeout(loadReport, 50) dùng closure cũ → vẫn gửi ngày cũ dù ô ngày đã trống.
    expect(api.getRevenueReport).toHaveBeenLastCalledWith('', '')
  })

  it('xuất CSV: tạo link tải có tên file theo ngày, nội dung đủ các mốc và báo thành công', async () => {
    const clicks = []
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { clicks.push(this) })
    const user = userEvent.setup()
    render(<RevenueReportView onNotify={onNotify} />)
    await screen.findByText('22/10')

    await user.click(screen.getByRole('button', { name: /Xuất Báo Cáo CSV/ }))

    expect(clickSpy).toHaveBeenCalledTimes(1)
    const link = clicks[0]
    expect(link.getAttribute('download')).toMatch(/^SmartMeal_BaoCaoDoanhThu_\d{4}-\d{2}-\d{2}\.csv$/)
    const csv = decodeURI(link.getAttribute('href'))
    expect(csv).toContain('MocThoiGian,DoanhThuVND,SoGiaoDich')
    expect(csv).toContain('"22/10",158000,2')
    expect(onNotify).toHaveBeenCalledWith('Đã xuất file báo cáo CSV thành công!', 'success')
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('xuất CSV khi chưa có báo cáo thì không làm gì; lỗi tải → onNotify error', async () => {
    api.getRevenueReport.mockRejectedValue(new Error('Hết thời gian chờ'))
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<RevenueReportView onNotify={onNotify} />)
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Lỗi tải báo cáo doanh thu: Hết thời gian chờ', 'error'))

    await user.click(screen.getByRole('button', { name: /Xuất Báo Cáo CSV/ }))

    expect(clickSpy).not.toHaveBeenCalled()
  })
})

// ───────────────────────────── UC6: View Engagement Analytics ─────────────────────────────
describe('EngagementAnalyticsView', () => {
  it('hiển thị DAU / WAU / MAU, tỷ lệ hoàn thành thử thách và các tổng hoạt động', async () => {
    render(<EngagementAnalyticsView onNotify={onNotify} />)

    expect(await within(statCard('DAU (Hoạt Động Hằng Ngày)')).findByText('12')).toBeInTheDocument()
    expect(within(statCard('WAU (Hoạt Động Hằng Tuần)')).getByText('30')).toBeInTheDocument()
    expect(within(statCard('MAU (Hoạt Động Hằng Tháng)')).getByText('41')).toBeInTheDocument()
    expect(within(statCard('Tỷ Lệ Hoàn Thành Thử Thách')).getByText('33.3%')).toBeInTheDocument()
    expect(screen.getByText((1520).toLocaleString())).toBeInTheDocument()
    expect(screen.getByText((125000).toLocaleString())).toBeInTheDocument()
    expect(screen.getByText('Lv. 3.4')).toBeInTheDocument()
  })

  it('bảng xếp hạng: thứ hạng, tên (mặc định "Người dùng"), số bữa, cấp pet, XP và ngày hoạt động', async () => {
    render(<EngagementAnalyticsView onNotify={onNotify} />)
    await screen.findByText('Lan Anh')

    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('1')).toBeInTheDocument()
    expect(within(rows[0]).getByText('80')).toBeInTheDocument()
    expect(within(rows[0]).getByText('🐾 Lv. 6')).toBeInTheDocument()
    expect(within(rows[0]).getByText(`+${(2600).toLocaleString()} XP`)).toBeInTheDocument()
    expect(within(rows[1]).getByText('Người dùng')).toBeInTheDocument()
    expect(within(rows[1]).getByText('—')).toBeInTheDocument()
  })

  it('chưa có dữ liệu → giá trị 0 / Lv. 1 và thông báo bảng trống', async () => {
    api.getEngagementAnalytics.mockResolvedValue({})
    render(<EngagementAnalyticsView onNotify={onNotify} />)

    expect(await screen.findByText('Chưa có dữ liệu người dùng tích cực.')).toBeInTheDocument()
    expect(screen.getByText('Lv. 1')).toBeInTheDocument()
    expect(within(statCard('DAU (Hoạt Động Hằng Ngày)')).getByText('0')).toBeInTheDocument()
  })

  it('lỗi tải → onNotify error', async () => {
    api.getEngagementAnalytics.mockRejectedValue(new Error('403'))
    render(<EngagementAnalyticsView onNotify={onNotify} />)

    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Lỗi tải dữ liệu tương tác người dùng: 403', 'error'))
    expect(engagement.topEngagedUsers).toHaveLength(2)
  })
})
