# Dispara Lead Tech Stack

This document provides an overview of the key libraries and technologies used in the **Dispara Lead** application.

## 🖥️ Frontend Core

*   **[React](https://react.dev/)**: The core JavaScript library for building the user interface. We use functional components and hooks throughout the application.
*   **[Vite](https://vitejs.dev/)**: The build tool and development server. It provides fast hot module replacement (HMR) and optimized production builds.
*   **[TypeScript](https://www.typescriptlang.org/)**: Adds static typing to JavaScript, improving code quality, developer experience, and maintainability.

## 🎨 Styling & UI Components

*   **[Tailwind CSS](https://tailwindcss.com/)**: A utility-first CSS framework for rapid UI development. It allows us to style components directly in the markup.
*   **[Shadcn UI](https://ui.shadcn.com/)**: A collection of re-usable components built using Radix UI and Tailwind CSS. It provides accessible and customizable components like Dialogs, Dropdowns, and Buttons.
*   **[Lucide React](https://lucide.dev/)**: The icon library used for consistent and clean iconography across the app.

## 🗃️ State Management & Data Fetching

*   **[TanStack Query (React Query)](https://tanstack.com/query/latest)**: Handles server state management (fetching, caching, synchronizing, and updating server state). It drastically reduces the need for boilerplate code for API requests.
*   **[Zustand](https://github.com/pmndrs/zustand)**: A small, fast, and scalable bearbones state-management solution used for client-side global state (e.g., UI preferences, session data).

## 🛤️ Routing & Navigation

*   **[React Router](https://reactrouter.com/)**: Handles client-side routing, enabling navigation between different views (Pages) without reloading the page.

## 📝 Forms & Validation

*   **[React Hook Form](https://react-hook-form.com/)**: Performant, flexible, and extensible forms with easy-to-use validation.
*   **[Zod](https://zod.dev/)**: TypeScript-first schema declaration and validation library. We use it to define schemas for our forms and API responses to ensure type safety.

## ☁️ Backend & Infrastructure Services

*   **[Supabase](https://supabase.com/)**: An open-source Firebase alternative. We use it for:
    *   **PostgreSQL Database**: The primary data store.
    *   **Authentication**: Handling user sign-ups and logins.
    *   **Edge Functions**: Serverless functions for backend logic (Deno).
    *   **Storage**: Storing files and assets.
*   **[Upstash QStash](https://upstash.com/docs/qstash/overall/getstarted)**: A serverless messaging and scheduling solution. It is critical for our "Fan-out" architecture to handle massive campaign message queues reliably.

## 🛠️ Testing

*   **[Vitest](https://vitest.dev/)**: A blazing fast unit test framework powered by Vite. Used for unit and integration testing.
*   **[Playwright](https://playwright.dev/)**: (If referenced in devDependencies) Used for end-to-end testing to ensure the application works correctly across different browsers.