import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SpatialNavigationFocusableView } from 'react-tv-space-navigation';
import { color, radius, space, type } from '../theme';

/** A focusable surface. Focus reads from across the room: amber outline, lifted, brighter. */
export function Focusable({
  onSelect,
  style,
  focusedStyle,
  children,
}: {
  onSelect?: () => void;
  style?: StyleProp<ViewStyle>;
  focusedStyle?: StyleProp<ViewStyle>;
  children: (state: { focused: boolean }) => ReactNode;
}) {
  return (
    <SpatialNavigationFocusableView onSelect={onSelect}>
      {({ isFocused }: { isFocused: boolean }) => (
        <View style={[styles.base, style, isFocused && styles.focused, isFocused && focusedStyle]}>
          {children({ focused: isFocused })}
        </View>
      )}
    </SpatialNavigationFocusableView>
  );
}

export function TvButton({
  label,
  onSelect,
  variant = 'primary',
  hint,
}: {
  label: string;
  onSelect: () => void;
  variant?: 'primary' | 'secondary';
  hint?: string;
}) {
  return (
    <Focusable
      onSelect={onSelect}
      style={[styles.button, variant === 'primary' ? styles.primary : styles.secondary]}
    >
      {({ focused }) => (
        <>
          <Text
            style={[
              type.label,
              styles.buttonLabel,
              { color: variant === 'primary' || focused ? color.ink950 : color.chalk },
            ]}
          >
            {label}
          </Text>
          {hint ? (
            <Text style={[styles.hint, { color: focused || variant === 'primary' ? color.ink850 : color.chalk3 }]}>
              {hint}
            </Text>
          ) : null}
        </>
      )}
    </Focusable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 3,
    borderColor: 'transparent',
    borderRadius: radius.md,
  },
  focused: {
    borderColor: color.amber,
    transform: [{ scale: 1.04 }],
  },
  button: {
    minHeight: 76,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  primary: { backgroundColor: color.chalk },
  secondary: { backgroundColor: color.ink850, borderColor: color.lineStrong },
  buttonLabel: { fontSize: 26 },
  hint: { fontSize: 18, marginTop: 2 },
});
