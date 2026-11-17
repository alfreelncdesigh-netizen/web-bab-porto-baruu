export async function ensureInitialData(): Promise<void> {
  // Do not seed dummy/mock projects, blogs, or templates into user's database
  // Only user added/edited content should exist.
  return Promise.resolve();
}

