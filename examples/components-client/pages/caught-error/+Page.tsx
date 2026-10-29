import { Component, useState, type ReactNode } from "react";

// An error boundary of the app's
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <p id="caught">Caught</p> : this.props.children;
  }
}

function Thrower(): never {
  throw new Error("A client component failed on a click");
}

export default function Page() {
  const [failed, setFailed] = useState(false);
  return (
    <Boundary>
      <button id="fail" type="button" onClick={() => setFailed(true)}>
        Fail
      </button>
      {failed && <Thrower />}
    </Boundary>
  );
}
