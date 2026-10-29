import type { SVGProps } from "react";

/** Three successive positions, cut from the same continuous movement. */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" {...props}>
      <path
        d="M5 29 16 10h8L13 29H5Zm12 0L28 10h7L24 29h-7Z"
        fill="currentColor"
      />
      <path d="m22 33 4-7h9l-4 7h-9Z" fill="currentColor" />
    </svg>
  );
}

export function OutwardArrow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6 18 18 6M6 6h12v12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
