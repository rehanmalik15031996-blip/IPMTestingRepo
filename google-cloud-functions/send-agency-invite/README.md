# Send Agency Invite (Google Cloud Function)

Sends the **agency invite email** with the **link provided by the IPM app**. The agent clicks the link and sets their password on the site — **no PIN**. The app builds the full `inviteLink` (production or Vercel preview URL) so it works in both environments.

## Environment variables (same as send-otp)

- `GMAIL_ADDRESS` – e.g. `admin@internationalpropertymarket.com`
- `GMAIL_APP_PASSWORD` – Gmail app password

## Deploy (Cloud Run, same style as send-otp)

1. In Google Cloud Console, create a new Cloud Run (or Cloud Functions 2nd gen) service.
2. Use the same region as `send-otp` (e.g. `europe-west4`).
3. Set the entry point to `send_agency_invite`.
4. Add the two env vars above.
5. Deploy this folder (e.g. `gcloud run deploy send-agency-invite --source .`).

## IPM app configuration

After deployment, set in Vercel (and any server env):

```bash
SEND_AGENT_INVITE_URL=https://send-agency-invite-XXXX.europe-west4.run.app
```

For the invite link to point to the correct site:

- **Production:** set `FRONTEND_ORIGIN=https://www.internationalpropertymarket.com` in Vercel.
- **Vercel preview:** the app uses `VERCEL_URL` so preview deployments get the correct invite link automatically.

## Request payload (from IPM add-agent API)

```json
{
  "email": "agent@example.com",
  "inviteLink": "https://www.internationalpropertymarket.com/agency-agent-invite?token=...",
  "agencyName": "Your Agency Name",
  "branchName": "TestBranch",
  "type": "agent-invite"
}
```

`inviteLink` is required; the app builds it dynamically (prod vs Vercel). The email includes only the link; the agent sets their password on the page.
