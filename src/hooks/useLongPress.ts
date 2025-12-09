import { useCallback, useRef } from 'react';

type Callback = () => void;

/**
 * Custom hook untuk menangani event long-press (tahan klik).
 * @param callback Fungsi yang akan dieksekusi setelah durasi long-press tercapai.
 * @param duration Durasi dalam milidetik untuk dianggap sebagai long-press (default 500ms).
 * @returns Object berisi event handler untuk dipasang pada elemen React.
 */
export const useLongPress = (
  callback: Callback,
  duration: number = 500
) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    // Pastikan tidak ada timer yang sudah berjalan
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      callback();
    }, duration);
  }, [callback, duration]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
};
