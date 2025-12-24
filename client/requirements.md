## Packages
react-player | For handling video playback across different sources smoothly
lucide-react | Already in stack, but emphasizing usage for high-quality icons
framer-motion | For smooth animations of the grid and controls
clsx | For conditional class merging
tailwind-merge | For safe class merging

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["var(--font-display)"],
  body: ["var(--font-body)"],
  mono: ["var(--font-mono)"],
}
API expects standard pagination: GET /api/videos?page=X&limit=4
Dark mode forced by default for this aesthetic.
