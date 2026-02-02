import { BottomSheet, Button } from '@toss/tds-react-native';

export interface AnalysisBottomSheetProps {
  open: boolean;
  onClose: () => void;
  onAnalyze: () => void;
}

export const AnalysisBottomSheet = ({ open, onClose, onAnalyze }: AnalysisBottomSheetProps) => {
  return (
    <BottomSheet.Root
      open={open}
      onClose={onClose}
      header={<BottomSheet.Header>분석을 진행할까요?</BottomSheet.Header>}
      headerDescription={
        <BottomSheet.HeaderDescription>{`분석을 진행하면 분석 횟수 1회가 차감돼요.\n또한, 광고가 출력될 수 있어요.`}</BottomSheet.HeaderDescription>
      }
      cta={
        <BottomSheet.CTA.Double
          leftButton={
            <Button display="block" style="weak" type="dark" onPress={onClose}>
              취소하기
            </Button>
          }
          rightButton={
            <Button display="block" onPress={onAnalyze}>
              분석하기
            </Button>
          }
        />
      }
    />
  );
};
