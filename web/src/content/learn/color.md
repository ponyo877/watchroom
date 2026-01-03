# WatchRoom Color Palette

## Design Philosophy

WatchRoomの配色は**紫(Purple)**を中心としたエンターテイメント感のあるデザインシステムを採用しています。

- **紫Primary**: Twitch、Discord、Spotifyなど映像/エンターテイメント業界で定番の色
- **ロゴの黄色との調和**: 黄色と紫は補色関係で美しく調和
- **モダンでプレミアム感**: 視覚的なインパクトと高級感を両立

## Brand Colors

| Name | Value | Usage |
|------|-------|-------|
| Primary | `--color-primary` | NewRoom, AddVideo buttons, main actions |
| Logo Yellow | `#FCEA2B` | Logo only (monocle face emoji) |

## External Service Colors (例外)

外部サービスのブランドガイドラインに従い、以下の色はハードコードを許容します。

| Name | Value | Usage |
|------|-------|-------|
| LINE Green | `#00B900` | LINE share button |
| X Black | `#000000` | X (Twitter) share button |

## Logo Colors

| Element | Value | Description |
|---------|-------|-------------|
| Text | `#1A1A1A` | "WatchRoom" text (Roboto Black) |
| Emoji Yellow | `#FCEA2B` | Monocle face background |
| Emoji Stroke | `#000000` | Monocle face outlines |

## Theme Colors (Light Mode)

| Name | OKLch Value | Hex Approx | Usage |
|------|-------------|------------|-------|
| Background | `oklch(0.99 0 0)` | ~#FCFCFC | Page background |
| Foreground | `oklch(0.13 0 0)` | ~#212121 | Text color |
| Card | `oklch(1 0 0)` | #FFFFFF | Card backgrounds |
| Card Foreground | `oklch(0.13 0 0)` | ~#212121 | Card text |
| Primary | `oklch(0.55 0.25 280)` | ~#7C3AED | Accent, links, main buttons |
| Primary Foreground | `oklch(0.98 0 0)` | ~#FAFAFA | Text on primary |
| Secondary | `oklch(0.96 0.01 260)` | ~#F1F5F9 | Secondary backgrounds |
| Secondary Foreground | `oklch(0.2 0 0)` | ~#333333 | Secondary text |
| Muted | `oklch(0.96 0.005 260)` | ~#F1F5F9 | Muted backgrounds |
| Muted Foreground | `oklch(0.5 0 0)` | ~#737373 | Muted text |
| Accent | `oklch(0.92 0.03 280)` | ~#F3F0FF | Light purple hover |
| Accent Foreground | `oklch(0.98 0 0)` | ~#FAFAFA | Text on accent |
| Destructive | `oklch(0.55 0.22 25)` | ~#DC2626 | Error, danger |
| Destructive Foreground | `oklch(0.98 0 0)` | ~#FAFAFA | Text on destructive |
| Border | `oklch(0.9 0.01 260)` | ~#E2E8F0 | Borders |
| Input | `oklch(0.9 0.01 260)` | ~#E2E8F0 | Input borders |
| Ring | `oklch(0.55 0.25 280)` | ~#7C3AED | Focus rings |

## Theme Colors (Dark Mode)

| Name | OKLch Value | Hex Approx | Usage |
|------|-------------|------------|-------|
| Background | `oklch(0.12 0.01 260)` | ~#0F172A | Page background |
| Foreground | `oklch(0.95 0 0)` | ~#F1F5F9 | Text color |
| Card | `oklch(0.16 0.015 260)` | ~#1E293B | Card backgrounds |
| Card Foreground | `oklch(0.95 0 0)` | ~#F1F5F9 | Card text |
| Primary | `oklch(0.7 0.25 280)` | ~#A78BFA | Neon bright purple |
| Primary Foreground | `oklch(0.1 0 0)` | ~#1A1A1A | Text on primary |
| Secondary | `oklch(0.25 0.02 260)` | ~#334155 | Secondary backgrounds |
| Secondary Foreground | `oklch(0.95 0 0)` | ~#F1F5F9 | Secondary text |
| Muted | `oklch(0.22 0.015 260)` | ~#1E293B | Muted backgrounds |
| Muted Foreground | `oklch(0.65 0.01 260)` | ~#94A3B8 | Muted text |
| Accent | `oklch(0.28 0.06 280)` | ~#2D2545 | Dark purple hover |
| Accent Foreground | `oklch(0.1 0 0)` | ~#1A1A1A | Text on accent |
| Destructive | `oklch(0.6 0.25 25)` | ~#EF4444 | Bright red |
| Destructive Foreground | `oklch(0.98 0 0)` | ~#FAFAFA | Text on destructive |
| Border | `oklch(0.28 0.02 260)` | ~#334155 | Borders |
| Input | `oklch(0.22 0.015 260)` | ~#1E293B | Input borders |
| Ring | `oklch(0.7 0.25 280)` | ~#A78BFA | Focus rings |

## Status Colors

| Name | OKLch Value | Hex Approx | Usage |
|------|-------------|------------|-------|
| Success | `oklch(0.6 0.2 145)` | ~#22C55E | Success states, copy confirmation |
| Warning | `oklch(0.75 0.15 85)` | ~#EAB308 | Warning states |
| Info | `oklch(0.6 0.2 230)` | ~#3B82F6 | Info states |

## Border Radius

| Name | Value | Pixels |
|------|-------|--------|
| Default | `0.625rem` | 10px |
| Large | `1rem` | 16px |
| Extra Large | `1.5rem` | 24px |

## Button Colors

| Button | Background | Text | Shadow |
|--------|------------|------|--------|
| NewRoom | `bg-primary` | `text-primary-foreground` | `shadow-primary/25` |
| AddVideo | `bg-primary` | `text-primary-foreground` | `shadow-primary/25` |
| LINE Share | `#00B900` | white | - |
| X Share | black | white | - |
| Copy | `bg-primary` | `text-primary-foreground` | - |

## Usage Guidelines

### DO ✅

- Use `bg-primary` for main action buttons
- Use `text-success` for success messages (e.g., "コピーしました！")
- Use semantic color classes (`bg-primary`, `text-muted-foreground`, etc.)
- Use CSS variables for new color definitions

### DON'T ❌

- Don't hardcode hex colors except for external service brands (LINE, X)
- Don't use standard Tailwind colors (e.g., `bg-green-500`) when semantic alternatives exist
- Don't mix different color systems in the same component

## File References

- Theme CSS: `web/src/styles/globals.css`
- Header: `web/src/components/common/Header.tsx`
- Logo: `web/public/logo.svg`
- Favicon: `web/public/favicon.svg`
