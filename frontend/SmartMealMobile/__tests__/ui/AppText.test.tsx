import React from 'react';
import { Text } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { AppText, type AppTextProps } from '@/components/ui/AppText';

// Lớp màu mà AppText truyền xuống <Text>. NativeWind xếp utility theo thứ tự chữ cái chứ không theo thứ tự trong
// className, nên màu đặt qua className phải là lớp màu duy nhất (không kèm "text-text-primary" mặc định).
function renderedClassName(props: AppTextProps): string[] {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(
      <AppText {...props}>Đã ghi 1 món vào Bữa tối</AppText>,
    );
  });
  const className: string = tree!.root.findByType(Text).props.className;
  return className.split(/\s+/).filter(Boolean);
}

describe('AppText', () => {
  it('dùng màu của prop color khi className không đặt màu chữ', () => {
    expect(
      renderedClassName({
        color: 'secondary',
        className: 'flex-1 text-center',
      }),
    ).toEqual(
      expect.arrayContaining(['text-text-secondary', 'flex-1', 'text-center']),
    );
    expect(renderedClassName({})).toContain('text-text-primary');
  });

  it('màu chữ trong className thay hẳn màu mặc định', () => {
    const classes = renderedClassName({
      className: 'flex-1 text-text-inverse',
    });
    expect(classes).toContain('text-text-inverse');
    expect(classes).not.toContain('text-text-primary');
  });

  it('nhận cả màu có độ mờ (text-on-primary/80)', () => {
    const classes = renderedClassName({
      color: 'secondary',
      className: 'text-center text-on-primary/80',
    });
    expect(classes).toContain('text-on-primary/80');
    expect(classes).not.toContain('text-text-secondary');
  });

  it('cỡ chữ và căn lề (text-body, text-center) không bị coi là màu', () => {
    expect(
      renderedClassName({ variant: 'caption', className: 'text-center' }),
    ).toEqual(
      expect.arrayContaining([
        'text-caption',
        'text-text-primary',
        'text-center',
      ]),
    );
  });
});
