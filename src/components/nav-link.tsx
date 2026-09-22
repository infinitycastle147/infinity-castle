"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label, icon }: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/search" && pathname.startsWith(`${href}/`));
  return (
    <Link className={`nav-link${active ? " active" : ""}`} href={href}>
      {icon}<span>{label}</span>
    </Link>
  );
}
