# PORTO Project

## Project Overview

PORTO is a monorepo project focused on building a minimalist technical/editorial portfolio website. It heavily emphasizes a "design system first" approach, prioritizing foundations like color tokens, typography scales, and spacing before building individual pages. 

The project is structured as a monolith with clear boundaries:
- `frontend/`: Contains the Next.js application.
- `backend/`: Reserved for future backend services, APIs, and persistence layers.
- `docs/`: Knowledge base for visual themes, UI details, and tech stack decisions.

### Main Technologies
- **Framework:** Next.js 15+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui (using `radix-nova` style) & Radix UI
- **Icons:** Lucide React
- **Animations:** Motion / Framer Motion (used sparingly for subtle interactions)
- **Package Manager:** pnpm

### Frontend Architecture
The frontend follows a modular architecture to separate concerns:
- `frontend/src/app/`: Routing, global layouts, and route-level composition.
- `frontend/src/modules/`: Domain-based UI logic (e.g., `home`). Each module contains its own sections and specific needs.
- `frontend/src/shared/`: Reusable primitives, site-level config, and types that cross module boundaries.
- `frontend/src/components/ui/`: Isolated source for `shadcn/ui` components.

## Building and Running

The project uses `pnpm` for dependency management and can be run from the root directory using the following scripts defined in `package.json`:

- **Install Dependencies:** `pnpm run install:frontend`
- **Run Development Server:** `pnpm run dev:frontend` (Runs on `http://localhost:3000`)
- **Build for Production:** `pnpm run build:frontend`
- **Lint the Codebase:** `pnpm run lint:frontend`

Alternatively, you can navigate directly into the `frontend/` directory and run standard `pnpm` commands (`pnpm install`, `pnpm dev`, `pnpm build`, `pnpm lint`).

## Development Conventions

### Coding Style & Visual Direction
- **Aesthetic:** Minimalist technical/editorial. Use monochrome/zinc palettes, thin borders, rigid grids, disciplined spacing, subtle patterns, and restrained animations.
- **Component States:** Always consider and implement comprehensive component states (hover, focus, active, disabled, loading, error, success).
- **Accessibility:** Ensure sufficient text contrast, clear focus states, correct heading hierarchies, and proper ARIA labels.
- **Responsive Design:** Think mobile-first and define behaviors for mobile, tablet, desktop, and wide screens early on.

### Architectural Rules
- `app/` is allowed to import from `modules/` and `shared/`.
- `modules/` is allowed to import from `shared/`.
- `shared/` **must not** depend on or import from `modules/`.
- Backend logic must not be mixed into the frontend folder.
- Keep dummy data close to its respective module until a CMS or API layer is introduced.

### Commit Guidelines
Use imperative commit subjects with a short scope.
- Examples: `frontend: refactor homepage`, `docs: refine visual direction`, `skills: add porto design system`.
- Pull requests should explain the purpose of the change, files modified, and the reasoning behind any new design or stack decisions.
