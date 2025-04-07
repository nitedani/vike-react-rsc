"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { rsc } from "vike-react-rsc/client";
import { FilmDetails } from "./FilmDetails";
import { filmStyles } from "./styles";

// Simple loading component for film details
function FilmDetailsLoading() {
  return (
    <div css={filmStyles.modalSkeleton}>
      {/* Title placeholder */}
      <div css={filmStyles.skeletonTitle} />

      {/* Info placeholders */}
      <div css={filmStyles.skeletonInfoGrid}>
        <div css={filmStyles.skeletonInfoItem} />
        <div css={filmStyles.skeletonInfoItem} />
        <div css={filmStyles.skeletonInfoItem} />
      </div>

      {/* Content placeholder */}
      <div css={filmStyles.skeletonContent} />
    </div>
  );
}

const FilmDetailsComponent = rsc(FilmDetails);

// Client component that uses the rsc utility to display film details
export function FilmDetailsClient({ id }: { id: number }) {
  const [showDetails, setShowDetails] = useState(false);

  // Modal content
  const modalContent = showDetails && (
    <div
      onClick={() => setShowDetails(false)}
      css={filmStyles.modal}
    >
      <div
        onClick={(e) => e.stopPropagation()} // Prevent clicks from closing the modal
        css={filmStyles.modalContent}
      >
        <button
          onClick={() => setShowDetails(false)}
          css={filmStyles.closeButton}
        >
          ×
        </button>
        <FilmDetailsComponent id={id} fallback={<FilmDetailsLoading />} />
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setShowDetails(true)}
        css={filmStyles.cardButton}
      >
        View Details
      </button>

      {createPortal(modalContent, document.body)}
    </>
  );
}
