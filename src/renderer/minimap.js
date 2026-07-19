(function exposeMinimap(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LTP_MINIMAP = api;
})(globalThis, () => {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const project = (options) => {
    const {
      size,
      clientWidth,
      clientHeight,
      zoom,
      viewport,
      frames = [],
      nodes = [],
      links = [],
      maxWidth = 180,
      maxHeight = 120
    } = options;
    const requestedDomain = options.domain || {
      x: 0,
      y: 0,
      width: Math.max(size.width, clientWidth / zoom),
      height: Math.max(size.height, clientHeight / zoom)
    };
    const domain = {
      ...requestedDomain,
      width: Math.max(requestedDomain.width, clientWidth / zoom),
      height: Math.max(requestedDomain.height, clientHeight / zoom)
    };
    const scale = Math.min(maxWidth / domain.width, maxHeight / domain.height);
    const metrics = {
      scale,
      domain,
      width: Math.max(1, Math.round(domain.width * scale)),
      height: Math.max(1, Math.round(domain.height * scale))
    };
    const viewportWidth = clamp((clientWidth / zoom) * scale, 4, metrics.width);
    const viewportHeight = clamp((clientHeight / zoom) * scale, 4, metrics.height);
    const viewportStyle = {
      left: clamp((viewport.left / zoom - domain.x) * scale, 0, metrics.width - viewportWidth),
      top: clamp((viewport.top / zoom - domain.y) * scale, 0, metrics.height - viewportHeight),
      width: viewportWidth,
      height: viewportHeight
    };
    const mapX = (value) => (value - domain.x) * scale;
    const mapY = (value) => (value - domain.y) * scale;
    const linkMarkup = links.map(({ source, target }) =>
      `<line x1="${mapX(source.x)}" y1="${mapY(source.y)}" x2="${mapX(target.x)}" y2="${mapY(target.y)}" />`).join("");
    const frameMarkup = frames.map(({ box }) =>
      `<div class="minimap-frame" style="left:${mapX(box.x)}px;top:${mapY(box.y)}px;width:${box.width * scale}px;height:${box.height * scale}px;"></div>`).join("");
    const nodeMarkup = nodes.map(({ box, type }) =>
      `<div class="minimap-node minimap-node-${type}" style="left:${mapX(box.x)}px;top:${mapY(box.y)}px;width:${Math.max(3, box.width * scale)}px;height:${Math.max(2, box.height * scale)}px;"></div>`).join("");
    const html = `
      <svg viewBox="0 0 ${metrics.width} ${metrics.height}" width="${metrics.width}" height="${metrics.height}">${linkMarkup}</svg>
      ${frameMarkup}${nodeMarkup}
      <div class="minimap-viewport" style="left:${viewportStyle.left}px;top:${viewportStyle.top}px;width:${viewportStyle.width}px;height:${viewportStyle.height}px;"></div>`;
    return { html, metrics, viewport: viewportStyle };
  };

  const logicalPoint = (clientPoint, rectangle, metrics) => ({
    x: metrics.domain.x + (clientPoint.x - rectangle.left) / metrics.scale,
    y: metrics.domain.y + (clientPoint.y - rectangle.top) / metrics.scale
  });

  return { logicalPoint, project };
});
