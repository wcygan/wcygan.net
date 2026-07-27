import type { SVGProps } from "react";

type CustomerIconProps = Omit<
  SVGProps<SVGSVGElement>,
  "children" | "fill" | "stroke" | "viewBox"
>;

export function CustomerIcon({
  className,
  "aria-hidden": ariaHidden = true,
  ...props
}: CustomerIconProps) {
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
      <circle cx="12" cy="7.25" r="3.15" />
      <path d="M5.6 19.35c.65-3.45 3.05-5.55 6.4-5.55s5.75 2.1 6.4 5.55" />
    </svg>
  );
}
