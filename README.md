# MK Booking

An Out-of-Home (OOH) advertising rental and booking platform for Panama. Similar to Airbnb, but for billboards, digital screens, and outdoor advertising spaces. A B2B marketplace connecting advertisers, agencies, and media owners.

## Features

- **Catalog & Discovery** - Browse and search advertising spaces with filters for structure type, zone, and price
- **Interactive Maps** - Google Maps integration showing asset locations with pricing
- **Inventory Management** - Manage assets, faces, dimensions, and specifications
- **Hierarchical Pricing** - Dynamic pricing rules at face, zone, structure, or organization level
- **Promotional Offers** - Support for percentage or fixed discount promotions
- **24-Hour Holds** - Reserve spaces before committing to a booking
- **Organization Management** - Multi-tenant support for advertisers, agencies, and media owners
- **Team Roles** - Owner, Admin, Sales, Operations, Finance, and Viewer permissions
- **Document Management** - Upload and verify tax certificates and legal documents
- **Production Specs** - Technical specifications for ad production (dimensions, DPI, file formats)
- **Permit Tracking** - Legal permits and compliance documentation with expiration dates
- **Maintenance Windows** - Schedule maintenance periods that block availability

## Tech Stack

### Frontend
- **Next.js 16** with App Router and React Server Components
- **TypeScript** with strict type checking
- **Tailwind CSS 4** + Shadcn UI components
- **React Hook Form** with Zod validation
- **Google Maps** via `@vis.gl/react-google-maps`

### Backend
- **tRPC 11** for end-to-end type-safe APIs
- **PostgreSQL** with Prisma ORM
- **Better Auth** for authentication
- **AWS S3** for file storage

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Docker (for local PostgreSQL)

### Installation

```bash
# Install dependencies
pnpm install

# Start the database
docker-compose up -d

# Run database migrations
pnpm prisma:migrate

# Seed with initial data
pnpm prisma:seed

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with Turbopack |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm prisma:studio` | Open Prisma Studio |
| `pnpm prisma:migrate` | Run database migrations |
| `pnpm prisma:seed` | Seed database |

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, register routes
│   ├── (protected)/         # Profile, onboarding
│   ├── (admin)/             # Admin dashboard, inventory, catalog
│   ├── s/[query]/           # Search results with map
│   └── api/                 # tRPC and auth endpoints
├── lib/
│   ├── services/            # Business logic (catalog, inventory, organization)
│   ├── trpc/routers/        # API route definitions
│   ├── auth.ts              # Better Auth configuration
│   └── db.ts                # Prisma client
├── components/
│   ├── ui/                  # Shadcn UI components
│   ├── home/                # Homepage components
│   └── auth/                # Authentication forms
└── prisma/
    ├── schema.prisma        # Database schema
    └── migrations/          # Database migrations
```

## Key Concepts

### Asset Hierarchy
- **Province** - Geographic region (e.g., Panamá, Colón)
- **Zone** - Area within a province (e.g., Avenida Central)
- **Asset** - Individual advertising location with coordinates
- **Asset Face** - Display surface with dimensions (width × height)

### Organization Types
- **Advertiser** - Companies looking to rent advertising space
- **Agency** - Marketing agencies managing campaigns
- **Media Owner** - Companies that own and manage OOH assets
- **Platform Admin** - Marketplace administrators

### Pricing Model
Price rules are matched hierarchically with intelligent fallback:
1. Face-specific price
2. Zone-level price
3. Structure type price
4. Organization-specific pricing
5. Default pricing

## Deployment

Configured for deployment on Render. See `render.yaml` for the blueprint configuration.

## Target Market

Built specifically for the Panamanian OOH advertising market:
- Currency: USD
- Language: Spanish (es-PA)
- Geography: Panama provinces and zones
- Compliance: Support for Cedula, RUC, and Panamanian tax IDs
