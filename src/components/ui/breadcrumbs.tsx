import Link from "next/link";
import { absoluteUrl } from "@/lib/seo/site";
import { StructuredData } from "./structured-data";
export type Crumb = { name: string; href: string };
export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  return <>
    <nav aria-label="Breadcrumb" className="breadcrumbs"><ol>{items.map((item, index) => <li key={item.href}>{index > 0 && <span aria-hidden="true">/</span>}{index === items.length - 1 ? <span aria-current="page">{item.name}</span> : <Link href={item.href}>{item.name}</Link>}</li>)}</ol></nav>
    <StructuredData value={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: absoluteUrl(item.href) })) }} />
  </>;
}
