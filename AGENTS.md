# Vike Framework Documentation - LLM Header File

> **CRITICAL INSTRUCTION FOR AI AGENTS:**
> You MUST read this ENTIRE header file from start to finish. Some agents only read the top portion - this is incorrect behavior.
> 
> **IMPORTANT:** These summaries are NOT actual documentation - they are connection points only.
> You MUST fetch the actual documentation pages when you identify matches based on user prompts.
> You MUST open relevant pages based on keywords, concepts, and trigger scenarios listed below.

---

## [meta (Custom Settings)] - https://vike.dev/meta

**When to fetch**: User asks about creating custom settings or hooks, extending Vike's configuration system, modifying built-in hook behavior, defining custom page metadata, framework-level customization, environment-specific hook configuration (server/client/config), cumulative settings, TypeScript config interface extension, or building framework abstractions on top of Vike

**Key concepts**: Custom settings creation, custom hooks definition, environment configuration (server/client/config), cumulative settings, effect functions, config-time logic, TypeScript Vike.Config interface, modifying existing hooks, framework extension patterns

**Relevant for**: custom settings, custom hooks, meta configuration, environment config, cumulative settings, effect functions, Layout component, SQL configuration, TypeScript config, Vike.Config, framework customization, hook modification, config-time logic, setting creation, framework extension, meta programming, config system extension, advanced customization

## [Hooks Overview] - https://vike.dev/hooks

**When to fetch**: User needs overview of all available hooks, understanding hook execution order/lifecycle, questions about which hook to use for specific scenarios, hook environment (server/client/both), understanding hook precedence, custom hook creation, OODA loop concepts, or architectural understanding of Vike's rendering system

**Key concepts**: Complete hook list, lifecycle and execution order, built-in vs custom hooks, server/client/both execution environments, hook precedence and categories, cumulative vs non-cumulative hooks, configurable environments, first render vs client navigation flows

**Relevant for**: hooks overview, lifecycle, execution order, hook list, server hooks, client hooks, hook flow, rendering lifecycle, OODA loop, first render, client navigation, hook precedence, custom hooks, meta configuration, architectural patterns, rendering pipeline

## [config (Configuration System)] - https://vike.dev/config

**When to fetch**: User asks about Vike configuration structure, + files system, config inheritance, pointer imports, global vs page-specific configs, domain-driven file organization, or understanding how configuration cascades through the application

**Key concepts**: + files for configuration, +config.js as central config, config inheritance system, pointer imports for value references, + files corresponding to settings/hooks, global vs page configs, domain-driven structure support, config code never in runtime

**Relevant for**: config files, +config.js, configuration, + files, config inheritance, pointer imports, global config, page config, file structure, configuration system, settings definition, config organization, domain-driven config, config hierarchy, extends option, framework setup, config loading, config environment

## [onBeforeRender Hook] - https://vike.dev/onBeforeRender

**When to fetch**: User needs advanced data fetching integrations (GraphQL/Apollo/Relay), setting multiple pageContext values simultaneously, orchestrating custom hooks, deep integration with data fetching tools, expert-level control, or alternatives to simpler data() hook

**Key concepts**: Advanced lower-level hook, deep integration with data fetching tools, setting multiple pageContext values, orchestrating custom hooks/settings with meta, server-side by default (configurable), more control but requires manual work vs data()

**Relevant for**: advanced data fetching, GraphQL integration, Apollo, Relay, custom pageContext, multiple values, meta configuration, orchestration, lower-level, expert mode, custom hooks, deep integration, data fetching tools, Tanstack Query, Telefunc, tRPC, custom orchestration

## [modifyUrl Utility] - https://vike.dev/modifyUrl

**When to fetch**: User asks about URL manipulation, i18n/locale extraction from URLs, programmatic URL component modification (pathname/protocol/hostname/port), URL transformation, or URL normalization tasks

**Key concepts**: URL manipulation utility, extracting/modifying URL components, locale extraction from URLs, URL transformation and rewriting, programmatic URL parsing

**Relevant for**: modifyUrl, URL manipulation, i18n, internationalization, locale, pathname modification, URL parsing, protocol change, hostname, port, URL transformation, language routing, URL rewriting, URL components

## [injectFilter (Asset Injection)] - https://vike.dev/injectFilter

**When to fetch**: User needs custom asset injection strategy, control over preload/asset tag injection, asset type filtering (images/scripts/fonts/styles), HTML_BEGIN vs HTML_END injection points, or performance tuning for asset delivery

**Key concepts**: Customizing asset injection strategy, control over preload/asset tag injection, asset type filtering, HTML_BEGIN vs HTML_END injection points, production-only feature, dependency graph control

**Relevant for**: injectFilter, asset injection, preload strategy, asset optimization, HTML_BEGIN, HTML_END, asset types, script loading, font preloading, image preloading, inject control, performance optimization, dependency graph, asset delivery tuning

## [passToClient] - https://vike.dev/passToClient

**When to fetch**: User asks about client-side data availability, pageContext serialization, server-to-client data transfer, hydration-related questions, custom property passing, security concerns about data exposure, or SSR data synchronization

**Key concepts**: Controls which pageContext properties sent to client, required for server-only properties to be available client-side, nested property paths support, serialization using @brillout/json-serializer, cumulative setting, user classes lost during serialization

**Relevant for**: passToClient, pageContext, client-side data, server-side data, serialization, hydration, data transfer, nested properties, security, data exposure, SSR synchronization, Client Routing, Server Routing, JSON serialization, property passing, state management

## [escapeInject] - https://vike.dev/escapeInject

**When to fetch**: User asks about HTML sanitization, XSS prevention, server-side HTML generation, onRenderHtml implementation, safe string interpolation, or security in HTML rendering

**Key concepts**: HTML sanitization for XSS prevention, string template tag for safe HTML generation, dangerouslySkipEscape for pre-sanitized HTML, HTML fragments assembly, security in server-side rendering

**Relevant for**: escapeInject, XSS prevention, HTML sanitization, cross-site scripting, dangerouslySkipEscape, HTML escaping, security, HTML fragments, onRenderHtml, safe HTML generation, template tag, server-side HTML, security best practices

## [Content Security Policy (csp)] - https://vike.dev/csp

**When to fetch**: User asks about CSP configuration, security compliance (PCI DSS), script security, inline script authorization, nonce generation, security headers, or production security hardening

**Key concepts**: Content Security Policy nonce configuration, automatic nonce generation for script tags, PCI DSS compliance support, cryptographically secure random strings, custom nonce generation, default CSP header creation, pageContext.cspNonce, beta feature

**Relevant for**: CSP, Content Security Policy, security nonce, cspNonce, PCI DSS, compliance, script security, inline scripts, security headers, nonce generation, crypto module, random string generation, script-src, unsafe-inline, security compliance, header security

## [headersResponse (HTTP Headers)] - https://vike.dev/headersResponse

**When to fetch**: User needs HTTP response header customization, security header configuration, CORS setup, cache control settings, CSP integration, or custom API response headers

**Key concepts**: Configure HTTP response headers, CSP integration, custom header setting per page, headersOriginal for request headers, used with renderPage() for server integration, response header customization

**Relevant for**: HTTP headers, headersResponse, response headers, request headers, CSP, Content Security Policy, security headers, CORS, cache control, custom headers, server integration, renderPage, headersOriginal, HTTP response, header configuration

## [HTML Streaming] - https://vike.dev/stream

