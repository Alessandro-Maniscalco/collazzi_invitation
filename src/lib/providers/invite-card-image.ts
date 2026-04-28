import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

import sharp from "sharp";
import TextToSVG from "text-to-svg";

const CARD_WIDTH = 1254;
const CARD_HEIGHT = 940;
const CARD_TEXT_COLOR = "#fbf0dc";
const nodeRequire = createRequire(import.meta.url);
const FONT_PATH = nodeRequire.resolve(
  "@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff",
);
const CARD_BACKGROUND_PATH = join(
  process.cwd(),
  "public",
  "assets",
  "collazzi",
  "maniscalco-post-envelope-bg.jpg",
);
let cachedTextToSvg: TextToSVG | null = null;

export async function renderInviteCardImage(partyLabel: string) {
  const background = await readFile(CARD_BACKGROUND_PATH);
  const overlay = Buffer.from(renderNameOverlay(partyLabel), "utf8");

  return sharp(background)
    .composite([{ input: overlay, left: 0, top: 0 }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}

function renderNameOverlay(partyLabel: string) {
  const textToSvg = getTextToSvg();
  const lines = wrapName(partyLabel, textToSvg);
  const fontSize = lines.length > 1 ? 86 : 92;
  const lineHeight = Math.round(fontSize * 1.15);
  const firstBaseline = CARD_HEIGHT / 2 - ((lines.length - 1) * lineHeight) / 2;

  const paths = lines
    .map((line, index) => {
      const y = Math.round(firstBaseline + index * lineHeight);
      return textToSvg.getPath(line, {
        x: CARD_WIDTH / 2,
        y,
        fontSize,
        anchor: "center middle",
        attributes: {
          fill: CARD_TEXT_COLOR,
        },
      });
    })
    .join("");

  return `<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  ${paths}
</svg>`;
}

function getTextToSvg() {
  cachedTextToSvg ??= TextToSVG.loadSync(FONT_PATH);
  return cachedTextToSvg;
}

function wrapName(value: string, textToSvg: TextToSVG) {
  const words = value.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (!words.length) {
    return ["Guest Name"];
  }

  const joined = words.join(" ");
  if (textToSvg.getWidth(joined, { fontSize: 92 }) <= 1120) {
    return [joined];
  }

  const lines = words.reduce<string[]>((acc, word) => {
    const current = acc.at(-1);
    if (!current) {
      acc.push(word);
      return acc;
    }

    const candidate = `${current} ${word}`;
    if (textToSvg.getWidth(candidate, { fontSize: 86 }) <= 1040 || acc.length >= 2) {
      acc[acc.length - 1] = candidate;
    } else {
      acc.push(word);
    }
    return acc;
  }, []);

  if (lines.length <= 2) {
    return lines;
  }

  return [lines.slice(0, -1).join(" "), lines.at(-1) ?? ""];
}
