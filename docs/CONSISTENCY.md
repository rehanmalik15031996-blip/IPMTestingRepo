# Consistency: agency agent vs sole agent

This doc states how we keep **agency agents**, **sole (independent) agents**, and **agencies** consistent so the same fix or feature isn’t applied to only one path.

## Principle

**One behavior, different data source.**

- **Sole agent:** Leads live on `user.agentStats.crmLeads`. Dashboard reads from that.
- **Agency agent:** Leads live on the **agency** document `agency.agencyStats.crmLeads` with `assignedAgentId = agent's user id`. Dashboard reads from the agency and filters by that id.
- **Agency:** Leads live on `user.agencyStats.crmLeads`. Dashboard reads from that.

Everything else (UI, refetch after add/update/delete, cache invalidation, activity log, statuses, validation) must be the **same** for all roles. If we add or fix something for one role, we do it for all.

## Where to keep in sync

| Area | Files / places |
|------|-----------------|
| Add lead | `api/add-lead.js`, `api/users/add-lead.js`, `server/routes/users.js` (add-lead) |
| Update lead | `api/update-lead.js` (Express has no update-lead route) |
| Delete lead | `api/delete-lead.js` |
| Dashboard (read leads) | `api/users/[id].js` (type=dashboard), `server/routes/users.js` (GET :id type=dashboard) |
| Client refetch/cache | `client/src/pages/CRM.js` (`fetchLeads(bypassCache)`), dashboard cache invalidation |

## Checklist for changes

1. **API:** Any change to add/update/delete lead or dashboard response must consider all three roles (agency, agency_agent, sole) in each file that implements the endpoint.
2. **Refetch:** After a lead mutation, the client must receive fresh data (no 304 with stale body). Same mechanism for all roles (e.g. cache-bust when bypassing cache).
3. **New fields/statuses/activities:** Add them in every API and server path that touches leads, so agency and sole behavior stay identical.

See also: `.cursor/rules/agency-agent-consistency.mdc` for AI-assisted consistency when editing these files.
