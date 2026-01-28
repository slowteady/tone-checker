import { createRoute, Flex, Stack } from '@granite-js/react-native';
import {
  Asset,
  FixedBottomCTA,
  FixedBottomCTAProvider,
  SegmentedControl,
  TextArea,
  Toast,
  Txt,
} from '@toss/tds-react-native';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@toss/tds-colors';
import { RELATIONSHIP_OPTIONS, SITUATION_OPTIONS, type Relationship, type Situation } from 'constants/params';

export const Route = createRoute('/', {
  component: Page,
});

function Page() {
  const [relationship, setRelationship] = useState<Relationship>('business');
  const [situation, setSituation] = useState<Situation>('neutral');
  const [text, setText] = useState<string>('');
  const [toastOpen, setToastOpen] = useState(false);

  const goToAnalyze = () => {
    if (isTextTooShort) {
      setToastOpen(true);
      return;
    }
  };

  const isTextTooShort = text.length < 20;

  return (
    <FixedBottomCTAProvider
      wrapperProps={{
        automaticallyAdjustKeyboardInsets: true,
        contentContainerStyle: styles.contentContainer,
      }}
    >
      <View>
        <Txt typography="t1" fontWeight="bold" style={{ marginBottom: 16 }}>
          {`AI가 문장의 말투를 \n상황에 맞게 다듬어드려요`}
        </Txt>
        <Flex direction="row" style={[styles.badge, { marginBottom: 24 }]}>
          <Asset.Icon name="icon-lightning-blue" frameShape={{ width: 18, height: 18 }} style={{ marginRight: 6 }} />
          <Txt typography="t7" fontWeight="bold" color={colors.grey500} style={{ marginRight: 4 }}>
            오늘 남은 횟수
          </Txt>
          <Txt typography="t7" fontWeight="bold" color={colors.blue900}>
            3
          </Txt>
        </Flex>

        <Flex direction="column" style={{ marginBottom: 24 }}>
          <Txt typography="t6" fontWeight="bold" color={colors.grey500} style={{ marginBottom: 8 }}>
            누구에게 보내나요?
          </Txt>
          <SegmentedControl.Root
            value={relationship}
            onChange={(value) => setRelationship(value as Relationship)}
            name="relationship"
            style={{ paddingHorizontal: 0 }}
          >
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <SegmentedControl.Item key={opt.value} value={opt.value}>
                {opt.label}
              </SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>
        </Flex>

        <Flex direction="column" style={{ marginBottom: 24 }}>
          <Txt typography="t6" fontWeight="bold" color={colors.grey500} style={{ marginBottom: 8 }}>
            어떤 분위기인가요?
          </Txt>
          <SegmentedControl.Root
            value={situation}
            onChange={(value) => setSituation(value as Situation)}
            name="situation"
            style={{ paddingHorizontal: 0 }}
          >
            {SITUATION_OPTIONS.map((opt) => (
              <SegmentedControl.Item key={opt.value} value={opt.value}>
                {opt.label}
              </SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>
        </Flex>

        <TextArea
          placeholder={`상대에게 보내고 싶은 문장을 입력해 주세요.`}
          value={text}
          onChangeText={setText}
          maxLength={800}
          textAreaStyle={{ height: 200 }}
          containerStyle={{ paddingVertical: 0, paddingHorizontal: 0, marginBottom: 24 }}
          help={
            <Stack
              direction="horizontal"
              align="center"
              justify="space-between"
              style={{ paddingVertical: 8, width: '100%' }}
            >
              <Flex direction="row" align="center">
                <Asset.Icon
                  name="icon-info-circle-blue"
                  frameShape={{ width: 16, height: 16 }}
                  style={{ marginRight: 4 }}
                  color={colors.red500}
                />
                <Txt typography="st12" fontWeight="semiBold" color={colors.grey500}>
                  {`최소 20자 이상 입력해주세요.`}
                </Txt>
              </Flex>
              <Txt typography="st12" fontWeight="bold" color={colors.grey500}>
                {text.length} / 800
              </Txt>
            </Stack>
          }
        />

        <FixedBottomCTA onPress={goToAnalyze}>
          <Txt typography="t6" fontWeight="bold" color={colors.white}>
            분석하기
          </Txt>
        </FixedBottomCTA>
      </View>

      {toastOpen && (
        <Toast
          open={toastOpen}
          onClose={() => setToastOpen(false)}
          position="bottom"
          text="최소 20자 이상 입력해주세요."
          icon={<Toast.LottieIcon preset type="error" />}
        />
      )}
    </FixedBottomCTAProvider>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.grey100,
    alignItems: 'center',
    alignSelf: 'baseline',
    borderRadius: 9999,
  },
});
