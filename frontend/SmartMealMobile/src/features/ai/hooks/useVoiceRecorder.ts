import { getRecordingPermissionsAsync, setAudioModeAsync, useAudioStream, type AudioStreamBuffer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { isAiQuotaExceededError } from '../services/ai.errors';
import { encodeWav, pcmBytesFor, pcmDurationMillis, pcmLevel } from '../services/pcmAudio';
import { deleteVoiceFile, writeVoiceFile } from '../services/voiceAudioFile';
import { useTranscribeVoiceDraft } from './useAiAnalysis';

/** 16 kHz mono đủ cho nhận dạng giọng nói và giữ file nhỏ (~32 KB mỗi giây). */
const SAMPLE_RATE = 16000;
const CHANNELS = 1;
/** Giới hạn một lần nói (file WAV ~1,9 MB) — đủ để kể một bữa ăn; chạm giới hạn thì gọi `onMaxDuration`. */
const MAX_RECORDING_MS = 60_000;
/** Ngắn hơn mức này coi như chưa nói gì. */
const MIN_RECORDING_MS = 700;
/** Phụ đề tạm: mỗi lần gửi cách nhau ít nhất chừng này, chỉ khi có thêm ≥ MIN_NEW_AUDIO_MS âm thanh có tiếng nói. */
const LIVE_INTERVAL_MS = 1500;
const MIN_NEW_AUDIO_MS = 700;
/** Âm lượng (0–1, xem pcmLevel) từ mức này trở lên coi là có tiếng nói (~-45 dBFS). */
const SPEECH_LEVEL = 0.25;
const WAVE_BAR_COUNT = 13;
const LIVE_FILE_NAME = 'voice-live.wav';

const START_FAILED_MESSAGE =
  'Không mở được micro. Hãy đóng ứng dụng khác đang dùng micro (gọi điện, ghi âm…) rồi chạm micro để thử lại.';
const TOO_SHORT_MESSAGE = 'Chưa thu được giọng nói. Chạm micro và nói tên món bạn đã ăn.';
const SAVE_FAILED_MESSAGE = 'Không lưu được đoạn ghi âm. Chạm micro để thử lại.';

export type VoiceRecorderStatus = 'idle' | 'starting' | 'recording' | 'stopped' | 'error';
export type VoiceRecorderStartResult = 'started' | 'permission-denied' | 'failed';

export interface VoiceRecording {
  /** File WAV trong cache — gửi /ai/voice-log/audio và nghe lại. */
  uri: string;
  durationMillis: number;
}

interface Meter {
  durationMillis: number;
  /** Âm lượng (0–1) của các đoạn 100 ms gần nhất, cũ → mới — vẽ sóng âm. */
  levels: number[];
}

const IDLE_METER: Meter = { durationMillis: 0, levels: Array<number>(WAVE_BAR_COUNT).fill(0) };

/**
 * Ghi âm giọng nói bằng luồng PCM của expo-audio (`useAudioStream`, chạy được trên Expo Go) thay cho
 * AudioRecorder: một nguồn micro duy nhất vừa vẽ sóng âm theo âm lượng thật, vừa cho phụ đề tạm — vài giây
 * một lần gửi cả đoạn đã ghi lên /ai/voice-log/transcribe (mỗi lúc một request) và hiện bản chép lời mới
 * nhất. Dừng thì đóng gói WAV để gửi phân tích. Mọi lỗi micro đều trả về `error` thay vì bị bỏ qua.
 */
export function useVoiceRecorder({ onMaxDuration }: { onMaxDuration?: () => void } = {}) {
  const transcribeDraft = useTranscribeVoiceDraft();
  // Gọi từ callback native khi chạm giới hạn thời lượng — giữ bản mới nhất mà không ghi ref lúc render.
  const onMaxDurationRef = useRef(onMaxDuration);
  useEffect(() => {
    onMaxDurationRef.current = onMaxDuration;
  });
  const [status, setStatus] = useState<VoiceRecorderStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [meter, setMeter] = useState<Meter>(IDLE_METER);
  const [liveTranscript, setLiveTranscript] = useState('');

  // Trạng thái đọc trong callback native (onBuffer) và timer — giữ ở ref để luôn là giá trị mới nhất.
  const statusRef = useRef<VoiceRecorderStatus>('idle');
  const chunksRef = useRef<Uint8Array[]>([]);
  const bytesRef = useRef(0);
  const formatRef = useRef({ sampleRate: SAMPLE_RATE, channels: CHANNELS });
  const levelsRef = useRef<number[]>(IDLE_METER.levels);
  /** Tăng mỗi lần ghi mới — phụ đề của lần ghi trước về muộn thì bỏ. */
  const sessionRef = useRef(0);
  const speechPendingRef = useRef(false);
  const bytesAtLastSendRef = useRef(0);
  const liveInFlightRef = useRef(false);
  /** Server từ chối (hết lượt / gửi quá dày) → thôi phụ đề cho lần ghi này, bước phân tích sẽ báo lỗi rõ. */
  const liveDisabledRef = useRef(false);
  const liveFileUriRef = useRef<string | null>(null);
  const recordingUriRef = useRef<string | null>(null);

  const updateStatus = (next: VoiceRecorderStatus) => {
    statusRef.current = next;
    setStatus(next);
  };

  const fail = (message: string) => {
    updateStatus('error');
    setError(message);
  };

  const handleBuffer = (buffer: AudioStreamBuffer) => {
    if (statusRef.current !== 'recording' && statusRef.current !== 'starting') return;
    if (chunksRef.current.length === 0) {
      formatRef.current = { sampleRate: buffer.sampleRate, channels: buffer.channels };
    }
    const { sampleRate, channels } = formatRef.current;
    if (bytesRef.current >= pcmBytesFor(MAX_RECORDING_MS, sampleRate, channels)) return;

    // Chép ra bộ nhớ JS: vùng đệm native chỉ được bảo đảm trong lúc gọi callback.
    const chunk = new Uint8Array(buffer.data.slice(0));
    chunksRef.current.push(chunk);
    bytesRef.current += chunk.byteLength;

    const level = pcmLevel(chunk);
    if (level >= SPEECH_LEVEL) speechPendingRef.current = true;
    levelsRef.current = [...levelsRef.current.slice(1), level];
    const durationMillis = pcmDurationMillis(bytesRef.current, sampleRate, channels);
    setMeter({ durationMillis, levels: levelsRef.current });

    if (durationMillis >= MAX_RECORDING_MS && statusRef.current === 'recording') {
      onMaxDurationRef.current?.();
    }
  };

  const { stream } = useAudioStream({
    sampleRate: SAMPLE_RATE,
    channels: CHANNELS,
    encoding: 'int16',
    onBuffer: handleBuffer,
  });

  // Phụ đề tạm trong lúc đang ghi: chỉ gửi khi có tiếng nói mới và không còn request nào đang chờ.
  const transcribeDraftAsync = transcribeDraft.mutateAsync;
  useEffect(() => {
    if (status !== 'recording') return;

    const timer = setInterval(() => {
      if (liveInFlightRef.current || liveDisabledRef.current || !speechPendingRef.current) return;
      const { sampleRate, channels } = formatRef.current;
      const newBytes = bytesRef.current - bytesAtLastSendRef.current;
      if (newBytes < pcmBytesFor(MIN_NEW_AUDIO_MS, sampleRate, channels)) return;

      let uri: string;
      try {
        uri = writeVoiceFile(LIVE_FILE_NAME, encodeWav(chunksRef.current, sampleRate, channels));
      } catch {
        return;
      }
      const session = sessionRef.current;
      liveFileUriRef.current = uri;
      liveInFlightRef.current = true;
      speechPendingRef.current = false;
      bytesAtLastSendRef.current = bytesRef.current;

      transcribeDraftAsync(uri)
        .then(text => {
          if (session === sessionRef.current && text) setLiveTranscript(text);
        })
        .catch((draftError: unknown) => {
          // 429: hết lượt AI hoặc gửi quá dày. Lỗi khác (mạng chập chờn) thì thử lại ở nhịp sau.
          if (session === sessionRef.current && isAiQuotaExceededError(draftError)) {
            liveDisabledRef.current = true;
          }
        })
        .finally(() => {
          liveInFlightRef.current = false;
        });
    }, LIVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [status, transcribeDraftAsync]);

  // Rời màn hình: luồng micro tự dừng khi useAudioStream giải phóng; chỉ cần dọn file tạm.
  const unmountedRef = useRef(false);
  useEffect(
    () => () => {
      unmountedRef.current = true;
      deleteVoiceFile(liveFileUriRef.current);
      deleteVoiceFile(recordingUriRef.current);
    },
    [],
  );

  const start = async (): Promise<VoiceRecorderStartResult> => {
    if (statusRef.current === 'starting' || statusRef.current === 'recording') return 'started';

    sessionRef.current += 1;
    chunksRef.current = [];
    bytesRef.current = 0;
    bytesAtLastSendRef.current = 0;
    speechPendingRef.current = false;
    liveDisabledRef.current = false;
    levelsRef.current = IDLE_METER.levels;
    deleteVoiceFile(recordingUriRef.current);
    recordingUriRef.current = null;
    setMeter(IDLE_METER);
    setLiveTranscript('');
    setError(null);
    updateStatus('starting');

    try {
      const { granted } = await getRecordingPermissionsAsync();
      if (!granted) {
        updateStatus('idle');
        return 'permission-denied';
      }
      await stream.start();
      if (unmountedRef.current) {
        // Rời màn đúng lúc micro đang mở: luồng đã được giải phóng trước khi kịp chạy — tắt hẳn micro.
        try {
          stream.stop();
        } catch {
          // Đối tượng native đã giải phóng.
        }
        return 'failed';
      }
      updateStatus('recording');
      return 'started';
    } catch {
      fail(START_FAILED_MESSAGE);
      return 'failed';
    }
  };

  /** Dừng ghi và trả file WAV; null khi chưa ghi được gì (lý do nằm ở `error`). */
  const stop = async (): Promise<VoiceRecording | null> => {
    if (statusRef.current !== 'recording') return null;

    stream.stop();
    updateStatus('stopped');
    // iOS: luồng micro để phiên âm thanh ở chế độ chỉ-ghi — chuyển lại chế độ phát để nghe lại được.
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => undefined);

    const { sampleRate, channels } = formatRef.current;
    const durationMillis = pcmDurationMillis(bytesRef.current, sampleRate, channels);
    if (durationMillis < MIN_RECORDING_MS) {
      fail(TOO_SHORT_MESSAGE);
      return null;
    }

    try {
      const uri = writeVoiceFile(`voice-${Date.now()}.wav`, encodeWav(chunksRef.current, sampleRate, channels));
      recordingUriRef.current = uri;
      return { uri, durationMillis };
    } catch {
      fail(SAVE_FAILED_MESSAGE);
      return null;
    }
  };

  return {
    status,
    error,
    durationMillis: meter.durationMillis,
    levels: meter.levels,
    liveTranscript,
    start,
    stop,
  };
}
