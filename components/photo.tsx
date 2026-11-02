import Image from "next/image";
import { uploadUrl } from "@/server/uploads-url";

export function Photo({
  path,
  alt,
  size = 40,
}: {
  path: string | null | undefined;
  alt: string;
  size?: number;
}) {
  const url = uploadUrl(path);
  if (!url) {
    return (
      <span
        style={{ width: size, height: size }}
        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-(--teal-soft) text-xs font-semibold uppercase text-(--teal)"
      >
        {alt.slice(0, 2)}
      </span>
    );
  }
  return (
    <Image
      src={url}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded-xl object-cover"
      style={{ width: size, height: size }}
    />
  );
}
