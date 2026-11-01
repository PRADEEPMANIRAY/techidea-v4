export function GlobalSearch() {
  return <form action="/tools" role="search" className="global-search">
    <label className="sr-only" htmlFor="global-search">Search all tools</label><span aria-hidden="true" className="search-symbol">⌕</span>
    <input id="global-search" name="q" type="search" placeholder="What do you need to do?" maxLength={120} />
    <button type="submit" className="button button-dark">Search <span aria-hidden="true">↗</span></button>
  </form>;
}
