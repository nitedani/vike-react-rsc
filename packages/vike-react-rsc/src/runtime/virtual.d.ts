declare module "virtual:runtime/server" {
  const server: typeof import("./server");
  export = server;
}
declare module "virtual:runtime/ssr" {
  const ssr: typeof import("./ssr");
  export = ssr;
}
declare module "virtual:enviroment-name" {
  const name: "rsc" | "ssr" | "client";
  export = name;
}
