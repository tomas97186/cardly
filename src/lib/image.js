function resizeImageEl(img, maxDim, quality) {
  let { width, height } = img;
  if (width > height) {
    if (width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
  } else {
    if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export function resizeImage(file, maxDim = 700, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(resizeImageEl(img, maxDim, quality));
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Re-resizes an already-loaded data URL (e.g. the output of resizeImage above) down
// to a much smaller thumbnail — used for the cover photo only, so list views (up to
// 60 ItemCards on screen at once) don't each pull down a full ~700px image just to
// show it at 40-60px.
export function resizeDataUrl(dataUrl, maxDim = 160, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(resizeImageEl(img, maxDim, quality));
    img.onerror = reject;
    img.src = dataUrl;
  });
}
