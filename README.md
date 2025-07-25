# Next.js JSON Schema Generator

A configuration-driven development framework that generates complete full-stack Next.js applications from JSON table and enum definitions. Define your schema in JSON, get TypeScript types, Drizzle ORM schemas, Zod validation, and React components automatically.

## Features

- 🚀 **Rapid Development**: JSON configs → complete application
- 🔒 **Type Safety**: End-to-end TypeScript from database to UI
- 📝 **Auto-Generated**: Forms, tables, validation, and database utilities
- 🎨 **Modern Stack**: Next.js 15 + Drizzle + Zod + DaisyUI + React Hook Form
- 🔄 **Hot Reload**: Watch mode for JSON changes
- 📊 **Production Ready**: Includes migrations, seeding, and deployment setup

## Quick Start

### Prerequisites

- Node.js 18+, PostgreSQL, pnpm

### Installation

1. **Clone the repo**
   - in https:

   ```bash
   git clone https://github.com/your-username/nextjs-json-schema-generator.git
   ```

   - in ssh:

   ```bash
   git clone git@github.com:your-username/nextjs-json-schema-generator.git
   ```

2. **Go into folder and install dependencies:**

   ```bash
   cd nextjs-json-schema-generator
   pnpm install
   ```

### Setup

1. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your POSTGRES_URL
   ```

2. **Generate application code:**

   ```bash
   pnpm generate:all
   ```

3. **Setup database:**

   ```bash
   pnpm db:setup
   ```

4. **Start development:**
   ```bash
   pnpm dev
   ```

## Configuration System

Define your application using JSON files in two directories:

- **`db/enums/`** - Enum definitions with UI metadata
- **`db/tables/`** - Table schemas with validation and UI config

### Example Configurations

See the sample configurations for reference:

- [User Status Enum](db/enums/user_status.json) - Shows enum values with colors, icons, and labels
- [Users Table](db/tables/users.json) - Complete table with validation and UI configuration
- [Roles Table](db/tables/roles.json) - Basic table structure
- [User Roles Pivot](db/tables/user_roles.json) - Many-to-many relationship table

### JSON Schema Reference

#### Enum Files (`db/enums/[name].json`)

```json
{
  "values": ["active", "inactive", "pending"],
  "labels": { "active": "Active User" },
  "colors": { "active": "success" },
  "icons": { "active": "check-circle" },
  "description": "Status options"
}
```

#### Table Files (`db/tables/[name].json`)

**Core Structure:**

- `tableName`, `displayName`, `icon`, `description`
- `columns` - Column definitions with `dbConstraints`, `validation`, `ui`
- `indexes` - Database performance optimisation
- `relationships` - Foreign keys and associations
- `seedData` - Initial data for development

**Column Types:**

- `serial` - Auto-incrementing ID
- `varchar`, `text` - String fields
- `integer`, `numeric` - Numbers
- `timestamp`, `date` - Dates
- `boolean` - True/false
- `[enum_name]` - Reference to enum

**UI Configuration:**

- Form sections, field ordering, validation rules
- Input types (currency, date, multiline, etc.)
- Display formatting and help text

## Generated Code Structure

The framework generates a complete application:

```
src/
├── models/              # Generated from JSON configs
│   ├── enums/          # Enum types, schemas, validation
│   ├── [table]/        # Per-table types, schemas, validation
│   ├── schema.ts       # Aggregated Drizzle schemas
│   ├── types.ts        # Aggregated TypeScript types
│   └── validation.ts   # Aggregated Zod schemas
├── components/         # Generated React components
│   └── [table]/       # Forms and tables per model
└── db/                # Database utilities
    ├── connection.ts  # Drizzle connection
    ├── migrate.ts     # Migration runner
    └── seed.ts        # Generated seed data loader
```

**Generated Assets:**

- **TypeScript Types**: Complete interfaces for Create/Update/Select operations
- **Drizzle Schemas**: Database table definitions with indexes and relationships
- **Zod Validation**: Client/server validation schemas with error handling
- **React Components**: Form and table components using generic UI primitives
- **Database Utilities**: Seeding script

## Commands

### Generation

```bash
pnpm generate:all         # Generate everything
pnpm generate:models      # Types, schemas, validation only
pnpm generate:components  # React components only
pnpm generate:db          # Database utilities only
```

### Database

```bash
pnpm db:setup       # Migrate + seed (first time)
pnpm db:reset       # Reset database completely
pnpm db:push        # Push schema changes (development)
pnpm db:seed        # Load seed data
pnpm db:studio      # Open Drizzle Studio
```

### Development

```bash
pnpm dev           # Start development server
pnpm build         # Production build
pnpm lint          # Run ESLint
```

## Development Workflow

1. **Define schema** in `db/tables/` and `db/enums/`
2. **Generate code** with `pnpm generate:all`
3. **Update database** with `pnpm db:push`
4. **Develop features** using generated components

Use watch mode for rapid iteration:

```bash
pnpm generate:all --watch
```

## Advanced Features

**Form Sections**: Organise complex forms into collapsible groups
**Custom Validation**: Add domain-specific validation rules
**File Uploads**: Handle file attachments with proper validation
**Conditional Fields**: Show/hide fields based on other values
**Composite Keys**: Support for multi-column primary keys
**Soft Deletes**: Automatic timestamp-based deletion tracking

## Production Deployment

1. Generate production code: `pnpm generate:all`
2. Build application: `pnpm build`
3. Run migrations: `pnpm db:migrate`
4. Start server: `pnpm start`

## Contributing

1. Fork repository and create feature branch
2. Test changes with sample configurations
3. Ensure generated code follows project patterns
4. Submit pull request with clear description

## Troubleshooting

**Generation fails**: Check JSON syntax and required fields
**Database errors**: Verify `POSTGRES_URL` and database accessibility
**Type errors**: Regenerate all code after schema changes
**Missing relationships**: Ensure referenced tables exist

Enable debug logging: `DEBUG=true pnpm generate:all`

---

**License**: MIT
