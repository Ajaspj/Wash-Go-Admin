# Wash-Go Operations Admin Panel

Production-oriented administrative frontend for the Wash-Go on-demand vehicle wash and detailing platform. Built with React 19, TypeScript, Vite, TanStack Query, and Lucide React.

Connected Backends:
- **Staging Backend (Active Development)**: `https://wash-go-api-hsvt.onrender.com`
- **Production Backend**: `https://wash-go-api.onrender.com`

---

## 1. Architecture & Design Principles

The Wash-Go Admin Panel provides operations managers and platform administrators with end-to-end oversight and controls for:
- **Agent Partner Onboarding & Review**: Inspect applicant credentials, water tank capacity, pressure washer/vacuum equipment, and submit approval or rejection decisions.
- **Dedicated KYC Verification Queue**: Examine Government IDs, Driving Licenses, Vehicle Registration Certificates (RC), and Insurance with secure in-memory authenticated downloads.
- **Strict Domain Rules**: Administrative approval is blocked at the backend API layer unless all submitted KYC documents are reviewed and verified.
- **Operations Monitor**: Real-time dispatch oversight of customer wash orders, agent assignments, and cancellation handling.
- **Audit Ledger**: Comprehensive chronological records of all administrative decisions, status transitions, and operator identifiers.
- **Enterprise Security**:
  - Direct integration with Spring Security JWT authentication.
  - Strict client-side and server-side `ROLE_ADMIN` role guards.
  - Safe in-memory and `sessionStorage` token isolation (no refresh tokens or secrets stored in plain `localStorage`).
  - Strict CORS origin filtering.

---

## 2. Directory Structure

```text
Wash-Go-Admin/
├── src/
│   ├── api/
│   │   ├── client.ts             # Centralized API fetch client with token handling and 401 recovery
│   │   └── types.ts              # Domain TypeScript interfaces (AgentProfile, Booking, KYC, etc.)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx        # Protected route guard & shell wrapper
│   │   │   ├── Sidebar.tsx       # Charcoal-themed responsive sidebar with live metric badges
│   │   │   └── TopNav.tsx        # Top bar with admin identity, API status, and logout
│   │   └── ui/
│   │       ├── Modal.tsx         # Accessible dialog for reviews and decision reasons
│   │       ├── Skeleton.tsx      # Shimmer loading states for tables and cards
│   │       └── StatusBadge.tsx   # Domain status pills with semantic color-coding
│   ├── context/
│   │   ├── AuthContext.tsx       # Authentication state & authoritative backend role verification
│   │   └── ToastContext.tsx      # System feedback notifications (success, error, info)
│   ├── pages/
│   │   ├── AccessDenied.tsx      # Segregated screen for unauthorized non-admin attempts
│   │   ├── AgentDetail.tsx       # Detailed agent profile, equipment specs, and document review
│   │   ├── Agents.tsx            # Full agent directory with search, filters, and pagination
│   │   ├── Applications.tsx      # Dedicated agent applications review queue
│   │   ├── AuditLogs.tsx         # Chronological security & operational audit trail
│   │   ├── Bookings.tsx          # Bookings monitor with search and cancellation
│   │   ├── Dashboard.tsx         # Operations command center with real-time metric cards
│   │   ├── KycReview.tsx         # Dedicated KYC document verification queue
│   │   ├── Login.tsx             # Administrator authentication form
│   │   └── Settings.tsx          # System parameters and connected environment info
│   ├── test/
│   │   ├── Login.test.tsx        # Login form and input validation tests
│   │   ├── Modal.test.tsx        # Modal lifecycle and action trigger tests
│   │   ├── StatusBadge.test.tsx  # Status rendering and CSS token tests
│   │   └── setup.ts              # Vitest happy-dom test setup
│   ├── App.tsx                   # QueryClientProvider, ToastProvider, and Route declarations
│   ├── index.css                 # Wash-Go yellow & charcoal design system and tokens
│   ├── main.tsx                  # React application mount
│   └── vite-env.d.ts             # Vite client types & environment interface
├── .env.example                  # Safe environment template
├── .env.local                    # Local development environment configuration
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Environment Variables

Configure environment variables in `.env.local`:

```env
# Point to live staging backend (default for staging deployment and development):
VITE_API_URL=https://wash-go-api-hsvt.onrender.com
VITE_API_BASE_URL=https://wash-go-api-hsvt.onrender.com

