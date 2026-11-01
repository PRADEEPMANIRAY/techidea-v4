import { Brand } from "./brand";
import Link from "next/link";
import { MobileNav } from "./mobile-nav";
const links = [{ href: "/tools", label: "All tools" }, { href: "/calculators", label: "Calculators" }, { href: "/apis", label: "Free APIs" }, { href: "/about", label: "About" }];
export function Header() {
  return <header className="site-header"><div className="page-width header-inner"><Brand priority /><nav aria-label="Main navigation" className="desktop-nav">{links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav><Link href="/tools" className="header-cta">Find a tool <span aria-hidden="true">↗</span></Link><MobileNav links={links} /></div></header>;
}
