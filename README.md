# 🏆 T3 Hackathon Submission

**T3 Hackathon Submission Branch:** https://github.com/RostyslavDzhohola/t3-clone/tree/t3-hackathon-submission
**Try it on:** https://t3-clone-hackathon-26upbi4c0-rostyslav-dzhoholas-projects.vercel.app/

---

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

Register for Convex and get API keys for database.
Set up and start development environment for Convex database.

```bash
npx convex deploy
```

Before running the development server or deploying, make sure to set the `NEXT_PUBLIC_CONVEX_URL` environment variable. You can find this URL in your Convex Dashboard. Add it to your `.env` file to ensure proper connection to your Convex database.

```bash
npx convex dev
```

Register for Clerk and get API keys for authentication. Add the following environment variables to your `.env` file using the values from your Clerk Dashboard:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here
```

**Note:** These environment variables are required for authentication to work properly. You can find these keys in your Clerk Dashboard under API Keys.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Coderabbit Reviews

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/RostyslavDzhohola/t3-clone?utm_source=oss&utm_medium=github&utm_campaign=RostyslavDzhohola%2Ft3-clone&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

## 📚 Learning Lessons ( for personal use )

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

#### **Lesson 4: Convex Database Debugging & Troubleshooting**

**Overarching Question:** _"How do you debug Convex mutations and queries when they fail silently, and what are the common authentication and schema validation issues?"_

**Concept:** Convex mutations can fail due to authentication problems, schema validation errors, or network issues. Proper logging and error handling in both client and server code is essential for debugging real-time database applications.

**Key Learning Points:**

- Adding comprehensive logging to Convex functions
- Understanding Clerk JWT authentication flow with Convex
- Debugging schema validation failures
- Client-side vs server-side error handling
- Using browser console and Convex dashboard for debugging

**Resources:**

- [Convex Error Handling Guide](https://docs.convex.dev/functions/error-handling)
- [Convex Authentication Debugging](https://docs.convex.dev/auth/debugging)
- [Convex Logs and Dashboard Monitoring](https://docs.convex.dev/dashboard/logs)
- [Clerk JWT Token Debugging](https://clerk.com/docs/references/javascript/user/user-methods#debugging-tokens)

---

### ⚛️ Next.js & React Patterns

#### **Lesson 5: Next.js Server Actions**

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

#### **Lesson 6: Vercel AI SDK Integration**

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

#### **Lesson 7: Decoupled Architecture Design**

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

#### **Lesson 8: Package Manager Strategy (pnpm)**

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

---

#### **Lesson 9: Next.js Proxies for Analytics & Adblocker Bypass**

**Overarching Question:** _"How do Next.js rewrites enable proxying third-party scripts through your own domain, and why is this crucial for analytics accuracy?"_

**Concept:** Next.js rewrites allow you to transparently proxy external resources through your own domain, making requests appear to originate from your site. This bypasses adblockers that block third-party analytics domains and improves tracking accuracy.

**Key Learning Points:**

- How Next.js rewrites work under the hood
- The difference between redirects, rewrites, and proxies
- Why adblockers target third-party analytics domains
- Performance implications of proxying external resources
- Security considerations when proxying third-party content

**Resources:**

- [Next.js Rewrites Documentation](https://nextjs.org/docs/app/api-reference/next-config-js/rewrites)
- [DataFast Next.js Proxy Implementation](https://datafa.st/docs/nextjs-proxy)
- [Plausible Analytics Proxy Guide](https://plausible.io/docs/proxy/introduction)
- [Vercel Edge Network and Rewrites](https://vercel.com/docs/edge-network/rewrites)

---

### ⚡ Performance & Optimization

#### **Lesson 10: Main Thread Blocking & React Performance**

**Overarching Question:** _"What causes main thread blocking in React applications during streaming, and how can you optimize performance while maintaining real-time UI updates?"_

**Concept:** Main thread blocking occurs when JavaScript execution saturates the browser's single main thread, preventing user interactions. During AI streaming, rapid React re-renders combined with expensive operations like syntax highlighting can freeze the UI.

**Key Learning Points:**

- JavaScript's single-threaded nature and the event loop
- How React re-renders work and when they become expensive
- The performance cost of syntax highlighting during streaming
- Throttling techniques to batch UI updates
- React optimization patterns (React.memo, useMemo, useCallback)
- Trading off real-time features for UI responsiveness

**What's Actually Happening:**

- JavaScript runs on one main thread that handles both UI updates and user interactions
- Streaming tokens trigger continuous React re-renders (500-1000 per second)
- Each re-render processes markdown and runs expensive Prism syntax highlighting
- Continuous expensive operations saturate the main thread
- User interactions (clicks, scrolls, text selection) get queued but can't be processed
- Browser shows "Page Unresponsive" dialog when main thread is blocked too long

**Solution Strategies:**

- **Throttling:** Batch updates every 150ms instead of on every token
- **Deferred Syntax Highlighting:** Show plain code during streaming, apply Prism when complete
- **React.memo:** Prevent unnecessary re-renders of completed messages
- **Memoized Components:** Avoid recreating component functions on every render

**Resources:**

- [React Re-render Optimization - Medium Article](https://medium.com/@gethylgeorge/how-react-re-renders-work-and-how-to-optimize-them-5c1d8b8b3c8f)
- [React Legacy Docs - Optimizing Performance](https://legacy.reactjs.org/docs/optimizing-performance.html)
- [JavaScript Event Loop - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop)
- [React Profiler - Official Documentation](https://react.dev/reference/react/Profiler)
- [Web Performance Fundamentals - Google](https://developers.google.com/web/fundamentals/performance)

---

#### **Lesson 11: React.memo & Component Memoization Patterns**

**Overarching Question:** _"How do React.memo, useMemo, and custom equality functions prevent unnecessary re-renders in streaming applications, and when should you use each optimization technique?"_

**Concept:** React.memo is a higher-order component that memoizes the result of a component, preventing re-renders when props haven't changed. Combined with useMemo and custom equality functions, it creates a powerful optimization strategy for performance-critical applications.

**Key Learning Points:**

- **React.memo Fundamentals:** How React.memo wraps components to prevent re-renders
- **Custom Equality Functions:** Writing custom comparison logic for complex props
- **useMemo for Expensive Computations:** Memoizing heavy operations like markdown parsing
- **Component Architecture for Performance:** Structuring components to maximize memoization benefits
- **Shallow vs Deep Comparison:** Understanding when default shallow comparison fails
- **Debugging Memoization:** Using React DevTools to verify optimization effectiveness

**Real-World Implementation:**

```typescript
// Memoized component with custom equality check
const MessageBubble = React.memo(
  function MessageBubble({ message, isStreaming }) {
    // Component logic here
  },
  (prev, next) =>
    prev.message.content === next.message.content &&
    prev.isStreaming === next.isStreaming
);

