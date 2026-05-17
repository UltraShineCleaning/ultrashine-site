// Twitter card uses the same image as OpenGraph.
// Explicit re-exports (not `export { runtime, ... } from`) so Next.js can
// statically detect the `runtime` field — re-export form triggered:
//   "Next.js can't recognize the exported `runtime` field as it was not
//    assigned to a string literal."
import OpengraphImage, {
  alt as ogAlt,
  size as ogSize,
  contentType as ogContentType,
} from './opengraph-image';

export const runtime = 'edge';
export const alt = ogAlt;
export const size = ogSize;
export const contentType = ogContentType;

export default OpengraphImage;
