// 직접 그린 아이콘 (1.75 획, 20px 격자)

const PATHS = {
  play: <path d="M6.5 4.5v11l9-5.5z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <path d="M7 4.5v11" />
      <path d="M13 4.5v11" />
    </>
  ),
  skip: (
    <>
      <path d="M4.5 4.5v11l7-5.5z" fill="currentColor" stroke="none" />
      <path d="M15 4.5v11" />
    </>
  ),
  replay: (
    <>
      <path d="M4.5 10a5.5 5.5 0 1 0 1.8-4.1" />
      <path d="M4 3.5v3.5h3.5" />
    </>
  ),
  next: <path d="M7.5 4.5l5.5 5.5-5.5 5.5" />,
  prev: <path d="M12.5 4.5L7 10l5.5 5.5" />,
  check: <path d="M4.5 10.5l3.5 3.5 7.5-8" />,
  grip: (
    <>
      <path d="M7.5 5h.01M12.5 5h.01M7.5 10h.01M12.5 10h.01M7.5 15h.01M12.5 15h.01" strokeWidth="2.5" />
    </>
  ),
  up: <path d="M5 12.5l5-5 5 5" />,
  down: <path d="M5 7.5l5 5 5-5" />,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
