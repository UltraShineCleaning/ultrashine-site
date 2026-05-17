/**
 * JsonLd — drops a Schema.org JSON-LD <script> into the page.
 *
 * Schema.org structured data is invisible to humans but parsed by
 * Google + Bing + ChatGPT etc to understand what the page IS. Result:
 * rich snippets in search (star ratings, expandable FAQs, business cards,
 * service listings) which dramatically improve click-through from search.
 *
 * Server-component compatible — safe to use anywhere.
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // Schema.org JSON-LD is safe to dangerouslySetInnerHTML because
      // we control the input (no user-generated content goes in here)
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}
