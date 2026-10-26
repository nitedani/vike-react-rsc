import { useConfig } from "vike-react-rsc/useConfig";

// Without a directive, imported by a server component: a server component too
export function ServerTitle({ title }: { title: string }) {
  useConfig()({ title });
  return <h1>{title}</h1>;
}
