import Image from "next/image";
import Link from "next/link";
export function Brand({ priority = false }: { priority?: boolean }) {
  return <Link href="/" aria-label="TechIdea home" className="brand"><Image className="brand-logo" src="/techidea-logo.png" alt="TechIdea Online" width={270} height={90} sizes="(max-width: 480px) 180px, 270px" priority={priority} /></Link>;
}
