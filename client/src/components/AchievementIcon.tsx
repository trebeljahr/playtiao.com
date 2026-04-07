import type { AchievementTier } from "@shared";

const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: "#92400e",
  silver: "#64748b",
  gold: "#ca8a04",
  platinum: "#06b6d4",
};

const MUTED = "#a89a7e";

type IconProps = { color: string };

// ---------------------------------------------------------------------------
// Per-achievement SVG path data (24x24 viewBox, stroke-based)
// ---------------------------------------------------------------------------

function FootstepIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 3c1 0 2 1.5 2 4s-1 4-2 4-2-1.5-2-4 1-4 2-4zM15 5c1 0 2 1.2 2 3.5S16 12 15 12s-2-1.2-2-3.5S14 5 15 5zM6 14c.5-.5 2-.5 3 .5s1.5 2.5 1 3.5-2 1.5-3 .5S5.5 16 6 14zM14 15c.5-.3 1.8-.2 2.5.8s.8 2.3.3 2.8-1.8.2-2.5-.8-.8-2.5-.3-2.8z"
    />
  );
}

function BarChartIcon({ color }: IconProps) {
  return (
    <>
      <path
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2}
        d="M6 20V14M10 20V10M14 20V6M18 20V3"
      />
      <path stroke={color} strokeLinecap="round" d="M3 20h18" />
    </>
  );
}

function CoffeeIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 8h12a2 2 0 012 2v2a2 2 0 01-2 2h-1M5 8v6a4 4 0 004 4h2a4 4 0 004-4V8M5 8H3M8 3v2M12 3v2M16 3v2M5 20h14"
    />
  );
}

function HelmetIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 14c0-4.4 3.6-8 8-8s8 3.6 8 8M4 14h16M4 14v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 6V3M8 14v-2a4 4 0 018 0v2"
    />
  );
}

function MedalStarIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 2l2.4 4.8 5.3.8-3.8 3.7.9 5.3L12 14.2l-4.8 2.4.9-5.3L4.3 7.6l5.3-.8L12 2zM8 18l-2 4M16 18l2 4"
    />
  );
}

function FallingIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3a2 2 0 100 4 2 2 0 000-4zM10 9l-3 5M14 9l3 3M9 14l-2 7M15 12l2 9M11 14h2"
    />
  );
}

function BrokenHorseshoeIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 20V12a5 5 0 0110 0v8M7 20H5M17 20h2M12 7v0M11 12l2-3M13 15l-2-1"
    />
  );
}

function BoxingGloveIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 4h5a4 4 0 014 4v3a3 3 0 01-3 3h-1l-1 2H9l-1-2a3 3 0 01-3-3V8a4 4 0 013-3.9M9 16v4M14 16v4M6 8h2"
    />
  );
}

function BabyBottleIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 2h4v3l2 2v10a3 3 0 01-3 3h-2a3 3 0 01-3-3V7l2-2V2zM8 10h8M8 14h8"
    />
  );
}

function RobotIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 9h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2zM12 9V6M9 6h6M9 14h0M15 14h0M10 17h4M3 13H1M23 13h-2"
    />
  );
}

function SkullIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 2a8 8 0 00-8 8c0 2.5 1.2 4.8 3 6.2V19a1 1 0 001 1h8a1 1 0 001-1v-2.8c1.8-1.4 3-3.7 3-6.2a8 8 0 00-8-8zM9 12a1 1 0 100 2 1 1 0 000-2zM15 12a1 1 0 100 2 1 1 0 000-2zM10 20v1M14 20v1"
    />
  );
}

function FlameIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 2c1.5 3 5 5 5 9a5 5 0 01-10 0c0-4 3.5-6 5-9zM12 18a2 2 0 01-2-2c0-1.5 2-3 2-3s2 1.5 2 3a2 2 0 01-2 2z"
    />
  );
}

function BellIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0M1 3l2 2M23 3l-2 2M21 8h1M2 8h1"
    />
  );
}

function HourglassIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 2h12M6 22h12M7 2v4l5 5 5-5V2M7 22v-4l5-5 5 5v4M12 12v0M20 11l1 1-1 1"
    />
  );
}

function TwoPeopleIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
    />
  );
}

function ButterflyIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6c-3-4-8-3-8 1s4 6 8 5c4 1 8-1 8-5s-5-5-8-1zM12 6v14M9 20l3-2 3 2"
    />
  );
}

function CrownIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2 8l4 12h12l4-12-5 4-5-8-5 8-5-4zM6 20h12"
    />
  );
}

function LaurelIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18c-1-3-1-6 0-9 1-2 2-4 4-5M18 18c1-3 1-6 0-9-1-2-2-4-4-5M4 14c-1-1-2-3-1-5M20 14c1-1 2-3 1-5M3 10c0-2 1-3 2-4M21 10c0-2-1-3-2-4M12 2l-1 3M12 2l1 3M9 21h6M12 17v4"
    />
  );
}

function GradCapIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2 10l10-5 10 5-10 5-10-5zM6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5M22 10v6"
    />
  );
}

function BinocularsIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 8a4 4 0 108 0M11 8a4 4 0 108 0M5 8v8a3 3 0 006 0V8M13 8v8a3 3 0 006 0V8M11 8h2M11 12h2"
    />
  );
}

function DoorExitIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
    />
  );
}

function OwlIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3C8 3 4 6 4 11c0 3 1 5 3 7l1 3h8l1-3c2-2 3-4 3-7 0-5-4-8-8-8zM9 11a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM15 11a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM12 15l-1 2h2l-1-2zM8 3L6 1M16 3l2-2"
    />
  );
}

function RocketIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 2c-2 4-3 7-3 10a3 3 0 006 0c0-3-1-6-3-10zM9 12H5l2 4M15 12h4l-2 4M9 22c0-2 1-3 3-4 2 1 3 2 3 4"
    />
  );
}

function RisingArrowIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 20L9 8l4 6 8-12M17 2h4v4M3 20l4-1M3 20l1-4"
    />
  );
}

function DiamondIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 3h12l4 7-10 12L2 10l4-7zM2 10h20M12 22L8 10M12 22l4-12M6 3l2 7M18 3l-2 7M12 3v7"
    />
  );
}

function SlingshotIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 22V10M16 22V10M8 10c0-4 2-7 4-8 2 1 4 4 4 8M5 8l3 2M19 8l-3 2M12 2a1 1 0 100 2 1 1 0 000-2z"
    />
  );
}

function GridBoardIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 3h18v18H3V3zM3 9h18M3 15h18M9 3v18M15 3v18M6 6h0M18 12h0M12 18h0"
    />
  );
}

// Trophy fallback for unknown IDs
function TrophyFallbackIcon({ color }: IconProps) {
  return (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 9V2h12v7a6 6 0 01-12 0zM6 4H4a1 1 0 00-1 1v1a4 4 0 004 4M18 4h2a1 1 0 011 1v1a4 4 0 01-4 4M9 21h6M12 15v6"
    />
  );
}

// ---------------------------------------------------------------------------
// Icon registry
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, (props: IconProps) => React.JSX.Element> = {
  "first-move": FootstepIcon,
  "getting-started": BarChartIcon,
  regular: CoffeeIcon,
  centurion: HelmetIcon,
  veteran: MedalStarIcon,
  "first-fall": FallingIcon,
  "tough-luck": BrokenHorseshoeIcon,
  "punching-bag": BoxingGloveIcon,
  "ai-easy": BabyBottleIcon,
  "ai-medium": RobotIcon,
  "ai-hard": SkullIcon,
  "speed-demon": FlameIcon,
  "buzzer-beater": BellIcon,
  "one-second-glory": HourglassIcon,
  "first-friend": TwoPeopleIcon,
  "social-butterfly": ButterflyIcon,
  "top-one-percent": CrownIcon,
  "tournament-champion": LaurelIcon,
  "tutorial-complete": GradCapIcon,
  spectator: BinocularsIcon,
  "rage-quit": DoorExitIcon,
  "night-owl": OwlIcon,
  speedrun: RocketIcon,
  "comeback-kid": RisingArrowIcon,
  "flawless-victory": DiamondIcon,
  "david-vs-goliath": SlingshotIcon,
  "checkered-past": GridBoardIcon,
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function AchievementIcon({
  id,
  tier,
  unlocked = true,
  className = "h-6 w-6",
}: {
  id: string;
  tier: AchievementTier;
  unlocked?: boolean;
  className?: string;
}) {
  const color = unlocked ? TIER_COLORS[tier] : MUTED;
  const IconComponent = ICON_MAP[id] ?? TrophyFallbackIcon;

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth={1.8}>
      <IconComponent color={color} />
    </svg>
  );
}
