/**
 * File utilities: download blobs, read files, compress images.
 */

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function downloadText(text, filename, mimeType = 'text/plain') {
  downloadBlob(new Blob([text], { type: mimeType }), filename);
}

export function downloadArrayBuffer(buffer, filename, mimeType = 'application/octet-stream') {
  downloadBlob(new Blob([buffer], { type: mimeType }), filename);
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Resize an image (dataURL) to fit within maxDim, returning a new dataURL.
 */
export function resizeImage(dataUrl, maxDim = 1920) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) { resolve(dataUrl); return; }
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = dataUrl;
  });
}

export function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_\-\.]/gi, '_').slice(0, 64);
}