**When to fetch**: User asks about HTML streaming, progressive rendering, React Suspense streaming, performance optimization through streaming, SSR streaming setup, or stream-based HTML delivery

**Key concepts**: HTML streaming (SSR streaming), progressive rendering, stream-based HTML delivery, React Suspense streaming, performance optimization, first-class streaming support, first paint optimization

**Relevant for**: stream, HTML streaming, SSR streaming, progressive rendering, React Suspense, streaming SSR, performance optimization, stream response, HTTP streaming, onRenderHtml streaming, +stream setting, first paint optimization, progressive HTML

## [clientRouting] - https://vike.dev/clientRouting

**When to fetch**: User asks about SPA navigation, client-side routing setup, page transition requirements, link interception, smooth navigation experiences, state management initialization, or progressive enhancement

**Key concepts**: Enable Client-Side Routing (SPA-like navigation), alternative to Server Routing, requires onRenderClient with isHydration check, automatic \u003ca\u003e link interception, page transition hooks, state initialization strategies, navigate() for programmatic navigation, prefetching integration

**Relevant for**: client routing, clientRouting, SPA navigation, client-side navigation, page transitions, link interception, isHydration, navigate(), onRenderClient, Server Routing vs Client Routing, page navigation, smooth scrolling, state initialization, prefetching, hydration, DOM manipulation

## [guard Hook] - https://vike.dev/guard

**When to fetch**: User asks about authentication, authorization, page protection, access control, route guards, admin page protection, permission checks, user roles, or pre-data-fetch validation

**Key concepts**: Page protection from unauthorized/unexpected access, executes first after routing before data(), asynchronous support, always used with throw render() or throw redirect(), applies to single/multiple pages via inheritance, runs in same environment as data()

**Relevant for**: authentication, authorization, access control, page protection, route guards, admin pages, permission checks, user roles, throw render, throw redirect, security, guard pages, prevent access, unauthorized, login flow, protect routes

## [throw render()] - https://vike.dev/render

**When to fetch**: User asks about error handling, showing error pages, URL rewriting, internal redirects, rendering different page without changing URL, authentication/authorization flows with error display, or handling status codes (401/403/404/500)

**Key concepts**: Programmatic page rendering/redirection without URL change (URL rewriting), error page rendering with status codes, aborting page execution with custom error handling, preserves URL while rendering different content

**Relevant for**: throw render, abort, error page, URL rewrite, status codes, authentication flow, authorization, error handling, abortReason, abortStatusCode, guard hook, data hook, 401 unauthorized, 403 forbidden, 404 not found, internal server error, service unavailable, page rendering control

## [throw redirect()] - https://vike.dev/redirect

**When to fetch**: User asks about redirects, authentication flow redirects, error handling with redirects, login/logout flows, unauthorized access redirects, permanent (301) vs temporary (302) redirects, or form validation redirects

**Key concepts**: Abort page render and redirect user, temporary (302) by default with permanent (301) option, use in hooks not UI components, authentication/authorization redirects, error handling redirects, paired with guard() and data(), alternative to navigate() for post-render

**Relevant for**: redirect, abort rendering, authentication redirect, login redirect, 302, 301, permanent redirect, temporary redirect, throw redirect, navigation, URL change, page redirect, authorization redirect, error redirect

## [photon (Deployment Integration)] - https://vike.dev/photon

**When to fetch**: User asks about Vercel deployment, cloud platform integration, ISR (Incremental Static Regeneration), beta deployment features, vike-server alternatives, or hybrid static/SSR deployment

**Key concepts**: Vike-Photon Vercel integration package, supports static websites (SSG) and SSR, beta feature with breaking changes, built-in server with basic SSR features, ISR support, replaces vike-server for Vercel

**Relevant for**: Vercel, deployment, photon, vike-photon, cloud hosting, SSR deployment, static hosting, ISR, incremental static regeneration, server integration, production deployment, vike-server migration, beta features, Vercel CLI, Vercel Git integration, hybrid deployment

## [Settings Overview] - https://vike.dev/settings

**When to fetch**: User needs overview of all Vike configuration options, looking for specific setting name, configuration discovery, settings reference, complete feature list, or comparing different settings

**Key concepts**: Comprehensive overview of all built-in Vike settings, categorized into Basics/HTML shell/Advanced, settings vs hooks distinction, page-level and global configuration, extension settings

**Relevant for**: settings, configuration, Vike config, built-in settings, Page, Layout, Wrapper, route, prerender, ssr, stream, redirects, keepScrollPosition, prefetchStaticAssets, title, description, image, viewport, Head, htmlAttributes, bodyAttributes, passToClient, clientRouting, meta, configuration reference

## [Routing Precedence] - https://vike.dev/routing-precedence

**When to fetch**: User asks about route conflict resolution, multiple routes matching same URL, route prioritization, routing debugging, or precedence in Route Functions

**Key concepts**: Order for resolving route conflicts, precedence hierarchy (Route Function high → Route Function low → Filesystem → Route String static → Route Function no precedence → Route String parameterized → Route Function negative), static routes prioritized over parameterized

**Relevant for**: routing precedence, route conflicts, route priority, precedence order, route resolution, precedence number, route matching order, static vs parameterized, catch-all precedence, conflict resolution, route ordering, multiple matches, routing rules

## [Route Functions] - https://vike.dev/route-function

**When to fetch**: User needs complex routing requirements, conditional routing logic, advanced route matching, dynamic route determination, custom routing algorithms, or guard integration in routes

**Key concepts**: Full programmatic routing flexibility, function returns match result or false, access to pageContext for routing logic, return routeParams and precedence, RegExp or routing library support, async and sync variants, guard logic integration

**Relevant for**: Route Function, programmatic routing, routing logic, route function, route matching, conditional routing, RegExp routing, routing libraries, precedence number, routeParams, async routing, sync routing, RouteSync, RouteAsync, custom routing, advanced routing, route guards

## [onBeforePrerenderStart Hook] - https://vike.dev/onBeforePrerenderStart

**When to fetch**: User asks about static site generation (SSG), pre-rendering configuration, dynamic route pre-rendering, build optimization, parameterized route URLs, or bulk data fetching at build time

**Key concepts**: Pre-rendering (SSG) specific hook, build-time execution only, provide URLs for parameterized routes, bulk data fetching for faster builds, return pageContext to skip data() calls, never executes in development

**Relevant for**: pre-rendering, SSG, static site generation, build time, parameterized routes, dynamic routes, bulk data, build optimization, movie/@id patterns, static generation, vite build, URL generation

## [onPrerenderStart Hook] - https://vike.dev/onPrerenderStart

**When to fetch**: User asks about pre-render initialization, build process setup, global pre-rendering configuration, or SSG startup hooks

**Key concepts**: Global hook when pre-rendering starts, build-time only, server-side execution, pre-rendering process initialization

**Relevant for**: pre-render start, build initialization, SSG setup, static generation start, build process

## [data Hook] - https://vike.dev/data

**When to fetch**: User asks about fetching page data, initial data, server-side data fetching, database queries (ORM/SQL) from pages, data loading before page render, pre-rendering data needs, or pageContext.data access

**Key concepts**: Server-side data fetching hook before page rendering, executes on server-side by default (configurable), direct ORM/SQL database access support, data serialization for client transfer, error handling with throw render()/throw redirect()

**Relevant for**: data fetching, initial data, page data, server-side rendering, ORM, SQL queries, database access, pageContext.data, useData, data serialization, async data loading, fetch on server, pre-rendering data, SSG data, route parameters, error handling, environment configuration

