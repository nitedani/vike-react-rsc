"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { rsc } from "vike-react-rsc/client";
import { MovieDetails } from "./MovieDetails";
import { sharedStyles } from "../styles/shared";

// Loading component to show while fetching movie details
function MovieDetailsLoading() {
  return (
    <div
      css={{
        padding: "2rem",
        borderRadius: "16px",
        backgroundColor: "#f9f9f9",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
        maxWidth: "800px",
        margin: "0 auto",
        animation: "pulse 1.5s infinite ease-in-out",
        "@keyframes pulse": {
          "0%": { opacity: 0.7 },
          "50%": { opacity: 0.9 },
          "100%": { opacity: 0.7 },
        },
      }}
    >
      {/* Title placeholder */}
      <div
        css={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          borderBottom: "2px solid #eaeaea",
          paddingBottom: "1rem",
        }}
      >
        <div
          css={{
            height: "38px",
            width: "200px",
            backgroundColor: "#eaeaea",
            borderRadius: "4px",
          }}
        />
        <div
          css={{
            backgroundColor: "#eaeaea",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
          }}
        />
      </div>

      {/* Info placeholders */}
      <div
        css={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div
              css={{
                height: "20px",
                width: "100px",
                backgroundColor: "#eaeaea",
                borderRadius: "4px",
                marginBottom: "0.5rem",
              }}
            />
            <div
              css={{
                height: "24px",
                width: "150px",
                backgroundColor: "#eaeaea",
                borderRadius: "4px",
              }}
            />
          </div>
        ))}
      </div>

      {/* Crawl placeholder */}
      <div css={{ marginBottom: "2rem" }}>
        <div
          css={{
            height: "24px",
            width: "150px",
            backgroundColor: "#eaeaea",
            borderRadius: "4px",
            marginBottom: "1rem",
          }}
        />
        <div
          css={{
            backgroundColor: "#eaeaea",
            height: "200px",
            borderRadius: "8px",
          }}
        />
      </div>

      {/* Button placeholder */}
      <div css={sharedStyles.cardButtonContainer}>
        <div
          css={{
            height: "38px",
            width: "120px",
            backgroundColor: "#eaeaea",
            borderRadius: "50px",
            margin: "0 auto",
          }}
        />
      </div>
    </div>
  );
}

const MovieDetailsComponent = rsc(MovieDetails);

// Client component that uses the rsc utility to display movie details
export function MovieDetailsClient({ id }: { id: number }) {
  const [showDetails, setShowDetails] = useState(false);

  // Modal content
  const modalContent = showDetails && (
    <div
      css={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        zIndex: 1000,
        padding: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden", // Prevent body scrolling when modal is open
      }}
    >
      <div
        css={{
          backgroundColor: "white",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "800px",
          maxHeight: "90vh", // Limit height to 90% of viewport
          position: "relative",
          padding: "20px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
          overflow: "auto", // Add scrolling to the modal content
        }}
      >
        <button
          onClick={() => setShowDetails(false)}
          css={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "none",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
            color: "#666",
            zIndex: 1,
          }}
        >
          ×
        </button>
        <MovieDetailsComponent id={id} fallback={<MovieDetailsLoading />} />
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setShowDetails(true)}
        css={sharedStyles.cardButton}
      >
        View Details
      </button>

      {showDetails && createPortal(modalContent, document.body)}
    </>
  );
}
