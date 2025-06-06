# GitHub to Matrix Webhook Proxy

A Cloudflare Worker that acts as a proxy to forward GitHub webhooks to Matrix rooms with proper formatting and authentication.

## Features

- 🔄 Transforms GitHub webhook payloads into Matrix-formatted messages
- 🔒 Securely adds Matrix authentication token to requests
- 📝 Supports multiple GitHub event types:
  - Workflow runs (success/failure/cancelled)
  - Pull requests (opened/closed/merged/updated)
  - Issues (created/closed/reopened)
  - Comments (on issues and PRs)
  - Push events
  - Releases
- 🎨 Beautiful formatting with emojis and HTML styling

## Prerequisites

- Cloudflare account (free tier works)
- Node.js and npm/yarn installed locally
- Matrix access token for your bot/user
- Domain configured in Cloudflare (optional - can use workers.dev subdomain)

## Setup Instructions

### 1. Install Dependencies

```bash
# Install dependencies using npm
npm install

# OR using yarn
yarn install
```

### 2. Login to Cloudflare

```bash
npx wrangler login
```

This will open your browser to authenticate with your Cloudflare account.

### 3. Configure Your Worker

Update `wrangler.toml` with your settings:

1. **Set your Matrix room ID**:
   ```toml
   [vars]
   MATRIX_ROOM_ID = "!yourRoomId:matrix.org"
   ```
   - Use the internal room ID (starts with `!`)
   - Not the alias (like `#room:matrix.org`)
   - Find it in Element: Room Settings → Advanced → Internal room ID

2. **Configure your domain** (optional):
   - If using a custom domain, update the `pattern` and `zone_name` in the routes section
   - Otherwise, comment out the routes section to use the default workers.dev subdomain

3. **Change the worker name** (optional):
   - Update `name` in the toml file (this affects your worker URL)

### 4. Add Secrets

The worker uses two secrets that need to be added via Cloudflare's secret management:

#### Matrix Token

**Option 1: Use the login script (Recommended)**
```bash
npm run matrix-login
```

This interactive script will:
- Prompt for your Matrix credentials
- Login with refresh_token disabled for stability
- Show you the access token
- Optionally set it in Cloudflare automatically

**Option 2: Manual token setup**
```bash
npx wrangler secret put MATRIX_TOKEN
```
When prompted, paste your Matrix access token.

**Note about token stability:**
- Matrix tokens can expire or change when you log in/out
- The login script creates a stable token by disabling refresh tokens
- Keep the "GitHub Webhook Bot" device logged in to maintain token validity
- Consider using a dedicated bot account for maximum stability

#### GitHub Webhook Secret
```bash
npx wrangler secret put GITHUB_WEBHOOK_SECRET
```
When prompted, paste a secure secret string. You'll use this same secret when configuring the GitHub webhook.

**Generating a secure secret:**
```bash
# On Linux/Mac:
openssl rand -hex 32
# or
openssl rand -base64 32

# Or use any password generator to create a long random string
```

**Important:** Both secrets are encrypted and stored securely by Cloudflare. Never commit these to your repository.

**Important:** The authentication token must be from a Matrix user that is already in the room where you want to send messages.

**Getting your Matrix token:**

1. **Create a dedicated Matrix user** (recommended):
   - Create a new Matrix account specifically for GitHub notifications (e.g., `@github-bot:matrix.org`)
   - Join this user to your target Matrix room
   - Use this user's access token

2. **Get the access token**:
   - **Element**: Settings → Help & About → Access Token (at the bottom)
   - **Other clients**: Check their documentation
   - **Via API**: Login and use the access token from the response

3. **Ensure the user has permission**:
   - The user must be in the room you're sending to
   - The user must have permission to send messages in that room

### 5. Deploy the Worker

```bash
# Using npm
npm run deploy

# OR using yarn
yarn deploy
```

### 6. Configure GitHub Webhooks

1. Go to your GitHub repository → Settings → Webhooks
2. Click "Add webhook"
3. Configure:
   - **Payload URL**: 
     - Custom domain: `https://your-domain.com/webhook/`
     - Workers.dev: `https://github-matrix-webhook-proxy.<your-subdomain>.workers.dev/webhook/`
   - **Content type**: `application/json`
   - **Secret**: Enter the same secret you used for `GITHUB_WEBHOOK_SECRET`
   - **SSL verification**: Enable (recommended)
   - **Events**: Choose which events you want to forward:
     - Recommended: Issues, Pull requests, Push, Workflow runs
     - Or select "Send me everything"