// Memoized expensive computation
const markdown = useMemo(
  () => <ReactMarkdown>{content}</ReactMarkdown>,
  [content, isStreaming]
);
```

**When to Use Each Pattern:**

- **React.memo:** For components that receive the same props frequently
- **useMemo:** For expensive computations (parsing, filtering, sorting)
- **useCallback:** For functions passed as props to memoized components
- **Custom Equality:** When props contain objects or arrays that change reference but not content

**Common Pitfalls:**

- Over-memoizing simple components (performance overhead)
- Forgetting to memoize callback functions passed to memoized components
- Using object/array literals in JSX (breaks memoization)
- Not understanding when React's default shallow comparison fails

**Performance Impact in Our Streaming Chat:**

- **Before:** Every token caused all messages to re-render (exponential performance degradation)
- **After:** Only the actively streaming message re-renders, completed messages stay frozen
- **Result:** UI remains responsive even with 100+ messages and slow AI models

**Resources:**

- [React.memo Official Documentation](https://react.dev/reference/react/memo)
- [useMemo Hook Guide](https://react.dev/reference/react/useMemo)
- [React Performance Optimization Patterns](https://kentcdodds.com/blog/optimize-react-re-renders)
- [When to useMemo and useCallback](https://kentcdodds.com/blog/usememo-and-usecallback)
- [React DevTools Profiler Tutorial](https://react.dev/learn/react-developer-tools#profiler)

---

#### **Lesson 12: React Hydration Errors & Server-Client Mismatches**

**Overarching Question:** _"What causes hydration errors in Next.js applications, and how do you resolve server-client content mismatches while maintaining performance?"_

**Concept:** Hydration errors occur when the server-rendered HTML differs from what React renders on the client. This commonly happens with browser-only APIs like localStorage, timestamps, or dynamic content that varies between server and client environments.

**Key Learning Points:**

- **Hydration Process:** How React "hydrates" server-rendered HTML by attaching event listeners
- **Common Mismatch Causes:** localStorage, Date.now(), Math.random(), browser-only APIs
- **Detection and Debugging:** Using React DevTools and browser console to identify hydration errors
- **Client-Only Rendering Pattern:** Using useEffect to render content only after hydration
- **suppressHydrationWarning Usage:** When and how to safely suppress warnings for unavoidable mismatches
- **Two-Pass Rendering:** Initial server render → client hydration → state-dependent re-render

**Common Hydration Error Scenarios:**

```typescript
// ❌ Causes hydration error - localStorage unavailable on server
const count = localStorage.getItem('count') || '0';

