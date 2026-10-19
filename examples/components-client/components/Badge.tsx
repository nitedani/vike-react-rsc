export default function Badge({ label }: { label: string }) {
  return <b id="badge">{label}</b>;
}

export function shout(text: string) {
  return `${text.toUpperCase()}!`;
}