4. Click "Add webhook"

GitHub will send a ping event to verify the webhook is working.

## Configuration

### Environment Variables

The worker uses three configuration values:

1. **MATRIX_ROOM_ID** (in `wrangler.toml`):
   - The Matrix room ID where messages will be sent
   - Must use the internal room ID format: `!roomid:matrix.org`
   - Find it in Element: Room Settings → Advanced → Internal room ID

2. **MATRIX_TOKEN** (added as a secret):
   - The access token for the Matrix user
   - Added via `wrangler secret put MATRIX_TOKEN`
   - Never commit this to your repository

3. **GITHUB_WEBHOOK_SECRET** (added as a secret):
   - Shared secret for verifying GitHub webhooks
   - Added via `wrangler secret put GITHUB_WEBHOOK_SECRET`
   - Use the same value in GitHub webhook settings

### Custom Domain Setup

If using a custom domain:

1. Ensure your domain is added to Cloudflare
2. Update `wrangler.toml`:
   ```toml
   [[routes]]
   pattern = "your-domain.com/webhook/*"
   zone_name = "your-domain.com"
   ```

## Testing

Test your webhook proxy locally:

```bash
# Start local development server
npx wrangler dev

# In another terminal, send a test webhook
curl -X POST http://localhost:8787/webhook/ \
  -H "Content-Type: application/json" \
  -d '{"action": "opened", "sender": {"login": "testuser"}, "repository": {"full_name": "test/repo"}}'
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized from Worker**
   - The GitHub webhook secret doesn't match
   - Ensure you used the exact same secret in both GitHub and Cloudflare
   - Check that GitHub is sending the `X-Hub-Signature-256` header

2. **401 Unauthorized from Matrix**
   - Check your Matrix token is correct
   - Ensure the token has permission to post in the room
   - Verify the room ID is correct

3. **Worker not receiving webhooks**
   - Check the webhook URL in GitHub settings
   - Verify the worker is deployed: `npx wrangler tail`
   - Check GitHub webhook delivery history for errors

4. **Messages not formatted correctly**
   - Check the worker logs: `npx wrangler tail`
   - Verify the GitHub event type is supported

### Viewing Logs

Monitor your worker logs in real-time:

```bash
npx wrangler tail
```

## Supported GitHub Events

The worker currently formats these GitHub webhook events:

- **Repository Events**: Created, deleted, archived, unarchived, publicized, privatized, renamed, transferred
- **Workflow Runs**: Shows status with emojis (✅ success, ❌ failure, ⚠️ cancelled)
- **Pull Requests**: Open, close, merge, synchronize, reopen actions
- **Issues**: Create, close, reopen, assign, label actions  
- **Comments**: On issues and pull requests with preview text
- **Pushes**: Number of commits and branch
- **Releases**: Published, created, edited, deleted
- **Branch/Tag Events**: Create and delete
- **Stars**: Star and unstar events
- **Forks**: Repository fork events
- **Labels**: Create, edit, delete (filtered for ghost users during repo creation)

Other events will show a generic message with event type information.

## Security Notes

- The Matrix token and GitHub webhook secret are stored securely as Cloudflare secrets
- The worker validates all incoming webhooks using HMAC-SHA256 signatures
- Only authenticated GitHub webhooks are forwarded to Matrix
- The worker only accepts POST requests to `/webhook/`
- All requests are proxied without storing any data

## Development

To modify the worker:

1. Edit the TypeScript files in `src/`
2. Test locally: `npx wrangler dev`
3. Deploy changes: `npm run deploy`

### Project Structure

```
src/
├── index.ts          # Main worker entry point
├── types.ts          # TypeScript type definitions
├── utils.ts          # Utility functions (signature verification, etc.)
├── event-config.ts   # Event configuration and templates
├── event-handlers.ts # Complex event handler functions
└── formatter.ts      # Message formatting logic
```

## Scripts

- `npm run deploy` - Deploy the worker to Cloudflare
- `npm run dev` - Run the worker locally for testing
- `npm run tail` - View real-time logs from the deployed worker
- `npm run matrix-login` - Interactive script to get a stable Matrix token

## License

MIT License - See [LICENSE](LICENSE) file for details
