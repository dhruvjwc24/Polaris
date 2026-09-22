// Never render a stored/scraped URL into an href without checking its scheme
// first — a javascript: URI stored in a field like facebook_url/instagram_url
// (populated from web scraping, search results, or free-text input) would
// otherwise execute on click. Used anywhere a DB-sourced URL becomes an href.
export function safeHref(url: string | null | undefined): string {
  return url && /^https?:\/\//i.test(url) ? url : "#";
}
