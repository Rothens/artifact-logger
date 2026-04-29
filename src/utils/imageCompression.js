export async function compressImageFile(file, options = {}) {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.78,
    outputType = 'image/jpeg',
  } = options;

  const imageBitmap = await createImageBitmap(file);

  const { width, height } = fitInside(
    imageBitmap.width,
    imageBitmap.height,
    maxWidth,
    maxHeight
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageBitmap, 0, 0, width, height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, outputType, quality);
  });

  if (!blob) {
    throw new Error('Image compression failed.');
  }

  const dataUrl = await blobToDataUrl(blob);

  return {
    name: file.name,
    type: outputType,
    dataUrl,
    originalSize: file.size,
    compressedSize: blob.size,
    width,
    height,
  };
}

function fitInside(srcWidth, srcHeight, maxWidth, maxHeight) {
  let width = srcWidth;
  let height = srcHeight;

  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const ratio = Math.min(widthRatio, heightRatio, 1);

  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  return { width, height };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}