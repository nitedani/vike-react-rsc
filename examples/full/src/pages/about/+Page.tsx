import Counter from "../../components/Counter";

export async function Page() {
  return (
    <div>
      <h1>About</h1>
      <a href="/">Go to home</a>
      <div>
        <Counter />
      </div>
    </div>
  );
}
