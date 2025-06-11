This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## 📚 Learning Lessons

_This section documents every concept, pattern, and technology used in this project to create a comprehensive learning plan._

### 🔐 Authentication & Security

#### **Lesson 1: JWKS Endpoint URLs & JWT Authentication**

**Overarching Question:** _"How does JWT authentication work across multiple services, and why do we need JWKS endpoints for secure token validation?"_

**Concept:** JSON Web Key Set (JWKS) endpoints provide public keys that allow services to verify JWT tokens without sharing private keys. When Clerk issues a JWT token, Convex can validate it using Clerk's public keys from the JWKS endpoint.

**Key Learning Points:**

- JWT structure (header, payload, signature)
- Public/private key cryptography in authentication
- How JWKS endpoints enable secure cross-service authentication
- Why we use issuer domains vs full JWKS URLs

**Resources:**

- [JWT.io - JSON Web Tokens Introduction](https://jwt.io/introduction/)
- [Clerk Blog: How We Roll - JWT Single Sign-On](https://clerk.com/blog/how-we-roll-jwt-sso)
- [RFC 7517: JSON Web Key (JWK)](https://tools.ietf.org/html/rfc7517)
- [Convex Auth Documentation](https://docs.convex.dev/auth/advanced/custom-jwt)

---

#### **Lesson 2: Clerk + Convex Integration Pattern**

**Overarching Question:** _"How do modern authentication providers integrate with Backend-as-a-Service platforms using JWT tokens?"_

**Concept:** Clerk handles user authentication (sign-in, sign-up, session management) while Convex handles data storage. They communicate through JWT tokens that prove user identity across services.

**Key Learning Points:**

- Separation of concerns: Auth vs Data
- JWT templates for cross-service communication
- Environment variable configuration patterns
- Client-side vs server-side auth validation

**Resources:**

- [Convex + Clerk Integration Guide](https://docs.convex.dev/auth/clerk)
- [Clerk JWT Templates Setup](https://clerk.com/docs/integrations/databases/convex)
- [Clerk Next.js App Router Quickstart](https://clerk.com/docs/quickstarts/nextjs)

---

### 🗄️ Database & Backend Patterns

#### **Lesson 3: Convex Real-time Database Concepts**

**Overarching Question:** _"How do real-time databases differ from traditional databases, and what are the key patterns for queries, mutations, and schema design?"_

**Concept:** Convex provides real-time reactivity, meaning UI automatically updates when data changes. It uses a functional approach with queries (read), mutations (write), and actions (external calls).

**Key Learning Points:**

- Reactive queries vs traditional SQL
- Schema-first development with validators
- Function-based API design (queries, mutations, actions)
- Real-time subscriptions and live data

**Resources:**

- [Convex Schema Design Guide](https://docs.convex.dev/database/schemas)
- [Convex Query and Mutation Patterns](https://docs.convex.dev/functions)
- [Real-time Database Concepts](https://docs.convex.dev/understanding/concepts)

---

### ⚛️ Next.js & React Patterns

#### **Lesson 4: Next.js Server Actions**

**Overarching Question:** _"How do Server Actions bridge the gap between client and server code, and when should you use them vs API routes?"_

**Concept:** Server Actions allow you to write server-side logic directly in your components, eliminating the need for separate API endpoints. They run on the server but can be called directly from client components.

**Key Learning Points:**

- Server Actions vs API Routes
- Progressive enhancement patterns
- Form handling with Server Actions
- Streaming responses for real-time data

**Resources:**

- [Next.js Server Actions Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Next.js App Router Guide](https://nextjs.org/docs/app)

---

#### **Lesson 5: Vercel AI SDK Integration**

**Overarching Question:** _"How does the Vercel AI SDK streamline the process of building AI-powered applications with streaming responses?"_

**Concept:** The AI SDK provides hooks like `useChat` that handle streaming AI responses, message state management, and form handling automatically, connecting frontend to backend AI logic.

**Key Learning Points:**

- Streaming AI responses
- `useChat` hook patterns
- Server Action integration with AI
- Message state management

**Resources:**

- [AI SDK useChat Hook Guide](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot)
- [Server Actions with AI SDK](https://sdk.vercel.ai/docs/ai-sdk-core/generating-text)

---

### 🏗️ Architecture Patterns

#### **Lesson 6: Decoupled Architecture Design**

**Overarching Question:** _"What are the benefits of separating authentication, data storage, AI processing, and frontend concerns into distinct services?"_

**Concept:** This project uses a decoupled architecture where each service has a single responsibility: Clerk (auth), Convex (data), OpenRouter (AI), Next.js (UI + server logic).

**Key Learning Points:**

- Separation of concerns principle
- Service integration patterns
- Environment variable management
- Cross-service communication

**Resources:**

- [Service Separation in Modern Web Apps](https://vercel.com/blog/build-vs-buy)
- [Jamstack Architecture Guide](https://jamstack.org/what-is-jamstack/)

---

### 🎯 Development Practices

#### **Lesson 7: Package Manager Strategy (pnpm)**

**Overarching Question:** _"What are the advantages of pnpm over npm/yarn, and how does it impact project dependency management?"_

**Concept:** pnpm uses hard links and symlinks to save disk space and improve installation speed, while providing better dependency resolution and stricter dependency management.

**Key Learning Points:**

- Package manager differences (npm vs yarn vs pnpm)
- Dependency deduplication strategies
- Lockfile importance and differences
- Monorepo management with pnpm

**Resources:**

- [Why pnpm? Package Manager Comparison](https://pnpm.io/motivation)
- [pnpm vs npm vs yarn Performance Guide](https://pnpm.io/benchmarks)
