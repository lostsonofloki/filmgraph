import { parseOracleQueryConstraints } from "./naturalLanguageSort";

export const resolveOracleQueryConstraints = async (
  prompt,
  {
    constraintsEnabled = false,
    groqIntentEnabled = false,
    groqIntentParser = null,
  } = {}
) => {
  if (!constraintsEnabled) return null;
  if (!groqIntentEnabled || typeof groqIntentParser !== "function") {
    return parseOracleQueryConstraints(prompt);
  }

  try {
    const parsedByGroq = await groqIntentParser(prompt);
    if (parsedByGroq && typeof parsedByGroq === "object") {
      return parsedByGroq;
    }
  } catch (_err) {
    // Fail-soft to deterministic parser.
  }

  return parseOracleQueryConstraints(prompt);
};
