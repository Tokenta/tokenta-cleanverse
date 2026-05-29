/**
 * Prefer IPv4 for outbound provider probes (common fix for "fetch failed" on Windows
 * when IPv6 routes are broken but IPv4 works).
 */
import dns from "node:dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  /* Node < 17.0 — ignore */
}
