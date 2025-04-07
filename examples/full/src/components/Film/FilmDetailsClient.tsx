"use client";

import { useState, useEffect } from "react";
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

      {/* Content placeholder - one block for everything else */}
      <div css={filmStyles.skeletonContent} />
    </div>
  );
}

const FilmDetailsComponent = rsc(FilmDetails);

// Client component that uses the rsc utility to display film details
export function FilmDetailsClient({ id }: { id: number }) {
  const [showDetails, setShowDetails] = useState(false);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Reset body styles when component unmounts
      document.body.style.overflow = "auto";
      document.body.style.paddingRight = "0";
    };
  }, []);

  const onModalOpen = () => {
    const padding = getScrollbarWidth();
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${padding}px`;
    setShowDetails(true);
  };

  const onModalClose = () => {
    document.body.style.overflow = "auto";
    document.body.style.paddingRight = "0";
    setShowDetails(false);
  };

  // Modal content
  const modalContent = showDetails && (
    <div onClick={onModalClose} css={filmStyles.modal}>
      <div
        onClick={(e) => e.stopPropagation()} // Prevent clicks from closing the modal
        css={filmStyles.modalContent}
      >
        <button
          onClick={onModalClose}
          css={filmStyles.closeButton}
          aria-label="Close modal"
        >
          ×
        </button>
        <FilmDetailsComponent id={id} fallback={<FilmDetailsLoading />} />
      </div>
    </div>
  );

  return (
    <>
      <button onClick={onModalOpen} css={filmStyles.cardButton}>
        View Details
      </button>

      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
}

function getScrollbarWidth() {
  var outer = document.createElement("div");
  outer.style.visibility = "hidden";
  outer.style.width = "100px";

  document.body.appendChild(outer);

  var widthNoScroll = outer.offsetWidth;
  // force scrollbars
  outer.style.overflow = "scroll";

  // add innerdiv
  var inner = document.createElement("div");
  inner.style.width = "100%";
  outer.appendChild(inner);

  var widthWithScroll = inner.offsetWidth;

  // remove divs
  outer.parentNode!.removeChild(outer);

  return widthNoScroll - widthWithScroll;
}