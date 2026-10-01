export const LANG_MAP = {
  hi: "Hindi",
  bn: "Bengali",
  te: "Telugu",
  mr: "Marathi",
  ta: "Tamil",
  ur: "Urdu",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  or: "Odia",
  pa: "Punjabi",
  as: "Assamese",
  en: "English",
  ne: "Nepali",
  sd: "Sindhi",
  ks: "Kashmiri",
  sa: "Sanskrit",
  mai: "Maithili",
  mni: "Manipuri",
  doi: "Dogri",
  kok: "Konkani",
  sat: "Santali",
  hinglish: "Hinglish",
};

const romanHindiSignals = [
  "pani",
  "sadak",
  "road",
  "kachra",
  "gutter",
  "bijli",
  "light",
  "toot",
  "band",
  "nahi",
  "hai",
  "area",
  "jama",
  "overflow",
];

export function detectLocalLanguage(text = "") {
  const lower = text.toLowerCase();
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (romanHindiSignals.some((word) => lower.includes(word))) return "hinglish";
  return "en";
}
