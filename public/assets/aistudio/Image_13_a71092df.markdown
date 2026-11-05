---
name: Requirements Intelligence System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#6b38d4'
  on-secondary: '#ffffff'
  secondary-container: '#8455ef'
  on-secondary-container: '#fffbff'
  tertiary: '#006242'
  on-tertiary: '#ffffff'
  tertiary-container: '#007d55'
  on-tertiary-container: '#bdffdb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  code-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a balance between rigorous software engineering governance and clean, friction-free ergonomics. Designed specifically for technical analysts, product managers, and systems architects evaluating requirements against ISO/IEC/IEEE 29148:2018 and the Quality User Story (QUS) framework, the aesthetic removes cognitive overhead from high-density data verification.

### Design Movement & Principles
- **Modern Corporate Precision:** Structured surfaces, crisp grid adherence, and deliberate typographic rhythm replace decorative noise.
- **Ergonomic Density:** Technical audits, RAG pipeline outputs, and compliance matrices demand high scannability; layouts rely on purposeful whitespace rather than tight compression.
- **Assurance & Predictability:** The system uses distinct semantic cues to differentiate human input, deterministic validation, and non-deterministic AI generation.

## Colors

The palette establishes clarity across auditing states, automated LLM synthesis, and complex requirements validation pipelines.

### Primary & Functional Roles
- **Primary Indigo (`#2563EB`):** Applied to primary actions, interactive selection states, active navigation tabs, and system confirmations.
- **Secondary AI Violet (`#8B5CF6`):** Reserved exclusively for generative intelligence, vector search indicators, RAG lineage badges, and prompt enhancement interactions.
- **Tertiary Compliance Emerald (`#10B981`):** Indicates strict adherence to standard syntax, acceptance criteria fulfillment, and passing ISO/IEC/IEEE 29148:2018 checkpoints.
- **Warning Amber (`#F59E0B`):** Highlights semantic ambiguities, missing acceptance criteria, or incomplete QUS syntactic units (e.g., missing persona, lack of testability).
- **Error Rose (`#EF4444`):** Flags critical syntax failures, non-conforming clauses, or contradictions detected in requirements sets.

### Neutral Foundation
- **Canvas Base (`#F8FAFC`):** Soft, low-strain cool slate backdrop providing contrast without the glare of pure white.
- **Surface Elevation (`#FFFFFF`):** Base layer for cards, sheet modals, and input fields.
- **Border Subtle (`#E2E8F0`):** Structural divider for sections, card perimeters, and modular blocks.
- **Text Primary (`#0F172A`):** Deep slate ensuring maximum contrast ratios for technical requirements text.
- **Text Secondary (`#475569`):** Metadata, audit timestamps, and field descriptions.
- **Text Muted (`#94A3B8`):** Placeholders, disabled states, and inactive tab icons.

## Typography

Inter governs the entire typographic stack, leveraging its optical metrics, open counters, and high x-height to maximize legibilidade across dense engineering data, inline tokens, and audit summaries.

### Hierarchical Roles
- **Headlines (`headline-lg` through `headline-sm`):** Reserved for view-level navigation headers, requirement identifiers, and modal titles. Mobile scale dampens large sizes to preserve viewport area.
- **Body (`body-lg`, `body-md`, `body-sm`):** Structured for user story templates (*"Como um [ator], quero [ação], para que [benefício]"*). The line height allows comfortable reading during multi-paragraph requirement analysis.
- **Labels (`label-lg`, `label-md`, `label-sm`):** Tuned with slight positive tracking for chips, status tags, compliance scores, and metadata badges.
- **Technical Snippets (`code-md`):** Uses tabular numeral OpenType settings (`tnum`, `cv05`) for verification metrics, ISO clause identifiers, and token cost indicators.

## Layout & Spacing

The layout model optimizes space for touch-first handheld operation while maintaining standard enterprise tablet support.

### Grid & Canvas Structure
- **Mobile Handheld (360px - 599px):** Single-column layout. Standard edge margin is `1rem` (16px), with `1rem` gutters separating inline card clusters.
- **Tablet / Responsive (600px+):** Expands to a multi-pane split view (e.g., requirement list on the left 40%, ISO analysis & RAG contextual inspector on the right 60%), with outer margins expanding to `1.5rem` (24px).
- **Rhythm Multiplier:** A strict 4px/8px incremental base scales all vertical margins and gaps, preventing mismatched alignments when stacking complex analysis widgets.

