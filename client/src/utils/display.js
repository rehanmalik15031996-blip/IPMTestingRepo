/**
 * Never show legacy placeholder "Seeff" in the UI — treat as empty so real agency/branch can be set.
 * Use for any display of agencyName, branchName, or agent.branch.
 */
export function sanitizeAgencyBranchDisplay(value) {
  if (value == null || typeof value !== 'string') return '';
  const v = value.trim();
  return v.toLowerCase() === 'seeff' ? '' : v;
}
