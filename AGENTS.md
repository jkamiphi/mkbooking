# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Project Overview

MK Booking is an Out-of-Home (OOH) advertising rental and booking platform for Panama. Similar to Airbnb but for billboards, digital screens, and outdoor advertising spaces. It's a B2B marketplace connecting advertisers, agencies, and media owners to discover, reserve, and manage outdoor advertising inventory.

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
- **Authentication**: Better Auth (email/password + OAuth ready)
- **File Storage**: S3-compatible for document storage

### Key Libraries

- **Date Handling**: date-fns with timezone support
- **Maps**: Google Maps via @vis.gl/react-google-maps
- **Icons**: Lucide React

## Project Structure

### Core Directories

```
src/
├── app/                     # Next.js App Router pages and API routes
│   ├── api/                # tRPC and auth API endpoints
│   ├── (auth)/             # Login, register routes
│   ├── (protected)/        # Profile, onboarding
│   ├── (admin)/            # Admin dashboard, inventory, catalog
│   └── s/[query]/          # Search results with map
├── lib/                    # Core business logic and utilities
│   ├── services/           # Business logic services
│   ├── trpc/              # tRPC router configuration
│   ├── auth.ts            # Better Auth configuration
│   └── db.ts              # Prisma client
├── components/             # React components
│   ├── ui/                # Base UI components (Shadcn)
│   ├── home/              # Homepage components
│   └── auth/              # Authentication forms
└── prisma/                 # Database schema and migrations
```

### Key Service Domains

The application is organized around these major business domains:

- **Catalog & Discovery**: Browse and search advertising spaces with filters and map integration
- **Inventory Management**: Assets, faces, zones, structure types, production specs, permits
- **Pricing System**: Hierarchical price rules (face/zone/structure/organization level) with promotions
- **Organization Management**: Multi-tenant support for advertisers, agencies, and media owners
- **User Profiles**: Registration, profiles, roles, and notification preferences
- **Catalog Holds**: 24-hour reservation holds before booking commitment

## Database Architecture

### Multi-Tenant Design

- Organization-based isolation (advertisers, agencies, media owners)
- Users belong to organizations with role-based permissions
- All data scoped by organization for security

### Key Models

- **Province/Zone**: Geographic hierarchy for asset locations
- **Asset/AssetFace**: Advertising locations with display surfaces and dimensions
- **StructureType**: Categories (Unipolar, Digital Display, MUPI, etc.)
- **CatalogFace**: Published catalog entries with pricing
- **CatalogPriceRule**: Hierarchical pricing rules
- **CatalogHold**: 24-hour reservation holds
- **Organization/OrganizationMember**: Multi-tenant organization management

## tRPC API Architecture

### Router Organization

The API is organized into focused routers located in `src/lib/trpc/routers/`:

- Authentication handled through Better Auth integration
- All routes use `protectedProcedure` with organization-level authorization
- Input validation using Zod schemas
- Business logic delegated to services in `src/lib/services/`

### Security Pattern

```typescript
// Every router endpoint includes authorization checks
await authorizationService.verifyOrganizationAccess(input.organizationId, ctx.userId);
await authorizationService.verifyAssetAccess(input.assetId, ctx.organizationId);
```

## Testing Strategy

### Database Testing

- Uses separate test database
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

## Key Features to Understand

### Catalog & Pricing System

- Hierarchical pricing: face-level → zone-level → structure-level → organization-level
- Promotional discounts (percentage or fixed amount)
- 24-hour holds for sales pipeline conversion tracking
- Prices shown only to authenticated users

### Asset Management

- Assets organized by Province → Zone → Asset → Face
- Each face has dimensions, orientation, and production specifications
- Support for permits, maintenance windows, and content restrictions
- Multiple images per asset and face

### Organization Types

- **Advertiser**: Companies looking to rent advertising space
- **Agency**: Marketing agencies managing campaigns
- **Media Owner**: Companies that own and manage OOH assets
- **Platform Admin**: Marketplace administrators

### Geographic Organization

- Panama-specific: provinces and zones taxonomy
- Google Maps integration for asset visualization
- Location-based search and filtering

When working on this codebase, always consider the multi-tenant architecture and ensure proper authorization checks. The service layer provides business logic that should be leveraged rather than reimplemented.
