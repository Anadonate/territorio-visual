(() => {
  const SVG_TAGS = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'use', 'title', 'desc']);
  const SVG_ATTRIBUTES = new Set(['xmlns', 'xmlns:xlink', 'viewBox', 'width', 'height', 'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'transform', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'points', 'id', 'offset', 'stop-color', 'stop-opacity', 'gradientUnits', 'gradientTransform', 'spreadMethod', 'clip-path', 'mask', 'href', 'xlink:href']);
  const MAX_FILE_SIZE = 8 * 1024 * 1024;

  function rgbToOklab(r, g, b) {
    const linear = (value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    };
    const red = linear(r); const green = linear(g); const blue = linear(b);
    const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
    const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
    const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
    return {
      L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
    };
  }

  function toOklch(hex) {
    const value = hex.replace('#', '');
    const lab = rgbToOklab(parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16));
    const C = Math.hypot(lab.a, lab.b);
    const neutral = C < 0.025;
    return {
      L: lab.L,
      C,
      h: neutral ? null : (Math.atan2(lab.b, lab.a) * 180 / Math.PI + 360) % 360,
      neutral: neutral ? (lab.L < 0.20 ? 'Negro' : lab.L > 0.93 ? 'Blanco' : 'Gris') : null,
    };
  }

  function deltaEOK(firstHex, secondHex) {
    const toRgb = (hex) => [0, 2, 4].map((offset) => parseInt(hex.replace('#', '').slice(offset, offset + 2), 16));
    return distance(rgbToOklab(...toRgb(firstHex)), rgbToOklab(...toRgb(secondHex)));
  }

  function rgbToHex(r, g, b) {
    return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }

  function distance(first, second) {
    return Math.hypot(first.L - second.L, first.a - second.a, first.b - second.b);
  }

  function safeSvgBlob(file) {
    return file.text().then((source) => {
      if (source.length > MAX_FILE_SIZE) throw new Error('El SVG supera el tamaño permitido.');
      if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('Este SVG incluye declaraciones XML no compatibles. Expórtalo como PNG o JPEG.');
      const documentSvg = new DOMParser().parseFromString(source, 'image/svg+xml');
      if (documentSvg.querySelector('parsererror') || documentSvg.documentElement.localName !== 'svg') throw new Error('El archivo SVG no es válido.');
      const nodes = [...documentSvg.querySelectorAll('*')];
      if (nodes.length > 5000) throw new Error('El SVG contiene demasiados elementos para procesarlo con seguridad.');

      for (const node of nodes) {
        if (!SVG_TAGS.has(node.localName)) throw new Error('Este SVG incluye elementos no compatibles. Expórtalo como PNG o JPEG.');
        for (const attribute of [...node.attributes]) {
          const name = attribute.name;
          const value = attribute.value.trim();
          const externalCssReference = /url\s*\(/i.test(value) && !/^url\(\s*#[\w:.-]+\s*\)$/i.test(value);
          if (!SVG_ATTRIBUTES.has(name) || /^on/i.test(name) || /@import/i.test(value) || externalCssReference) {
            throw new Error('Este SVG contiene estilos o referencias no compatibles. Expórtalo como PNG o JPEG.');
          }
          if ((name === 'href' || name.endsWith(':href')) && value && !value.startsWith('#')) {
            throw new Error('Solo se permiten referencias internas dentro del SVG.');
          }
        }
      }
      return new Blob([new XMLSerializer().serializeToString(documentSvg.documentElement)], { type: 'image/svg+xml' });
    });
  }

  async function loadLogo(file) {
    if (!file) throw new Error('Selecciona un archivo de logotipo.');
    if (file.size > MAX_FILE_SIZE) throw new Error('El archivo supera el límite de 8 MB.');
    const extension = file.name.split('.').pop().toLowerCase();
    let blob;

    if (extension === 'svg' || file.type === 'image/svg+xml') {
      blob = await safeSvgBlob(file);
    } else {
      const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer());
      const isPng = signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47;
      const isJpeg = signature[0] === 0xff && signature[1] === 0xd8;
      if (!isPng && !isJpeg) throw new Error('Usa una imagen PNG o JPEG válida.');
      blob = file;
    }

    const previewUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.decoding = 'async';
    image.src = previewUrl;
    try {
      await image.decode();
    } catch {
      URL.revokeObjectURL(previewUrl);
      throw new Error('No se pudo abrir la imagen. Prueba a exportarla de nuevo como PNG o JPEG.');
    }
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) {
      URL.revokeObjectURL(previewUrl);
      throw new Error('La imagen no tiene dimensiones válidas o es demasiado grande.');
    }
    return { image, previewUrl };
  }

  function detectBackground(data, width, height) {
    const edge = Math.max(1, Math.ceil(Math.min(width, height) * 0.06));
    const histogram = new Map();
    let visibleEdge = 0;
    let transparent = 0;
    let semitransparent = 0;
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3];
      if (alpha === 0) { transparent += 1; continue; }
      if (alpha < 250) semitransparent += 1;
      if (x >= edge && x < width - edge && y >= edge && y < height - edge) continue;
      visibleEdge += 1;
      const r = data[i]; const g = data[i + 1]; const b = data[i + 2];
      const key = `${r >> 3}-${g >> 3}-${b >> 3}`;
      const bin = histogram.get(key) || { count: 0, r: 0, g: 0, b: 0 };
      const weight = alpha / 255;
      bin.count += weight; bin.r += r * weight; bin.g += g * weight; bin.b += b * weight;
      histogram.set(key, bin);
    }
    const dominant = [...histogram.values()].sort((a, b) => b.count - a.count)[0];
    const share = dominant && visibleEdge ? dominant.count / visibleEdge : 0;
    const rgba = dominant && dominant.count ? {
      r: dominant.r / dominant.count, g: dominant.g / dominant.count, b: dominant.b / dominant.count,
    } : null;
    const transparentRatio = transparent / (width * height);
    const background = rgba && transparentRatio <= 0.03 ? { ...rgba, lab: rgbToOklab(rgba.r, rgba.g, rgba.b), share } : null;
    const confidence = !background ? 'ninguna' : share >= 0.68 ? 'alta' : share >= 0.38 ? 'media' : 'baja';
    return { background, confidence, share, transparentRatio, semitransparentRatio: semitransparent / (width * height) };
  }

  function extractColors(image, backgroundMode = 'auto') {
    const scale = Math.min(1, 320 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Este navegador no permite leer la imagen en un canvas.');
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const detection = detectBackground(pixels, width, height);
    const background = detection.background;
    const mode = typeof backgroundMode === 'boolean' ? (backgroundMode ? 'include' : 'auto') : backgroundMode;
    const excludeBackground = Boolean(background && (mode === 'exclude' || (mode === 'auto' && detection.confidence === 'alta')));
    const backgroundMask = new Uint8Array(width * height);
    if (background && excludeBackground) {
      const queue = new Int32Array(width * height);
      let head = 0; let tail = 0;
      const add = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const pixel = y * width + x;
        if (backgroundMask[pixel]) return;
        const offset = pixel * 4;
        if (pixels[offset + 3] < 230) return;
        const lab = rgbToOklab(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
        if (distance(lab, background.lab) > 0.075) return;
        backgroundMask[pixel] = 1; queue[tail++] = pixel;
      };
      for (let x = 0; x < width; x += 1) { add(x, 0); add(x, height - 1); }
      for (let y = 1; y < height - 1; y += 1) { add(0, y); add(width - 1, y); }
      while (head < tail) {
        const pixel = queue[head++]; const x = pixel % width; const y = Math.floor(pixel / width);
        add(x - 1, y); add(x + 1, y); add(x, y - 1); add(x, y + 1);
      }
    }
    const histogram = new Map();
    let foregroundPixels = 0;
    let semitransparentPixels = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3];
      if (alpha < 12) continue;
      const r = pixels[index]; const g = pixels[index + 1]; const b = pixels[index + 2];
      const lab = rgbToOklab(r, g, b);
      if (excludeBackground && (backgroundMask[index / 4] || distance(lab, background.lab) < 0.055)) continue;
      const weight = alpha / 255;
      foregroundPixels += weight;
      if (alpha < 250) semitransparentPixels += 1;
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const x = (index / 4) % width; const y = Math.floor(index / 4 / width);
      let similarNeighbours = 0;
      for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
        if ((!dx && !dy) || x + dx < 0 || y + dy < 0 || x + dx >= width || y + dy >= height) continue;
        const neighbour = (y + dy) * width + x + dx;
        const offset = neighbour * 4;
        if (pixels[offset + 3] < 230 || (excludeBackground && (backgroundMask[neighbour] || distance(rgbToOklab(pixels[offset], pixels[offset + 1], pixels[offset + 2]), background.lab) < 0.055))) continue;
        if (distance(lab, rgbToOklab(pixels[offset], pixels[offset + 1], pixels[offset + 2])) < 0.018) similarNeighbours += 1;
      }
      const isSolidCore = alpha >= 230 && similarNeighbours >= 12;
      const bin = histogram.get(key) || { count: 0, r: 0, g: 0, b: 0, coreCount: 0, coreR: 0, coreG: 0, coreB: 0 };
      bin.count += weight; bin.r += r * weight; bin.g += g * weight; bin.b += b * weight;
      if (isSolidCore) { bin.coreCount += weight; bin.coreR += r * weight; bin.coreG += g * weight; bin.coreB += b * weight; }
      histogram.set(key, bin);
    }

    if (!foregroundPixels) throw new Error('No se encontraron tonos visibles fuera del fondo. Puedes incluirlo o añadir colores manualmente.');

    const bins = [...histogram.values()].map((bin) => {
      const rgb = { r: bin.r / bin.count, g: bin.g / bin.count, b: bin.b / bin.count };
      const core = bin.coreCount ? { r: bin.coreR / bin.coreCount, g: bin.coreG / bin.coreCount, b: bin.coreB / bin.coreCount } : null;
      return { ...rgb, lab: rgbToOklab(rgb.r, rgb.g, rgb.b), count: bin.count, coreCount: bin.coreCount, core };
    }).sort((a, b) => b.count - a.count);
    const clusters = [];
    for (const bin of bins) {
      let nearest = null;
      let nearestDistance = Infinity;
      for (const cluster of clusters) {
        const gap = distance(bin.lab, cluster.lab);
        if (gap < nearestDistance) { nearest = cluster; nearestDistance = gap; }
      }
      const nearBlackNeutralPair = nearest
        && Math.hypot(bin.lab.a, bin.lab.b) < 0.025 && Math.hypot(nearest.lab.a, nearest.lab.b) < 0.025
        && bin.lab.L < 0.30 && nearest.lab.L < 0.30;
      if (nearest && nearestDistance < (nearBlackNeutralPair ? 0.11 : 0.055)) {
        nearest.count += bin.count;
        nearest.r += bin.r * bin.count;
        nearest.g += bin.g * bin.count;
        nearest.b += bin.b * bin.count;
        nearest.coreCount += bin.coreCount;
        if (bin.core) { nearest.coreR += bin.core.r * bin.coreCount; nearest.coreG += bin.core.g * bin.coreCount; nearest.coreB += bin.core.b * bin.coreCount; }
        nearest.lab = rgbToOklab(nearest.r / nearest.count, nearest.g / nearest.count, nearest.b / nearest.count);
      } else {
        clusters.push({ ...bin, r: bin.r * bin.count, g: bin.g * bin.count, b: bin.b * bin.count, coreR: bin.core ? bin.core.r * bin.coreCount : 0, coreG: bin.core ? bin.core.g * bin.coreCount : 0, coreB: bin.core ? bin.core.b * bin.coreCount : 0 });
      }
    }

    let usableClusters = clusters;
    if (background && excludeBackground && clusters.length > 1) {
      const dominant = [...clusters].sort((a, b) => b.count - a.count)[0];
      const axis = { r: dominant.r / dominant.count - background.r, g: dominant.g / dominant.count - background.g, b: dominant.b / dominant.count - background.b };
      const axisLengthSquared = axis.r ** 2 + axis.g ** 2 + axis.b ** 2;
      if (axisLengthSquared > 0) {
        usableClusters = clusters.filter((cluster) => {
          if (cluster === dominant || cluster.count / foregroundPixels >= 0.2) return true;
          const color = { r: cluster.r / cluster.count, g: cluster.g / cluster.count, b: cluster.b / cluster.count };
          const offset = { r: color.r - background.r, g: color.g - background.g, b: color.b - background.b };
          const mix = (offset.r * axis.r + offset.g * axis.g + offset.b * axis.b) / axisLengthSquared;
          const residual = Math.hypot(offset.r - mix * axis.r, offset.g - mix * axis.g, offset.b - mix * axis.b) / 255;
          // Low-area shades close to the background-to-logo RGB blend line are likely JPEG edge halos.
          return !(mix > 0.03 && mix < 0.97 && residual < 0.04);
        });
      }
    }

    const solidCores = usableClusters.filter((cluster) => cluster.coreCount / foregroundPixels >= 0.0025 && cluster.coreCount / cluster.count >= 0.18);
    const monochromeBlend = background && usableClusters.length > 1 && usableClusters.every((cluster) => Math.hypot(cluster.lab.a, cluster.lab.b) < 0.025);
    const strongestNeutral = monochromeBlend
      ? [usableClusters.reduce((mark, cluster) => distance(cluster.lab, background.lab) > distance(mark.lab, background.lab) ? cluster : mark)]
      : null;
    const preferredClusters = solidCores.length ? solidCores : (strongestNeutral || usableClusters);
    const selected = preferredClusters
      .filter((cluster) => cluster.count / foregroundPixels >= 0.02)
      .sort((a, b) => b.count - a.count)
      .map((cluster) => {
        const useCore = cluster.coreCount / cluster.count >= 0.08;
        const color = useCore
          ? [cluster.coreR / cluster.coreCount, cluster.coreG / cluster.coreCount, cluster.coreB / cluster.coreCount]
          : [cluster.r / cluster.count, cluster.g / cluster.count, cluster.b / cluster.count];
        const hex = rgbToHex(...color);
        return { hex, share: cluster.count / foregroundPixels, oklch: toOklch(hex) };
      });
    const uniqueColors = [...new Map(selected.map((color) => [color.hex, color])).values()];
    if (!uniqueColors.length) throw new Error('No se detectaron tonos con suficiente presencia. Añade los colores manualmente.');
    return {
      colors: uniqueColors,
      background: background ? rgbToHex(background.r, background.g, background.b) : null,
      backgroundConfidence: background ? detection.confidence : 'ninguna',
      backgroundShare: detection.share,
      backgroundTransparent: detection.transparentRatio > 0.01,
      transparentRatio: detection.transparentRatio,
      semitransparentRatio: detection.semitransparentRatio,
      semitransparentPixels,
    };
  }

  window.TerritorioColor = Object.freeze({ loadLogo, extractColors, toOklch, deltaEOK, rgbToHex });
})();

