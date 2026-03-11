---
name: mkmedia-design-system
description: Apply MK MEDIA brand rules to any UI work in this repository. Use this skill whenever the user asks to design, restyle, or build any interface (admin, dashboard, forms, tables, navigation, pages, components, modals, states), even if they do not mention "brand" explicitly.
---

# MK MEDIA Design System

Use this skill to keep UI output visually consistent with the MK MEDIA brand manual in all product surfaces.

## When This Skill Must Trigger

Trigger this skill for:
- Any request to improve UI/UX or visual polish.
- Any new page/component layout or redesign.
- Any admin shell/navigation/header/sidebar work.
- Any table, form, card, modal, filter bar, or state badge styling.
- Any request where color/typography/branding consistency matters.

Do not wait for explicit "design system" wording. If the task changes UI, use this skill.

## Brand Constants (Non-Negotiable)

- Primary brand blue: `#0359A8`
- Secondary brand yellow: `#FCB814`
- Corporate naming in branded surfaces: `MK MEDIA`
- Preferred logo usage:
  - Blue logo on white/light backgrounds.
  - White logo on dark/blue backgrounds.
  - Minimum visible logo size: `20px`.
- Primary brand typeface: `Myriad Pro` (use licensed local files when available).

Read `references/manual-digital-summary.md` for the condensed manual rules before coding.

## Implementation Rules

1. Define and reuse tokens instead of hardcoded hex:
- `--mkmedia-blue`
- `--mkmedia-yellow`
- `--font-mkmedia`

2. Use `Myriad Pro` for identity-bearing UI elements:
- Header brand label.
- Brand chips/badges.
- High-identity section labels.

3. Preserve product usability:
- Keep neutral system surfaces for most UI.
- Use brand blue/yellow as purposeful accents for hierarchy, focus, state, and identity.
- Avoid oversaturating entire layouts with brand colors.

4. Accessibility and contrast:
- Ensure readable contrast for text/icons on brand backgrounds.
- Prefer dark text on yellow.
- Prefer white text on blue.

5. Brand consistency in responsive UI:
- Desktop and mobile variants must keep the same logo rules, palette, and typographic identity.

## Do / Don't

Do:
- Keep brand touches concentrated in navigation identity points.
- Use blue for active/selected/admin emphasis states.
- Use yellow for counters, alerts, and attention accents.
- Keep spacing, borders, and shadows restrained and product-oriented.

Don't:
- Reintroduce random hex values when brand tokens exist.
- Mix conflicting brand names on the same branded element.
- Use yellow as body text color on light backgrounds.
- Replace logo variants arbitrarily.

## Delivery Checklist (Mandatory)

Before finalizing any UI task, verify:
- Brand tokens are used instead of ad-hoc colors.
- Logo variant matches background context.
- `MK MEDIA` naming is correct where brand identity is shown.
- `Myriad Pro` usage is applied to identity-bearing elements.
- Mobile and desktop both respect brand rules.
- Interactive states remain clear and accessible.

