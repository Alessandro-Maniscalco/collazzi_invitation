"use client";

import { useState } from "react";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/formatters";
import type { AccommodationCard } from "@/lib/types";

import styles from "./invitation-experience.module.css";

function addressLinesFor(card: AccommodationCard) {
  if (card.addressLines?.length) return card.addressLines;
  return card.address
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function AccommodationCarousel({ cards }: { cards: AccommodationCard[] }) {
  const [index, setIndex] = useState(0);
  const card = cards[index];

  if (!card) {
    return null;
  }

  const addressLines = addressLinesFor(card);
  const mapQuery = encodeURIComponent([card.title, ...addressLines].join(" "));

  return (
    <>
      <section data-block-type="templated_block" className={styles.accommodationBlock}>
        <div className={styles.blockContainer}>
          <div className={styles.accommodationInner}>
            <button
              type="button"
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              disabled={index === 0}
              aria-label="Previous accommodation"
              className={cn(styles.carouselArrow, styles.carouselArrowLeft)}
            >
              <ChevronLeft size={28} strokeWidth={1.6} />
            </button>

            <button
              type="button"
              onClick={() => setIndex((current) => Math.min(cards.length - 1, current + 1))}
              disabled={index === cards.length - 1}
              aria-label="Next accommodation"
              className={cn(styles.carouselArrow, styles.carouselArrowRight)}
            >
              <ChevronRight size={28} strokeWidth={1.6} />
            </button>

            <header className={styles.accommodationHeader}>
              <div className={styles.accommodationHeaderInner}>
                <h2 className={styles.accommodationTitle}>Accommodation</h2>
              </div>
            </header>

            <div className={styles.accommodationViewport}>
              <article className={styles.accommodationCard}>
                <figure className={styles.accommodationImageFrame}>
                  <Image
                    src={card.imageSrc}
                    alt={card.title}
                    fill
                    className={styles.accommodationImage}
                    sizes="(max-width: 760px) 160px, 180px"
                  />
                </figure>

                <div className={styles.accommodationDetails}>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.accommodationVenue}
                  >
                    {card.title}
                  </a>

                  {addressLines.map((line) => (
                    <span key={line} className={styles.accommodationAddress}>
                      {line}
                    </span>
                  ))}

                  {card.phone ? (
                    <a
                      href={`tel:${card.phone.replaceAll(" ", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.accommodationPhone}
                    >
                      {card.phone}
                    </a>
                  ) : null}

                  <a
                    href={card.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkButton}
                  >
                    {card.ctaLabel}
                  </a>
                </div>
              </article>
            </div>

            <div className={styles.dots} aria-label="Accommodation pagination">
              {cards.map((item, itemIndex) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show accommodation ${itemIndex + 1}`}
                  aria-current={itemIndex === index}
                  onClick={() => setIndex(itemIndex)}
                  className={styles.dotButton}
                >
                  <span
                    className={cn(styles.dot, itemIndex === index && styles.dotActive)}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
      <hr className={styles.blockHr} />
    </>
  );
}