# Or point to local Spring Boot backend instance:
# VITE_API_URL=http://localhost:8080
# VITE_API_BASE_URL=http://localhost:8080

# Or point to production backend (for production deployment only):
# VITE_API_URL=https://wash-go-api.onrender.com
# VITE_API_BASE_URL=https://wash-go-api.onrender.com
```

> **Security Note**: Never commit JWT secrets, database credentials, or admin passwords to frontend `.env` files. `VITE_` variables are bundled into client-side code and must only contain public URLs.

---

## 4. Getting Started Locally

### Prerequisites
- Node.js `v20+` or `v22+`
- npm `v10+`

### 1. Installation
```powershell
cd "D:\Springboot projects\Wash-Go-Admin"
npm install
```

### 2. Start Local Development Server
```powershell
npm run dev
```
The admin panel will be available at:
`http://localhost:5173`

### 3. Run Frontend Tests
```powershell
npm run test
```

### 4. Build Production Bundle
```powershell
npm run build
```
The compiled output is created in `dist/`.

---

## 5. Administrator Provisioning & Authentication

### Security Model
1. **Authentication Endpoint**: `POST /api/v1/auth/login` accepts `{ email, password }` and issues a signed JWT access token.
2. **Authoritative Role Check**: The frontend verifies the user's authoritative role via `GET /api/v1/users/me` immediately upon receiving the token.
3. **Role Enforcement**: If `user.role !== 'ADMIN'`, the session is rejected immediately with a `403 Access Denied`, the token is erased, and the user is redirected to `/access-denied`. Customer and agent credentials cannot perform any administrative actions.
4. **Backend Security**: All `/api/v1/admin/**` endpoints are protected by Spring Security `.hasRole('ADMIN')`.

### Safe Production Administrator Provisioning
To provision or reset the administrator account securely without hardcoding credentials in the codebase, configure the following environment variable on Render (or local `.env`):

```bash
ADMIN_BOOTSTRAP_ENABLED=true
ADMIN_BOOTSTRAP_EMAIL=admin@washgo.com
ADMIN_BOOTSTRAP_PASSWORD=YourStrongAdminPassword2026!
ADMIN_BOOTSTRAP_FIRST_NAME=Super
ADMIN_BOOTSTRAP_LAST_NAME=Admin
```

When the Spring Boot backend boots:
1. `AdminBootstrapRunner` checks if an account with `ADMIN_BOOTSTRAP_EMAIL` exists.
2. If absent, it creates the account with `Role.ADMIN`, `UserStatus.ACTIVE`, `enabled = true`, and a BCrypt-hashed password.
3. The password is never logged or exposed in responses.

---

## 6. Backend CORS Configuration

The Spring Boot backend (`Wash-Go-API`) includes a `CorsConfigurationSource` in `SecurityConfig.java` that explicitly permits requests from:
- `http://localhost:[*]`
- `http://127.0.0.1:[*]`
- `https://*.onrender.com`
- `https://*.vercel.app`
- `https://*.netlify.app`

Allowed HTTP methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD`.
Credentials: `true` (supports credentialed requests).

---

## 7. KYC Storage Configuration

The backend stores KYC documents using `AgentDocumentStorageService`:
- Local default: `./storage/kyc-documents`
- Render production: Configured via `KYC_STORAGE_DIR`. When using a Render persistent disk (e.g. `/var/data/washgo/kyc-documents`), set `KYC_STORAGE_DIR=/var/data/washgo/kyc-documents` in Render service environment settings.
- Document downloads are streamed through `GET /api/v1/admin/documents/{documentId}/download` with strict role verification. Storage paths and raw disk locations are never exposed to clients.

---

## 8. Rollback and Recovery Considerations

- **Database Migrations**: Managed forward-only through Flyway (`src/main/resources/db/migration`). Never drop tables or delete production migration records.
- **Stateless Authentication**: JWT access tokens are short-lived (`15m`). If an administrator account is compromised, revoking the user record immediately invalidates token refresh sessions.
- **Audit Logging**: Every status transition, approval, rejection, and KYC review records an immutable entry in the `audit_logs` table with actor ID, entity ID, action, and timestamp.