## Elevation & Depth

Visual hierarchy combines clean tonal surfaces with subtle, cool-tinted drop shadows, keeping data readable without heavy structural borders.

### Elevation Hierarchy
- **Level 0 (Flat Canvas):** `#F8FAFC` background. Never receives drop shadows.
- **Level 1 (Structural Cards & Modules):** `#FFFFFF` surfaces sitting on Level 0. Outlined with a 1px border (`#E2E8F0`) and supported by an ambient shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
- **Level 2 (Active/Selected Requirements & Interactive Sheets):** Applied to active story cards, contextual drawers, and RAG lineage cards. Elevation: `0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Modals & Overlays):** Full-screen ISO checklist drawers, validation bottom-sheets, and action menus. Elevation: `0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.
- **AI Ambient Glow:** Modules dynamically receiving RAG context or undergoing evaluation receive a focused, 1px perimeter glow in `#8B5CF6` at 30% opacity, paired with an ambient tint of `rgba(139, 92, 246, 0.06)`.

## Shapes

The design system uses a balanced rounding radius (`roundedness: 2`) to make corporate technical tools feel modern and approachable without sacrificing structural density.

### Radius Implementations
- **Standard Controls (Inputs, Buttons, Dropdowns):** `rounded-md` (0.5rem / 8px) ensures buttons fit alongside standard field labels.
- **Cards and Data Groups:** `rounded-lg` (1rem / 16px) defines user story cards, checklist clusters, and criteria blocks.
- **Containers and Bottom Sheets:** `rounded-xl` (1.5rem / 24px) creates soft transitions for incoming bottom modals and contextual inspection sheets.
- **Badges and Pills:** Fully rounded (9999px) for status indicators, ISO reference tags, and quality flags.

## Components

### Buttons
- **Primary:** Solid `#2563EB` fill, `#FFFFFF` text, `rounded-md` (8px). Touch target: minimum 48px height. State changes utilize `#1D4ED8` on press.
- **Secondary / Ghost:** Outlined with 1px `#E2E8F0`, `#0F172A` text, hover/press state tinted with `#F1F5F9`.
- **AI Action Variant:** Gradient accent or solid `#8B5CF6` with a soft purple aura. Used for triggers like *"Gerar Critérios com RAG"* or *"Auditar Sintaxe QUS"*.

### Chips & Badges
- **Compliance Status (ISO/IEC/IEEE 29148):** Emerald pill (`#ECFDF5` background, `#047857` label, 1px border `#A7F3D0`).
- **Gap / Ambiguity Tag:** Amber pill (`#FFFBEB` background, `#B45309` label, 1px border `#FDE68A`).
- **AI / Vector Context Badge:** Violet pill (`#F5F3FF` background, `#6D28D9` label, 1px border `#DDD6FE`), often prepended by an inline spark icon.

### Form Inputs & Story Editors
- **Surface & State:** `#FFFFFF` fill, 1px `#CBD5E1` border, 8px radius. Active focus applies a 2px ring in `#2563EB` with an offset of 1px.
- **Requirement Block Editor:** Specialized split fields highlighting three discrete elements:
  1. *Como um* (Role input)
  2. *Quero* (Feature/Action input)
  3. *Para que* (Business Value input)
  Each section has an integrated validation icon indicating syntax completeness.

### Cards
- **Requirement Story Card:** White background, Level 1 elevation, `rounded-lg` (16px), 16px internal padding. Left edge features a 4px vertical status stripe (Emerald = Compliant, Amber = Needs Review, Slate = Draft).
- **RAG Lineage Card:** Translucent slate/violet background (`#FAF5FF`), containing the cited document section, retrieval confidence score, and raw clause reference.

### Verification Checklists & Radio Lists
- **Checkboxes:** 20px x 20px square with a 4px corner radius. Border `#94A3B8`, active fill `#10B981` with a white checkmark for passing acceptance criteria.
- **Radio Buttons:** 20px circular indicator for strict rule selection (e.g., selecting standard formats: Connextra, INVEST, or Standard Clause). Active state is `#2563EB`.

### Metric Radial & Score Bars
- Visual progress bars showing requirements quality (e.g., "Índice de Qualidade QUS: 92%"). Background `#E2E8F0`, foreground filled dynamically via Emerald (`#10B981`) or Amber (`#F59E0B`) based on threshold levels.