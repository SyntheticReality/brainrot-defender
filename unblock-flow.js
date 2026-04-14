export const UNBLOCK_STEPS = Object.freeze([
  Object.freeze({
    title: "ARE YOU SURE?!",
    description: "Type the sentence exactly to give up.",
    phrase: "My higher self is begging me to not unblock."
  }),
  Object.freeze({
    title: "LAST CHANCE",
    description: "Type the final sentence exactly to give up.",
    phrase: "I admit defeat."
  })
]);

export function normalizeChallengeInput(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function isMatchingUnblockPhrase(stepIndex, value) {
  return normalizeChallengeInput(value) === (UNBLOCK_STEPS[stepIndex]?.phrase ?? "");
}
