import {
  DM_Sans,
  Figtree,
  Geist,
  Geist_Mono,
  Inter,
  JetBrains_Mono,
  Lora,
  Merriweather,
  Noto_Sans,
  Noto_Serif,
  Nunito_Sans,
  Outfit,
  Playfair_Display,
  Public_Sans,
  Raleway,
  Roboto,
  Roboto_Slab,
} from "next/font/google";
import localFont from "next/font/local";

const inter = Inter({
  subsets: ["latin"],
  preload: false,
  variable: "--font-inter",
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  preload: false,
  variable: "--font-noto-sans",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  preload: false,
  variable: "--font-roboto",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const outfit = Outfit({
  subsets: ["latin"],
  preload: false,
  variable: "--font-outfit",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  preload: false,
  variable: "--font-geist-mono",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  preload: false,
  variable: "--font-dm-sans",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  preload: false,
  variable: "--font-nunito-sans",
});

const figtree = Figtree({
  subsets: ["latin"],
  preload: false,
  variable: "--font-figtree",
});

const raleway = Raleway({
  subsets: ["latin"],
  preload: false,
  variable: "--font-raleway",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  preload: false,
  variable: "--font-public-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  preload: false,
  variable: "--font-jetbrains-mono",
});

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  preload: false,
  variable: "--font-noto-serif",
});

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  preload: false,
  variable: "--font-roboto-slab",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
  variable: "--font-merriweather",
});

const lora = Lora({
  subsets: ["latin"],
  preload: false,
  variable: "--font-lora",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  preload: false,
  variable: "--font-playfair-display",
});

const geistPixelSquare = localFont({
  src: "../../../node_modules/geist/dist/fonts/geist-pixel/GeistPixel-Square.woff2",
  variable: "--font-geist-pixel-square",
  weight: "500",
  fallback: [
    "Geist Mono",
    "ui-monospace",
    "SFMono-Regular",
    "Roboto Mono",
    "Menlo",
    "Monaco",
    "Liberation Mono",
    "DejaVu Sans Mono",
    "Courier New",
    "monospace",
  ],
  adjustFontFallback: false,
  preload: false,
});

export const fontRegistry = {
  geist: {
    label: "Geist",
    font: geist,
  },
  inter: {
    label: "Inter",
    font: inter,
  },
  notoSans: {
    label: "Noto Sans",
    font: notoSans,
  },
  nunitoSans: {
    label: "Nunito Sans",
    font: nunitoSans,
  },
  figtree: {
    label: "Figtree",
    font: figtree,
  },
  roboto: {
    label: "Roboto",
    font: roboto,
  },
  raleway: {
    label: "Raleway",
    font: raleway,
  },
  dmSans: {
    label: "DM Sans",
    font: dmSans,
  },
  publicSans: {
    label: "Public Sans",
    font: publicSans,
  },
  outfit: {
    label: "Outfit",
    font: outfit,
  },
  geistMono: {
    label: "Geist Mono",
    font: geistMono,
  },
  geistPixelSquare: {
    label: "Geist Pixel Square",
    font: geistPixelSquare,
  },
  jetBrainsMono: {
    label: "JetBrains Mono",
    font: jetBrainsMono,
  },
  notoSerif: {
    label: "Noto Serif",
    font: notoSerif,
  },
  robotoSlab: {
    label: "Roboto Slab",
    font: robotoSlab,
  },
  merriweather: {
    label: "Merriweather",
    font: merriweather,
  },
  lora: {
    label: "Lora",
    font: lora,
  },
  playfairDisplay: {
    label: "Playfair Display",
    font: playfairDisplay,
  },
} as const;

export type FontKey = keyof typeof fontRegistry;

export const fontKeys = Object.keys(fontRegistry) as FontKey[];

export const fontVars = Object.values(fontRegistry)
  .map(({ font }) => font.variable)
  .join(" ");

export const fontOptions = fontKeys.map((key) => ({
  key,
  label: fontRegistry[key].label,
}));
