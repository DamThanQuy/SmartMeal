/**
 * pcmAudio: đo âm lượng PCM 16-bit cho sóng âm và đóng gói WAV gửi /ai/voice-log/(audio|transcribe) — backend
 * nhận diện file bằng chữ ký "RIFF....WAVE" nên header phải đúng từng byte.
 */
import { encodeWav, pcmBytesFor, pcmDurationMillis, pcmLevel } from '@/features/ai/services/pcmAudio';

/** PCM 16-bit little-endian từ các mẫu -1..1. */
function pcm(samples: number[]): Uint8Array {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  samples.forEach((sample, i) => view.setInt16(i * 2, Math.round(sample * 32767), true));
  return bytes;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

describe('pcmDurationMillis / pcmBytesFor', () => {
  test('16 kHz mono 16-bit = 32 000 byte mỗi giây', () => {
    expect(pcmDurationMillis(32000, 16000, 1)).toBe(1000);
    expect(pcmDurationMillis(16000, 16000, 1)).toBe(500);
    expect(pcmBytesFor(700, 16000, 1)).toBe(22400);
    expect(pcmBytesFor(1000, 48000, 2)).toBe(192000);
  });
});

describe('pcmLevel', () => {
  test('im lặng / đoạn rỗng → 0', () => {
    expect(pcmLevel(pcm([0, 0, 0, 0]))).toBe(0);
    expect(pcmLevel(new Uint8Array(0))).toBe(0);
  });

  test('to hết cỡ → 1, nhỏ dần theo dBFS (-20 dB ≈ 2/3, dưới -60 dB → 0)', () => {
    expect(pcmLevel(pcm([1, -1, 1, -1]))).toBeCloseTo(1, 2);
    expect(pcmLevel(pcm([0.1, -0.1, 0.1, -0.1]))).toBeCloseTo(2 / 3, 2);
    expect(pcmLevel(pcm([0.0005, -0.0005]))).toBe(0);
  });

  test('đọc đúng đoạn nằm giữa một ArrayBuffer lớn hơn (byteOffset ≠ 0)', () => {
    const backing = new Uint8Array(12);
    backing.set(pcm([1, -1, 1, -1]), 4);
    expect(pcmLevel(backing.subarray(4, 12))).toBeCloseTo(1, 2);
  });
});

describe('encodeWav', () => {
  test('header RIFF/WAVE PCM 16-bit đúng chuẩn và dữ liệu nối đúng thứ tự', () => {
    const first = pcm([0.5, -0.5]);
    const second = pcm([0.25]);

    const wav = encodeWav([first, second], 16000, 1);
    const view = new DataView(wav.buffer);

    expect(wav.byteLength).toBe(44 + 6);
    expect(ascii(wav, 0, 4)).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(36 + 6);
    expect(ascii(wav, 8, 4)).toBe('WAVE');
    expect(ascii(wav, 12, 4)).toBe('fmt ');
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint32(28, true)).toBe(32000); // byte rate
    expect(view.getUint16(32, true)).toBe(2); // block align
    expect(view.getUint16(34, true)).toBe(16);
    expect(ascii(wav, 36, 4)).toBe('data');
    expect(view.getUint32(40, true)).toBe(6);
    expect(Array.from(wav.slice(44))).toEqual([...first, ...second]);
  });

  test('chưa có âm thanh → WAV rỗng nhưng header vẫn hợp lệ', () => {
    const wav = encodeWav([], 48000, 2);

    expect(wav.byteLength).toBe(44);
    expect(new DataView(wav.buffer).getUint32(28, true)).toBe(48000 * 2 * 2);
  });
});
