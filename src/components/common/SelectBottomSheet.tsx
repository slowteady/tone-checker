import { BottomSheet, Button } from '@toss/tds-react-native';

export interface SelectBottomSheetProps<T extends string> {
  open: boolean;
  title: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  selectedValue: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  onExited?: () => void;
}

export function SelectBottomSheet<T extends string>({
  open,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  onExited,
}: SelectBottomSheetProps<T>) {
  const handleSelect = (value: T) => {
    onSelect(value);
    onClose();
  };

  return (
    <BottomSheet.Root
      open={open}
      onClose={onClose}
      onExited={onExited}
      header={<BottomSheet.Header>{title}</BottomSheet.Header>}
      wrapperProps={{ contentContainerStyle: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 } }}
    >
      {options.map((option) => {
        const isSelected = selectedValue === option.value;

        return (
          <Button
            key={option.value}
            onPress={() => handleSelect(option.value)}
            type={isSelected ? 'primary' : 'dark'}
            style={isSelected ? 'fill' : 'weak'}
            display="block"
            size="large"
            viewStyle={{ marginBottom: 8 }}
          >
            {option.label}
          </Button>
        );
      })}
    </BottomSheet.Root>
  );
}
