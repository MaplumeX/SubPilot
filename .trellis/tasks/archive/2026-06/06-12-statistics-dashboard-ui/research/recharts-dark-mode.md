# Research: Recharts Dark Mode with Tailwind CSS / shadcn/ui

- **Query**: How to make Recharts v3 charts work well in dark mode with Tailwind CSS / shadcn/ui
- **Scope**: mixed (internal + external)
- **Date**: 2026-06-12

## Findings

### 1. The Problem: Recharts Default Colors Are Light-Mode Only

Recharts v3.8.1 ships hardcoded light-mode defaults:

| Element | Default | Source |
|---|---|---|
| CartesianGrid `stroke` | `#ccc` | `CartesianGrid.d.ts:defaultCartesianGridProps.stroke` |
| XAxis/YAxis `stroke` | `#666` | `CartesianAxis.js:53` |
| Axis tick text `fill` | inherits axis `stroke` (`#666`) | `CartesianAxis.js:334` (`fill: stroke`) |
| Tooltip content bg | `#fff` | `DefaultTooltipContent.js:defaultDefaultTooltipContentProps.contentStyle.backgroundColor` |
| Tooltip content border | `1px solid #ccc` | `DefaultTooltipContent.js:defaultDefaultTooltipContentProps.contentStyle.border` |
| Tooltip item text color | `#000` | `DefaultTooltipContent.js:defaultDefaultTooltipContentProps.itemStyle.color` |

All of these are invisible or nearly invisible on a dark background.

### 2. CSS Variables Available from shadcn/ui Dark Theme

The project uses shadcn/ui with Tailwind v4. The `index.css` defines these CSS variables under `:root` (light) and `.dark` (dark):

| CSS Variable | Light Value | Dark Value | Use in Charts |
|---|---|---|---|
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Axis tick text, labels |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | Secondary axis text, grid |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | CartesianGrid stroke |
| `--card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Tooltip background |
| `--popover` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Tooltip background (preferred) |
| `--popover-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Tooltip text |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Subtle backgrounds |
| `--primary` | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` | Bar fill (already used in project) |
| `--chart-1` through `--chart-5` | grayscale gradient | same values | Chart color palette |
| `--ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` | Focus ring |

**Key CSS wiring** (from `index.css`):
- `@custom-variant dark (&:is(.dark *))` -- dark mode is class-based via `.dark`
- `--color-foreground: var(--foreground)` etc. -- maps CSS vars to Tailwind color tokens
- The `ThemeProvider` uses `next-themes` with `attribute="class"`, toggling `.dark` on `<html>`

### 3. shadcn/ui ChartContainer Pattern (The Gold Standard)

The shadcn/ui `chart.tsx` component (`ChartContainer`) solves dark mode via **CSS selectors targeting Recharts internal class names**. This is the canonical approach:

```tsx
// From shadcn/ui chart.tsx (GitHub: shadcn-ui/ui, apps/v4/registry/new-york-v4/ui/chart.tsx)
<div
  className={cn(
    "flex aspect-video justify-center text-xs " +
    "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground " +
    "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 " +
    "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border " +
    "[&_.recharts-dot[stroke='#fff']]:stroke-transparent " +
    "[&_.recharts-layer]:outline-hidden " +
    "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border " +
    "[&_.recharts-radial-bar-background-sector]:fill-muted " +
    "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted " +
    "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border " +
    "[&_.recharts-sector]:outline-hidden " +
    "[&_.recharts-sector[stroke='#fff']]:stroke-transparent " +
    "[&_.recharts-surface]:outline-hidden",
    className
  )}
