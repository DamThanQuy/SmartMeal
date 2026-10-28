import { writeVoiceFile } from '@/features/ai/services/voiceAudioFile';

const mockFiles = new Map<string, Uint8Array>();

// Native File không chạy trong Jest. Mô phỏng đúng hợp đồng SDK 58: write() bất đồng bộ,
// writeSync() hoàn tất dữ liệu trước khi trả về để bên gọi có thể upload ngay URI.
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  File: class {
    uri: string;

    constructor(...parts: string[]) {
      this.uri = parts.join('/');
    }

    create() {
      mockFiles.set(this.uri, new Uint8Array());
    }

    async write(bytes: Uint8Array) {
      await Promise.resolve();
      mockFiles.set(this.uri, bytes.slice());
    }

    writeSync(bytes: Uint8Array) {
      mockFiles.set(this.uri, bytes.slice());
    }
  },
}));

test('file âm thanh đã có đủ dữ liệu ngay khi trả URI cho luồng upload', () => {
  const bytes = new Uint8Array([82, 73, 70, 70, 4, 0, 0, 0]);

  const uri = writeVoiceFile('voice.wav', bytes);

  expect(uri).toBe('file:///cache/voice.wav');
  expect(mockFiles.get(uri)).toEqual(bytes);
});