## [onData Hook] - https://vike.dev/onData

**When to fetch**: User asks about reacting to data availability, store population from fetched data, client-side data processing after fetch, side effects when data arrives, or state management initialization with data

**Key concepts**: Called immediately when pageContext.data becomes available, executes on both server and client sides, cumulative (multiple hooks definable), typically used for side effects with data, called after +data on server

**Relevant for**: data callback, data listener, store population, state management, client-side data processing, pageContext.data, reactive data, data side effects, cumulative hooks, data hydration, global store, state initialization

## [onError Hook] - https://vike.dev/onError

**When to fetch**: User asks about error handling setup, custom error pages, error tracking integration, 404/500 page customization, or error logging needs

**Key concepts**: Error handling hook for page rendering errors, automatic error page rendering, 404 and 500 error handling, integration with error tracking services, custom error page logic

**Relevant for**: error handling, error page, 404, 500, error tracking, Sentry, Bugsnag, error logging, exception handling, custom errors, error boundary

## [onHydrationEnd Hook] - https://vike.dev/onHydrationEnd

**When to fetch**: User asks about post-hydration initialization, client-side setup after SSR, one-time browser initialization, service worker registration, analytics initialization, or page interactive callbacks

**Key concepts**: Called after page hydration completes, client-side only (requires Client Routing), initialization after hydration, first page load only (not subsequent navigations), useful for one-time client setup

**Relevant for**: hydration, client hydration, SSR hydration, page interactive, initialization, client setup, browser initialization, service worker, first load, hydration complete, client routing, interactive state

## [onPageTransitionStart Hook] - https://vike.dev/onPageTransitionStart

**When to fetch**: User asks about page transition animations, loading indicators during navigation, navigation lifecycle hooks, custom transition effects, pre-navigation setup, or backward/forward navigation detection

**Key concepts**: Called at navigation start before new page renders, client-side only (requires Client Routing), page transition animations, access to isBackwardNavigation, paired with onPageTransitionEnd()

**Relevant for**: page transitions, navigation, animations, client-side routing, loading states, transition effects, page navigation, backward navigation, forward navigation, route changes, SPA navigation

## [onCreatePageContext Hook] - https://vike.dev/onCreatePageContext

**When to fetch**: User asks about custom pageContext initialization, adding custom properties to pageContext, per-page instance creation, derived pageContext values, or store initialization per page

**Key concepts**: Called when pageContext object is created, runs on both server and client, called right after routing, add custom pageContext properties, initialize instances per page, define derived properties

**Relevant for**: pageContext initialization, custom properties, page lifecycle, context creation, derived values, instance creation, per-page setup

## [onCreateGlobalContext Hook] - https://vike.dev/onCreateGlobalContext

**When to fetch**: User asks about global context initialization, app-wide state setup, server startup initialization, global configuration, or cross-page shared state

**Key concepts**: Called when globalContext object is created, server-side at server start, client-side when user opens website, global app state initialization, lives until process/tab closes

**Relevant for**: global context, app initialization, global state, shared context, server startup, application lifecycle, global configuration

## [hooksTimeout] - https://vike.dev/hooksTimeout

**When to fetch**: User encounters hook timeout errors, slow data fetching issues, performance debugging, long-running hook operations, memory leak prevention, or custom timeout requirements

**Key concepts**: Timeout configuration for Vike hooks, default 30-second timeout with 4-second warning, separate warning and error timeout settings, per-hook configuration possible, prevents memory leaks from long-running requests

**Relevant for**: hooks timeout, hooksTimeout, hook execution time, timeout configuration, warning timeout, error timeout, data fetching timeout, long-running hooks, memory leaks, performance monitoring, hook errors, execution limits

## [keepScrollPosition] - https://vike.dev/keepScrollPosition

**When to fetch**: User asks about scroll preservation during navigation, nested layout implementation (tabs/sidebars), multi-page form UX, product detail page navigation, tab navigation without scroll reset, or custom scroll group requirements

**Key concepts**: Controls scroll behavior during page navigation, used for nested layouts (tabs/sub-navigation), supports scroll groups for arbitrary page collections, default page scrolls to top on navigation, can be set per-page or programmatically

**Relevant for**: scroll position, keepScrollPosition, scroll preservation, nested layouts, tabs navigation, scroll groups, client routing, page navigation, UX optimization, scroll behavior, route parameters, programmatic scroll control

## [prefetchStaticAssets] - https://vike.dev/prefetchStaticAssets

**When to fetch**: User asks about performance optimization, prefetching and preloading strategies, client routing performance, mobile vs desktop optimization, link hover interactions, viewport-based prefetching, or progressive enhancement

**Key concepts**: Link prefetching configuration for performance, two modes ('viewport' when link enters viewport and 'hover'), Client Routing requirement, only prefetches static assets not pageContext, disabled in development, per-link override with data attributes

**Relevant for**: prefetching, static assets, performance optimization, link prefetching, viewport prefetching, hover prefetching, client routing, preloading, asset loading, mobile optimization, desktop optimization, data-prefetch-static-assets, progressive loading, page speed

## [redirects Setting] - https://vike.dev/redirects

**When to fetch**: User needs URL redirection, permanent redirect (301) setup, link aliasing, migration of old URLs to new structure, external link shortening, third-party website link management, or pattern-based URL rewrites

**Key concepts**: Permanent HTTP 301 redirections configuration, supports internal/external/parameterized/glob patterns, alias creation for links (mailto/magnet/external URLs), server-side only, pre-rendering integration for static hosts, pattern matching with @ parameters and * wildcards

**Relevant for**: redirects, HTTP 301, permanent redirections, URL rewriting, aliases, parameterized redirects, glob patterns, external redirects, internal redirects, mailto links, magnet links, URL migration, deprecated URLs, link shortening, pattern matching

## [prerender Setting] - https://vike.dev/prerender

**When to fetch**: User asks about static site generation (SSG), pre-rendering configuration, build-time rendering, performance optimization for pre-rendering, partial pre-rendering scenarios, or build process customization

**Key concepts**: Controls pre-rendering (SSG) settings, supports partial pre-rendering (some pages pre-rendered others SSR), configurable parallelization for build performance, redirects generation for pre-rendered sites, directory structure settings (noExtraDir), disableAutoRun to manually trigger pre-rendering

**Relevant for**: pre-rendering, SSG, static site generation, build-time rendering, partial pre-rendering, prerender settings, noExtraDir, parallel builds, redirects, disableAutoRun, keepDistServer, pre-rendered pages, static HTML, build optimization, CPU parallelization, memory management

## [pageContext] - https://vike.dev/pageContext

**When to fetch**: User asks about accessing page information in components or hooks, understanding what data is available during rendering, troubleshooting page state or navigation issues, implementing custom page properties, accessing URL parameters/route params/request headers, or managing page transitions

**Key concepts**: Central object holding all information about current page, contains built-in properties (urlParsed/routeParams/Page/data/headers/config/runtime), supports custom properties via TypeScript interface extension, different lifecycle on server vs client, immutable after rendering

**Relevant for**: pageContext object, page state, server-side rendering context, client-side context, page lifecycle, custom properties, TypeScript types, urlParsed, routeParams, page data access, request context, navigation state, isClientSide, isHydration, page metadata, rendering context, HTTP headers

## [globalContext] - https://vike.dev/globalContext

