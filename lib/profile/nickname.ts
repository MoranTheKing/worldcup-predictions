export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 20;

export function normalizeNicknameInput(value: FormDataEntryValue | string | null | undefined) {
  const normalized = value?.toString().trim().replace(/\s+/g, " ") ?? "";
  return normalized.length >= NICKNAME_MIN_LENGTH && normalized.length <= NICKNAME_MAX_LENGTH
    ? normalized
    : null;
}

export function getNicknameFormatError() {
  return `צריך לבחור כינוי באורך ${NICKNAME_MIN_LENGTH}-${NICKNAME_MAX_LENGTH} תווים.`;
}

export function getNicknameTakenError() {
  return "הכינוי הזה כבר תפוס. צריך לבחור כינוי אחר.";
}

export function getNicknameHelperText() {
  return "זה השם שיופיע בליגות, בטבלאות ובמסכי ההשוואה מול שחקנים אחרים.";
}
