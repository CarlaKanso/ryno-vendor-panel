import Link from "next/link";

export default function RecapNotFound() {
  return (
    <div className="grid h-dvh place-items-center bg-ryno-900 px-6 text-center text-white">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-gold-300">
          Recap
        </p>
        <h1 className="mt-3 font-display text-6xl tracking-wide">No such month.</h1>
        <p className="mt-4 text-white/70">
          A recap lives at <code className="text-white">/recap/YYYY-MM</code>, for a month that
          has already begun.
        </p>
        <Link
          href="/recap"
          className="mt-8 inline-flex h-11 items-center rounded-lg bg-gold-400 px-5 text-sm font-semibold text-ryno-900 hover:bg-gold-300"
        >
          Go to the latest recap
        </Link>
      </div>
    </div>
  );
}
