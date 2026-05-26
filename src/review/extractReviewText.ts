const META_PREFIXES = [
  /^analyze this review:\s*/i,
  /^please analyze:\s*/i,
  /^review:\s*/i,
  /^תנתח לי את הביקורת הבאה:\s*/u
];

export function stripReviewMetaPhrases(input: string): string {
  let text = input.trim();
  for (const pattern of META_PREFIXES) {
    text = text.replace(pattern, "");
  }
  return text.trim();
}

function collapseSpaces(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase();
}

function countSpaces(text: string): number {
  return (text.match(/\s/g) ?? []).length;
}

export function resolveReviewText(
  userInput: string,
  routerReviewText: string | null | undefined
): string {
  const strippedInput = stripReviewMetaPhrases(userInput);
  const fromRouter = routerReviewText?.trim() ?? "";

  if (fromRouter.length === 0) {
    return strippedInput;
  }

  const collapsedInput = collapseSpaces(strippedInput);
  const collapsedRouter = collapseSpaces(fromRouter);

  // Same text — prefer the user's input (router often drops spaces).
  if (collapsedInput === collapsedRouter) {
    return strippedInput;
  }

  const normalizedInput = strippedInput.replace(/\s+/g, " ").toLowerCase();
  const normalizedRouter = fromRouter.replace(/\s+/g, " ").toLowerCase();

  if (normalizedInput.includes(normalizedRouter)) {
    return strippedInput;
  }

  if (normalizedRouter.includes(normalizedInput)) {
    return fromRouter;
  }

  if (Math.abs(fromRouter.length - strippedInput.length) <= 5) {
    return countSpaces(strippedInput) >= countSpaces(fromRouter)
      ? strippedInput
      : fromRouter;
  }

  return fromRouter.length >= strippedInput.length * 0.8 ? fromRouter : strippedInput;
}
