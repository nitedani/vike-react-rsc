"use server component";
import Badge, { shout } from "../../components/Badge";

export default function Page() {
  return <Badge label={shout("A function of a component file, called on the server")} />;
}
