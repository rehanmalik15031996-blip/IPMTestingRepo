/**
 * Property upload limits by role and subscription plan.
 * Used in PortfolioLegacy and PropertyUploadForm to enforce plan-based caps.
 */

/**
 * Returns the maximum number of properties the user can upload.
 * @param {{ role?: string, subscriptionPlan?: string }} user - User from localStorage/API (role, subscriptionPlan)
 * @returns {number}
 */
export function getPropertyLimitForUser(user) {
    if (!user) return 1;
    const role = (user.role || '').toLowerCase();
    const plan = (user.subscriptionPlan || 'Basic').trim();

    // Buyer, Seller, Investor, Landlord: plan-based (Basic 1, Premium 5, Custom high cap)
    if (['buyer', 'seller', 'investor', 'landlord'].includes(role)) {
        if (plan === 'Premium') return 5;
        if (plan === 'Custom') return 100;
        return 1; // Basic or missing
    }

    // Agent / Independent agent / Agency agent: Basic = 10 listings, else 5
    if (['agent', 'independent_agent', 'agency_agent'].includes(role)) {
        if (plan === 'Basic') return 10;
        return 5; // no plan or other
    }

    // Agency: no cap enforced here (handled elsewhere if needed)
    if (role === 'agency') return 999;

    return 1;
}
