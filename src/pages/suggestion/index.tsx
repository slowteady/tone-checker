import { createRoute, useNavigation } from '@granite-js/react-native';
import { colors, FixedBottomCTA, FixedBottomCTAProvider, Txt } from '@toss/tds-react-native';
import { StyleSheet, View } from 'react-native';
import { CopyCard } from 'components/result/CopyCard';
import { useResultStore } from 'stores/result';
import { isGenerateResponse, isCorrectResponse } from 'lib/schema';

export const Route = createRoute('/suggestion', {
  component: Page,
});

function Page() {
  const analysisResult = useResultStore((s) => s.analysisResult);
  if (!analysisResult) return null;

  const navigation = useNavigation();

  // 응답 타입 체크
  const isCorrect = isCorrectResponse(analysisResult);
  const isGenerate = isGenerateResponse(analysisResult);

  // 응답 타입에 따라 데이터 추출
  let items: Array<{ label: string; description?: string; example: string }> = [];

  if (isCorrect) {
    // correct 모드: corrections 데이터 매핑
    items = analysisResult.data.corrections.map((c) => ({
      label: c.label,
      description: c.description,
      example: c.text,
    }));
  } else if (isGenerate) {
    // generate 모드: messages 데이터 매핑
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
        {/* correct 모드: 종합 점수 표시 */}
        {isCorrect && (
          <View
            style={{
              marginBottom: 16,
              padding: 16,
              backgroundColor: colors.grey50,
              borderRadius: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Txt typography="st6" fontWeight="semiBold" color={colors.grey700}>
                종합 점수
              </Txt>
              <Txt typography="t4" fontWeight="bold" color={colors.grey900}>
                {analysisResult.data.overall_score}점
              </Txt>
            </View>
            <Txt typography="st11" color={colors.grey600} style={{ marginTop: 8 }}>
              {analysisResult.data.diagnosis}
            </Txt>
          </View>
        )}

        <Txt typography="t3" fontWeight="bold" color={colors.grey900} style={{ marginBottom: 16 }}>
          이런 표현은 어떠세요?
        </Txt>

        {items.map((item, index) => (
          <View key={index} style={{ marginBottom: 16 }}>
            <CopyCard label={item.label} description={item.description} example={item.example} />
          </View>
        ))}
      </View>

      {/* correct 모드: 자세히 보기, generate 모드: 홈으로 */}
      {isCorrect ? (
        <FixedBottomCTA onPress={() => navigation.push('/result')}>
          <Txt typography="t6" fontWeight="bold" color={colors.white}>
            분석 결과 자세히 보기
          </Txt>
        </FixedBottomCTA>
      ) : (
        <FixedBottomCTA onPress={() => navigation.popToTop()}>
          <Txt typography="t6" fontWeight="bold" color={colors.white}>
            홈으로 돌아가기
          </Txt>
        </FixedBottomCTA>
      )}
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
