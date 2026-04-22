/**
 * Server-side: never persist "Seeff" as agency or branch name.
 * Use whenever writing agencyName or branchName to DB (invites, users, leads, etc.).
 */
function sanitizeAgencyBranch(value) {
  if (value == null || typeof value !== 'string') return '';
  const v = value.trim();
  return v.toLowerCase() === 'seeff' ? '' : v;
}

module.exports = { sanitizeAgencyBranch };
