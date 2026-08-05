"use client";

import { useEffect, useRef } from "react";

import styles from "./florence-map.module.css";

export type FlorenceMapSuggestion = {
  id: string;
  title: string;
  description?: string;
  category: "museum" | "food" | "tour";
  position: [latitude: number, longitude: number];
  query?: string;
  order?: number;
  imageUrl?: string;
  photoSourceUrl?: string;
};

type FlorenceMapMode = FlorenceMapSuggestion["category"];

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function markerSvg(category: Exclude<FlorenceMapMode, "tour">) {
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
  const activeModes = Array.from(
    new Set(suggestions.map((suggestion) => suggestion.category)),
  );
  const hasTour = suggestions.some((suggestion) => suggestion.category === "tour");

  useEffect(() => {
    const mapContainer = containerRef.current;
    if (!mapContainer) return;

    let disposed = false;
    let removeMap: (() => void) | undefined;

    void import("leaflet").then((leaflet) => {
      if (disposed || !containerRef.current) return;

      const map = leaflet.map(mapContainer, {
        center: [43.7704, 11.2543],
        zoom: 14,
        scrollWheelZoom: false,
      });

      const handleCommandWheel = (event: WheelEvent) => {
        if (!event.metaKey && !event.ctrlKey) return;

        event.preventDefault();
        event.stopPropagation();

        const zoomDirection = event.deltaY < 0 ? 1 : -1;
        const nextZoom = Math.min(
          map.getMaxZoom(),
          Math.max(map.getMinZoom(), map.getZoom() + zoomDirection),
        );

        map.setZoomAround(map.mouseEventToContainerPoint(event), nextZoom);
      };

      mapContainer.addEventListener("wheel", handleCommandWheel, {
        passive: false,
      });

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        })
        .addTo(map);

      const bounds = leaflet.latLngBounds([]);
      const tourSuggestions = suggestions.filter(
        (suggestion) => suggestion.category === "tour",
      );

      if (hasTour) {
        leaflet
          .polyline(
            tourSuggestions.map((suggestion) => suggestion.position),
            {
              color: "#4b0015",
              dashArray: "2 10",
              lineCap: "round",
              opacity: 0.8,
              weight: 4,
            },
          )
          .addTo(map);
      }

      suggestions.forEach((suggestion) => {
        const isTourStop = suggestion.category === "tour";
        const categoryLabel =
          suggestion.category === "museum"
            ? "Museum"
            : suggestion.category === "food"
              ? "Food"
              : `Stop ${suggestion.order}`;
        const markerClass =
          suggestion.category === "museum"
            ? styles.markerMuseum
            : suggestion.category === "food"
              ? styles.markerFood
              : styles.markerTour;
        const markerContent =
          suggestion.category === "tour"
            ? `<span class="${styles.markerNumber}">${suggestion.order}</span>`
            : markerSvg(suggestion.category);
        const icon = leaflet.divIcon({
          className: styles.markerWrap,
          html: `<span class="${styles.markerCore} ${
            isTourStop ? styles.markerTourCore : ""
          } ${markerClass}">${markerContent}</span>`,
          iconSize: isTourStop ? [34, 34] : [42, 42],
          iconAnchor: isTourStop ? [17, 34] : [21, 42],
          popupAnchor: isTourStop ? [0, -29] : [0, -37],
        });
        const description = suggestion.description
          ? `<span class="${styles.popupDescription}">${escapeHtml(
              suggestion.description,
            )}</span>`
          : "";
        const photo = suggestion.imageUrl
          ? `
            <figure class="${styles.popupPhoto}">
              <img src="${escapeHtml(suggestion.imageUrl)}" alt="${escapeHtml(
                suggestion.title,
              )}" loading="lazy" />
              ${
                suggestion.photoSourceUrl
                  ? `<figcaption><a href="${escapeHtml(
                      suggestion.photoSourceUrl,
                    )}" target="_blank" rel="noopener noreferrer">Photo: Wikimedia Commons</a></figcaption>`
                  : ""
              }
            </figure>
          `
          : "";
        const mapsUrl = googleMapsUrl(suggestion);
        const popup = `
          <div class="${styles.popupContent}">
            <span class="${styles.popupCategory}">${categoryLabel}</span>
            ${photo}
            <a class="${styles.popupTitle}" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">
              <strong>${escapeHtml(suggestion.title)}</strong>
            </a>
            ${description}
            <a class="${styles.popupMapsLink}" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
          </div>
        `;
        const marker = leaflet
          .marker(suggestion.position, {
            icon,
            keyboard: true,
            riseOnHover: true,
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

        marker
          .getElement()
          ?.setAttribute(
            "aria-label",
            suggestion.order
              ? `${suggestion.order}. ${suggestion.title}`
              : suggestion.title,
          );
        marker.on("mouseover focus", () => marker.openPopup());
        bounds.extend(suggestion.position);
      });

      map.fitBounds(bounds, {
        padding: [42, 42],
        maxZoom: hasTour && activeModes.length === 1 ? 16 : 15,
      });

      const fitVisibleMap = () => {
        if (!containerRef.current || containerRef.current.clientWidth === 0) return;

        map.invalidateSize();
        map.fitBounds(bounds, {
          padding: [42, 42],
          maxZoom: hasTour && activeModes.length === 1 ? 16 : 15,
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
        mapContainer.removeEventListener("wheel", handleCommandWheel);
        map.remove();
      };
    });

    return () => {
      disposed = true;
      removeMap?.();
    };
  }, [activeModes.length, hasTour, suggestions]);

  const modeLabels: Record<FlorenceMapMode, string> = {
    museum: "Museums",
    food: "Food",
    tour: "Guided city walk",
  };
  const ariaLabel = `Interactive map of Florence: ${activeModes
    .map((mode) => modeLabels[mode])
    .join(", ")}`;

  return (
    <div className={styles.mapFrame}>
      <div
        ref={containerRef}
        className={styles.map}
        role="region"
        aria-label={ariaLabel}
      />
      <p className={styles.mapHint}>
        {hasTour
          ? "Follow the numbered route. Hold ⌘ and scroll to zoom. Hover over any pin for details and its Google Maps link."
          : "Hold ⌘ and scroll to zoom. Hover over a pin to discover the place and open it in Google Maps."}
      </p>
    </div>
  );
}
