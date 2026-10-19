function Thrower(): never {
  throw new Error("A client component failed on demand");
}

export default function Page() {
  return (
    <>
      <h1>A page whose client component throws</h1>
      <Thrower />
    </>
  );
}
