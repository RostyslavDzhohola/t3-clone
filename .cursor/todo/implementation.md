# T3 Chat Cloneathon: TODO.md

This file outlines the step-by-step plan to build and win the T3 Chat Cloneathon. The architecture is designed for a modern, full-stack Next.js application.

**Tech Stack:**

- **Frontend:** Next.js (App Router) + Tailwind CSS
- **Backend Logic:** Next.js Server Actions
- **Database:** Convex
- **Authentication:** Clerk
- **AI Integration:** Vercel AI SDK + OpenRouter

---

## Phase 1: Foundation & Setup (Day 1)

_Goal: Connect all services and deploy a live, authenticated skeleton app._

### Project & Auth Setup

- ✅ Initialize a new Next.js project using the App Router: `npx create-next-app@latest`.
- ✅ Set up a new GitHub repository and push the initial code.
- ✅ Add a `LICENSE` file (e.g., `MIT`).
- ✅ Create a Clerk account and a new application. Configure it for **Google sign-in only**.
- ✅ Install Clerk's Next.js SDK: `npm install @clerk/nextjs`.
- ✅ Wrap `app/layout.tsx` with the `<ClerkProvider>`.
- ✅ Add Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) to `.env.local`.

### Convex Database Integration

- ✅ Initialize Convex in your project: `npx convex init`.
- ✅ **Crucial Step:** In the Convex dashboard (Settings -> Auth), configure Clerk as a JWT provider using the **JWKS endpoint URL** from your Clerk dashboard.
- ✅ Define the database schema in `convex/schema.ts`. Create a `messages` table with fields: `userId: string`, `role: "user" | "assistant"`, and `body: string`.

### Vercel Deployment

- ✅ Connect your GitHub repository to Vercel.
- ✅ Add all environment variables (Clerk, Convex, OpenRouter) to the Vercel project settings.
- ✅ Deploy the initial skeleton app to get a live URL.

---

## Phase 2: Building the Core Chat Experience (Day 2-3)

_Goal: Implement the main chat functionality using Next.js Server Actions._

### Create the Server Action

- ✅ Install the Vercel AI SDK and OpenAI SDK: `npm install ai openai`.
- ✅ Create backend logic: `app/api/chat/route.ts` (chose API route instead of Server Action).
- ✅ Create an `async` handler inside the API route.
- ✅ Use the Vercel AI SDK's `streamText` function inside the action.
- ✅ Configure `streamText` with OpenRouter provider and `OPENROUTER_API_KEY`.

### Frontend Chat UI (`useChat`)

- ✅ In your main chat component, use the API route instead of Server Action.
- ✅ Use the `useChat` hook from `ai/react`, pointing to `/api/chat`: `useChat({ api: "/api/chat" })`.
- ✅ Build the UI to map over the `messages` array and a form bound to the `useChat` helpers.

### Persisting Messages to Convex

- ✅ Create a Convex mutation in `convex/messages.ts` named `saveMessage`. It should take `role` and `body` and save them to the database.
- ✅ When the user submits the form, call `saveMessage` to save the user's prompt.
- ✅ Use the `onFinish` callback from `useChat` to call `saveMessage` again to save the AI's complete response.
- ✅ Load existing messages on component mount to restore chat history.

---

## Phase 3: The "Vibe Check" - Bonus Features (Day 4-6)

_Goal: Add high-impact features to impress the judges._

### High-Priority Bonus Features

- [ ] **Resumable Streams:** (This is handled automatically by the tech stack).
- [ ] **Bring Your Own Key (BYOK):**
  - [ ] Create a settings modal to input and save a user's OpenRouter key to `localStorage`.
  - [ ] Pass this key from the client to your Server Action.
  - [ ] Modify the Server Action to use the user's key if it's provided.
- [ ] **Syntax Highlighting:**
  - [ ] Install `react-syntax-highlighter`.
  - [ ] Create a component to wrap message content and apply highlighting to code blocks.

### Medium-Priority Bonus Features

- [ ] **Chat Sharing:**
  - [ ] Add a "Share" button that calls a Convex mutation to set a chat's `isPublic` flag to `true`.
  - [ ] Create a dynamic page `app/share/[chatId]/page.tsx` to fetch and display the public chat.
- [ ] **Model Selector:**
  - [ ] Add a `<select>` dropdown to the UI.
  - [ ] Pass the selected model name to your Server Action to be used in the OpenRouter API call.

---

## Phase 4: Final Polish & Submission (Day 7)

_Goal: Ensure quality, document the project, and submit._

### Final Polish & Bug Squashing

- [ ] Test every feature, especially the sign-in flow and BYOK.
- [ ] Check responsiveness on desktop and mobile browsers.
- [ ] Clean up code and add comments where necessary.

### Documentation & Presentation

- [ ] **Perfect your `README.md`:**
  - [ ] Include the app name and a link to the live Vercel deployment.
  - [ ] List all implemented features, highlighting the bonus ones.
  - [ ] Provide clear setup instructions for local development.
- [ ] Record a quick, energetic demo video (e.g., using Loom).

### Submission

- [ ] Double-check all competition rules.
- [ ] Submit the project.
- [ ] Post your work on Twitter to share your progress.
