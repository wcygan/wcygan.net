import type { SVGProps } from "react";

type KafkaIconProps = Omit<
  SVGProps<SVGSVGElement>,
  "children" | "fill" | "stroke" | "viewBox"
>;

export function KafkaIcon({
  className,
  "aria-hidden": ariaHidden = true,
  ...props
}: KafkaIconProps) {
  return (
    <svg
      {...props}
      className={className}
      viewBox="216 0 369 599"
      fill="none"
      stroke="currentColor"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden={ariaHidden}
      focusable="false"
    >
      <defs>
        <mask
          id="kafka-icon-cutouts"
          x="210"
          y="-5"
          width="384"
          height="610"
          maskUnits="userSpaceOnUse"
        >
          <rect
            x="210"
            y="-5"
            width="384"
            height="610"
            fill="white"
            stroke="none"
          />
          <circle cx="317" cy="76" r="37" fill="black" stroke="none" />
          <circle cx="317" cy="299" r="53" fill="black" stroke="none" />
          <circle cx="507" cy="188" r="37" fill="black" stroke="none" />
          <circle cx="507" cy="410" r="37" fill="black" stroke="none" />
          <circle cx="317" cy="521" r="37" fill="black" stroke="none" />
        </mask>
      </defs>
      <g mask="url(#kafka-icon-cutouts)" fill="currentColor" stroke="none">
        <path
          d="M317 76v445m0-222 190-111M317 299l190 111"
          fill="none"
          stroke="currentColor"
          strokeWidth="36"
        />
        <circle cx="317" cy="76" r="78" />
        <circle cx="317" cy="299" r="101" />
        <circle cx="507" cy="188" r="78" />
        <circle cx="507" cy="410" r="78" />
        <circle cx="317" cy="521" r="78" />
      </g>
    </svg>
  );
}
