export function uploadUrl(relative: string | null | undefined) {
  return relative ? `/uploads/${relative}` : null;
}
