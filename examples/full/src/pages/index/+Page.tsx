import Counter from "../../components/Counter";

type Film = {
  id: number;
  title: string;
};

async function Films() {
  const films = await fetch(
    "https://brillout.github.io/star-wars/api/films.json"
  ).then((res) => res.json() as Promise<Film[]>);
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log("Films fetched");

  return (
    <div>
      {films.map((film) => (
        <div key={film.id}>{film.title}</div>
      ))}
    </div>
  );
}

export default async function Page() {
  return (
    <>
      <h1>Home</h1>
      <a href="/about">Go to about</a>
      <Films />
      <div>
        <Counter />
      </div>
    </>
  );
}
