type Film = {
  id: number;
  title: string;
};

export async function Page() {
  const films = await fetch(
    "https://brillout.github.io/star-wars/api/films.json"
  ).then((res) => res.json() as Promise<Film[]>);

  return (
    <div>
      <h1>Home</h1>
      {films.map((film) => (
        <div key={film.id}>{film.title}</div>
      ))}
    </div>
  );
}
