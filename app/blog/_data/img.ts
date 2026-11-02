/** Inline article image: a figure with caption styled by /blog/[slug]/page.module.css. */
export function img(src: string, caption: string): string {
  return `<figure class="bodyFigure">
    <img src="${src}" alt="${caption.replace(/"/g, '&quot;')}" loading="lazy" />
    <figcaption>${caption}</figcaption>
  </figure>`;
}
