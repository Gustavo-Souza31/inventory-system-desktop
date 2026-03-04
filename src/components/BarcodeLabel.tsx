import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import type { Product } from '../database/types';
import { Modal } from './Modal';

interface BarcodeLabelProps {
    product: Product;
    onClose: () => void;
}

export function BarcodeLabel({ product, onClose }: BarcodeLabelProps) {
    const barcodeRef = useRef<SVGSVGElement>(null);
    const qrRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (barcodeRef.current) {
            try {
                JsBarcode(barcodeRef.current, product.sku, {
                    format: 'CODE128',
                    width: 2,
                    height: 60,
                    displayValue: true,
                    fontSize: 14,
                    margin: 10,
                    background: '#ffffff',
                    lineColor: '#000000',
                });
            } catch {
                // Invalid barcode value
            }
        }
        if (qrRef.current) {
            QRCode.toCanvas(qrRef.current, JSON.stringify({
                sku: product.sku,
                name: product.name,
                price: product.price,
            }), {
                width: 120,
                margin: 1,
                color: { dark: '#000000', light: '#ffffff' },
            });
        }
    }, [product]);

    function handlePrint() {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const barcodeHtml = barcodeRef.current?.outerHTML || '';
        const qrDataUrl = qrRef.current?.toDataURL() || '';

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta - ${product.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .label { border: 1px dashed #ccc; padding: 16px; width: 300px; text-align: center; }
          .label h3 { margin: 0 0 4px; font-size: 14px; }
          .label .price { font-size: 20px; font-weight: bold; margin: 8px 0; }
          .codes { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 8px; }
          .codes img { width: 80px; height: 80px; }
          svg { max-width: 100%; }
          @media print { .label { border: none; } }
        </style>
      </head>
      <body>
        <div class="label">
          <h3>${product.name}</h3>
          <div class="price">R$ ${product.price.toFixed(2)}</div>
          <div class="codes">
            <div>${barcodeHtml}</div>
            ${qrDataUrl ? `<img src="${qrDataUrl}" />` : ''}
          </div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
        printWindow.document.close();
    }

    return (
        <Modal
            title={`Etiqueta — ${product.name}`}
            onClose={onClose}
            footer={
                <>
                    <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
                    <button className="btn btn-primary" onClick={handlePrint}>🖨️ Imprimir Etiqueta</button>
                </>
            }
        >
            <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 4px', color: '#111', fontSize: '15px' }}>{product.name}</h3>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#111', margin: '8px 0' }}>
                    R$ {product.price.toFixed(2)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
                    <svg ref={barcodeRef} />
                    <canvas ref={qrRef} style={{ width: '100px', height: '100px' }} />
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>SKU: {product.sku}</div>
            </div>
        </Modal>
    );
}
