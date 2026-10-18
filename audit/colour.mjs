/**
 * Any colour the browser computes, read as numbers — for the probes that
 * measure what is painted.
 *
 * They all read colours as "the first three numbers are red, green and
 * blue", which was true while every computed colour was `rgb()`. Since
 * Tailwind 4 a colour with an opacity is `color-mix(in oklab, …)`, which the
 * browser reports as `oklab(0.9 0.01 0.1 / 0.9)` — and those numbers read as
 * red, green and blue are black. So the browser converts: a colour painted
 * onto one pixel of a canvas comes back as the bytes it is.
 *
 *   await page.addInitScript(defineRgba);   // before the page loads
 *   …in the page: window.__rgba('oklab(…)') → [r, g, b, alpha 0–1]
 *
 * `enter()` installs it on every page it opens.
 */
export function defineRgba() {
  let pixel = null;
  window.__rgba = (colour) => {
    if (!colour || colour === 'transparent') return [0, 0, 0, 0];
    pixel ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    pixel.clearRect(0, 0, 1, 1);
    pixel.fillStyle = '#000';
    pixel.fillStyle = colour;
    pixel.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
}
