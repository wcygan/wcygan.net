import type { SVGProps } from "react";

type DatabaseIconProps = Omit<
  SVGProps<SVGSVGElement>,
  "children" | "fill" | "viewBox"
>;

export function DatabaseIcon({
  className,
  "aria-hidden": ariaHidden = true,
  ...props
}: DatabaseIconProps) {
  return (
    <svg
      {...props}
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden={ariaHidden}
      focusable="false"
    >
      <ellipse cx="24" cy="11" rx="15.5" ry="6" />
      <path d="M8.5 11v13c0 3.3 6.9 6 15.5 6s15.5-2.7 15.5-6V11" />
      <path d="M8.5 24v13c0 3.3 6.9 6 15.5 6s15.5-2.7 15.5-6V24" />
    </svg>
  );
}
