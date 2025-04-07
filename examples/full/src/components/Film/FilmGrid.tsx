"use server";

import { Suspense } from "react";
import { filmStyles } from "./styles";
import { FilmCard } from "./FilmCard";
import type { Film } from "./FilmCard";

// Simple skeleton component for film cards
function FilmCardSkeleton() {
  return (
    <div css={[
      filmStyles.card,
      filmStyles.cardSkeleton
    ]}>
      <div css={filmStyles.skeletonTitle} />
      <div css={filmStyles.skeletonMetadata} />
      <div css={filmStyles.skeletonMetadata} />
      <div css={filmStyles.cardButtonContainer}>
        <div css={filmStyles.skeletonButton} />
      </div>
    </div>
  );
}

// Component to fetch all film IDs
export async function getFilmIds(): Promise<number[]> {
  // Fetch all films to get their IDs
  const films = await fetch(
    "https://brillout.github.io/star-wars/api/films.json"
  ).then((res) => res.json() as Promise<Film[]>);

  return films.map(film => film.id);
}

// Component to fetch and display all films
export async function FilmGrid({
  withDelay = false,
  listMode = false
}: {
  withDelay?: boolean,
  listMode?: boolean
}) {
  if (listMode) {
    // For list mode, fetch all films at once
    const films = await fetch(
      "https://brillout.github.io/star-wars/api/films.json"
    ).then((res) => res.json() as Promise<Film[]>);

    // Simulate a longer loading time for demonstration
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return (
      <div css={filmStyles.cardGrid}>
        {films.map((film) => (
          <FilmCard key={film.id} id={film.id} />
        ))}
      </div>
    );
  } else {
    // For grid mode with individual suspense boundaries
    const filmIds = await getFilmIds();

    return (
      <div css={filmStyles.cardGrid}>
        {filmIds.map(id => (
          <div key={id} css={filmStyles.cardWrapper}>
            <Suspense fallback={<FilmCardSkeleton />}>
              <DelayedFilmCard id={id} withDelay={withDelay} />
            </Suspense>
          </div>
        ))}
      </div>
    );
  }
}

// Helper component to add optional delay for demonstration purposes
async function DelayedFilmCard({ id, withDelay }: { id: number, withDelay: boolean }) {
  // Add a delay based on the film ID to demonstrate staggered loading
  if (withDelay) {
    await new Promise(resolve => setTimeout(resolve, id * 1000));
  }

  return <FilmCard id={id} />;
}
