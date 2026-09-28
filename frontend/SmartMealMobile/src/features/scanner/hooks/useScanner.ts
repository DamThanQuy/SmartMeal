import { useMutation } from '@tanstack/react-query';
import { scannerService } from '../services/scannerService';

export function useScanBarcode() {
  return useMutation({
    mutationFn: () => scannerService.scanBarcode(),
  });
}

export function useAnalyzeOcrLabel() {
  return useMutation({
    mutationFn: () => scannerService.analyzeOcrLabel(),
  });
}

export function useScanFridge() {
  return useMutation({
    mutationFn: () => scannerService.scanFridge(),
  });
}
