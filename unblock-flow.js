export const UNBLOCK_CHALLENGE_HISTORY_KEY = "unblockChallengeHistory";

const HISTORY_LIMITS = Object.freeze({
  step1: 3,
  step2: 3,
  consequenceSet: 2
});

const STEP_ONE_VARIANTS = Object.freeze([
  Object.freeze({
    id: "step1-neutral-purpose",
    tone: "neutral",
    title: "",
    description: "Type the sentence below exactly:",
    phraseTemplate: "I am opening {siteLabel} on purpose, not on impulse.",
    buttonLabel: "Continue"
  }),
  Object.freeze({
    id: "step1-neutral-trade",
    tone: "neutral",
    title: "",
    description: "Type the sentence below exactly:",
    phraseTemplate: "If I unblock {siteLabel}, I am choosing distraction right now.",
    buttonLabel: "Continue"
  }),
  Object.freeze({
    id: "step1-neutral-boundary",
    tone: "neutral",
    title: "",
    description: "Type the sentence below exactly:",
    phraseTemplate: "I am about to override my boundary for {siteLabel}.",
    buttonLabel: "Continue"
  }),
  Object.freeze({
    id: "step1-neutral-choice",
    tone: "neutral",
    title: "",
    description: "Type the sentence below exactly:",
    phraseTemplate: "This unblock is a decision to let {siteLabel} in.",
    buttonLabel: "Next Step"
  }),
  Object.freeze({
    id: "step1-medium-slip",
    tone: "medium",
    title: "",
    description: "Type the sentence below exactly:",
    phraseTemplate: "This is another attempt to open {siteLabel}, not a real need.",
    buttonLabel: "Continue"
  }),
  Object.freeze({
    id: "step1-medium-pattern",
    tone: "medium",
    title: "",
    description: "Type the sentence below exactly:",
    phraseTemplate: "I have already tested this boundary today, and I am back at {siteLabel}.",
    buttonLabel: "Continue"
  }),
  Object.freeze({
    id: "step1-medium-bait",
    tone: "medium",
    title: "",
    description: "Type the sentence below exactly:",
    phraseTemplate: "I know {siteLabel} is bait for me right now, and I still want in.",
    buttonLabel: "Continue"
  }),
  Object.freeze({
    id: "step1-medium-loop",
    tone: "medium",
    title: "",
    description: "Type the sentence below exactly:",
    phraseTemplate: "I am circling back to {siteLabel} again instead of staying with my task.",
    buttonLabel: "Next Step"
  }),
  Object.freeze({
    id: "step1-high-compulsion",
    tone: "high",
    title: "",
    description: "Type the sentence below exactly:",
    phraseTemplate: "This is not curiosity. It is compulsion toward {siteLabel}.",
    buttonLabel: "Continue"
  }),
  Object.freeze({
    id: "step1-high-drag",
    tone: "high",
    title: "",
    description: "Type the sentence below exactly:",
    phraseTemplate: "My attention is being dragged back to {siteLabel} again.",
    buttonLabel: "Continue"
  }),
  Object.freeze({
    id: "step1-high-return",
    tone: "high",
    title: "",
    description: "Type the sentence below exactly:",
    phraseTemplate: "I keep returning to {siteLabel} even after blocking it.",
    buttonLabel: "Continue"
  }),
  Object.freeze({
    id: "step1-high-hit",
    tone: "high",
    title: "",
    description: "Type the sentence below exactly:",
    phraseTemplate: "I am about to override the defense because I want the hit from {siteLabel}.",
    buttonLabel: "Last Step"
  })
]);

