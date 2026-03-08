export function sortSections<T extends { name: string; rank?: number }>(sections: T[]): T[] {
  return [...sections].sort((a, b) => {
    const aRanked = a.rank != null;
    const bRanked = b.rank != null;
    if (aRanked && bRanked) {
      if (a.rank !== b.rank) return a.rank! - b.rank!;
      return a.name.localeCompare(b.name);
    }
    if (aRanked) return -1;
    if (bRanked) return 1;
    return a.name.localeCompare(b.name);
  });
}
