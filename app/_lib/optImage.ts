/**
 * Small/large WebP copies of the big homepage photos (public/images/opt/).
 * The originals are 2560px JPEGs of 200–600 KB each; on a phone the whole set
 * was ~2.3 MB, all downloaded at page load because CSS backgrounds don't lazy-load.
 * -sm = 900px wide (phones), -lg = 1800px (desktop). ~320 KB total on phones.
 *
 * To add a photo: put the JPEG in public/images, make the two WebPs with the
 * same name in public/images/opt, and add the name here.
 */
const OPTIMIZED = new Set([
  'flow_living_room_navy',
  'flow_hand_marble',
  'service_movein_boxes',
  'service_commercial_office',
  'service_postconstruction',
  'hero_3d_map_area',
  'flow_sparkles',
  'flow_bathroom_sunset',
]);

export function optImage(src: string): { sm: string; lg: string } {
  const m = src.match(/^\/images\/([\w-]+)\.jpe?g$/);
  if (m && OPTIMIZED.has(m[1])) return { sm: `/images/opt/${m[1]}-sm.webp`, lg: `/images/opt/${m[1]}-lg.webp` };
  return { sm: src, lg: src };
}

/** Phones and small tablets get the small file. */
export const LARGE_IMAGE_QUERY = '(min-width: 900px)';
