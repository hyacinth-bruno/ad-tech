import Link from "next/link";
import { northstar } from "@/lib/theme";

/** The same wordmark is used in the shop and the campaign workspace. */
export function BrandMark({ href = "/shop", className }: { href?: string; className?: string }) {
  return <Link href={href} className={className} aria-label="Northstar home" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: northstar.ink, fontSize: 27, fontWeight: 750, letterSpacing: "-1.3px", whiteSpace: "nowrap", textDecoration: "none" }}>
    <span aria-hidden="true" style={{ fontSize: 37, lineHeight: 1, fontWeight: 400 }}>✳</span><span>northstar<span style={{ color: "#7c9c43" }}>.</span></span>
  </Link>;
}
