# Insighta Labs+ Web Portal

The Insighta Labs+ Web Portal is the frontend interface for a secure Profile Intelligence System.  
It connects to a centralized backend API that handles authentication, role-based access control, natural language search, and CLI integration.

---

## Live Demo

https://insighta-web-portal-eta.vercel.app/

---

## System Architecture

The system follows a multi-client architecture with a shared backend.
GitHub OAuth (PKCE)
↓
Backend API (Node.js + Express)
↓
MongoDB Database
↓
| Web Portal (Vercel) |
| CLI Tool (Node.js) |

---

## Authentication Flow

### Web Flow

1. User clicks “Login with GitHub”
2. Redirect to backend OAuth endpoint
3. GitHub authentication
4. Backend receives callback
5. Exchange code for access token
6. Fetch GitHub user profile
7. Create or update user in database
8. Generate JWT access and refresh tokens
9. Store tokens in HTTP-only cookies
10. Redirect user to dashboard

---

### CLI Flow

1. CLI triggers OAuth with `?source=cli`
2. Backend processes authentication
3. Detects CLI source
4. Redirects to local CLI server
5. CLI receives tokens via URL
6. Stores tokens in `~/.insighta/tokens.json`

---

## CLI Usage

Commands:

insighta login
insighta logout
insighta whoami

insighta profiles list
insighta profiles list --page 2
insighta profiles list --limit 10
insighta profiles list --sort age
insighta profiles list --search "women from ghana"

insighta profiles get <id>
insighta profiles export

### Install

You can install cli package.

```bash
npm install -g insighta_adv_cli
```

Token Handling
Access Token
Valid for 15 minutes
Used for API requests
Sent via Authorization header or cookies
Contains user ID and role
Refresh Token
Valid for 7 days
Stored in:
MongoDB (server-side)
HTTP-only cookies (web)
Local file system (CLI)
Role Enforcement Logic
Roles
analyst → default user
admin → elevated privileges
Middleware Flow
Verify JWT token
Attach user to request
Check user role
Allow or deny access
Protected Routes
Route Access
GET /profiles analyst, admin
POST /profiles admin only
DELETE /profiles admin only
GET /export admin only
Natural Language Search

The system supports rule-based query parsing.

Gender Detection
women, female → female
men, male → male
Age Detection
young → 16–24
adult → adult group
senior → elderly group
above 30 → min_age
under 25 → max_age
Country Detection
from nigeria → NG
from ghana → GH
from kenya → KE
Example

Query:elderly women from ghana

Parsed:

{
"gender": "female",
"age_group": "senior",
"country_id": "GH"
}

Features
GitHub OAuth 2.0 (PKCE)
JWT Authentication
Role-Based Access Control
Natural Language Search
CSV Export (admin only)
CLI + Web integration
Secure HTTP-only cookies
Tech Stack
Node.js
Express.js
MongoDB
JWT
GitHub OAuth
Vanilla JavaScript
Vercel (frontend)
Railway (backend)
Notes
Web portal depends on backend API
Authentication requires cookies enabled
CLI uses independent token storage
System supports both web and CLI clients

```

```