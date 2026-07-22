export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = 0; i < result.length; i++) {
    const j = Math.floor(random() * result.length);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
