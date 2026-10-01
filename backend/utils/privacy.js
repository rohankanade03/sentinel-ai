export function maskName(name = "") {
  const trimmed = String(name).trim();
  if (!trimmed) return "Citizen";

  return trimmed
    .split(/\s+/)
    .map((part, index) => `${part.charAt(0).toUpperCase()}${index === 0 ? "****" : "."}`)
    .join(" ");
}

export function maskPhone(phone = "") {
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return "Pending";
  if (digits.length <= 4) return `XXXX${digits.slice(-2)}`;
  return `${digits.slice(0, 2)}XXXXXX${digits.slice(-2)}`;
}

export function maskCitizen(citizen = {}) {
  return {
    maskedName: citizen.maskedName || maskName(citizen.name),
    maskedPhone: citizen.maskedPhone || maskPhone(citizen.phone),
  };
}
