import Counter from "../../components/Counter";
import { getPageContext } from "vike-react-rsc/usePageContext";

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
  const ctx = getPageContext();
  console.log(ctx.pageId);

  return (
    <>
      <h1>Home</h1>
      <a href="/todos">Go to todos</a>
      <Films />
      <div>
        <Counter />
      </div>
    </>
  );
}
