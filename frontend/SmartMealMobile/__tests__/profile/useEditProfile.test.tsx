/**
 * useEditProfile: EditProfileScreen lưu 2 nơi khác nhau ở backend — họ tên (tài khoản) rồi giới
 * tính/ngày sinh/chiều cao (hồ sơ sức khỏe). Chạy tuần tự, bỏ qua phần không đổi, dừng ở bước lỗi.
 */
import { useEditProfile } from '@/features/profile/hooks/useEditProfile';
import { renderHookWithQuery } from '../../test-utils/renderHookWithQuery';

const mockUpdateProfile = jest.fn();
const mockUpdateBasicInfo = jest.fn();

jest.mock('@/features/auth', () => ({
  useUpdateProfile: () => ({ mutateAsync: mockUpdateProfile }),
}));
jest.mock('@/features/health', () => ({
  useUpdateBasicInfo: () => ({ mutateAsync: mockUpdateBasicInfo }),
}));

const BASIC_INFO = {
  gender: 'male' as const,
  dateOfBirth: new Date(1995, 2, 8),
  heightCm: 175,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateProfile.mockResolvedValue({ fullName: 'Tên mới' });
  mockUpdateBasicInfo.mockResolvedValue(undefined);
});

describe('useEditProfile', () => {
  test('chỉ đổi họ tên → chỉ gọi cập nhật tài khoản', async () => {
    const hook = await renderHookWithQuery(() => useEditProfile());

    await hook.run(() => hook.current.mutateAsync({ fullName: 'Tên mới' }));

    expect(mockUpdateProfile).toHaveBeenCalledWith({ fullName: 'Tên mới' });
    expect(mockUpdateBasicInfo).not.toHaveBeenCalled();
    await hook.unmount();
  });

  test('chỉ đổi thông tin cơ bản → chỉ gọi cập nhật hồ sơ sức khỏe', async () => {
    const hook = await renderHookWithQuery(() => useEditProfile());

    await hook.run(() => hook.current.mutateAsync({ basicInfo: BASIC_INFO }));

    expect(mockUpdateBasicInfo).toHaveBeenCalledWith(BASIC_INFO);
    expect(mockUpdateProfile).not.toHaveBeenCalled();
    await hook.unmount();
  });

  test('đổi cả hai → họ tên trước, hồ sơ sức khỏe sau', async () => {
    const order: string[] = [];
    mockUpdateProfile.mockImplementation(async () => {
      order.push('profile');
      return { fullName: 'Tên mới' };
    });
    mockUpdateBasicInfo.mockImplementation(async () => {
      order.push('basicInfo');
    });
    const hook = await renderHookWithQuery(() => useEditProfile());

    await hook.run(() =>
      hook.current.mutateAsync({ fullName: 'Tên mới', basicInfo: BASIC_INFO }),
    );

    expect(order).toEqual(['profile', 'basicInfo']);
    await hook.unmount();
  });

  test('lưu họ tên lỗi → dừng, không đụng tới hồ sơ sức khỏe', async () => {
    const error = new Error('Không thể cập nhật hồ sơ.');
    mockUpdateProfile.mockRejectedValue(error);
    const hook = await renderHookWithQuery(() => useEditProfile());

    await expect(
      hook.run(() => hook.current.mutateAsync({ fullName: 'Tên mới', basicInfo: BASIC_INFO })),
    ).rejects.toBe(error);

    expect(mockUpdateBasicInfo).not.toHaveBeenCalled();
    expect(hook.current.error).toBe(error);
    await hook.unmount();
  });

  test('họ tên đã lưu nhưng hồ sơ sức khỏe lỗi → báo lỗi (họ tên đã được ghi vào tài khoản)', async () => {
    const error = new Error('Máy chủ gặp sự cố.');
    mockUpdateBasicInfo.mockRejectedValue(error);
    const hook = await renderHookWithQuery(() => useEditProfile());

    await expect(
      hook.run(() => hook.current.mutateAsync({ fullName: 'Tên mới', basicInfo: BASIC_INFO })),
    ).rejects.toBe(error);

    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });
});