**When to fetch**: User asks about application-wide state management, shared data across all pages, global configuration or settings, server vs client lifecycle differences, edge deployment considerations, or storing authentication state globally

**Key concepts**: Object for storing global information across entire application, completely different lifecycle between client and server, server created when server starts (lives until shutdown), client created when user visits site (lives until close), accessible via pageContext.globalContext or getGlobalContext()

**Relevant for**: global state, application context, server lifecycle, client lifecycle, global data storage, edge computing, worker processes, global configuration, shared state, application initialization, getGlobalContext, getGlobalContextAsync, getGlobalContextSync, onCreateGlobalContext

## [useConfig Hook] - https://vike.dev/useConfig

**When to fetch**: User asks about dynamic head tags from components, SEO meta tags based on data, component-level configuration, dynamic title/description, og:image social media tags, or data-driven metadata

**Key concepts**: Universal hook (works in components AND Vike hooks), set configurations inside UI components, dynamic \u003chead\u003e tag management, must call before await in data(), paired with \u003cConfig\u003e and \u003cHead\u003e components, React Query/Apollo integration pattern

**Relevant for**: dynamic config, head tags, meta tags, SEO, title, description, og:image, social sharing, universal hook, Config component, Head component, React Query integration

## [useData Hook] - https://vike.dev/useData

**When to fetch**: User asks about accessing fetched data in components, component-level data access, type-safe data access, UI framework integration, or data consumption in views

**Key concepts**: Component hook for accessing data() return value, provided by vike-react/vike-vue/vike-solid, works inside UI components, TypeScript type inference support, alternative to pageContext.data, cannot be used in Vike hooks

**Relevant for**: component data access, useData hook, UI component, React hook, Vue composable, Solid hook, component data, type inference, data consumption, vike-react, vike-vue, vike-solid

## [usePageContext Hook] - https://vike.dev/usePageContext

**When to fetch**: User asks about accessing pageContext in components, URL information in components, route params in UI, custom pageContext properties access, or component-level context access

**Key concepts**: Access pageContext in any UI component, provided by vike-react/vike-vue/vike-solid, React Context / Vue provide/inject implementation, custom implementation for non-standard setups

**Relevant for**: pageContext access, component context, React Context, Vue provide/inject, route information, URL access, component hook, context provider

## [getGlobalContext Utility] - https://vike.dev/getGlobalContext

**When to fetch**: User asks about global context access outside hooks, assets manifest needs, Vite config access at runtime, server initialization, or cross-cutting concerns

**Key concepts**: Access globalContext anywhere, server/client utility, assets manifest access, Vite config subset, can be called anytime independent of rendering, server startup access, getGlobalContextAsync alternative

**Relevant for**: global context access, assets manifest, Vite config, runtime access, server startup, global state, getGlobalContextAsync, isClientSide

## [navigate Function] - https://vike.dev/navigate

**When to fetch**: User asks about programmatic page navigation, form submission success redirects, conditional navigation based on logic, navigation after async operations, keepScrollPosition or overwriteLastHistoryEntry, or client routing behavior

**Key concepts**: Programmatic client-side navigation, navigation without requiring link clicks, options for scroll position and history management, form submission redirects, client router integration

**Relevant for**: navigate, programmatic navigation, client routing, form redirect, page switching, keepScrollPosition, overwriteLastHistoryEntry, history API, browser history, navigation promise, router, client-side routing, window.history

## [reload Function] - https://vike.dev/reload

**When to fetch**: User needs to reload current page programmatically, authentication cookie updates requiring refresh, client-side page refresh needs, faster reload than full browser refresh, or post-logout/post-login page updates

**Key concepts**: Page reloading using Vike's client router, faster alternative to window.location.reload, client routing requirement, refresh after authentication changes

**Relevant for**: reload, page refresh, client router, authentication refresh, cookie update, re-render page, logout, login flow, page reload, window.location.reload alternative

## [prefetch Function] - https://vike.dev/prefetch

**When to fetch**: User asks about performance optimization, predictive page loading, speed up navigation between pages, form submission workflows with known next page, or preloading strategies

**Key concepts**: Programmatic page prefetching, performance optimization through predictive loading, static asset preloading, client routing requirement

**Relevant for**: prefetch, preload, performance optimization, predictive loading, static assets, page speed, navigation optimization, client routing, asset prefetching, prefetchStaticAssets

## [clientOnly Function] - https://vike.dev/clientOnly

**When to fetch**: User needs components that crash or don't work with SSR, libraries that use browser-only APIs (like window), performance optimization through deferred loading, heavy interactive components (maps/charts), or progressive loading strategies

**Key concepts**: Load and render components only on client-side, defer loading of heavy components for performance, handle library components that don't support SSR, dynamic imports with code-splitting, fallback content while loading

**Relevant for**: clientOnly, client-side only, SSR incompatible, browser-only, window object, dynamic import, code-splitting, lazy loading, performance optimization, heavy components, fallback loading, vike-react, vike-vue, vike-solid, library integration

## [renderPage Function] - https://vike.dev/renderPage

**When to fetch**: User asks about custom server integration, manual SSR setup, Express/Hono/Fastify or other server framework integration, production server configuration, or server middleware implementation

**Key concepts**: Server-side rendering function, embedding Vike into any server framework, manual server integration, production server middleware, SSR implementation

**Relevant for**: renderPage, server integration, SSR, server-side rendering, Express.js, middleware, production server, manual integration, HTTP response, server framework, embedding Vike, pageContext server, Node.js server, Cloudflare Workers, Vercel, AWS deployment

## [Page Component] - https://vike.dev/Page

**When to fetch**: User asks about defining pages in Vike, setting up new pages or components, configuring page rendering behavior, integrating custom UI frameworks, or understanding relationship between Page and rendering hooks

**Key concepts**: Core setting that defines page's root component, value exported from +Page.js/jsx/vue files, Vike doesn't use value itself just makes it available at pageContext.Page, rendered by onRenderHtml() and onRenderClient() hooks, can be any type/value

**Relevant for**: Page component, +Page.js, root component, page definition, UI component, React component, Vue component, Solid component, JSX component, page rendering, component export, pageContext.Page, onRenderHtml, onRenderClient, UI framework integration

## [Layout Component] - https://vike.dev/Layout

**When to fetch**: User asks about designing page structure and appearance, creating consistent layouts across pages, implementing nested layouts, setting up different layouts for different sections, building navigation and header/footer structures, or same-page navigation patterns

**Key concepts**: Component that wraps the Page component, defines visual structure/appearance of pages, multiple layouts for different page groups, cumulative setting (layouts nest within each other), global layouts apply to all pages via inheritance, nested layouts for hierarchical structures

**Relevant for**: Layout component, +Layout.js, page layout, nested layouts, layout hierarchy, cumulative layouts, global layout, page wrapper, UI structure, visual design, layout inheritance, config inheritance, multiple layouts, layout groups, navigation structure, header footer, same-page navigation, tabs

## [Wrapper Component] - https://vike.dev/Wrapper

**When to fetch**: User asks about integrating third-party tools or libraries, setting up state management (Redux/Zustand), configuring data fetching tools (Apollo/TanStack Query), adding context providers, or tool initialization requirements

**Key concepts**: Component that wraps both Page and all Layout components, primarily for integrating tools (data fetching/state management), multiple wrappers supported (nest within each other), wraps everything (Wrapper \u003e Layout \u003e Page), preferred over Layout for tool integration

