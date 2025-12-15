
import html2canvas from 'html2canvas';

export type ScreenshotOptions = {
  scale?: number;
  backgroundColor?: string;
  windowWidth?: number; // útil para forçar layout desktop em mobile
  quality?: number;
};

/**
 * Captura um elemento HTML e retorna o canvas correspondente.
 */
export async function elementToCanvas(
  element: HTMLElement,
  opts: ScreenshotOptions = {}
): Promise<HTMLCanvasElement> {
  const scale = opts.scale ?? Math.max(2, window.devicePixelRatio || 1);

  return await html2canvas(element, {
    scale,
    useCORS: true, // Importante para imagens externas (logos)
    backgroundColor: opts.backgroundColor ?? '#0f172a', // Default: slate-950
    windowWidth: opts.windowWidth ?? element.scrollWidth, // Força largura para evitar cortes/layout mobile
    logging: false,
  });
}

/**
 * Captura um elemento e retorna um Blob JPEG.
 */
export async function elementToJpegBlob(
  element: HTMLElement,
  opts: ScreenshotOptions = {}
): Promise<Blob> {
  const canvas = await elementToCanvas(element, opts);
  const quality = opts.quality ?? 0.9;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Falha ao gerar a imagem (blob nulo).'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Captura um elemento e força o download como arquivo JPG.
 */
export async function downloadElementAsJpeg(
  element: HTMLElement,
  fileName: string,
  opts: ScreenshotOptions = {}
): Promise<void> {
  const blob = await elementToJpegBlob(element, opts);
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Limpa a URL da memória
  URL.revokeObjectURL(url);
}
