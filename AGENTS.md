# Agent Guidelines for T3 Chat Cloneathon

## Build/Test Commands
- **Package Manager**: Use `pnpm` ONLY (never npm/yarn)
- **Dev**: `pnpm run dev` (Next.js with Turbopack)
- **Build**: `pnpm run build`
- **Lint**: `pnpm run lint`
- **Type Check**: `pnpm run type-check`
- **Test**: `pnpm run test` (Vitest)
- **Single Test**: `pnpm run test -- path/to/test.test.ts`
- **Test UI**: `pnpm run test:ui`

## Code Style & Architecture
- **File Naming**: Components/hooks use kebab-case files (`chat-ui.tsx`, `use-chat-logic.ts`)
- **Component Names**: PascalCase exports (`ChatUI`, `useChatLogic`)
- **Imports**: Use `@/` path alias for src imports
- **Types**: Strict TypeScript, use `Id<"tableName">` for Convex IDs
- **Error Handling**: Use toast notifications via `sonner`

## Architecture Rules
- **Next.js**: App Router with Server Actions (NO API routes)
- **Convex**: Database only (queries/mutations with new function syntax)
- **Clerk**: Authentication only (Google Sign-In)
- **AI SDK**: `useChat` hook connects to Server Actions
- **Server Logic**: All in `app/actions.ts` using `streamText`