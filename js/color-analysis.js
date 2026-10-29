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
    const points = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
    const cornerColors = points.map(([x, y]) => {
      const index = (y * width + x) * 4;
      return { r: data[index], g: data[index + 1], b: data[index + 2], alpha: data[index + 3] };
    });
    if (cornerColors.some((color) => color.alpha < 235)) return null;
    const labs = cornerColors.map((color) => rgbToOklab(color.r, color.g, color.b));
    if (labs.some((lab) => labs.some((other) => distance(lab, other) > 0.035))) return null;
    return {
      r: cornerColors.reduce((sum, color) => sum + color.r, 0) / cornerColors.length,
      g: cornerColors.reduce((sum, color) => sum + color.g, 0) / cornerColors.length,
      b: cornerColors.reduce((sum, color) => sum + color.b, 0) / cornerColors.length,
      lab: rgbToOklab(
        cornerColors.reduce((sum, color) => sum + color.r, 0) / cornerColors.length,
        cornerColors.reduce((sum, color) => sum + color.g, 0) / cornerColors.length,
        cornerColors.reduce((sum, color) => sum + color.b, 0) / cornerColors.length,
      ),
    };
  }

  function extractColors(image, includeBackground = false) {
    const scale = Math.min(1, 144 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Este navegador no permite leer la imagen en un canvas.');
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const background = detectBackground(pixels, width, height);
    const histogram = new Map();
    let foregroundPixels = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3];
      if (alpha < 220) continue;
      const r = pixels[index]; const g = pixels[index + 1]; const b = pixels[index + 2];
      const lab = rgbToOklab(r, g, b);
      if (background && !includeBackground && distance(lab, background.lab) < 0.045) continue;
      foregroundPixels += 1;
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const bin = histogram.get(key) || { count: 0, r: 0, g: 0, b: 0 };
      bin.count += 1; bin.r += r; bin.g += g; bin.b += b;
      histogram.set(key, bin);
    }

    if (!foregroundPixels) throw new Error('No se encontraron tonos visibles fuera del fondo. Puedes incluirlo o añadir colores manualmente.');

    const bins = [...histogram.values()].map((bin) => {
      const rgb = { r: bin.r / bin.count, g: bin.g / bin.count, b: bin.b / bin.count };
      return { ...rgb, lab: rgbToOklab(rgb.r, rgb.g, rgb.b), count: bin.count };
    }).sort((a, b) => b.count - a.count);
    const clusters = [];
    for (const bin of bins) {
      let nearest = null;
      let nearestDistance = Infinity;
      for (const cluster of clusters) {
        const gap = distance(bin.lab, cluster.lab);
        if (gap < nearestDistance) { nearest = cluster; nearestDistance = gap; }
      }
      if (nearest && nearestDistance < 0.055) {
        nearest.count += bin.count;
        nearest.r += bin.r * bin.count;
        nearest.g += bin.g * bin.count;
        nearest.b += bin.b * bin.count;
        nearest.lab = rgbToOklab(nearest.r / nearest.count, nearest.g / nearest.count, nearest.b / nearest.count);
      } else {
        clusters.push({ ...bin, r: bin.r * bin.count, g: bin.g * bin.count, b: bin.b * bin.count });
      }
    }

    let usableClusters = clusters;
    if (background && !includeBackground && clusters.length > 1) {
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

    const selected = usableClusters
      .filter((cluster) => cluster.count / foregroundPixels >= 0.008)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((cluster) => {
        const hex = rgbToHex(cluster.r / cluster.count, cluster.g / cluster.count, cluster.b / cluster.count);
        return { hex, share: cluster.count / foregroundPixels, oklch: toOklch(hex) };
      });
    if (!selected.length) throw new Error('No se detectaron tonos con suficiente presencia. Añade los colores manualmente.');
    return { colors: selected, background: background ? rgbToHex(background.r, background.g, background.b) : null, foregroundPixels };
  }

  window.TerritorioColor = Object.freeze({ loadLogo, extractColors, toOklch, deltaEOK, rgbToHex });
})();

