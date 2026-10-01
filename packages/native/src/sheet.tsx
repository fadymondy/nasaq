import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { Icon } from "./icons";
import { alpha } from "./logic";
import { useNasaq } from "./provider";
import { Text } from "./text";

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  /**
   * Heights as fractions of the window (0 to 1). The sheet is as tall as its content, up to the largest
   * value (default 0.85); the content scrolls past that.
   */
  snapPoints?: number[];
  /** Safe-area bottom inset (react-native-safe-area-context `useSafeAreaInsets().bottom`). */
  bottomInset?: number;
  closeLabel?: string;
}

/** A bottom sheet on the Modal from react-native (no extra dependency): dimmed backdrop, grab handle, close control. */
export function Sheet({ visible, onClose, title, children, snapPoints, bottomInset = 0, closeLabel }: SheetProps) {
  const nq = useNasaq();
  const { height } = useWindowDimensions();
  const c = nq.colors;
  const top = Math.max(...(snapPoints?.length ? snapPoints : [0.85]));
  const max = Math.round(height * Math.min(1, Math.max(0.2, top)));
  const label = closeLabel ?? (nq.script === "arabic" ? "إغلاق" : "Close");
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} supportedOrientations={["portrait", "landscape"]}>
      <View style={{ flex: 1, justifyContent: "flex-end" }} accessibilityViewIsModal>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onClose}
          style={{ position: "absolute", top: 0, bottom: 0, start: 0, end: 0, backgroundColor: alpha(c.bg, 0.6) }}
        />
        <View
          style={{
            maxHeight: max,
            backgroundColor: c.surfaceOverlay,
            borderTopStartRadius: nq.radius.floating + 4,
            borderTopEndRadius: nq.radius.floating + 4,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: c.line,
            paddingTop: nq.space[2],
            paddingBottom: nq.space[4] + bottomInset,
            paddingHorizontal: nq.space[4],
            gap: nq.space[3],
          }}
        >
          <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: c.lineStrong }} />
          {title ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: nq.space[3] }}>
              <Text variant="h3" style={{ flex: 1 }}>
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={onClose}
                hitSlop={10}
                style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="close" size={20} color={c.fgMuted} />
              </Pressable>
            </View>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: nq.space[3] }} bounces={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