// ✅ Solution - client-only rendering
const [count, setCount] = useState('0');
useEffect(() => {
  setCount(localStorage.getItem('count') || '0');
}, []);

// ❌ Causes hydration error - timestamp differs
<span>{new Date().toLocaleDateString()}</span>

// ✅ Solution - suppress hydration warning for timestamps
<span suppressHydrationWarning>{new Date().toLocaleDateString()}</span>
```

**Solution Patterns:**

- **Conditional Rendering:** Render different content based on client-side state
- **Loading States:** Show placeholder content until client-side data loads
- **Dynamic Imports:** Use Next.js dynamic imports with `ssr: false` for client-only components
- **Environment Detection:** Check `typeof window !== 'undefined'` carefully
- **suppressHydrationWarning:** Use for unavoidable mismatches (timestamps, browser extensions)
- **Browser Extension Handling:** Add `suppressHydrationWarning` to form elements targeted by extensions

**Performance Considerations:**

- Client-only rendering prevents SSR benefits (SEO, initial paint)
- Two-pass rendering can cause layout shift
- Balance hydration safety with performance and user experience

**Our Specific Cases:**

**Case 1 - localStorage Mismatch:**
The `RemainingLimitBanner` showed different message counts because:

- Server: Used default limit (10 messages)
- Client: Read actual count from localStorage (0 messages)
- Solution: Render banner only on client after hydration

**Case 2 - Browser Extension Attributes:**
ShadCN Input/Button components had extension-injected attributes:

- Extensions: Grammarly (`data-gr-*`), Dashlane (`data-dashlane-*`)
- Issue: Extensions modify DOM before React hydration completes
- Solution: Add `suppressHydrationWarning` to form elements

**Resources:**

- [React Hydration Documentation](https://react.dev/reference/react-dom/client/hydrateRoot)
- [Next.js Hydration Error Guide](https://nextjs.org/docs/messages/react-hydration-error)
- [Handling Client-Server Differences](https://nextjs.org/docs/app/building-your-application/rendering/client-components#hydration-mismatch)
- [React suppressHydrationWarning](https://react.dev/reference/react-dom/components/common#suppressing-unavoidable-hydration-mismatch-errors)
