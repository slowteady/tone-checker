import { colors } from '@toss/tds-colors';
import { createRoute, Flex, useNavigation } from '@granite-js/react-native';
import { StyleSheet, View } from 'react-native';
import { Border, BottomInfo, FixedBottomCTA, FixedBottomCTAProvider, Post, Txt } from '@toss/tds-react-native';
import { Progressbar } from 'components/result/Progressbar';
import { SignalCard } from 'components/result/SignalCard';
import { categoryScoresDetailsMap, categoryScoresMap } from 'constants/categoryScoresMap';
import { useMemo } from 'react';
import { ResultCard } from 'components/result/ResultCard';
import { useResultStore } from 'stores/result';
import { isCorrectResponse, type CategoryScoreItemDto, type SignalDto } from 'lib/schema';

export const Route = createRoute('/result', {
  component: Page,
});

function Page() {
  const analysisResult = useResultStore((s) => s.analysisResult);
  const navigation = useNavigation();

  // correct 모드만 이 페이지에서 처리
  if (!isCorrectResponse(analysisResult)) {
    return null;
  }

  const result = analysisResult.data;
  const categoryScores = result.category_scores;
  const categoryScoresArray = useMemo(
    () =>
      Object.entries(categoryScores).map(([key, value]: [string, CategoryScoreItemDto]) => ({
        category: categoryScoresMap[key as keyof typeof categoryScoresMap],
        score: value.score,
        comment: value.comment,
        detail: Object.entries(value.details).map(([key, value]: [string, { score: number; comment: string }]) => ({
          category: categoryScoresDetailsMap[key as keyof typeof categoryScoresDetailsMap],
          score: value.score,
          comment: value.comment,
        })),
      })),
    [categoryScores]
  );

  const hasWarnings = result.warnings.length > 0;
  const hasSignals = result.signals.length > 0;

  return (
    <FixedBottomCTAProvider>
      <View style={styles.container}>
        <Flex direction="row" justify="space-between" style={{ marginBottom: 12 }}>
          <Txt typography="t6" fontWeight="bold" color={colors.grey700} style={{ alignSelf: 'flex-end' }}>
            종합 점수
          </Txt>
          <Flex direction="row" align="flex-end">
            <Txt typography="t1" fontWeight="bold" color={colors.grey900} style={{ marginBottom: -4, marginRight: 2 }}>
              {result.overall_score}
            </Txt>
            <Txt typography="t5" fontWeight="bold" color={colors.grey700} style={{ marginRight: 2 }}>
              /
            </Txt>
            <Txt typography="t5" fontWeight="bold" color={colors.grey700}>
              100
            </Txt>
          </Flex>
        </Flex>

        <View style={{ marginBottom: 20 }}>
          <Progressbar score={result.overall_score} />
        </View>

        <Txt typography="st6" fontWeight="bold" color={colors.grey900} style={{ marginBottom: 20 }}>
          {result.summary}
        </Txt>

        {hasWarnings && (
          <BottomInfo
            style={{
              backgroundColor: colors.grey50,
              marginBottom: 32,
              paddingHorizontal: 0,
              paddingVertical: 16,
              borderRadius: 16,
            }}
          >
            <Post.Ul typography="st11" paddingBottom={0} style={{ paddingLeft: 8 }}>
              {result.warnings.map((warning: string, idx: number) => (
                <Post.Li key={idx} color={colors.grey700}>
                  {warning}
                </Post.Li>
              ))}
            </Post.Ul>
          </BottomInfo>
        )}

        {hasSignals && (
          <Flex direction="column" style={{ marginBottom: 20, gap: 16 }}>
            {result.signals.map((signal: SignalDto, idx: number) => {
              const key = `${signal.category}-${idx}`;
              return <SignalCard key={key} level={signal.level} reason={signal.reason} evidence={signal.evidence} />;
            })}
          </Flex>
        )}
      </View>

      <View style={{ marginBottom: 20 }}>
        <Border type="height16" height={8} />
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <Txt typography="t4" fontWeight="bold" color={colors.grey900} style={{ marginBottom: 24 }}>
          상세 분석
        </Txt>
        <Flex direction="column" style={{ gap: 32 }}>
          {categoryScoresArray.map((category, idx) => {
            const key = `${category.category}-${idx}`;

            return (
              <ResultCard
                key={key}
                category={category.category}
                score={category.score}
                comment={category.comment}
                detail={category.detail}
              />
            );
          })}
        </Flex>
      </View>

      {/* v2 correct: 홈으로 */}
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
