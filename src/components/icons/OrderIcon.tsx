import type { SVGProps } from "react";

type OrderIconProps = Omit<
  SVGProps<SVGSVGElement>,
  "children" | "fill" | "stroke" | "viewBox"
>;

export function OrderIcon({
  className,
  "aria-hidden": ariaHidden = true,
  ...props
}: OrderIconProps) {
  return (
    <svg
      {...props}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden={ariaHidden}
      focusable="false"
    >
      <path d="M6.75 3.6h7.1l3.4 3.45V20.4H6.75z" />
      <path d="M13.85 3.6v3.45h3.4" />
      <path d="M9.25 11.2h5.5M9.25 14.35h5.5M9.25 17.5h3.4" />
    </svg>
  );
}
