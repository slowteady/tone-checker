import { useCallback } from 'react';
import { useOverlay } from '@apps-in-toss/framework';
import { SelectBottomSheet } from 'components/common/SelectBottomSheet';

/**
 * SelectBottomSheet를 열기 위한 커스텀 훅
 *
 * @example
 * const openScenarioSheet = useBottomSheet(
 *   "누구에게 보내나요?",
 *   SCENARIO_OPTIONS,
 *   scenario,
 *   setScenario
 * );
 */
export function useBottomSheet<T extends string>(
  title: string,
  options: ReadonlyArray<{ value: T; label: string }>,
  selectedValue: T,
  onSelect: (value: T) => void
) {
  const overlay = useOverlay();

  const open = useCallback(() => {
    overlay.open(({ isOpen, close, exit }) => (
      <SelectBottomSheet
        open={isOpen}
        title={title}
        options={options}
        selectedValue={selectedValue}
        onSelect={onSelect}
        onClose={close}
        onExited={exit}
      />
    ));
  }, [overlay, title, options, selectedValue, onSelect]);

  return open;
}
