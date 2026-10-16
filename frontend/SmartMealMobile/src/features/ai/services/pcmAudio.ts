// Xử lý âm thanh PCM 16-bit (little-endian) thu từ micro (expo-audio useAudioStream) — hàm thuần, không
// gọi native, để test được: đo âm lượng cho sóng âm và đóng gói WAV gửi lên backend.

const BYTES_PER_SAMPLE = 2;
const WAV_HEADER_BYTES = 44;
/** Âm lượng dưới ngưỡng này (dBFS) coi như im lặng. */
const SILENCE_FLOOR_DB = -60;

/** Thời lượng (ms) của `byteLength` byte PCM 16-bit. */
export function pcmDurationMillis(byteLength: number, sampleRate: number, channels: number): number {
  return (byteLength / (sampleRate * channels * BYTES_PER_SAMPLE)) * 1000;
}

/** Số byte PCM 16-bit ứng với `millis` ms. */
export function pcmBytesFor(millis: number, sampleRate: number, channels: number): number {
  return Math.round((millis / 1000) * sampleRate * channels * BYTES_PER_SAMPLE);
}

/**
 * Âm lượng của một đoạn PCM, chuẩn hóa về 0–1: RMS quy ra dBFS rồi ánh xạ tuyến tính -60 dB → 0, 0 dB → 1
 * (thang nghe gần với tai người hơn RMS thô).
 */
export function pcmLevel(bytes: Uint8Array): number {
  const sampleCount = Math.floor(bytes.byteLength / BYTES_PER_SAMPLE);
  if (sampleCount === 0) return 0;

  const view = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * BYTES_PER_SAMPLE);
  let sumSquares = 0;
  for (let i = 0; i < sampleCount; i++) {
    const sample = view.getInt16(i * BYTES_PER_SAMPLE, true) / 32768;
    sumSquares += sample * sample;
  }
  const rms = Math.sqrt(sumSquares / sampleCount);
  if (rms === 0) return 0;

  const db = 20 * Math.log10(rms);
  return Math.min(Math.max((db - SILENCE_FLOOR_DB) / -SILENCE_FLOOR_DB, 0), 1);
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

/** Ghép các đoạn PCM 16-bit thành một file WAV (RIFF, PCM tuyến tính) — định dạng backend nhận diện được. */
export function encodeWav(
  chunks: readonly Uint8Array[],
  sampleRate: number,
  channels: number,
): Uint8Array {
  const dataBytes = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const wav = new Uint8Array(WAV_HEADER_BYTES + dataBytes);
  const view = new DataView(wav.buffer);
  const blockAlign = channels * BYTES_PER_SAMPLE;

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // kích thước khối fmt
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BYTES_PER_SAMPLE * 8, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = WAV_HEADER_BYTES;
  for (const chunk of chunks) {
    wav.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return wav;
}
