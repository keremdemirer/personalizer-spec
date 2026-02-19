# Security

## Operation allowlist
- Renderers MUST only execute allowlisted `operation` values.
- Unknown operation handling:
  - **Print targets**: hard-fail (render fails)
  - **Preview targets**: implementation-defined (skip or fail)

## Asset fetching
- Prefer signed URLs or platform CDN URLs.
- Renderers SHOULD prevent SSRF by:
  - allowlisting domains, or
  - pre-fetching assets via a safe proxy layer.
