import { useActionState } from "react";
import { countSubmit } from "../../actions/countSubmit";

export default function Page() {
  const [submits, formAction] = useActionState(countSubmit, 0);
  return (
    <form action={formAction}>
      <p id="submits">Submitted {submits} times</p>
      <button>Count a submit</button>
    </form>
  );
}