**Relevant for**: Wrapper component, +Wrapper.js, component wrapper, tool integration, Provider component, state management integration, data fetching integration, context providers, Redux integration, Apollo integration, TanStack Query, tool setup, component hierarchy

## [Head Setting] - https://vike.dev/Head

**When to fetch**: User asks about adding metadata tags to pages, SEO optimization setup, social media sharing configuration (Open Graph), favicon and PWA icon setup, adding analytics scripts, or configuring search engine crawler settings

**Key concepts**: Setting for adding \u003chead\u003e tags to pages, cumulative configuration (multiple Head configs combine), only for global tags (favicon/PWA) and crawler-intended tags (SEO/SMO), cannot be used for \u003ctitle\u003e (use +title instead), supports \u003cscript\u003e/\u003cmeta\u003e/\u003clink\u003e tags

**Relevant for**: Head tags, HTML head, metadata, SEO tags, Open Graph, og:image, og:type, meta description, meta tags, social media tags, favicon, PWA settings, apple-touch-icon, theme-color, manifest, script tags, robots meta, crawler configuration

## [title Setting] - https://vike.dev/title

**When to fetch**: User asks about setting page titles, dynamic title generation, SEO optimization questions, document metadata configuration, or \u003ctitle\u003e tag questions

**Key concepts**: Setting page title tag, dynamic title based on page data, title configuration per page, meta setting for document head, integration with vike-react/vue/solid

**Relevant for**: title, page title, document title, meta tags, SEO, head tags, dynamic title, pageContext.data, document metadata, \u003ctitle\u003e, custom settings

## [description Setting] - https://vike.dev/description

**When to fetch**: User asks about meta description setup, SEO optimization needs, Open Graph description, dynamic description generation, or social media sharing metadata

**Key concepts**: Setting page meta description, SEO description configuration, dynamic description from data, meta tag configuration, document metadata

**Relevant for**: description, meta description, SEO, meta tags, og:description, social sharing, document metadata, page description, dynamic description, Open Graph

## [image Setting] - https://vike.dev/image

**When to fetch**: User asks about social media sharing preview setup, Open Graph image questions, URL preview image configuration, social cards for Twitter/Facebook/LinkedIn, or dynamic preview images per page

**Key concepts**: Setting page preview image for URL sharing, Open Graph image configuration, social media preview images, og:image meta tag, dynamic image from data

**Relevant for**: image, preview image, Open Graph, og:image, social sharing, social media cards, Twitter card, Facebook preview, URL sharing, meta image, social preview

## [viewport Setting] - https://vike.dev/viewport

**When to fetch**: User asks about mobile responsiveness questions, viewport configuration needs, meta viewport tag setup, mobile device rendering issues, responsive vs zoomed-out page behavior, or user-scalable settings

**Key concepts**: Mobile/tablet viewport configuration, responsive design settings, viewport meta tag setup, initial scale and width settings, mobile device rendering control

**Relevant for**: viewport, mobile viewport, responsive design, meta viewport, initial-scale, device-width, mobile rendering, tablet devices, zoom control, user-scalable, responsive web design

## [htmlAttributes Setting] - https://vike.dev/htmlAttributes

**When to fetch**: User asks about HTML tag attribute questions, dark mode implementation (class="dark"), root element customization, language attribute setup, or custom HTML element attributes

**Key concepts**: Adding attributes to \u003chtml\u003e tag, dynamic HTML element attributes, dark mode class setup, language attribute configuration, root element customization

**Relevant for**: htmlAttributes, HTML tag, html element, root element, dark mode, class attribute, lang attribute, html attributes, document root, theme class

## [bodyAttributes Setting] - https://vike.dev/bodyAttributes

**When to fetch**: User asks about body tag attribute questions, body class/id setup, theme application to body, body element customization, or dynamic body attributes

**Key concepts**: Adding attributes to \u003cbody\u003e tag, body element customization, dynamic body attributes, theme classes on body, body element configuration

**Relevant for**: bodyAttributes, body tag, body element, body class, theme class, body attributes, dynamic attributes, document body

## [ssr Setting] - https://vike.dev/ssr

**When to fetch**: User asks about disabling SSR for specific pages, SPA configuration questions, SSR toggle needs, client-side only rendering, render mode selection, or questions about server-side vs client-side rendering

**Key concepts**: Enable/disable server-side rendering, SSR configuration per page, SPA mode (ssr: false), render mode control, SSR vs client-only rendering

**Relevant for**: ssr, server-side rendering, disable SSR, SPA mode, client-side rendering, render modes, SSR toggle, ssr: false, hydration, server rendering control

## [Routing (Overview)] - https://vike.dev/routing

**When to fetch**: User asks about routing in Vike, URL structure, defining page routes, route parameters, route guards, or organizing pages by URL

**Key concepts**: Filesystem Routing, Route Strings, Route Functions, Route Guards, groups for organization, URL determined by filesystem location, @ parameter syntax, glob patterns, guard() hook for protection

**Relevant for**: routing, URL mapping, filesystem routing, route definition, route parameters, @id parameter, route guards, guard hook, route organization, glob patterns, URL structure, page routes, routing basics

## [Filesystem Routing] - https://vike.dev/filesystem-routing

**When to fetch**: User asks about automatic routing, organizing pages by URL structure, using route parameters in file paths, ignored directory patterns, or file structure organization

**Key concepts**: URL determined by file location on filesystem, pages/ and index/ directories skipped, @parameter for route parameters, (parentheses) for ignored directories, src/ directory ignored by default, case sensitive routing

**Relevant for**: filesystem routing, automatic routing, file-based routing, pages directory, route parameters, @id parameter, ignored directories, parentheses directories, case sensitive, file structure, URL mapping, convention routing, src directory, domain-driven structure

## [Route String] - https://vike.dev/route-string

**When to fetch**: User asks about defining parameterized routes, simple route patterns, understanding route parameters, using glob patterns, or route conflict resolution

**Key concepts**: String-based route definitions, parameter syntax with @ (e.g., /product/@id), glob patterns (* for catch-all), route precedence rules, routeParams available in pageContext, multiple parameters support, overrides filesystem routing

**Relevant for**: Route String, route definition, parameterized routes, @parameter, route parameters, routeParams, glob patterns, catch-all routes, /product/@id, route syntax, URL patterns, route precedence, static routes, dynamic routes

## [route Setting] - https://vike.dev/route

**When to fetch**: User asks about defining page URLs and routing logic, implementing dynamic routes with parameters, complex routing requirements, URL pattern matching, or understanding routing precedence

**Key concepts**: Determines page's URL routing, three types (Filesystem Routing/Route String/Route Function), Route String for parameterized routes, Route Function for programmatic routing logic, route parameters available at pageContext.routeParams, TypeScript support

**Relevant for**: routing, route definition, URL mapping, route parameters, +route.js, Route String, Route Function, filesystem routing, parameterized routes, @id parameter, routeParams, URL patterns, route matching, programmatic routing, routing logic, route precedence

## [Preloading] - https://vike.dev/preloading

**When to fetch**: User asks about asset preloading, customizing preload strategy, early hints, 103 Early Hint, or preload tag injection customization

**Key concepts**: Vike automatically injects preload tags for JavaScript/CSS/images, default preload strategy works for most users, customize using injectFilter(), early hints via pageContext.httpResponse.earlyHints for 103 Early Hint, assets manifest available via getGlobalContext()

