import { useEffect, useState, type ReactNode } from 'react';

const WIDTH = 1920;
const HEIGHT = 1080;

/** Renders the app at TV resolution and scales it to fit the window, letterboxed. */
export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: WIDTH * scale, height: HEIGHT * scale, overflow: 'hidden' }}>
        <div
          style={{
            width: WIDTH,
            height: HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            display: 'flex',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
