# MCPHub Surgical Migration Tracker

This file tracks the case-by-case migration of custom features from the `legacy-main` branch to the updated `v0.12.15` codebase.

## Completed / Vetted
- [x] `e980f16` | 2025-09-28 | Update index.ts (Auth bypass) - **APPLIED**
- [x] `bd116d6` | 2025-09-28 | Update sseService.ts - **VETTED/SKIPPED** (Adopted Upstream Auto-Rebuild)
- [x] `3f7b1db` | 2025-09-28 | Update sseService.ts - **VETTED/SKIPPED**
- [x] `5c1bb38` | 2025-09-28 | Update index.ts - **VETTED/SKIPPED**
- [x] `1198a9e` | 2025-09-28 | Update index.ts - **VETTED/SKIPPED**
- [x] **Custom Error Safety** - Manually applied try-catch to `sseService.ts` to preserve legacy intent within the new upstream structure.

## Remaining Checklist

### Phase 1: Initial Service Tweaks (Sep 2025)
- [x] `1416724` | 2025-09-28 | Update sseService.ts - **VETTED/SKIPPED** (Adopted Upstream)
- [x] `7909a71` | 2025-09-28 | Update index.ts - **VETTED/SKIPPED**
- [x] `ec31c22` | 2025-09-28 | Update sseService.ts - **VETTED/SKIPPED**
- [x] `8cdf91c` | 2025-09-28 | Update sseService.ts - **VETTED/SKIPPED**
- [x] `8a5b5a3` | 2025-09-28 | Update index.ts - **VETTED/SKIPPED**
- [x] `11b8109` | 2025-09-28 | Update server.ts - **APPLIED** (Hardened CORS)
- [x] `bd03e92` | 2025-09-28 | Update server.ts - **APPLIED**
- [x] `35a61be` | 2025-09-28 | Update server.ts - **APPLIED**
- [x] `e74d7ec` | 2025-09-28 | Update mcpService.ts - **VETTED/SKIPPED** (Upstream now has full Resource support)
- [x] `7a20f31` | 2025-09-28 | Update mcpService.ts - **VETTED/SKIPPED**
- [x] `07f19ee` | 2025-09-29 | Update openApiGeneratorService.ts - **APPLIED** (Smart operationId logic)
- [x] `03312af` | 2025-09-29 | Update ToolResult.tsx - **VETTED/SKIPPED** (Upstream version is more advanced/dark-mode ready)
- [x] `91fd74f` | 2025-09-29 | Update ToolResult.tsx - **VETTED/SKIPPED**
- [x] `efc7f08` | 2025-09-29 | Update ToolResult.tsx - **VETTED/SKIPPED**
- [x] `945fbec` | 2025-09-29 | Update ToolResult.tsx - **VETTED/SKIPPED**

### Phase 2: Configuration & Cloning (Oct 2025)
- [x] `0b8a87b` | 2025-10-13 | increase login validity to 10y - **APPLIED**
- [x] `a0f9c2f` | 2025-10-13 | fix auth bug - **APPLIED** (Robust Regex-based public path detection)
- [x] `30d17a7` | 2025-10-13 | feat(servers): Add clone functionality and fix case-sensitivity - **APPLIED**
- [x] `89fea0f` | 2025-10-13 | fix: resolve server clone feature issues - **APPLIED**
- [x] `3ef3b22` | 2025-10-13 | feat: add professional API endpoints modal with copy functionality - **APPLIED**
- [x] `3faf269` | 2025-10-13 | fix: endpoints modal bugs - grid layout, translation, and URL detection - **APPLIED**
- [x] `e7fa8b9` | 2025-10-18 | update ui - **VETTED/SKIPPED** (Adopted minor mobile tweaks/xs breakpoint, but kept Upstream v0.12.15 redesign)

### Phase 3: Modernization & YAML (Oct 2025 - Mar 2026)
- [x] `1163025` | 2025-10-28 | Merge remote-tracking branch 'upstream/main' - **N/A** (Already in Upstream v0.12.15)
- [x] `1c69452` | 2025-10-28 | feat(frontend): improve UI for OAuth and mobile layout - **APPLIED**
- [x] `e7719ff` | 2025-10-28 | fix(oauth): Implement spec-compliant dynamic registration - **APPLIED** (Supabase fix)
- [x] `e376eb9` | 2026-03-22 | feat: add YAML support for OpenAPI specifications - **APPLIED**
- [x] `1c05b72` | 2026-03-22 | Merge pull request #2 from parasshah10/feat-openapi-yaml-support-12312720070777336418 - **APPLIED**
- [x] `624a222` | 2026-03-22 | fix: handle nullable properties in OpenAPI generation - **APPLIED**
- [x] `1a3fc45` | 2026-03-23 | Merge pull request #3 from parasshah10/feat-openapi-yaml-support-12312720070777336418 - **APPLIED**
