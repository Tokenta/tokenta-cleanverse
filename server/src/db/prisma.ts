/** Database layer removed — Terminal persists via in-memory stores only. */
export function isDbPersistenceEnabled(): boolean {
  return false;
}

export function getPrisma(): null {
  return null;
}
