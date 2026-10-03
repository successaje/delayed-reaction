import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useRemote } from '../remote/use-remote';
import { color, safe, space, type } from '../theme';

/**
 * Last line of defence: a render error shows a recoverable screen instead of a black TV.
 * Any remote press resets it back to the start.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[DelayedReaction] render error', error, info.componentStack);
  }

  reset = () => {
    this.setState({ failed: false });
    this.props.onReset();
  };

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: color.ink950, padding: safe.x, justifyContent: 'center' }}>
        <Text style={[type.title, { color: color.chalk }]}>Something went wrong on this TV</Text>
        <Text style={[type.body, { color: color.chalk2, marginTop: space.sm, maxWidth: 1000 }]}>
          Your room and everyone's reactions are safe. Press any button to start again.
        </Text>
        <ResetOnKey onReset={this.reset} />
      </View>
    );
  }
}

function ResetOnKey({ onReset }: { onReset: () => void }) {
  useRemote(() => onReset());
  return null;
}