const STEP_TWO_VARIANTS = Object.freeze([
  Object.freeze({
    id: "step2-neutral-open-anyway",
    tone: "neutral",
    title: "",
    description: "",
    phraseTemplate: "I accept {consequence}. Open {siteLabel} anyway.",
    buttonLabel: "Give Up"
  }),
  Object.freeze({
    id: "step2-neutral-disable-choice",
    tone: "neutral",
    title: "",
    description: "",
    phraseTemplate: "After accepting {consequence}, I still choose to disable the block.",
    buttonLabel: "Give Up"
  }),
  Object.freeze({
    id: "step2-neutral-still-want",
    tone: "neutral",
    title: "",
    description: "",
    phraseTemplate: "I accept {consequence}, and I still want {siteLabel}.",
    buttonLabel: "Give Up"
  }),
  Object.freeze({
    id: "step2-neutral-deliberate",
    tone: "neutral",
    title: "",
    description: "",
    phraseTemplate: "I am choosing {siteLabel} after accepting {consequence}.",
    buttonLabel: "Give Up"
  }),
  Object.freeze({
    id: "step2-medium-again",
    tone: "medium",
    title: "",
    description: "",
    phraseTemplate: "I accept {consequence}. This is another deliberate override.",
    buttonLabel: "Give Up"
  }),
  Object.freeze({
    id: "step2-medium-feed",
    tone: "medium",
    title: "",
    description: "",
    phraseTemplate: "Even after accepting {consequence}, I still want the feed from {siteLabel}.",
    buttonLabel: "Give Up"
  }),
  Object.freeze({
    id: "step2-medium-means",
    tone: "medium",
    title: "",
    description: "",
    phraseTemplate: "I know this means {consequence}, and I am doing it anyway.",
    buttonLabel: "Give Up"
  }),
  Object.freeze({
    id: "step2-medium-repeat",
    tone: "medium",
    title: "",
    description: "",
    phraseTemplate: "I am overriding the defense again after accepting {consequence}.",
    buttonLabel: "Give Up"
  }),
  Object.freeze({
    id: "step2-high-loop",
    tone: "high",
    title: "",
    description: "",
    phraseTemplate: "I accept {consequence}, and I am still feeding the loop.",
    buttonLabel: "Give Up"
  }),
  Object.freeze({
    id: "step2-high-pattern",
    tone: "high",
    title: "",
    description: "",
    phraseTemplate: "I accept {consequence}, and I am breaking my own boundary again.",
    buttonLabel: "Give Up"
  }),
  Object.freeze({
    id: "step2-high-impulse",
    tone: "high",
    title: "",
    description: "",
    phraseTemplate: "I accept {consequence}. I am choosing the impulse anyway.",
    buttonLabel: "Give Up"
  }),
  Object.freeze({
    id: "step2-high-alive",
    tone: "high",
    title: "",
    description: "",
    phraseTemplate: "I know this keeps the pattern alive: {consequence}.",
    buttonLabel: "Give Up"
  })
]);

