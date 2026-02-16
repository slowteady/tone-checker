import { createRoute, useNavigation } from '@granite-js/react-native';
import { colors, FixedBottomCTA, FixedBottomCTAProvider, Txt } from '@toss/tds-react-native';
import { StyleSheet, View } from 'react-native';
import { CopyCard } from 'components/result/CopyCard';
import { useResultStore } from 'stores/result';
import { isGenerateResponse, isCorrectResponse, isAnalyzeResponse } from 'lib/schema';

export const Route = createRoute('/suggestion', {
  component: Page,
});

function Page() {
  const analysisResult = useResultStore((s) => s.analysisResult);
  if (!analysisResult) return null;

  const navigation = useNavigation();

  // 응답 타입에 따라 데이터 추출
  let items: Array<{ label: string; description?: string; example: string }> = [];

  if (isAnalyzeResponse(analysisResult)) {
    // v1: suggestions
    items = analysisResult.data.suggestions;
  } else if (isCorrectResponse(analysisResult)) {
    // v2 correct: corrections (text → example으로 매핑)
    items = analysisResult.data.corrections.map((c) => ({
      label: c.label,
      description: c.description,
      example: c.text,
    }));
  } else if (isGenerateResponse(analysisResult)) {
    // v2 generate: messages (description 없음)
    items = analysisResult.data.messages.map((m) => ({
      label: m.label,
      example: m.text,
    }));
  } else {
    return null;
  }

  return (
    <FixedBottomCTAProvider>
      <View style={styles.container}>
        <Txt typography="t3" fontWeight="bold" color={colors.grey900} style={{ marginBottom: 16 }}>
          이런 표현은 어떠세요?
        </Txt>

        {items.map((item, index) => (
          <View key={index} style={{ marginBottom: 16 }}>
            <CopyCard label={item.label} description={item.description} example={item.example} />
          </View>
        ))}
      </View>

      <FixedBottomCTA onPress={() => navigation.popToTop()}>
        <Txt typography="t6" fontWeight="bold" color={colors.white}>
          홈으로 돌아가기
        </Txt>
      </FixedBottomCTA>
    </FixedBottomCTAProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});