**Relevant for**: preloading, preload tags, asset preloading, early hints, 103 Early Hint, HTTP2 Push, injectFilter, assets manifest, getGlobalContext, performance optimization, preload strategy, resource hints

## [CLI (Command Line)] - https://vike.dev/cli

**When to fetch**: User asks about running development server, building for production, preview production build, pre-rendering pages, configuring CLI commands, setting up npm scripts, or environment-specific configuration

**Key concepts**: Commands (vike dev/vike build/vike preview/vike prerender), pass Vike settings as CLI options (--host/--port/--mode), VIKE_CONFIG environment variable for configuration, VITE_CONFIG for Vite settings, JSON5 syntax for option values

**Relevant for**: CLI, command line, vike dev, vike build, vike preview, vike prerender, CLI options, --host, --port, --mode, VIKE_CONFIG, VITE_CONFIG, JSON5 syntax, npm scripts, development server, production build, preview server

## [JavaScript API] - https://vike.dev/api

**When to fetch**: User asks about building custom frameworks or CLIs, programmatic build control, custom development workflows, framework creation, or accessing Vite internals programmatically

**Key concepts**: Functions (dev()/build()/preview()/prerender()), programmatic control over Vike, used for building custom CLIs/frameworks, access to viteConfig and viteServer, vikeConfig and viteConfig options, getGlobalContext() access, Build Your Own Framework capability

**Relevant for**: JavaScript API, programmatic API, dev() function, build() function, preview() function, prerender() function, vike/api, custom CLI, custom framework, vikeConfig option, viteConfig option, viteServer, programmatic control, framework building

## [Error Page] - https://vike.dev/error-page

**When to fetch**: User asks about implementing error handling, customizing 404 pages, handling 500 errors, error page design, understanding error flow, or custom error messages

**Key concepts**: Defined by /pages/_error/+Page.js, rendered for 404 and 500 errors, access to pageContext.is404/abortReason/abortStatusCode, custom error messages based on error type, pre-rendering generates /dist/client/404.html, integration with throw render()

**Relevant for**: error page, _error page, 404 error, 500 error, error handling, is404, abortReason, abortStatusCode, throw render, error messages, custom errors, error page design, 404 Not Found, 500 Internal Error, error routing

## [client Entry] - https://vike.dev/client

**When to fetch**: User asks about setting up client-side initialization, configuring error tracking, adding global client code, or understanding client-side execution order

**Key concepts**: File for adding client-side only code, ensures code runs before other client code, good for initializing error trackers (Sentry), client-side initialization, custom error tracking setup, window event listeners

**Relevant for**: +client.js, client-side code, client initialization, error tracking, Sentry setup, client entry point, browser code, window events, client-only code, early execution, error tracker, client setup

## [Why Vike] - https://vike.dev/why

**When to fetch**: User asks about Vike benefits, framework philosophy, flexibility features, comparing Vike to other frameworks, progressive migration, future-proof architecture, or understanding Vike's core principles

**Key concepts**: Flexible by design with low-level hooks, conservative or cutting-edge stacks, progressive growth (migrate one page at a time), future-proof unopinionated core, separation of concerns, flourishing do-one-thing-do-it-well ecosystem, passionate leadership

**Relevant for**: Vike benefits, framework philosophy, flexibility, low-level hooks, extensions, progressive migration, future-proof, unopinionated, separation of concerns, ecosystem, framework comparison, why choose Vike, architecture benefits

## [Data Fetching (Overview)] - https://vike.dev/data-fetching

**When to fetch**: User asks about fetching data in Vike, initial page data loading, using +data hook, ORM/SQL database queries, data serialization, accessing data in components, or choosing between RPC/API routes/GraphQL

**Key concepts**: Page data with +data hook, runs server-side by default, ORM/SQL database access, data serialization for client transfer, access via useData() in components, pageContext.routeParams for route parameters, tools like vike-react-query for data fetching, RPC/API routes/GraphQL for mutations

**Relevant for**: data fetching, +data hook, page data, server-side data loading, ORM queries, SQL database, useData, data serialization, route parameters, vike-react-query, vike-vue-query, Telefunc, RPC, API routes, GraphQL, data mutations

## [Pre-rendering (SSG)] - https://vike.dev/pre-rendering

**When to fetch**: User asks about static site generation, build-time rendering, when to pre-render pages, deploying to static hosts (GitHub Pages/Cloudflare Pages/Netlify), performance optimization via pre-rendering, or SSG vs SSR differences

**Key concepts**: Rendering HTML at build-time (during $ vike build), alternative to request-time rendering, static assets only (HTML/JS/CSS/images) with no production server needed, also known as SSG (Static-Site Generators), use when content changes occasionally, don't use when content changes very frequently

**Relevant for**: pre-rendering, SSG, static site generation, build-time rendering, static deployment, GitHub Pages, Cloudflare Pages, Netlify, performance optimization, prerender: true, onBeforePrerenderStart, parameterized routes, SSG vs SSR, static hosting

## [SSR vs SPA] - https://vike.dev/SSR-vs-SPA

**When to fetch**: User asks about choosing between SSR and SPA, SEO requirements, page performance trade-offs, when to use server-side rendering, client-side only rendering, or understanding SSR/SPA differences

**Key concepts**: SSR (page rendered to HTML on server-side then hydrated on client), SPA (page only rendered on client-side with empty HTML shell), toggle with +ssr setting per page, SSR main motivation is SEO and AI visibility, SPA advantages (simpler code/no production server), SSR for content-focused websites, SPA for interaction-focused apps

**Relevant for**: SSR, SPA, server-side rendering, single-page application, SEO, search engine optimization, AI visibility, page performance, hydration, +ssr setting, content vs interaction apps, rendering strategies, Google indexing

## [Head Tags] - https://vike.dev/head-tags

**When to fetch**: User asks about setting head tags, page titles, meta descriptions, Open Graph tags, dynamic head tags based on data, SEO metadata, social media preview tags, or favicon configuration

**Key concepts**: Global \u003chead\u003e tags via +config.ts (title/description/image), per-page \u003chead\u003e tags override global, +Head setting cumulative for all pages, dynamic \u003chead\u003e tags using useConfig() hook or pageContext functions, +Head component for components, default logic for all pages possible

**Relevant for**: head tags, meta tags, title, description, image, Open Graph, og:image, SEO metadata, social media sharing, favicon, dynamic head tags, useConfig, +Head setting, +Head component, page metadata

## [Common Issues] - https://vike.dev/common-issues

**When to fetch**: User encounters npm packages containing invalid code, hydration mismatch errors, broken npm package issues, or general troubleshooting

**Key concepts**: Npm packages containing invalid code (add to vite.config.js \u003e ssr.noExternal), hydration mismatch (content rendered to HTML on server differs from content rendered in browser), links to detailed guides for solutions

**Relevant for**: common issues, troubleshooting, npm package errors, hydration mismatch, SSR errors, broken packages, ssr.noExternal, debugging, error solutions, configuration fixes

## [Base URL] - https://vike.dev/base-url

**When to fetch**: User asks about configuring URL root of website, deploying to subdirectory, CDN deployment, or using baseAssets setting

**Key concepts**: Configures URL root of website (default / or custom /some-base/), configuration in vite.config.js with base setting, use import.meta.env.BASE_URL in code, CDN deployment with baseAssets setting, combined baseAssets and baseServer setup

**Relevant for**: base URL, subdirectory deployment, URL root, import.meta.env.BASE_URL, baseAssets, baseServer, CDN deployment, static asset CDN, production URL configuration