const CONSEQUENCE_SETS = Object.freeze([
  Object.freeze({
    id: "risk",
    options: Object.freeze([
      Object.freeze({
        id: "risk-double-mental-health",
        label: "MENTAL HEALTH",
        description:
          "More than 3 hours a day is linked to double the risk of poor mental-health outcomes in youth.",
        consequenceText:
          "that more than 3 hours a day is linked to double the risk of poor mental-health outcomes in youth"
      }),
      Object.freeze({
        id: "risk-body-image",
        label: "BODY IMAGE",
        description:
          "46% of adolescents ages 13-17 say social media makes them feel worse about their body image.",
        consequenceText:
          "that 46% of adolescents ages 13-17 say social media makes their body image worse"
      }),
      Object.freeze({
        id: "risk-mental-health-self-report",
        label: "EMOTIONAL COST",
        description: "19% of teens say social media hurts their mental health.",
        consequenceText:
          "that 19% of teens say social media hurts their mental health"
      })
    ])
  }),
  Object.freeze({
    id: "sleep-school",
    options: Object.freeze([
      Object.freeze({
        id: "sleep-school-sleep",
        label: "SLEEP",
        description: "45% of teens say social media hurts the amount of sleep they get.",
        consequenceText:
          "that 45% of teens say social media hurts the amount of sleep they get"
      }),
      Object.freeze({
        id: "sleep-school-productivity",
        label: "PRODUCTIVITY",
        description: "40% of teens say social media hurts how productive they are.",
        consequenceText:
          "that 40% of teens say social media hurts their productivity"
      }),
      Object.freeze({
        id: "sleep-school-grades",
        label: "GRADES",
        description: "22% of teens say social media hurts their grades.",
        consequenceText:
          "that 22% of teens say social media hurts their grades"
      })
    ])
  }),
  Object.freeze({
    id: "habit",
    options: Object.freeze([
      Object.freeze({
        id: "habit-too-much-time",
        label: "LIFE ENERGY",
        description: "45% of teens say they spend too much time on social media.",
        consequenceText:
          "that 45% of teens say they spend too much time on social media"
      }),
      Object.freeze({
        id: "habit-cut-back",
        label: "LOSS OF CONTROL",
        description: "44% of teens say they have cut back on social media and smartphone time.",
        consequenceText:
          "that 44% of teens say they have tried to cut back on social media and smartphone time"
      }),
      Object.freeze({
        id: "habit-hard-to-give-up",
        label: "DEPENDENCE",
        description: "54% of teens say it would be hard for them to give up social media.",
        consequenceText:
          "that 54% of teens say it would be hard for them to give up social media"
      })
    ])
  }),
  Object.freeze({
    id: "pressure",
    options: Object.freeze([
      Object.freeze({
        id: "pressure-drama",
        label: "DRAMA LOAD",
        description: "39% of teens say social media overwhelms them because of all the drama.",
        consequenceText:
          "that 39% of teens say social media overwhelms them because of all the drama"
      }),
      Object.freeze({
        id: "pressure-likes",
        label: "APPROVAL LOOP",
        description: "31% of teens say social media makes them feel pressure to post content that gets likes and comments.",
        consequenceText:
          "that 31% of teens say social media pressures them to post for likes and comments"
      }),
      Object.freeze({
        id: "pressure-left-out",
        label: "SOCIAL EXCLUSION",
        description: "31% of teens say social media makes them feel left out of things their friends do.",
        consequenceText:
          "that 31% of teens say social media makes them feel left out by friends"
      })
    ])
  }),
  Object.freeze({
    id: "attention",
    options: Object.freeze([
      Object.freeze({
        id: "attention-negative-peers",
        label: "PEER DAMAGE",
        description: "48% of teens say social media has a mostly negative effect on people their age.",
        consequenceText:
          "that nearly half of teens say social media has a mostly negative effect on people their age"
      }),
      Object.freeze({
        id: "attention-own-life",
        label: "SELF-WORTH",
        description: "27% of teens say social media makes them feel worse about their own life.",
        consequenceText:
          "that 27% of teens say social media makes them feel worse about their own life"
      }),
      Object.freeze({
        id: "attention-almost-constant",
        label: "ALWAYS ON",
        description: "19% of teens say they use YouTube almost constantly.",
        consequenceText:
          "that 19% of teens say they use YouTube almost constantly"
      })
    ])
  }),
  Object.freeze({
    id: "systems",
    options: Object.freeze([
      Object.freeze({
        id: "systems-no-data-control",
        label: "DATA EXTRACTION",
        description: "60% of teens say they have little or no control over the data social media companies collect.",
        consequenceText:
          "that 60% of teens feel they have little or no control over the data social media companies collect"
      }),
      Object.freeze({
        id: "systems-youTube-signals",
        label: "ALGORITHMIC TARGETING",
        description: "YouTube's recommendation system learns from more than 80 billion signals.",
        consequenceText:
          "that YouTube's recommendation system learns from more than 80 billion signals"
      }),
      Object.freeze({
        id: "systems-low-enjoyment",
        label: "LOW RETURN",
        description: "Only 34% of teens say they enjoy using social media a lot.",
        consequenceText:
          "that only 34% of teens say they enjoy using social media a lot"
      })
    ])
  })
]);

function normalizeRecentIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item) => typeof item === "string" && item.trim()))];
}

function appendRecentId(values, nextId, limit) {
  const base = normalizeRecentIds(values).filter((value) => value !== nextId);

  if (typeof nextId === "string" && nextId) {
    base.push(nextId);
  }

  return base.slice(-limit);
}

function interpolate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function getTone(siteAttemptCountToday) {
  if (siteAttemptCountToday >= 5) {
    return "high";
  }

  if (siteAttemptCountToday >= 2) {
    return "medium";
  }

  return "neutral";
}

