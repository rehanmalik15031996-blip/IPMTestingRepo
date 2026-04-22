/**
 * Remove secrets before sending User documents to the client (integration tokens, password).
 */
function sanitizeUserForClient(user) {
    const u = user && typeof user.toObject === 'function' ? user.toObject({ depopulate: true }) : { ...(user || {}) };
    if (u.password != null) delete u.password;
    if (u.agencyStats && u.agencyStats.integrations) {
        const intg = {
            hubspot: { ...(u.agencyStats.integrations.hubspot || {}) },
            propdata: { ...(u.agencyStats.integrations.propdata || {}) },
        };
        delete intg.hubspot.privateAppAccessToken;
        delete intg.hubspot.oauthAccessToken;
        delete intg.hubspot.oauthRefreshToken;
        if (intg.hubspot.oauthApp) {
            intg.hubspot.oauthApp = { ...intg.hubspot.oauthApp };
            if (intg.hubspot.oauthApp.clientSecret) intg.hubspot.oauthApp.clientSecret = '[stored]';
        }
        delete intg.propdata.bearerToken;
        u.agencyStats = { ...u.agencyStats, integrations: intg };
    }
    return u;
}

module.exports = { sanitizeUserForClient };
