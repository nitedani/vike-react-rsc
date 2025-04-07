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
        padding: "1.5rem",
        borderRadius: "12px",
        backgroundColor: "white",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
        maxWidth: "800px",
        margin: "0 auto",
        minHeight: "800px", // Match the actual component height
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
          marginBottom: "1.5rem",
          borderBottom: "2px solid #0070f3",
          paddingBottom: "0.75rem",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          css={{
            height: "38px",
            width: "250px",
            backgroundColor: "#e9ecef",
            borderRadius: "4px",
          }}
        />
      </div>

      {/* Info placeholders */}
      <div
        css={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div
              css={{
                height: "20px",
                width: "100px",
                backgroundColor: "#e9ecef",
                borderRadius: "4px",
                marginBottom: "0.5rem",
              }}
            />
            <div
              css={{
                height: "24px",
                width: "150px",
                backgroundColor: "#e9ecef",
                borderRadius: "4px",
              }}
            />
          </div>
        ))}
      </div>

      {/* Crawl placeholder */}
      <div css={{ marginBottom: "1.5rem", marginTop: "1.5rem" }}>
        <div
          css={{
            height: "24px",
            width: "150px",
            backgroundColor: "#e9ecef",
            borderRadius: "4px",
            marginBottom: "1rem",
          }}
        />
        <div
          css={{
            backgroundColor: "#f8f9fa",
            height: "400px",
            borderRadius: "8px",
            border: "1px solid #e9ecef",
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
      onClick={() => setShowDetails(false)}
      css={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 1000,
        padding: "20px",
        paddingTop: "40px", // Ensure there's always space at the top
        display: "flex",
        alignItems: "flex-start", // Align to the top instead of center
        justifyContent: "center",
        overflow: "auto", // Allow scrolling
        animation: "backdropFade 0.2s ease-in",
        "@keyframes backdropFade": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 }
        }
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()} // Prevent clicks from closing the modal
        css={{
          backgroundColor: "white",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "800px",
          position: "relative",
          padding: "0", // Remove padding as MovieDetails has its own padding
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
          maxHeight: "calc(100vh - 80px)", // Limit height to viewport minus padding
          overflowY: "auto", // Allow scrolling within the modal
          animation: "modalEnter 0.3s ease-out",
          "@keyframes modalEnter": {
            "0%": { opacity: 0, transform: "scale(0.95)" },
            "100%": { opacity: 1, transform: "scale(1)" }
          }
        }}
      >
        <button
          onClick={() => setShowDetails(false)}
          css={{
            position: "absolute",
            top: "15px",
            right: "15px",
            zIndex: 10,
            background: "white",
            border: "1px solid #e1e4e8",
            borderRadius: "50px",
            width: "30px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            cursor: "pointer",
            color: "#666",
            transition: "all 0.2s ease",
            ":hover": {
              background: "#0070f3",
              color: "white",
              border: "1px solid #0070f3"
            }
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