function chooseVariant(variants, recentIds) {
  const normalizedRecentIds = new Set(normalizeRecentIds(recentIds));
  const preferredPool = variants.filter((variant) => !normalizedRecentIds.has(variant.id));
  const pool = preferredPool.length > 0 ? preferredPool : variants;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

function buildContextLine(context) {
  if (context.hasBlockedContext) {
    if (context.siteAttemptCountToday > 0) {
      const noun = context.siteAttemptCountToday === 1 ? "hit" : "hits";
      return `Trying to open ${context.siteLabel}. ${context.siteAttemptCountToday} blocked ${noun} today.`;
    }

    return `Trying to open ${context.siteLabel}.`;
  }

  return "";
}

function normalizeContext(context = {}) {
  const siteLabel =
    typeof context.siteLabel === "string" && context.siteLabel.trim()
      ? context.siteLabel.trim()
      : "this site";

  const siteAttemptCountToday =
    Number.isInteger(context.siteAttemptCountToday) && context.siteAttemptCountToday >= 0
      ? context.siteAttemptCountToday
      : 0;

  const totalAttemptsToday =
    Number.isInteger(context.totalAttemptsToday) && context.totalAttemptsToday >= 0
      ? context.totalAttemptsToday
      : 0;

  return {
    siteLabel,
    siteAttemptCountToday,
    totalAttemptsToday,
    hasBlockedContext: Boolean(context.hasBlockedContext)
  };
}

export function normalizeChallengeInput(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeUnblockChallengeHistory(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      recentStep1PhraseIds: [],
      recentStep2PhraseIds: [],
      recentConsequenceSetIds: []
    };
  }

  return {
    recentStep1PhraseIds: normalizeRecentIds(value.recentStep1PhraseIds).slice(
      -HISTORY_LIMITS.step1
    ),
    recentStep2PhraseIds: normalizeRecentIds(value.recentStep2PhraseIds).slice(
      -HISTORY_LIMITS.step2
    ),
    recentConsequenceSetIds: normalizeRecentIds(value.recentConsequenceSetIds).slice(
      -HISTORY_LIMITS.consequenceSet
    )
  };
}

export function recordUnblockChallengeHistory(history, challenge) {
  const normalizedHistory = normalizeUnblockChallengeHistory(history);

  return {
    recentStep1PhraseIds: appendRecentId(
      normalizedHistory.recentStep1PhraseIds,
      challenge?.historyEntryIds?.step1PhraseId ?? "",
      HISTORY_LIMITS.step1
    ),
    recentStep2PhraseIds: appendRecentId(
      normalizedHistory.recentStep2PhraseIds,
      challenge?.historyEntryIds?.step2PhraseId ?? "",
      HISTORY_LIMITS.step2
    ),
    recentConsequenceSetIds: appendRecentId(
      normalizedHistory.recentConsequenceSetIds,
      challenge?.historyEntryIds?.consequenceSetId ?? "",
      HISTORY_LIMITS.consequenceSet
    )
  };
}

export function createUnblockChallenge(context = {}, history = {}) {
  const normalizedContext = normalizeContext(context);
  const normalizedHistory = normalizeUnblockChallengeHistory(history);
  const tone = getTone(normalizedContext.siteAttemptCountToday);
  const templateValues = {
    siteLabel: normalizedContext.siteLabel
  };

  const step1Variant = chooseVariant(
    STEP_ONE_VARIANTS.filter((variant) => variant.tone === tone),
    normalizedHistory.recentStep1PhraseIds
  );
  const step2Variant = chooseVariant(
    STEP_TWO_VARIANTS.filter((variant) => variant.tone === tone),
    normalizedHistory.recentStep2PhraseIds
  );
  const consequenceSet = chooseVariant(
    CONSEQUENCE_SETS,
    normalizedHistory.recentConsequenceSetIds
  );

  return {
    contextLine: buildContextLine(normalizedContext),
    historyEntryIds: {
      step1PhraseId: step1Variant.id,
      step2PhraseId: step2Variant.id,
      consequenceSetId: consequenceSet.id
    },
    steps: [
      {
        id: "step-1",
        title: step1Variant.title,
        description: step1Variant.description,
        phrase: interpolate(step1Variant.phraseTemplate, templateValues),
        buttonLabel: step1Variant.buttonLabel
      },
      {
        id: "step-2",
        title: step2Variant.title,
        description: "",
        choicePrompt: "CHOOSE YOUR SACRIFICE:",
        consequenceOptions: consequenceSet.options.map((option) => ({ ...option })),
        phraseTemplate: interpolate(step2Variant.phraseTemplate, {
          ...templateValues,
          consequence: "{consequence}"
        }),
        buttonLabel: step2Variant.buttonLabel
      }
    ]
  };
}

export function resolveChallengePhrase(step, selectedConsequence = null) {
  if (!step) {
    return "";
  }

  if (typeof step.phrase === "string") {
    return step.phrase;
  }

  if (typeof step.phraseTemplate !== "string") {
    return "";
  }

  const consequenceText = selectedConsequence?.consequenceText ?? "";

  if (!consequenceText) {
    return "";
  }

  return step.phraseTemplate.replace("{consequence}", consequenceText);
}

export function isMatchingUnblockPhrase(step, value, selectedConsequence = null) {
  return normalizeChallengeInput(value) === resolveChallengePhrase(step, selectedConsequence);
}
