import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';

/** Chất lượng ảnh chụp — đủ rõ để AI đọc chữ trên nhãn, file vẫn dưới giới hạn 5 MB của server. */
const CAPTURE_QUALITY = 0.7;

/** zoom của expo-camera là tỉ lệ 0–1 so với mức phóng tối đa của máy; quá 0.6 ảnh số bị vỡ, khó đọc chữ. */
const MAX_ZOOM = 0.6;
/** Mức đổi zoom khi khoảng cách hai ngón tăng gấp đôi. */
const PINCH_SENSITIVITY = 0.25;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(0, value));
}

/**
 * Camera xem trực tiếp cho màn quét nhãn / tủ lạnh (expo-camera — chạy được trên Expo Go): xin quyền ngay khi
 * vào màn, chụp bằng CameraView thay vì mở app camera của hệ thống, kèm đèn flash và chụm 2 ngón để phóng to.
 * Máy tự lấy nét liên tục; expo-camera trên Android không hỗ trợ chạm để lấy nét tại một điểm, nên với nhãn chữ
 * nhỏ hãy để máy xa hơn một chút rồi phóng to.
 */
export function useLiveCamera() {
  const [permission, requestPermission] = useCameraPermissions({ request: true });
  const cameraRef = useRef<CameraView>(null);
  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(0);

  /** Chụm/mở 2 ngón ở bất kỳ đâu trên màn để phóng to/thu nhỏ (scaleChange: tỉ lệ so với lần cập nhật trước). */
  const zoomGesture = Gesture.Pinch()
    .runOnJS(true)
    .onChange(event => {
      setZoom(current => clampZoom(current + (event.scaleChange - 1) * PINCH_SENSITIVITY));
    });

  /** Chụp một ảnh; trả URI file ảnh, hoặc undefined nếu camera chưa sẵn sàng. */
  const capture = async (): Promise<string | undefined> => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: CAPTURE_QUALITY });
    return photo?.uri;
  };

  return {
    /** null khi đang đọc trạng thái quyền. */
    permission,
    requestPermission,
    cameraRef,
    torch,
    toggleTorch: () => setTorch(current => !current),
    zoom,
    resetZoom: () => setZoom(0),
    zoomGesture,
    capture,
  };
}