>
```

Key CSS selectors explained:

| Selector | What It Targets | Dark Mode Fix |
|---|---|---|
| `[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground` | Axis tick labels | Forces text to use `--muted-foreground` |
| `[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50` | Grid lines matching default `#ccc` | Uses `--border` with 50% opacity |
| `[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border` | Tooltip cursor line | Uses `--border` |
| `[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border` | Polar grid lines | Uses `--border` |
| `[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted` | Bar chart tooltip cursor fill | Uses `--muted` |

**How this works**: The `[&_...]` syntax is a Tailwind v4 arbitrary variant that generates CSS descendant selectors. Because the parent `<div>` lives inside the `.dark` class context, the Tailwind utility classes (`fill-muted-foreground`, `stroke-border`, etc.) automatically resolve to dark-mode CSS variable values.

### 4. Tooltip Dark Mode: Custom Content Component

The shadcn `ChartTooltipContent` replaces Recharts' default tooltip with a component that uses Tailwind classes:

```tsx
// Key parts of ChartTooltipContent (simplified)
<div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
  <span className="text-muted-foreground">{itemConfig?.label ?? item.name}</span>
  <span className="font-mono font-medium text-foreground tabular-nums">{value}</span>
</div>
```

CSS classes used: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border/50` -- all automatically adapt to dark mode via CSS variables.

**Usage pattern**:
```tsx
<ChartTooltip content={<ChartTooltipContent />} />
// or with indicator:
<ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
```

### 5. Pie Chart with Sector: Text/Label Color Control

For the Pie chart label function, the `PieLabelRenderProps` includes SVG text attributes (`fill`, `stroke`, etc.) inherited from `SVGProps<SVGElement>`.

Current project code (line 153):
```tsx
label={(props: PieLabelRenderProps) => {
  const name = (props.name as string) ?? "";
  const percent = (props.percent as number) ?? 0;
  return `${name} ${(percent * 100).toFixed(0)}%`;
}}
```

When the `label` prop is a function returning a string, Recharts renders it as an SVG `<text>` element. The text color defaults to `fill: stroke` (which is the Pie's stroke, typically not set, falling back to `#666`).

**To make labels adapt to dark mode**, two approaches:

**Approach A** (recommended -- CSS selectors): Add to the parent container's className:
```
[&_.recharts-pie-label]:fill-foreground
```

**Approach B** (inline): Return a custom SVG text element from the label function:
```tsx
label={(props: PieLabelRenderProps) => {
  return (
    <text fill="var(--foreground)" ...>
      {name} {(percent * 100).toFixed(0)}%
    </text>
  );
}}
```

For the Sector `shape` prop (line 158), the `fill` is explicitly set via `COLORS[index]`, which are hardcoded hex values. These work in both themes (they're colored, not grayscale), so no change needed for Sector fill.

### 6. BarChart: Axes and Tooltip Styling

Current project code (lines 223-238):
```tsx
<BarChart data={monthlyData}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="month" />
  <YAxis />
  <Tooltip formatter={(value) => fmt(Number(value))} ... />
  <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
</BarChart>
```

Issues in dark mode:
- `CartesianGrid` defaults to `stroke="#ccc"` (visible on dark but wrong shade)
- `XAxis`/`YAxis` default to `stroke="#666"` (nearly invisible on dark)
- `Tooltip` default content uses white bg + black text

**Fix via CSS selectors** (add to parent container):
```
[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground
[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50
```

**Fix via inline props** (alternative):
```tsx
<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
<XAxis dataKey="month" stroke="var(--border)" tick={{ fill: "var(--muted-foreground)" }} />
<YAxis stroke="var(--border)" tick={{ fill: "var(--muted-foreground)" }} />
<Tooltip contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px" }} itemStyle={{ color: "var(--popover-foreground)" }} labelStyle={{ color: "var(--foreground)" }} />
```

### 7. Common Patterns Summary

There are **three approaches** to make Recharts dark-mode compatible:

| Approach | Pros | Cons | Used By |
|---|---|---|---|
| **A. CSS descendant selectors** (shadcn `ChartContainer`) | Single className on wrapper; declarative; uses Tailwind dark mode automatically | Requires knowing Recharts internal class names; selectors are fragile if Recharts changes class names | shadcn/ui (official) |
| **B. Inline CSS variable references** (`stroke="var(--border)"`) | Explicit; works everywhere; no dependency on class names | Verbose; must be set on every component instance | Common in tutorials |
| **C. Custom content components** (replace default Tooltip/Legend) | Full control; uses Tailwind classes; most flexible | More code; must replace Recharts default rendering | shadcn/ui ChartTooltipContent |

**Best practice**: Use **Approach A** (CSS selectors) via a `ChartContainer`-style wrapper for axis/grid/text, and **Approach C** (custom Tooltip content) for tooltip styling. This is exactly what shadcn/ui's `chart.tsx` provides.

### 8. Recommended Integration Path for This Project

The project does NOT currently use shadcn/ui's `ChartContainer` / `ChartTooltipContent` components. Two options:

**Option 1**: Install shadcn's chart component:
```bash
npx shadcn@latest add chart
```
This adds `components/ui/chart.tsx` with `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`. Then replace `ResponsiveContainer` with `ChartContainer` and `Tooltip` with `ChartTooltip` + `ChartTooltipContent`.

**Option 2**: Manual CSS approach (lighter weight, no new deps):
Add dark-adaptive CSS selectors to the parent `<div>` wrapping each chart, and override Tooltip via `contentStyle`/`itemStyle` or a custom content component.

### Files Found

| File Path | Description |
|---|---|
| `frontend/src/pages/StatisticsPage.tsx` | Current charts implementation (PieChart + BarChart) |
| `frontend/src/index.css` | CSS variables for light/dark themes |
| `frontend/src/components/theme-provider.tsx` | ThemeProvider wrapping next-themes |
| `frontend/src/theme-hook.ts` | useTheme re-export from next-themes |
| `frontend/src/components/theme-toggle.tsx` | Theme toggle component |
| `frontend/node_modules/recharts/types/component/Tooltip.d.ts` | Tooltip props interface |
| `frontend/node_modules/recharts/types/component/DefaultTooltipContent.d.ts` | Default tooltip styling constants |
| `frontend/node_modules/recharts/types/cartesian/XAxis.d.ts` | XAxis props interface |
| `frontend/node_modules/recharts/types/cartesian/CartesianGrid.d.ts` | CartesianGrid props (stroke defaults to '#ccc') |
| `frontend/node_modules/recharts/types/polar/Pie.d.ts` | Pie/Sector/Label type definitions |
| `frontend/node_modules/recharts/es6/cartesian/CartesianAxis.js` | Axis rendering: tick fill inherits stroke (#666) |
| `frontend/node_modules/recharts/es6/component/DefaultTooltipContent.js` | Default tooltip: bg=#fff, text=#000 |

### External References

- [shadcn/ui chart.tsx source](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/chart.tsx) -- the canonical dark-mode Recharts wrapper
- [shadcn/ui Chart docs](https://ui.shadcn.com/docs/components/chart) -- official documentation
- [Recharts v3 API](https://recharts.github.io/) -- component prop references

### Related Specs

- `.trellis/spec/frontend/component-guidelines.md` -- component conventions
- `.trellis/spec/frontend/directory-structure.md` -- where to put new components

## Caveats / Not Found

1. The shadcn/ui chart component (`chart.tsx`) is NOT currently installed in the project. It would need to be added via `npx shadcn@latest add chart` or manually created.
2. The CSS selector approach (`[&_.recharts-...]`) relies on Recharts internal class names. These are stable but not part of the public API. If Recharts changes them in a future version, the selectors would break silently.
3. The `--chart-1` through `--chart-5` variables are defined but have the same values in both light and dark modes in this project's `index.css`. They may need different values for each mode if used as a chart color palette.
4. The `[stroke='#ccc']` attribute selector in the CSS will only match the literal string `#ccc`. If Recharts ever changes the default grid stroke color, this selector stops working.
5. Neither approach (CSS selectors nor inline vars) handles the Tooltip's `contentStyle` / `itemStyle` defaults automatically -- you must either use a custom content component or explicitly override via `contentStyle` / `itemStyle` props.