## [Active Links] - https://vike.dev/active-links

**When to fetch**: User asks about highlighting current page in navigation, active link styling, checking if link is active, or navigation visual indicators

**Key concepts**: Practice of visually highlighting current page in navigation, implementation steps (create \u003cLink\u003e component, use usePageContext() to access pageContext.urlPathname, check if active, set CSS class), cannot use window.location.pathname with SSR

**Relevant for**: active links, navigation highlighting, current page indicator, usePageContext, urlPathname, CSS active class, navigation styling, link component, SSR navigation

## [Static Directory (public/)] - https://vike.dev/static-directory

**When to fetch**: User asks about serving static files, public directory, static assets, robots.txt, dist/client directory, or static middleware

**Key concepts**: public/ directory for static assets (built-in Vite support), example public/robots.txt served at /robots.txt, dist/client/ directory after build contains all static assets, Vite automatically adds content hash and copies public/ files, server static middleware alternative for heavy assets

**Relevant for**: static directory, public directory, static files, static assets, robots.txt, dist/client, Vite static assets, content hash, static middleware, express.static(), asset serving

## [File Environment (.server/.client/.shared)] - https://vike.dev/file-env

**When to fetch**: User asks about file environment, protecting secrets from client-side, .server.js files, .client.js files, or ensuring server-only code never leaks to client

**Key concepts**: Determines in which environment files are loaded, .server.js ensures secret information never leaks to client-side (Vike throws error if client-side code loads .server.js), for + files change environment of hooks (e.g., +data.shared.js / +data.server.js / +data.client.js)

**Relevant for**: file environment, .server.js, .client.js, .shared.js, server-only code, secrets protection, environment configuration, + files environment, data hook environment, security, prevent leaks

## [Environment Variables] - https://vike.dev/env

**When to fetch**: User asks about .env files, environment variables, PUBLIC_ENV__ prefix, secrets management, import.meta.env, or configuration with environment variables

**Key concepts**: .env and .env.[mode] files, .env.production/.env.development loaded only in respective mode, PUBLIC_ENV__ prefixed variables accessible everywhere, non-prefixed variables only accessible server-side, static replacement at build-time, security considerations for secrets

**Relevant for**: environment variables, .env files, PUBLIC_ENV__, import.meta.env, secrets, server-side variables, client-side variables, static replacement, .env.local, OS environment variables, security, configuration

## [HTTP Headers] - https://vike.dev/headers

**When to fetch**: User asks about request headers, accessing HTTP headers, cookie parsing, response headers, or headers in pageContext

**Key concepts**: Request headers via pageContext.headers (normalized by Vike) and pageContext.headersOriginal (original object from server), convert to standard Headers, cookie parsing with cookie parser, setting headersOriginal at renderPage() integration, response headers via +headersResponse

**Relevant for**: HTTP headers, request headers, pageContext.headers, headersOriginal, cookies, cookie parsing, response headers, headersResponse, renderPage, server integration, header access

## [Internationalization (i18n)] - https://vike.dev/i18n

**When to fetch**: User asks about multi-language support, i18n implementation, locale extraction from URLs, language routing, translated content, or internationalization setup

**Key concepts**: Use onBeforeRoute() hook for locale extraction, modifyUrl for URL manipulation, update \u003cLink\u003e component to include locale, techniques work with ?lang=fr query parameters or domain.fr TLDs or Accept-Language headers, pre-rendering with onBeforePrerender() to duplicate URLs for each locale

**Relevant for**: i18n, internationalization, multi-language, locale, language routing, onBeforeRoute, modifyUrl, URL locale, translated content, Accept-Language, pre-rendering i18n, locale data, lang setting

## [Path Aliases] - https://vike.dev/path-aliases

**When to fetch**: User asks about import aliases, path aliases, replacing relative imports, #root imports, or configuring import shortcuts

