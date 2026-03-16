# Sub-project 2: Left Sidebar + Main Content + Routing

## Problem

The app currently renders hard-coded sample data in both sidebars. It needs to be wired to the real API — projects in the left sidebar, generations in the main content — with URL-driven state via React Router.

## Routing (React Router v7)

### Route structure

- `/` → redirect to first project, or "create your first project" screen if none
- `/projects/:projectId` → project dashboard (generation grid)
- `/projects/:projectId/generations/:generationId` → reserved for future detail view

The `projectId` URL param is the source of truth for the active project. No `activeProjectId` component state — the URL drives everything.

### Data flow

- `App.tsx` wraps the app in `<BrowserRouter>`, fetches user + projects list on mount
- Route params via `useParams()` determine which project is active
- Project switcher uses `useNavigate()` to change URL on project switch
- Generation grid reads `projectId` from URL, fetches `GET /v1/projects/:projectId/generations`

## Left Sidebar

### ProjectSwitcher (replaces TeamSwitcher)

- Receives projects array and current `projectId` from URL
- Dropdown lists all projects, highlights the active one
- Clicking a project navigates to `/projects/:id`
- "Add Project" button opens a modal dialog with fields: name (required), description (optional), url (optional)
- After creation, navigates to the new project's URL

### NavMain (simplified)

- Single "Home" item linking to `/projects/:projectId` (the grid view)
- Remove Search, Ask AI, Inbox — not needed

### Recent Generations (replaces NavFavorites)

- Shows recent generations for the active project (fetched from API)
- Each item shows a prompt snippet (truncated) and rendering style
- Clicking navigates to `/projects/:projectId/generations/:genId` (for now, just highlights in grid or scrolls to it)

### Removed sections

- NavWorkspaces → removed
- NavSecondary → removed (Settings can be added later)

## Main Content

### Generation Grid (`/projects/:projectId`)

- Fetches `GET /v1/projects/:projectId/generations` when `projectId` changes
- Renders a responsive grid of generation cards
- Each card shows:
  - Transparent image thumbnail (from `https://${IMAGES_DOMAIN}/${storagePath}transparent.png`)
  - Prompt text (truncated)
  - Rendering style tags (e.g., "flat", "clay")
  - Creation date
  - Delete button
- Empty state: "No generations yet. Use the generator on the right to create your first illustration."
- Loading state while fetching

### No project state (`/`)

- If user has projects: redirect to first project
- If user has no projects: show a welcome screen with "Create your first project" CTA

## Right Sidebar

### NavUser

- Wired to the real user object from App.tsx (name, email, initials avatar)
- Logout via form POST to `/auth/logout`

### Generator form placeholder

- Remove DatePicker, Calendars, and "New Calendar" button
- Show a simple placeholder: "Generator form coming soon" (implemented in sub-project 3)

## Components to modify

| Component | Action |
|-----------|--------|
| `App.tsx` | Add BrowserRouter, Routes, pass user/projects to sidebars |
| `sidebar-left.tsx` | Replace sample data with props, remove workspaces/secondary |
| `team-switcher.tsx` → `project-switcher.tsx` | Rewrite for projects + add modal |
| `nav-main.tsx` | Simplify to single Home item |
| `nav-favorites.tsx` → `recent-generations.tsx` | Rewrite for generation list |
| `sidebar-right.tsx` | Wire real user, replace calendars with placeholder |
| `nav-user.tsx` | Already has logout — just wire real user data |

## Components to remove

- `nav-workspaces.tsx`
- `nav-secondary.tsx`
- `calendars.tsx`
- `date-picker.tsx`

## Components to create

- `project-switcher.tsx` — project dropdown + add project modal
- `recent-generations.tsx` — generation list in sidebar
- `pages/project-dashboard.tsx` — generation grid page
- `pages/no-project.tsx` — welcome / create first project page

## Dependencies to add

- `react-router` (v7)
