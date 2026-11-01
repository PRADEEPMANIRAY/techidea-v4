"use client";
import { useRef, useState } from "react";
import { categories, type ToolCategoryId } from "@/data/tools/categories";
import type { Tool } from "@/data/tools/registry";
import { ToolCard } from "./tool-card";
export function ToolSearch({ items, initialQuery = "", initialCategory = "", allowedCategories }: { items: readonly Tool[]; initialQuery?: string; initialCategory?: string; allowedCategories?: readonly ToolCategoryId[] }) {
  const searchInput = useRef<HTMLInputElement>(null);
  const options = categories.filter((category) => items.some(tool => tool.status === "published" && tool.category === category.id) && (!allowedCategories || allowedCategories.includes(category.id)));
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(options.some((item) => item.id === initialCategory) ? initialCategory : "");
  const matches = items.filter((tool) => options.some(option => option.id === tool.category) && tool.name.toLowerCase().includes(query.trim().toLowerCase()) && (!category || tool.category === category));
  function reset() { setQuery(""); setCategory(""); searchInput.current?.focus(); }
  return <section aria-label="Search the tool collection" className="directory-search">
    <form className="filter-bar" role="search" onSubmit={(event) => event.preventDefault()}>
      <div className="field search-field"><label htmlFor="tool-query">Search by tool name</label><input ref={searchInput} id="tool-query" name="q" type="search" value={query} maxLength={120} onChange={(event) => setQuery(event.target.value)} placeholder="Try JSON or calculator" /></div>
      <div className="field"><label htmlFor="tool-category">Category</label><select id="tool-category" name="category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>
      <button type="button" className="button button-light" onClick={reset} disabled={!query && !category}>Clear filters</button>
    </form>
    <div className="results-bar"><p role="status" aria-live="polite" aria-atomic="true">{matches.length} {matches.length === 1 ? "tool" : "tools"}{query.trim() ? ' matching “' + query.trim() + '”' : " in the collection"}</p><span>Planned tools are not available yet</span></div>
    <h2 className="sr-only">Tool results</h2>
    {matches.length ? <div className="tool-grid">{matches.map((tool) => <ToolCard key={tool.id} tool={tool} />)}</div> : <div className="empty-state"><span aria-hidden="true" className="tool-icon">⌕</span><h2>No tools match your search</h2><p>Try a shorter name or choose another category.</p><button type="button" onClick={reset} className="button button-dark">Reset search</button></div>}
  </section>;
}
