"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label, icon }: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link className={`nav-link${active ? " active" : ""}`} href={href} aria-label={label} aria-current={active ? "page" : undefined} title={label}>
      {icon}<span>{label}</span>
    </Link>
  );
}