**Key concepts**: Replace cumbersome relative imports with aliases (e.g., #root/components/Counter), follow Node.js convention (prefix aliases with #), configuration in vite.config.js with resolve.alias, TypeScript requires defining twice (vite.config.ts and tsconfig.json), scope applies to files processed by Vite

**Relevant for**: path aliases, import aliases, #root, relative imports, resolve.alias, tsconfig.json paths, vite.config, import shortcuts, Node.js imports, TypeScript paths, package.json imports

## [API Routes] - https://vike.dev/api-routes

**When to fetch**: User asks about creating API endpoints, backend API routes, REST API, API implementation in Vike, or alternatives to API routes

**Key concepts**: Vike doesn't include built-in API routes by design, recommended approach use Telefunc (RPC) or another RPC tool, alternative create API routes using Express.js or Hono, Vike's middleware should be last (it's catch-all), use vike-photon or server middleware for API endpoints

**Relevant for**: API routes, REST API, backend endpoints, Telefunc, RPC, Express.js API, Hono API, server middleware, API implementation, catch-all middleware, vike-photon API

## [GitHub Pages Deployment] - https://vike.dev/github-pages

**When to fetch**: User asks about deploying to GitHub Pages, static hosting on GitHub, GitHub Actions deployment, or .nojekyll file

**Key concepts**: Pre-render pages to static assets, deploy dist/client/ directory, can use GitHub Actions for automatic deployment, requires .nojekyll file to serve files starting with underscore, base URL configuration needed for subdirectory deployments

**Relevant for**: GitHub Pages, static deployment, GitHub Actions, .nojekyll, base URL, subdirectory deployment, static hosting, GitHub deployment, automated deployment, dist/client

## [Netlify Deployment] - https://vike.dev/netlify

**When to fetch**: User asks about deploying to Netlify, Netlify static hosting, Netlify Functions for SSR, or Netlify build configuration

**Key concepts**: Static hosting via pre-rendering, build command vike build, deploy dist/client/ directory, SSR option via Netlify Functions (separate documentation)

**Relevant for**: Netlify, static hosting, Netlify deployment, Netlify Functions, SSR deployment, build command, dist/client, Netlify configuration

## [Cloudflare Pages Deployment] - https://vike.dev/cloudflare-pages

**When to fetch**: User asks about Cloudflare Pages deployment (note: being deprecated - recommend Cloudflare Workers instead)

**Key concepts**: IMPORTANT being deprecated (official recommendation is Cloudflare Workers instead), recommend using vike-photon for static deployments, vike-photon works for both static and SSR

**Relevant for**: Cloudflare Pages, deprecated, Cloudflare Workers migration, vike-photon, static deployment, SSR deployment, Cloudflare hosting

## [Cloudflare Deployment] - https://vike.dev/cloudflare

**When to fetch**: User asks about Cloudflare Workers deployment, edge deployment, Cloudflare D1/KV/bindings, workerd runtime, or serverless Cloudflare hosting

**Key concepts**: Recommended approach use Photon for seamless integration, supports both SSR and static websites (SSG), in development server code runs inside workerd (Cloudflare's runtime), two deployment options (Cloudflare Pages being deprecated / Cloudflare Workers recommended), access Cloudflare APIs via env object, bundle size limit 3MB default

**Relevant for**: Cloudflare, Cloudflare Workers, edge deployment, vike-photon, @photonjs/cloudflare, workerd, Cloudflare D1, Cloudflare KV, bindings, serverless, Wrangler, edge computing, SSR edge

## [Vercel Deployment] - https://vike.dev/vercel

**When to fetch**: User asks about Vercel deployment, Vercel serverless, Incremental Static Regeneration (ISR), Vercel Edge Functions, or Vercel API routes

**Key concepts**: Recommended approach use Photon for seamless integration, supports static websites/SSR/partial pre-rendering, installation via vike.dev/new scaffold with Vercel + Photon, supports Incremental Static Regeneration (ISR), manual integration via Vercel API Route also possible, alternative vite-plugin-vercel for full Build Output API

**Relevant for**: Vercel, Vercel deployment, vike-photon, @photonjs/vercel, ISR, Incremental Static Regeneration, Vercel CLI, Git integration, serverless Vercel, Vercel Edge, Build Output API, vite-plugin-vercel

## [AWS Deployment] - https://vike.dev/aws

**When to fetch**: User asks about AWS deployment, AWS Lambda, serverless AWS, SST framework, or deploying Vike to AWS

**Key concepts**: Vike works with any AWS deployment tool, AWS Lambda examples using Serverless Framework, full-stack deployment tools (SST/Hono integration examples), from server perspective Vike is just middleware

**Relevant for**: AWS, AWS Lambda, serverless AWS, Serverless Framework, SST, Hono AWS, AWS deployment, Lambda functions, cloud deployment AWS

## [Docker Deployment] - https://vike.dev/docker

**When to fetch**: User asks about Docker deployment, containerization, Node.js containers, Docker HMR, WSL Docker, or out-of-memory errors in Docker

**Key concepts**: Use any Node.js container image, development considerations (set server.host: true for external access, configure Docker for Vite's HMR websocket, WSL-specific HMR configuration), out-of-memory errors increase Node.js memory with --max-old-space-size

**Relevant for**: Docker, containerization, Node.js containers, Docker deployment, HMR websocket, server.host, WSL, out-of-memory, --max-old-space-size, container configuration, Vite Docker

## [Authentication] - https://vike.dev/auth

**When to fetch**: User asks about authentication implementation, login/logout flows, user sessions, auth libraries (Better Auth/Auth.js/Passport), protecting pages, or accessing user info

**Key concepts**: Compatible with any auth tool (Better Auth/Auth.js/Grant/Passport.js/Auth0), make user info available via pageContext.user in +onCreatePageContext.server.js, access request object pageContext.runtime.req, client-side use +onCreateGlobalContext.client.js to fetch user info, implement login flows with +guard hook using throw redirect() or throw render()

**Relevant for**: authentication, auth, login, logout, user sessions, Better Auth, Auth.js, Passport.js, Auth0, Grant, pageContext.user, guard hook, auth flow, user info, session management, protected pages

## [Server Integration] - https://vike.dev/server-integration

**When to fetch**: User asks about integrating with Express/Hono/Fastify/H3/Elysia, custom server setup, server middleware, or manual renderPage() integration

**Key concepts**: Recommended vike-server extension for automatic integration, supports Hono/Express.js/Fastify/H3/Elysia, supports deployments VPS/Netlify/Cloudflare/Vercel, features include server code transpiled by Vite/zero-config/automatic static file serving/HMR support/compression in production, manual integration via renderPage() for full control

**Relevant for**: server integration, vike-server, Express.js, Hono, Fastify, H3, Elysia, middleware, renderPage, manual integration, VPS deployment, server framework, custom server, production server

## [Error Tracking] - https://vike.dev/error-tracking

**When to fetch**: User asks about error tracking setup, Sentry integration, Bugsnag, Rollbar, logging client/server errors, or production error monitoring

**Key concepts**: Client-side initialize in +client.js file, server-side use +onError() hook to access server errors, compatible trackers Sentry/Bugsnag/Rollbar, only track errors in production (check import.meta.env.PROD)

**Relevant for**: error tracking, Sentry, Bugsnag, Rollbar, error logging, +client.js, +onError hook, production errors, error monitoring, exception tracking, import.meta.env.PROD

## [CSS-in-JS] - https://vike.dev/css-in-js

**When to fetch**: User asks about styled-components, styled-jsx, CSS-in-JS libraries, collecting styles for SSR, avoiding FOUC (Flash of Unstyled Content), or Compiled/Grommet integration

**Key concepts**: Collect styles to avoid FOUC, compatible with styled-components/styled-jsx/Compiled/Grommet, with vike-react/vue/solid use +onBeforeRenderHtml and +onAfterRenderHtml hooks, without vike-{react,vue,solid} collect inside +onRenderHtml() hook, example pattern (collect styles during SSR, store in pageContext.collectedStyles, generate CSS and inject into HTML head)

**Relevant for**: CSS-in-JS, styled-components, styled-jsx, Compiled, Grommet, FOUC, Flash of Unstyled Content, style collection, SSR styles, onBeforeRenderHtml, onAfterRenderHtml, vike-react-styled-components

## [Markdown] - https://vike.dev/markdown

**When to fetch**: User asks about Markdown support, MDX integration, frontmatter, metadata from Markdown files, @mdx-js/rollup, or Markdown page generation

**Key concepts**: Vue use @mdx-js/rollup/unplugin-vue-markdown/vite-plugin-md, React use @cyco130/vite-plugin-mdx or @mdx-js/rollup, metadata approaches (global metadata via metadata.js file, local metadata via custom settings with meta, frontmatter supported but discouraged for global metadata due to performance, custom setting eager for global access), MDX allows exporting JavaScript values from .mdx files

**Relevant for**: Markdown, MDX, frontmatter, @mdx-js/rollup, unplugin-vue-markdown, vite-plugin-md, @cyco130/vite-plugin-mdx, metadata, custom settings, eager setting, markdown pages, content management

## [Store (State Management)] - https://vike.dev/store

**When to fetch**: User asks about state management, Redux integration, Pinia, Vuex, global state, store initialization, or managing complex UI state

**Key concepts**: Tool for managing complex UI state via immutable data structures, recommended use Vike extensions for automatic integration (vike-vue-pinia available, React contribution needed), manual integration (SSR create store at +onCreatePageContext.server.js retrieve state at +onAfterRenderHtml.js, passToClient make storeInitialState available to client, hydration initialize store on client at +onBeforeRenderClient.js with storeInitialState), must ensure exact same initial state on client and server

**Relevant for**: store, state management, Redux, Pinia, Vuex, Effector, PullState, global state, store initialization, SSR state, hydration mismatch, vike-vue-pinia, passToClient, storeInitialState, immutable state

## [Integration (Advanced)] - https://vike.dev/integration

**When to fetch**: User asks about vanilla UI tools (jQuery/tooltips/modals), analytics integration (Google Analytics/Plausible/Segment), component libraries (Bootstrap), service workers, View Transitions, or manual UI framework integration

**Key concepts**: Vanilla UI tools initialize via onHydrationEnd() hook, analytics use +client.js file or +onHydrationEnd hook, component libraries initialize Bootstrap and vanilla libraries using onHydrationEnd() or +client.js, data fetching instead of +data hook use tools like vike-react-apollo/vike-vue-query, service workers initialize in +client.js, View Transitions implement via navigate() function, UI framework manual integration for full control

**Relevant for**: vanilla UI tools, jQuery, analytics, Google Analytics, Plausible, Segment, Bootstrap, component libraries, service workers, View Transitions, manual UI integration, React integration, Vue integration, Solid integration, onHydrationEnd, +client.js

---

**End of Vike Documentation LLM Header File**

> Remember: This header contains only summaries and connection points. Always fetch the actual documentation pages when you identify relevant matches based on user queries.
