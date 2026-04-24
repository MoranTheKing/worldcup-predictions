export const PASSWORD_MIN_LENGTH = 10;

const PASSWORD_SYMBOL_PATTERN = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;
const SIMPLE_PASSWORD_PATTERNS = [
  /123456/i,
  /123456789/i,
  /qwerty/i,
  /abcdef/i,
  /password/i,
  /letmein/i,
  /iloveyou/i,
  /admin/i,
  /mundial/i,
  /worldcup/i,
  /מונדיאל/i,
  /(.)\1{4,}/,
];

export type PasswordRequirement = {
  id: "length" | "lowercase" | "uppercase" | "number" | "symbol" | "notObvious";
  label: string;
  passed: boolean;
};

export type PasswordPolicyResult = {
  requirements: PasswordRequirement[];
  passed: boolean;
  score: number;
  label: string;
};

export function evaluatePasswordPolicy(password: string, email = ""): PasswordPolicyResult {
  const normalizedPassword = password.toLowerCase();
  const emailLocalPart = email.split("@")[0]?.trim().toLowerCase() ?? "";
  const containsEmailPart =
    emailLocalPart.length >= 4 && normalizedPassword.includes(emailLocalPart);
  const hasSimplePattern = SIMPLE_PASSWORD_PATTERNS.some((pattern) => pattern.test(password));

  const requirements: PasswordRequirement[] = [
    {
      id: "length",
      label: `לפחות ${PASSWORD_MIN_LENGTH} תווים`,
      passed: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: "lowercase",
      label: "אות קטנה באנגלית",
      passed: /[a-z]/.test(password),
    },
    {
      id: "uppercase",
      label: "אות גדולה באנגלית",
      passed: /[A-Z]/.test(password),
    },
    {
      id: "number",
      label: "מספר אחד לפחות",
      passed: /\d/.test(password),
    },
    {
      id: "symbol",
      label: "סימן מיוחד כמו ! או #",
      passed: PASSWORD_SYMBOL_PATTERN.test(password),
    },
    {
      id: "notObvious",
      label: "לא רצף פשוט או חלק מהאימייל",
      passed: password.length > 0 && !hasSimplePattern && !containsEmailPart,
    },
  ];

  const score = requirements.filter((requirement) => requirement.passed).length;
  const passed = score === requirements.length;

  return {
    requirements,
    passed,
    score,
    label: getPasswordStrengthLabel(score),
  };
}

export function getPasswordPolicyError(password: string, email = "") {
  const policy = evaluatePasswordPolicy(password, email);

  if (policy.passed) {
    return null;
  }

  const missingRequirements = policy.requirements
    .filter((requirement) => !requirement.passed)
    .map((requirement) => requirement.label);

  return `הסיסמה עדיין חלשה. צריך להוסיף: ${missingRequirements.join(", ")}.`;
}

function getPasswordStrengthLabel(score: number) {
  if (score <= 1) {
    return "חלשה מאוד";
  }

  if (score <= 3) {
    return "מתחילה להתחזק";
  }

  if (score <= 5) {
    return "כמעט שם";
  }

  return "חזקה ומוכנה";
}
