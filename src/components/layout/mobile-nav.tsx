"use client";

import { useRef } from "react";
import Link from "next/link";

export function MobileNav({ links }: { links: readonly { href: string; label: string }[] }) {
  const menu = useRef<HTMLDetailsElement>(null);
  function close() {
    if (menu.current) menu.current.open = false;
  }
  return (
    <details ref={menu} className="mobile-menu" onKeyDown={(event) => {
      if (event.key === "Escape") {
        close();
        menu.current?.querySelector("summary")?.focus();
      }
    }}>
      <summary>Menu <span aria-hidden="true">☰</span></summary>
      <nav aria-label="Mobile navigation">
        {links.map((link) => <Link key={link.href} href={link.href} onClick={close}>{link.label}</Link>)}
      </nav>
    </details>
  );
}
