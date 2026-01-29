import { Asset, Result } from '@toss/tds-react-native';

export interface ErrorResultProps {
  onRetry: () => void;
}

export const ErrorResult = ({ onRetry }: ErrorResultProps) => {
  return (
    <Result
      figure={
        <Asset.Image
          source={{ uri: 'https://static.toss.im/lotties/empty-2-spot-apng.png' }}
          frameShape={Asset.frameShape.CleanW80}
        />
      }
      title="다시 시도해주세요"
      description="시스템에 잠깐 문제가 생겨 화면을 불러오지 못했어요."
      button={
        <Result.Button size="medium" onPress={onRetry}>
          다시 시도하기
        </Result.Button>
      }
    />
  );
};
