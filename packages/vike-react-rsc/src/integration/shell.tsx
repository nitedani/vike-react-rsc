import { Suspense } from "react";

//TODO: load this from +Layout, etc..
export const Shell = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  return (
    <div>
      <div>
        <a href="/">Home</a>
        <a href="/todos">Todos</a>
      </div>

      <Suspense fallback="Loading...">{children}</Suspense>
    </div>
  );
};
