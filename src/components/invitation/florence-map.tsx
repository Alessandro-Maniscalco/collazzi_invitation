"use client";

import { useEffect, useRef } from "react";

import styles from "./florence-map.module.css";

export type FlorenceMapSuggestion = {
  id: string;
  title: string;
  description?: string;
  category: "museum" | "food";
  position: [latitude: number, longitude: number];
  query?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function markerSvg(category: FlorenceMapSuggestion["category"]) {
  if (category === "museum") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 9h18M5 9v8m4-8v8m6-8v8m4-8v8M3 17h18M2 21h20M12 3 3 7h18l-9-4Z" />
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3v8m-3-8v5c0 2 1.3 3 3 3s3-1 3-3V3M7 11v10M15 3v18m0-9h4V3c-2.2 0-4 2.7-4 6v3Z" />
    </svg>
  `;
}

function googleMapsUrl(suggestion: FlorenceMapSuggestion) {
  const query = suggestion.query ?? `${suggestion.title}, Florence, Italy`;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function FlorenceMap({
  suggestions,
}: {
  suggestions: FlorenceMapSuggestion[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;
    let removeMap: (() => void) | undefined;

    void import("leaflet").then((leaflet) => {
      if (disposed || !containerRef.current) return;

      const map = leaflet.map(containerRef.current, {
        center: [43.7704, 11.2543],
        zoom: 14,
        scrollWheelZoom: false,
      });

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        })
        .addTo(map);

      const bounds = leaflet.latLngBounds([]);

      suggestions.forEach((suggestion) => {
        const categoryLabel = suggestion.category === "museum" ? "Museum" : "Food";
        const markerClass =
          suggestion.category === "museum" ? styles.markerMuseum : styles.markerFood;
        const icon = leaflet.divIcon({
          className: styles.markerWrap,
          html: `<span class="${styles.markerCore} ${markerClass}">${markerSvg(
            suggestion.category,
          )}</span>`,
          iconSize: [42, 42],
          iconAnchor: [21, 42],
          popupAnchor: [0, -37],
        });
        const description = suggestion.description
          ? `<span class="${styles.popupDescription}">${escapeHtml(
              suggestion.description,
            )}</span>`
          : "";
        const popup = `
          <div class="${styles.popupContent}">
            <span class="${styles.popupCategory}">${categoryLabel}</span>
            <strong>${escapeHtml(suggestion.title)}</strong>
            ${description}
            <a href="${googleMapsUrl(
              suggestion,
            )}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
          </div>
        `;
        const marker = leaflet
          .marker(suggestion.position, {
            icon,
            keyboard: true,
            title: suggestion.title,
          })
          .bindPopup(popup, {
            className: styles.popup,
            closeButton: false,
            maxWidth: 260,
            minWidth: 200,
            autoPanPadding: [28, 28],
          })
          .addTo(map);

        marker.on("mouseover focus", () => marker.openPopup());
        bounds.extend(suggestion.position);
      });

      map.fitBounds(bounds, {
        padding: [42, 42],
        maxZoom: 15,
      });

      const fitVisibleMap = () => {
        if (!containerRef.current || containerRef.current.clientWidth === 0) return;

        map.invalidateSize();
        map.fitBounds(bounds, {
          padding: [42, 42],
          maxZoom: 15,
        });
      };
      const resizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(fitVisibleMap);
      });

      resizeObserver.observe(containerRef.current);
      const resizeFrame = window.requestAnimationFrame(fitVisibleMap);

      removeMap = () => {
        resizeObserver.disconnect();
        window.cancelAnimationFrame(resizeFrame);
        map.remove();
      };
    });

    return () => {
      disposed = true;
      removeMap?.();
    };
  }, [suggestions]);

  return (
    <div className={styles.mapFrame}>
      <div
        ref={containerRef}
        className={styles.map}
        role="region"
        aria-label="Interactive map of Florence recommendations"
      />
      <p className={styles.mapHint}>
        Hover over a pin to discover the place. Use its link to open Google Maps.
      </p>
    </div>
  );
}
