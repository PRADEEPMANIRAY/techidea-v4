import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
export function InformationPage({title,path,intro,children}:{title:string;path:string;intro:string;children:ReactNode}) {
 return <div className="page-width page-section"><Breadcrumbs items={[{name:"Home",href:"/"},{name:title,href:path}]}/><article className="information-page"><header className="page-heading"><h1>{title}</h1><p>{intro}</p></header>{children}<nav aria-label="Site information" className="link-pills"><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/privacy-policy">Privacy policy</Link><Link href="/terms">Terms</Link><Link href="/disclaimer">Disclaimer</Link></nav></article></div>;
}
