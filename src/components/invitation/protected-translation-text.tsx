import { Fragment } from "react";

const PROTECTED_TRANSLATION_TERMS = [
  { match: "Dress Code - Casual Chic", label: "Dress Code - Casual Chic" },
  { match: "Dress Code- Casual Chic", label: "Dress Code - Casual Chic" },
  { match: "Dress code - Casual Chic", label: "Dress Code - Casual Chic" },
  { match: "Dress code- Casual Chic", label: "Dress Code - Casual Chic" },
  {
    match: "Dress Code - Black tie e abito lungo",
    label: "Dress Code - Black tie and long dress",
  },
  {
    match: "Dress Code- Black tie e abito lungo",
    label: "Dress Code - Black tie and long dress",
  },
  {
    match: "Dress code - Black tie e abito lungo",
    label: "Dress Code - Black tie and long dress",
  },
  {
    match: "Dress code- Black tie e abito lungo",
    label: "Dress Code - Black tie and long dress",
  },
  {
    match: "Dress Code - Black Tie and Long Dress",
    label: "Dress Code - Black tie and long dress",
  },
  {
    match: "Dress code - Black Tie and Long Dress",
    label: "Dress Code - Black tie and long dress",
  },
  { match: "Black Tie and Long Dress", label: "Black tie and long dress" },
  { match: "Black Tie e abito lungo", label: "Black tie and long dress" },
  { match: "Black tie e abito lungo", label: "Black tie and long dress" },
  {
    match: "Dinner in the centre of Florence",
    label: "Dinner in the centre of Florence",
  },
  { match: "Dress Code", label: "Dress Code" },
  { match: "Dress code", label: "Dress Code" },
];

const protectedTermPattern = new RegExp(
  `(${PROTECTED_TRANSLATION_TERMS.map(({ match }) =>
    match.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|")})`,
  "gi",
);

const protectedTermLabels = new Map(
  PROTECTED_TRANSLATION_TERMS.map(({ match, label }) => [match.toLowerCase(), label]),
);

function protectedTermLabel(text: string) {
  return protectedTermLabels.get(text.toLowerCase());
}

export function ProtectedTranslationText({ text }: { text: string }) {
  return (
    <>
      {text.split(protectedTermPattern).map((part, index) => {
        const label = protectedTermLabel(part);

        return label ? (
          <span key={`${part}-${index}`} translate="no" className="notranslate">
            {label}
          </span>
        ) : (
          <Fragment key={`${part}-${index}`}>{part}</Fragment>
        );
      })}
    </>
  );
}
