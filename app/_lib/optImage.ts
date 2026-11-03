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
  'ba_kitchen_after',
  'ba_kitchen_before',
  'bathroom',
  'bedroom',
  'flow_bathroom_sunset',
  'flow_before_after',
  'flow_hand_marble',
  'flow_hero_kitchen',
  'flow_living_areas',
  'flow_living_room_navy',
  'flow_sparkles',
  'hero_3d_about',
  'hero_3d_areas',
  'hero_3d_blog',
  'hero_3d_estimator',
  'hero_3d_faq',
  'hero_3d_leavereview',
  'hero_3d_map_area',
  'hero_3d_quote',
  'hero_3d_reviews',
  'hero_3d_services',
  'hero_kitchen',
  'hero_scene_01_kitchen',
  'hero_scene_02_living',
  'hero_scene_03_bathroom',
  'hero_scene_04_bedroom',
  'living_room',
  'service_commercial_office',
  'service_deep_cleaning',
  'service_movein_boxes',
  'service_postconstruction',
  'team_van',
]);

export function optImage(src: string): { sm: string; lg: string } {
  const m = src.match(/^\/images\/([\w-]+)\.jpe?g$/);
  if (m && OPTIMIZED.has(m[1])) return { sm: `/images/opt/${m[1]}-sm.webp`, lg: `/images/opt/${m[1]}-lg.webp` };
  return { sm: src, lg: src };
}

/**
 * Background photo set by inline style, without JavaScript: the small file on phones,
 * the large one on computers, picked by CSS (.bg-resp in globals.css). Use with
 * className="bg-resp". Speed pass 2026-11-02 — hero photos were 2560px JPEGs
 * (120–550 KB) downloaded in full by every phone.
 */
export function bgStyle(src: string): Record<string, string> {
  const o = optImage(src);
  return { '--bg-sm': `url(${o.sm})`, '--bg-lg': `url(${o.lg})` };
}

/** Phones and small tablets get the small file. */
export const LARGE_IMAGE_QUERY = '(min-width: 900px)';
