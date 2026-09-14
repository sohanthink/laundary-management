import Link from "next/link";

type LogoProps = {
  href?: string;
  compact?: boolean;
};

export function Logo({ href = "/", compact = false }: LogoProps) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-3 text-(--ink)"
    >
      <span className="flex size-10 items-center justify-center rounded-2xl bg-(--teal) text-white shadow-[0_8px_20px_rgba(29,107,92,0.28)]">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
          className="size-5"
        >
          <path
            d="M8 11.5c0-3.2 2.7-5.8 6-5.8h4c3.3 0 6 2.6 6 5.8v1.2H8v-1.2Z"
            fill="currentColor"
            opacity="0.35"
          />
          <path
            d="M7 14.5h18l-1.6 10.2A3 3 0 0 1 20.4 27H11.6a3 3 0 0 1-3-2.3L7 14.5Z"
            fill="currentColor"
          />
          <path
            d="M16 8.5V6.2"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.55rem] tracking-tight">
          an-nafi
        </span>
        {!compact && (
          <span className="mt-1 text-[0.68rem] font-medium uppercase tracking-[0.22em] text-(--muted)">
            Laundry management
          </span>
        )}
      </span>
    </Link>
  );
}
