const TINTS = [
  "var(--moss)",
  "var(--recycle)",
  "var(--compost)",
  "var(--dropoff)",
  "var(--hivis)",
];

/**
 * Same name always gets the same colour, so people stay recognisable in a feed.
 * FNV-1a rather than a rolling sum: the naive version bunched real names onto
 * three of the five tints and never produced the other two.
 */
function tintFor(seed: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return TINTS[(hash >>> 0) % TINTS.length];
}

interface AvatarProps {
  seed: string;
  emoji: string;
  size?: "sm" | "md" | "lg";
}

export default function Avatar({ seed, emoji, size = "md" }: AvatarProps) {
  const tint = tintFor(seed);

  return (
    <span
      className={`avatar avatar-${size}`}
      style={{
        background: `color-mix(in srgb, ${tint} 20%, var(--surface))`,
        borderColor: `color-mix(in srgb, ${tint} 45%, transparent)`,
      }}
      aria-hidden="true"
    >
      {emoji}
    </span>
  );
}
