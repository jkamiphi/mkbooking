# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Planilla is a comprehensive payroll and HR management system built with modern technologies. The application handles employee management, payroll processing, shift planning, permissions, attendance tracking, and comprehensive reporting for organizations.

## Development Commands

### Core Development

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build production application (includes Prisma generation)
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking with Prisma generation

### Database Management

- `pnpm db:setup` - Complete development database setup (start Docker, create DB, run migrations)
- `pnpm db:setup:test` - Complete test database setup
- `pnpm db:setup:all` - Set up both development and test databases
- `pnpm db:start` - Start Docker database container
- `pnpm prisma:studio` - Open Prisma Studio for development database (localhost:5555)
- `pnpm prisma:studio:test` - Open Prisma Studio for test database (port 5556)
- `pnpm prisma:migrate` - Run database migrations on development DB
- `pnpm prisma:seed` - Seed database with initial data

### Testing

- `pnpm test` - Run all tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Generate test coverage report
- `pnpm test:ui` - Run tests with Vitest UI
- `pnpm test:unit` - Run unit tests only
- `pnpm test:integration` - Run integration tests only
- `pnpm test:verbose` - Run tests with full Prisma logs

## Tech Stack Architecture

### Frontend

- **Framework**: Next.js 15 with App Router and React Server Components
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS 4 + Shadcn UI components
- **State Management**: React Context + tRPC hooks
- **Forms**: React Hook Form with Zod validation

### Backend

- **API Layer**: tRPC for end-to-end type safety
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Stytch authentication service
- **File Storage**: Vercel Blob for document storage

### Key Libraries

- **Date Handling**: date-fns with timezone support
- **PDF Generation**: React PDF renderer + PDFKit
- **Charts**: Recharts for data visualization
- **Email**: Resend for transactional emails
- **Error Tracking**: Sentry for monitoring

## Project Structure

### Core Directories

```
src/
├── app/                     # Next.js App Router pages and API routes
│   ├── api/                # tRPC API route handlers
│   ├── dashboard/          # Main application dashboard
│   └── authenticate/       # Authentication flows
├── lib/                    # Core business logic and utilities
│   ├── services/           # Business logic services (40+ domains)
│   ├── trpc/              # tRPC router configuration
│   └── auth/              # Authentication utilities
├── components/             # React components
│   ├── ui/                # Base UI components (Shadcn)
│   └── [feature]/         # Feature-specific components
└── types/                  # TypeScript type definitions
    └── api/               # API request/response types
```

### Key Service Domains

The application is organized around these major business domains:

- **Employee Management**: Personal info, work schedules, benefits, deductions
- **Payroll Processing**: Regular, vacation, severance, and professional services payroll
- **Shift Planning**: Shift-based scheduling system with role management
- **Attendance**: Time tracking, overtime, work schedule breaches
- **Permissions**: Vacation, sick leave, doctor appointments with approval workflows
- **Company Configuration**: Multi-company support with departments, locations, holidays

## Database Architecture

### Multi-Tenant Design

- Organization-based isolation with company hierarchies
- Each user belongs to an organization with access to multiple companies
- All data is scoped by organization/company for security

### Key Models

- **OrganizationDB**: Top-level tenant isolation
- **CompanyDB**: Business entities within organizations
- **EmployeeDB**: Employee records with work information, benefits, deductions
- **CompanyPayrollPeriodDB**: Payroll processing periods with configurable frequencies
- **EmployeeShiftDB**: Shift-based scheduling system

## tRPC API Architecture

### Router Organization

The API is organized into 40+ focused routers located in `src/lib/trpc/routers/`:

- Authentication handled through Stytch integration
- All routes use `protectedProcedure` with organization-level authorization
- Input validation using Zod schemas
- Business logic delegated to services in `src/lib/services/`

### Security Pattern

```typescript
// Every router endpoint includes authorization checks
await authorizationService.verifyEmployeeAccess(input.employeeId, ctx.organizationId);
await authorizationService.verifyCompanyAccess(input.companyId, ctx.organizationId);
```

## Testing Strategy

### Database Testing

- Uses separate test database (`planilla_test_db`)
- Table truncation between tests in dependency order
- Real database operations (no mocking)
- Test data factories for consistent setup

### Test Commands

- Run `pnpm db:setup:test` before testing
- Use `PRISMA_QUIET_LOGS=true` to reduce log verbosity
- Tests are located in `src/test/` with clear domain organization

## Development Guidelines

### Environment Configuration

- **CRITICAL**: Never use `process.env` directly in application code
- Server-side: Use `getServerConfig()` from `@/lib/server-config`
- Client-side: Use `getClientConfig()` from `@/lib/client-config`
- All environment variables must be defined in `src/types/env.d.ts`

### Code Standards (from .cursorrules)

- Functional and declarative programming patterns
- TypeScript with interfaces over types
- Descriptive variable names with auxiliary verbs
- Minimize 'use client' - prefer React Server Components
- Responsive design with Tailwind CSS
- Use Shadcn UI components for consistency

### Component Organization

- Feature-specific components in `_components` folders within app routes
- Shared components in `src/components/`
- UI components follow Shadcn patterns

## Shift Planning System

The application includes a sophisticated shift-based scheduling system:

- **Shift Roles**: Configurable roles with time constraints and colors
- **Employee Assignments**: Employees can be assigned to multiple shift roles
- **Visual Scheduler**: Day/Week/Month view scheduling interface
- **Notes System**: Shift-specific notes and communications

## Key Features to Understand

### Payroll Processing

- Multiple payroll types: regular, vacation, severance, professional services
- Complex tax calculations for Costa Rican regulations
- Historical payroll import capabilities
- PDF generation for payroll receipts

### Multi-Company Support

- Organizations can manage multiple companies
- Company-specific configurations for holidays, work schedules, payroll settings
- Department and location management per company

### Permission System

- Vacation tracking with allocation and balance management
- Sick leave with automatic calculations
- Doctor appointment permissions
- Approval workflows with document management

When working on this codebase, always consider the multi-tenant architecture and ensure proper authorization checks. The extensive service layer provides robust business logic that should be leveraged rather than reimplemented.
