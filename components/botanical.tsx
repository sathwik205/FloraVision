"use client";
import { useId } from "react";
import type { CropId } from "@/lib/types";
export function CropArt({
  crop,
  className = "",
}: {
  crop: CropId;
  className?: string;
}) {
  const id = useId().replaceAll(":", "");
  return (
    <svg
      className={`crop-art ${className}`}
      viewBox="0 0 120 110"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop
            stopColor={
              crop === "potato"
                ? "#dbbd85"
                : crop === "grape"
                  ? "#b89bc8"
                  : crop === "corn"
                    ? "#f7dc75"
                    : crop === "pepper"
                      ? "#a8c47a"
                      : "#f29b70"
            }
          />
          <stop
            offset="1"
            stopColor={
              crop === "potato"
                ? "#9c7043"
                : crop === "grape"
                  ? "#684b83"
                  : crop === "corn"
                    ? "#c58b27"
                    : crop === "pepper"
                      ? "#437b4b"
                      : "#b94837"
            }
          />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="91" rx="38" ry="7" fill="#213d21" opacity=".09" />
      {crop === "potato" && (
        <g>
          <ellipse
            cx="50"
            cy="61"
            rx="31"
            ry="24"
            transform="rotate(-25 50 61)"
            fill={`url(#${id})`}
          />
          <ellipse
            cx="77"
            cy="72"
            rx="23"
            ry="20"
            transform="rotate(25 77 72)"
            fill={`url(#${id})`}
          />
          {[
            [36, 56],
            [51, 47],
            [57, 67],
            [75, 65],
            [85, 78],
            [31, 68],
          ].map(([x, y], i) => (
            <ellipse
              key={i}
              cx={x}
              cy={y}
              rx="2"
              ry="1.4"
              fill="#846342"
              opacity=".65"
            />
          ))}
          <path d="M61 35Q55 13 88 18Q84 39 61 35" fill="#68854d" />
          <path d="M61 36L80 23" stroke="#c6d3a2" fill="none" />
        </g>
      )}
      {crop === "pepper" && (
        <g>
          <path
            d="M61 31Q39 22 28 41Q17 71 39 87Q51 94 60 84Q74 95 88 79Q102 59 88 38Q79 26 61 31"
            fill={`url(#${id})`}
          />
          <path
            d="M60 31Q57 15 73 12"
            fill="none"
            stroke="#45623c"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M49 38Q37 58 45 78M67 39Q76 59 68 78"
            fill="none"
            stroke="#d3e2b4"
            strokeWidth="3"
            opacity=".4"
          />
        </g>
      )}
      {crop === "corn" && (
        <g>
          <ellipse
            cx="60"
            cy="52"
            rx="19"
            ry="37"
            fill={`url(#${id})`}
            transform="rotate(12 60 52)"
          />
          {[31, 41, 51, 61, 71].map((y) => (
            <path
              key={y}
              d={`M44 ${y}Q60 ${y + 5} 76 ${y}`}
              stroke="#b58c33"
              opacity=".5"
              fill="none"
            />
          ))}
          <path
            d="M52 18L48 80M62 16L59 86M71 22L69 80"
            stroke="#fff1ab"
            opacity=".6"
          />
          <path d="M59 94Q25 69 29 38Q52 57 59 94" fill="#69924d" />
          <path d="M59 94Q90 72 92 41Q66 52 59 94" fill="#477844" />
        </g>
      )}
      {crop === "grape" && (
        <g>
          <path
            d="M59 28Q62 15 76 12"
            fill="none"
            stroke="#6c7543"
            strokeWidth="4"
          />
          {[
            [48, 39],
            [68, 39],
            [39, 55],
            [59, 56],
            [79, 55],
            [48, 73],
            [69, 73],
            [59, 88],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="13" fill={`url(#${id})`} />
              <ellipse
                cx={x - 4}
                cy={y - 5}
                rx="4"
                ry="2"
                fill="#fff"
                opacity=".25"
              />
            </g>
          ))}
          <path d="M59 30Q38 11 31 23Q38 40 59 30" fill="#7d9b54" />
        </g>
      )}
      {crop === "apple" && (
        <g>
          <path
            d="M60 36C35 16 18 45 30 70C39 93 51 94 60 86C70 94 85 87 93 62C103 35 78 22 60 36"
            fill={`url(#${id})`}
          />
          <path
            d="M60 36Q58 23 64 15"
            stroke="#755639"
            strokeWidth="5"
            fill="none"
          />
          <path d="M65 27Q74 6 91 18Q80 34 65 27" fill="#718d4e" />
          <path
            d="M40 43Q30 56 39 70"
            stroke="#ffd2ae"
            strokeWidth="4"
            strokeLinecap="round"
            opacity=".5"
            fill="none"
          />
        </g>
      )}
      {crop === "tomato" && (
        <g>
          <ellipse cx="60" cy="62" rx="37" ry="30" fill={`url(#${id})`} />
          <path
            d="M60 38L44 26L47 39L28 38L46 46L39 57L59 47L75 55L73 44L91 39L70 36L73 22Z"
            fill="#547c43"
          />
          <path
            d="M60 37Q59 25 65 16"
            fill="none"
            stroke="#5b7742"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M37 58Q31 69 42 77"
            fill="none"
            stroke="#ffccb0"
            opacity=".45"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}
export function HeroPlant() {
  return (
    <svg
      className="hero-plant"
      viewBox="0 0 500 400"
      role="img"
      aria-label="Illustration of green leaves"
    >
      <defs>
        <linearGradient id="plant-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#acc76c" />
          <stop offset=".5" stopColor="#618e48" />
          <stop offset="1" stopColor="#285538" />
        </linearGradient>
        <linearGradient id="plant-light" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#d2df96" />
          <stop offset="1" stopColor="#71974d" />
        </linearGradient>
        <filter id="plant-shadow">
          <feDropShadow
            dx="8"
            dy="12"
            stdDeviation="9"
            floodColor="#1d3c28"
            floodOpacity=".18"
          />
        </filter>
      </defs>
      <g fill="none" stroke="#a2b68a" opacity=".38">
        <circle cx="265" cy="194" r="135" />
        <circle cx="265" cy="194" r="167" strokeDasharray="3 8" />
        <path d="M60 195H460M265 20V380" strokeDasharray="3 8" />
      </g>
      <g filter="url(#plant-shadow)">
        <path
          d="M192 350Q236 222 328 70"
          fill="none"
          stroke="#52734b"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M240 235C161 205 139 91 170 46C247 67 286 148 240 235Z"
          fill="url(#plant-leaf)"
        />
        <path
          d="M262 193C269 103 361 45 414 61C412 137 351 208 262 193Z"
          fill="url(#plant-light)"
        />
        <path
          d="M209 300C145 287 96 212 111 154C191 151 244 227 209 300Z"
          fill="url(#plant-light)"
        />
        <path
          d="M225 275C265 214 353 207 389 244C354 298 280 323 225 275Z"
          fill="url(#plant-leaf)"
        />
        <g stroke="#dce9b0" strokeWidth="1.4" opacity=".65" fill="none">
          <path d="M240 235L175 61M263 193L400 68M208 299L119 168M225 275L373 247" />
          <path d="M221 181L180 157M211 151L229 116M199 119L172 100M298 165L309 116M331 135L377 127M181 260L138 244M163 234L165 201M267 267L289 242M308 259L341 281" />
        </g>
      </g>
      <circle
        cx="276"
        cy="192"
        r="65"
        fill="none"
        stroke="#f5ffe9"
        strokeWidth="1.5"
        strokeDasharray="6 6"
        opacity=".8"
      />
      <path
        d="M216 143v-13h13M323 130h13v13M336 242v13h-13M229 255h-13v-13"
        stroke="#f5ffe9"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}
