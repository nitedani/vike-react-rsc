// vite.ts resolves it
declare module "virtual:vike-react-rsc/LoadingBoundary" {
  export const LoadingBoundary: typeof import("./components/LoadingBoundary").LoadingBoundary | undefined;
}
