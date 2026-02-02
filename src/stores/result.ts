import type { AnalyzeResponseDto } from 'lib/schema';
import { create } from 'zustand';

type ResultState = {
  analysisResult: AnalyzeResponseDto | null;

  setAnalysisResult: (result: AnalyzeResponseDto | null) => void;
  clearResult: () => void;
};

export const useResultStore = create<ResultState>((set) => ({
  analysisResult: null,

  setAnalysisResult: (analysisResult) => set({ analysisResult }),
  clearResult: () => set({ analysisResult: null }),
}));
