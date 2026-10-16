import { getCounts } from "../../serverCounts";

export default function Page() {
  return (
    <ul>
      {Object.entries(getCounts()).map(([key, count]) => (
        <li key={key} data-count={key}>
          {count}
        </li>
      ))}
    </ul>
  );
}
