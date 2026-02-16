import type { AnalyzeResponseDto, GenerateResponseDto, CorrectResponseDto } from 'lib/schema';
import { create } from 'zustand';

type ResultState = {
  analysisResult: AnalyzeResponseDto | GenerateResponseDto | CorrectResponseDto | null;

  setAnalysisResult: (result: AnalyzeResponseDto | GenerateResponseDto | CorrectResponseDto | null) => void;
  clearResult: () => void;
};

export const useResultStore = create<ResultState>((set) => ({
  analysisResult: null,

  setAnalysisResult: (analysisResult) => set({ analysisResult }),
  clearResult: () => set({ analysisResult: null }),
}));
