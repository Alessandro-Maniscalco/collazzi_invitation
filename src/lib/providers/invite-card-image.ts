import { readFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

const CARD_WIDTH = 1254;
const CARD_HEIGHT = 940;
const CARD_TEXT_COLOR = "#fbf0dc";
const CARD_BACKGROUND_PATH = join(
  process.cwd(),
  "public",
  "assets",
  "collazzi",
  "maniscalco-post-envelope-bg.jpg",
);

export async function renderInviteCardImage(partyLabel: string) {
  const background = await readFile(CARD_BACKGROUND_PATH);
  const overlay = Buffer.from(renderNameOverlay(partyLabel), "utf8");

  return sharp(background)
    .composite([{ input: overlay, left: 0, top: 0 }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}

function renderNameOverlay(partyLabel: string) {
  const lines = wrapName(partyLabel);
  const fontSize = lines.length > 1 ? 86 : 92;
  const lineHeight = Math.round(fontSize * 1.15);
  const firstBaseline = CARD_HEIGHT / 2 - ((lines.length - 1) * lineHeight) / 2;

  const text = lines
    .map((line, index) => {
      const y = Math.round(firstBaseline + index * lineHeight);
      return `<text x="${CARD_WIDTH / 2}" y="${y}" text-anchor="middle">${escapeXml(line)}</text>`;
    })
    .join("");

  return `<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <style>
    text {
      fill: ${CARD_TEXT_COLOR};
      font-family: Georgia, 'Times New Roman', serif;
      font-size: ${fontSize}px;
      font-weight: 400;
      dominant-baseline: middle;
    }
  </style>
  ${text}
</svg>`;
}

function wrapName(value: string) {
  const words = value.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (!words.length) {
    return ["Guest Name"];
  }

  const joined = words.join(" ");
  if (estimateTextWidth(joined, 92) <= 1120) {
    return [joined];
  }

  const lines = words.reduce<string[]>((acc, word) => {
    const current = acc.at(-1);
    if (!current) {
      acc.push(word);
      return acc;
    }

    const candidate = `${current} ${word}`;
    if (estimateTextWidth(candidate, 86) <= 1040 || acc.length >= 2) {
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

function estimateTextWidth(value: string, fontSize: number) {
  return value.length * fontSize * 0.52;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
