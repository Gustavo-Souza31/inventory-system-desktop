import { useEffect, useRef } from 'react';

interface UseBarcodeScannerOptions {
    enabled: boolean;
    onScan: (code: string) => void;
    minLength?: number;
    maxIntervalMs?: number;
}

// Leitores USB "keyboard wedge" digitam muito mais rápido que um humano e
// terminam a leitura com Enter. Detectamos isso medindo o intervalo entre
// teclas: se alguma tecla chega devagar, o buffer reseta — só sobrevive até
// o Enter uma sequência inteira digitada dentro do limiar de velocidade.
export function useBarcodeScanner({ enabled, onScan, minLength = 5, maxIntervalMs = 40 }: UseBarcodeScannerOptions) {
    const onScanRef = useRef(onScan);
    onScanRef.current = onScan;

    useEffect(() => {
        if (!enabled) return;

        let buffer = '';
        let lastKeyTime = 0;

        function handleKeyDown(e: KeyboardEvent) {
            const now = performance.now();

            if (e.key === 'Enter') {
                const fastEnough = now - lastKeyTime <= maxIntervalMs;
                if (buffer.length >= minLength && fastEnough) {
                    e.preventDefault();
                    onScanRef.current(buffer);
                }
                buffer = '';
                return;
            }

            if (e.key.length !== 1) return; // ignora Shift, Tab, setas, Backspace etc.

            if (now - lastKeyTime > maxIntervalMs) buffer = '';
            buffer += e.key;
            lastKeyTime = now;
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled, minLength, maxIntervalMs]);
}
