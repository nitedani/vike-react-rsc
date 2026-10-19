function Thrower(): never {
  throw new Error("A server component failed on demand");
}

export default function Page() {
  return (
    <>
      <h1>A page whose server component throws</h1>
      <Thrower />
    </>
  );
}
