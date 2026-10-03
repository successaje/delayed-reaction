import QRCode from 'qrcode';
import { useMemo } from 'react';
import { View } from 'react-native';

/**
 * A QR code drawn with Views (no SVG dependency on Vega). Each row is split into runs of
 * dark modules, so a typical code is a few hundred Views rather than a thousand.
 */
export function QrCode({ value, size, fg = '#0a0c0b', bg = '#f2f0e8' }: { value: string; size: number; fg?: string; bg?: string }) {
  const rows = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    const data = qr.modules.data;
    const result: Array<Array<{ start: number; length: number }>> = [];
    for (let y = 0; y < n; y++) {
      const runs: Array<{ start: number; length: number }> = [];
      let x = 0;
      while (x < n) {
        if (data[y * n + x]) {
          const start = x;
          while (x < n && data[y * n + x]) x++;
          runs.push({ start, length: x - start });
        } else x++;
      }
      result.push(runs);
    }
    return { n, rows: result };
  }, [value]);

  const quiet = 2;
  const cell = size / (rows.n + quiet * 2);
  return (
    <View
      accessibilityLabel="QR code"
      style={{ width: size, height: size, backgroundColor: bg, padding: cell * quiet, borderRadius: 8 }}
    >
      {rows.rows.map((runs, y) => (
        <View key={y} style={{ height: cell, flexDirection: 'row' }}>
          {runs.map((run) => (
            <View
              key={run.start}
              style={{
                position: 'absolute',
                left: run.start * cell,
                width: run.length * cell + 0.5,
                height: cell + 0.5,
                backgroundColor: fg,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
