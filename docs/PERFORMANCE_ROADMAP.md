# Performance roadmap – next options

App is still feeling slow in places. Here’s a short list of options to try over the next couple of days. Pick 1–2 per session.

---

## Already done (reference)
- Tab cache (10 min TTL, 2 min stale)
- Prefetch route chunks + dashboard data on sidebar hover
- Warm dashboard cache in background when user is logged in
- Lazy-load Dashboard
- MongoDB indexes: Property (agentId+createdAt, agentId+status), User (agencyId)

---

## 1. **FontAwesome tree-shaking** (high impact, medium effort)
- **Issue:** Importing many (or all) icons blows up the JS bundle.
- **Option A:** Replace broad imports with per-icon imports and only register icons you use (e.g. `@fortawesome/fontawesome-svg-core` + `addIcons` with a single list of used icons).
- **Option B:** Audit every `fa-` usage, collect unique icon names, then one file that imports only those and registers them.
- **Result:** Often 200–400KB+ smaller initial bundle → faster first load and less work on navigation.

---

## 2. **Lighter / split dashboard API** (high impact, medium effort)
- **Issue:** One big `?type=dashboard` response (portfolio, agents, leads, sales, news, etc.) is slow to send and parse.
- **Options:**
  - **A)** Split into e.g. `GET /api/users/:id/dashboard/summary` (counts + top agents list only) and load full portfolio/CRM in a second request or when user opens that tab.
  - **B)** Add `?fields=stats,topAgents,crmLeads` (or similar) so Dashboard can request only what the current view needs.
  - **C)** Omit heavy fields (e.g. `listingMetadata`, full portfolio details) from the initial payload; load details when opening a property or section.
- **Result:** Faster first dashboard paint and faster tab switches that need less data.

---

## 3. **Virtualize long lists** (high impact where lists are long)
- **Issue:** CRM leads, Agents list, or Portfolio with hundreds of rows = lots of DOM and re-renders.
- **Option:** Use `react-window` or `@tanstack/react-virtual` so only visible rows are in the DOM.
- **Apply to:** CRM lead list, Agents table, Portfolio/listing grids if they can be large.
- **Result:** Smooth scrolling and much faster rendering when there are many items.

---

## 4. **Skeleton / inline loading states** (perceived speed)
- **Issue:** Full-page or big spinners make waits feel longer.
- **Option:** Replace big loaders with skeleton UIs (e.g. grey blocks where charts/tables will be) and small “Updating…” or nothing for background refetches.
- **Result:** Feels faster even when network time is the same.

---

## 5. **i18n lazy-load by language** (medium impact, low effort)
- **Issue:** All languages loaded up front in `translations.js` adds to initial bundle.
- **Option:** Load only the active language at first; dynamically import other languages when user switches (e.g. `import(\`./i18n/translations-${lang}.js\`)`).
- **Result:** Slightly smaller initial bundle and parse time.

---

## 6. **API response compression** (low effort, check first)
- **Check:** Confirm API and static assets are served with gzip or Brotli (Vercel usually does this; custom Node server may need compression middleware).
- **Result:** Smaller payloads over the wire = faster load.

---

## 7. **Reduce re-renders on heavy pages** (targeted)
- **Issue:** Dashboard/CRM re-render a lot (e.g. on any state change) and include charts/large lists.
- **Options:** Wrap expensive sections in `React.memo`; split state so chart components don’t depend on lead/agent list state; use `useMemo` for derived data (filtered lists, aggregates).
- **Result:** Smoother UI when switching tabs or updating one section.

---

## 8. **Preload critical API on login** (low effort)
- **Option:** Right after successful login (before redirect to dashboard), fire a single `GET /api/users/:id?type=dashboard` and store in cache. By the time the user lands on Dashboard, data is already there.
- **Result:** First dashboard view often feels instant.

---

## Suggested order for the next couple of days
1. **Day 1:** (8) Preload dashboard on login + (6) verify compression.  
2. **Day 2:** (1) FontAwesome tree-shaking or (2) lighter/split dashboard API, depending on whether bundle size or API time is the bigger bottleneck (check Network + Performance in DevTools).

When you’re ready to tackle a specific number, we can implement it step by step.
