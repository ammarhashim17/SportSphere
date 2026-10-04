import { forwardRef, useCallback } from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

type Props = {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
};

export const AppBottomSheet = forwardRef<BottomSheetModal, Props>(function AppBottomSheet(
  { children, snapPoints },
  ref,
) {
  const backdrop = useCallback(
    (p: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...p} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      backdropComponent={backdrop}
      backgroundStyle={{ borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: '#D0D5DD' }}
    >
      <BottomSheetView style={{ padding: 16, paddingBottom: 32 }}>{children}</BottomSheetView>
    </BottomSheetModal>
  );
});
