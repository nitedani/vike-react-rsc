import { filmStyles } from "./styles";
import { FilmDetailsClient } from "./FilmDetailsClient";

export type Film = {
  id: number;
  title: string;
  director?: string;
  releaseDate?: string;
  openingCrawl?: string;
};

// Component to display a single film card
export async function FilmCard({ id }: { id: number }) {
  // Fetch a single film
  const films = await fetch(
    "https://brillout.github.io/star-wars/api/films.json"
  ).then((res) => res.json() as Promise<Film[]>);

  // Find the specific film
  const film = films.find(f => f.id === id);

  if (!film) {
    return <div>Film not found</div>;
  }

  return (
    <div css={filmStyles.card}>
      {/* Episode badge */}
      <div css={filmStyles.cardEpisodeBadge}>Episode {film.id}</div>

      {/* Film title */}
      <h3 css={filmStyles.cardTitle}>{film.title}</h3>

      {/* Film metadata */}
      <div css={filmStyles.cardMetadataContainer}>
        <p css={filmStyles.cardMetadata}>
          <span css={filmStyles.metadataLabel}>Director:</span> {film.director}
        </p>
      </div>

      {/* View details button */}
      <div css={filmStyles.cardButtonContainer}>
        <FilmDetailsClient id={id} />
      </div>
    </div>
  );
}
