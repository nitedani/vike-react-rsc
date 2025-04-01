import { Suspense } from "react";

export const Shell = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  return (
    <div>
      <div>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </div>

      <Suspense fallback="Loading...">{children}</Suspense>
    </div>
  );
};
