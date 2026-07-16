export function handleSupabaseResult<T>(
  result: { data: T | null; error: Error | null }
): T {
  if (result.error) {
    throw result.error;
  }

  return result.data as T;
}