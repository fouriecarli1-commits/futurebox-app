/**
 * `public/brand/futurebox-mark.png`: the 128-pixel brand mark, cut from the
 * app icon itself (`art/brand/app-icon.png`) so that every mark in and
 * around the app is the one file the home screen shows. It used to be a
 * drawing of a chip on a gradient; since 24 October 2026 there is no second
 * drawing of the brand anywhere.
 *
 *   node scripts/brand-mark.mjs
 */
import sharp from 'sharp';

const SOURCE = 'art/brand/app-icon.png';
await sharp(SOURCE).resize(128, 128).png({ compressionLevel: 9 }).toFile('public/brand/futurebox-mark.png');
console.log('public/brand/futurebox-mark.png — 128×128, cut from the app icon');
