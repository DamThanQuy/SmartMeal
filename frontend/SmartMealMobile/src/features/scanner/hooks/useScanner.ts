import { useMutation } from '@tanstack/react-query';
import { scannerService } from '../services/scannerService';

export function useScanBarcode() {
  return useMutation({
    mutationFn: (code: string) => scannerService.scanBarcode(code),
  });
}

export function useAnalyzeOcrLabel() {
  return useMutation({
    mutationFn: (imageUri: string) => scannerService.analyzeOcrLabel(imageUri),
  });
}

export function useScanFridge() {
  return useMutation({
    mutationFn: (imageUris: string[]) => scannerService.scanFridge(imageUris),
  });
}
