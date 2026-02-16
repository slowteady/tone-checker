import { BottomSheet, Txt } from '@toss/tds-react-native';
import { Pressable } from 'react-native';
import { colors } from '@toss/tds-colors';

export interface ExampleBottomSheetProps {
  open: boolean;
  title: string;
  examples: string[];
  onSelect: (example: string) => void;
  onClose: () => void;
  onExited?: () => void;
}

/**
 * 예시 문장 선택 BottomSheet
 * 메시지 생성 모드 전용
 */
export function ExampleBottomSheet({ open, title, examples, onSelect, onClose, onExited }: ExampleBottomSheetProps) {
  const handleSelect = (example: string) => {
    onSelect(example);
    onClose();
  };

  return (
    <BottomSheet.Root
      open={open}
      onClose={onClose}
      onExited={onExited}
      header={<BottomSheet.Header>{title}</BottomSheet.Header>}
      headerDescription={<BottomSheet.HeaderDescription>클릭하여 사용할 수 있어요</BottomSheet.HeaderDescription>}
      wrapperProps={{ contentContainerStyle: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 } }}
    >
      {examples.map((example, index) => (
        <Pressable
          key={index}
          onPress={() => handleSelect(example)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? colors.grey200 : colors.grey100,
            paddingVertical: 16,
            paddingHorizontal: 16,
            borderRadius: 12,
            marginBottom: index < examples.length - 1 ? 12 : 0,
          })}
        >
          <Txt typography="st10" fontWeight="medium" color={colors.grey900}>
            {example}
          </Txt>
        </Pressable>
      ))}
    </BottomSheet.Root>
  );
}
