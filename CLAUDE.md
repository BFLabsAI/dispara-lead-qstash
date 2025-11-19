# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DisparaLead** is a Brazilian Portuguese WhatsApp marketing automation application built with React, TypeScript, and modern web technologies. The application enables scheduling and executing bulk WhatsApp message campaigns with AI-powered copywriting features.

## Development Commands

```bash
# Start development server (runs on port 8080)
pnpm dev

# Build for production
pnpm build

# Build for development (debug mode)
pnpm build:dev

# Lint code
pnpm lint

# Preview production build
pnpm preview
```

## Tech Stack & Architecture

### Core Technologies
- **React 18.3.1** with TypeScript
- **Vite 6.3.4** for build tooling with SWC compiler
- **React Router DOM 6.26.2** for client-side routing
- **Tailwind CSS 3.4.11** with custom "Disparador" color scheme

### UI Components
- **shadcn/ui** library - All components pre-installed and ready to use
- **Radix UI** components for accessibility
- **Lucide React** for icons
- **Vaul** for mobile drawer/sidebar components

### State Management
- **Zustand 5.0.8** for client-side state with domain-specific stores:
  - `disparadorStore`: Campaign dispatch logic
  - `copyAgentStore`: AI copywriting features
  - `apiSettingsStore`: API configuration
- **React Query 5.56.2** for server state management

### Forms & Validation
- **React Hook Form 7.53.0** with **Zod 3.23.8** schemas
- Use `@hookform/resolvers` for form validation

### Backend & Database
- **Supabase** as the backend database
- Custom schema for `scheduled_campaigns` with campaign grouping and status tracking

## Application Structure

### Routing (All routes in `src/App.tsx`)
- `/` - Home dashboard with navigation cards
- `/dashboard` - Analytics and insights
- `/instancias` - WhatsApp instance management
- `/disparo` - Message dispatch interface
- `/agendar-campanha` - Campaign scheduling
- `/copy-agent` - AI-powered copywriting assistance
- `/api-settings` - API configuration

All routes use `DashboardLayout` component except for the 404 page.

### Directory Organization
```
src/
├── components/
│   ├── ui/              # shadcn/ui components (don't edit directly)
│   ├── disparador/      # WhatsApp campaign components
│   ├── layout/          # DashboardLayout, AppSidebar
│   ├── dashboard/       # Dashboard-specific components
│   ├── campaigns/       # Campaign management
│   └── copy-agent/      # AI copywriting components
├── pages/              # Route-based page components
├── store/              # Zustand state stores
├── services/           # API services
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── lib/                # Core libraries and configurations
└── context/            # React contexts (theming)
```

## Development Guidelines

### Code Organization (from AI_RULES.md)
- **Always use TypeScript**
- **Keep routes in `src/App.tsx`**
- **Pages go in `src/pages/`**
- **Components go in `src/components/`**
- **All source code must be in the `src` folder**
- **Update the main page (`src/pages/Index.tsx`) to include new components**

### Component Development
- **Prefer shadcn/ui components** when available
- **Use Tailwind CSS extensively** for styling
- **Import shadcn/ui components** from `@/components/ui/`
- **Create new components** if you need to modify shadcn/ui components (don't edit them directly)

### State Management
- Use **Zustand stores** for client-side state management
- Create domain-specific stores for different features
- Use **React Query** for server state and API calls

### Styling
- **Tailwind CSS only** - no CSS modules or styled-components
- Use the custom "Disparador" color scheme (green-based branding)
- Mobile-first responsive design approach
- Use `next-themes` for dark/light mode support

## Database Schema

The application uses a `scheduled_campaigns` table with the following key fields:
- `campaign_group_id`: Groups multiple dispatches of the same campaign
- `hora_agendamento`: Specific scheduling timestamp for each dispatch
- `dispatch_order`: Order of dispatch within the campaign group
- `status_disparo`: Track dispatch status ('agendado', 'processando', 'concluido', 'falha', 'cancelado')
- `templates_mensagem`: Message templates for each specific dispatch
- `contatos_json`: Contact list for each dispatch

## Deployment

- **Vercel-ready** configuration in `vercel.json`
- **Single-page app** setup with all routes rewriting to `index.html`
- **Build optimization** with SWC compiler for fast builds

## Key Features

1. **WhatsApp Marketing Automation**: Bulk message scheduling and dispatch
2. **AI-Powered Copywriting**: Copy Agent for intelligent message creation
3. **Campaign Scheduling**: Time-based scheduling with smart intervals
4. **Multi-Instance Management**: Handle multiple WhatsApp business instances
5. **Real-time Analytics**: Campaign metrics and insights
6. **Responsive Design**: Mobile-first with collapsible sidebar
7. **Theming Support**: Dark/light mode capability

## Development Notes

- The application uses **pnpm** as the package manager
- **Hot reload** is enabled via Vite development server
- **Component tagging** is enabled via `@dyad-sh/react-vite-component-tagger` for development assistance
- Path alias `@` resolves to `src/` directory
- All shadcn/ui components and their dependencies are pre-installed