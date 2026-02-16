import { BottomSheet, Button, colors, Post } from '@toss/tds-react-native';
import type { Mode } from 'constants/params';

export interface AnalysisBottomSheetProps {
  mode: Mode;
  open: boolean;
  onClose: () => void;
  onAnalyze: () => void;
}

export const AnalysisBottomSheet = ({ mode, open, onClose, onAnalyze }: AnalysisBottomSheetProps) => {
  const actionLabel = mode === 'generate' ? '생성' : '교정';

  return (
    <BottomSheet.Root
      open={open}
      onClose={onClose}
      header={<BottomSheet.Header>{`${actionLabel}을 진행할까요?`}</BottomSheet.Header>}
      headerDescription={
        <BottomSheet.HeaderDescription>{`${actionLabel}을 진행하면 사용 횟수 1회가 차감돼요.`}</BottomSheet.HeaderDescription>
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
              {actionLabel}하기
            </Button>
          }
        />
      }
    >
      <Post.Paragraph
        typography="st11"
        fontWeight="bold"
        color={colors.grey700}
        style={{ marginBottom: 8, paddingBottom: 0 }}
      >
        *{mode === 'generate' ? '설명이' : '문장이'} 길수록 {actionLabel} 시간이 더 소요될 수 있어요.
      </Post.Paragraph>
      <Post.Paragraph typography="st11" fontWeight="bold" color={colors.grey700}>
        *광고가 출력될 수 있어요.
      </Post.Paragraph>
    </BottomSheet.Root>
  );
};
