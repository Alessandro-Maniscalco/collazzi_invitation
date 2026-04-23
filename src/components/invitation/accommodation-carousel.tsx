"use client";

import { useState } from "react";

import Image from "next/image";

import type { AccommodationCard } from "@/lib/types";

export function AccommodationCarousel({ cards }: { cards: AccommodationCard[] }) {
  const [index, setIndex] = useState(0);
  const card = cards[index];

  if (!card) {
    return null;
  }

  return (
    <div className="paper-panel rounded-[2rem] border border-[var(--app-line)] p-6 sm:p-8">
      <div className="section-label text-center">Accommodation</div>
      <div className="mt-6 grid items-center gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="relative mx-auto aspect-square w-full max-w-[22rem] overflow-hidden rounded-full border border-[var(--app-line)] bg-white">
          <Image src={card.imageSrc} alt={card.title} fill className="object-cover" sizes="352px" />
        </div>
        <div className="text-center lg:text-left">
          <h3 className="font-display text-4xl text-stone-950">{card.title}</h3>
          <p className="mt-3 text-stone-700">{card.city}</p>
          <p className="mt-6 text-lg text-stone-700">{card.address}</p>
          <p className="mt-3 text-lg text-stone-700">{card.phone}</p>
          <p className="mt-4 text-sm leading-7 text-stone-600">{card.notes}</p>
          <a
            href={card.ctaUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex rounded-full border border-stone-900 px-5 py-3 text-sm font-semibold text-stone-900"
          >
            {card.ctaLabel}
          </a>
        </div>
      </div>
      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={index === 0}
          className="rounded-full border border-[var(--app-line)] px-4 py-2 text-sm disabled:opacity-40"
        >
          Prev
        </button>
        <div className="flex gap-2">
          {cards.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show accommodation ${itemIndex + 1}`}
              onClick={() => setIndex(itemIndex)}
              className={`h-2.5 w-2.5 rounded-full ${
                itemIndex === index ? "bg-stone-900" : "bg-stone-300"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setIndex((current) => Math.min(cards.length - 1, current + 1))}
          disabled={index === cards.length - 1}
          className="rounded-full border border-[var(--app-line)] px-4 py-2 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
