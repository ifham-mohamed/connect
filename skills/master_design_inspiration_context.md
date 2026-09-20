# Master Design Inspiration Context

> Knowledge consolidation only. This document preserves and normalizes design inspiration extracted from multiple independent context packs. It is not an implementation specification and does not imply that any pattern has already been implemented.

## Source Traceability Key

The source files did not contain permanent cross-pack inspiration IDs, so this master document assigns stable **source-local trace IDs** only for provenance. These IDs do not change the meaning of the source material.

| Context Pack ID | Source file | Source-local inspiration prefix | Primary subject |
|---|---|---|---|
| CP-01 | `data-table-ux-implementation-brief(1).md` | `DT-*` | Dense data-table behavior and interaction |
| CP-02 | `UI_UX_Implementation_Brief_README(1).md` | `PD-*` | Compact productivity UI, keyboard access, motion, spacing |
| CP-03 | `README_UI_UX_Implementation_Brief(1).md` | `LP-*` | Outcome-first, product-led landing/interface communication |
| CP-04 | `responsive_table_ux_implementation_brief(1).md` | `RT-*` | Responsive table restructuring and progressive disclosure |
| CP-05 | `README_Dashboard_Design_Implementation_Brief(1).md` | `DB-*` | Information-first dashboards, KPI hierarchy, semantic elevation |

### Source-local inspiration IDs

**CP-01 — Data Table UX**
- `DT-01` Semantic text/numeric alignment
- `DT-02` Restrained default row styling
- `DT-03` Density as a controlled system
- `DT-04` Sticky column headers
- `DT-05` Sticky identity columns during horizontal scrolling
- `DT-06` Explicit missing-value representation
- `DT-07` One-line long-text truncation with secondary full-value reveal
- `DT-08` Preserve meaningful numeric precision
- `DT-09` Contextual row actions
- `DT-10` Mouse/keyboard/touch action parity
- `DT-11` Active sort-state emphasis
- `DT-12` Progressive emphasis and content-first table styling

**CP-02 — Compact Productivity UI**
- `PD-01` Compact information density (~13px text, ~32px dense rows as observed reference)
- `PD-02` Subtle border/surface hierarchy with minimal ordinary shadow
- `PD-03` Mostly neutral color system with a dominant accent
- `PD-04` Status communication beyond color alone
- `PD-05` Global searchable command palette
- `PD-06` Shortcut discoverability near associated commands
- `PD-07` Very fast, direct, non-overshooting motion
- `PD-08` Shared spacing/alignment rhythm, including a 4px reference grid
- `PD-09` Structured rows/columns for repeated comparable data
- `PD-10` Stable hover and selection geometry
- `PD-11` Shared design-system consistency
- `PD-12` Larger touch targets (~44–48px) as an interpretation for touch contexts

**CP-03 — Outcome-First / Product-Led Communication**
- `LP-01` Outcome-first hero/message framing
- `LP-02` Meaningful visual emphasis over decoration
- `LP-03` One dominant primary action with a quieter secondary path
- `LP-04` Concrete, measurable proof
- `LP-05` Product/interface views as evidence
- `LP-06` Unified value narrative: outcome → context → action → evidence → proof
- `LP-07` “1 accent · 0 blobs” as a restraint principle, not a literal rule
- `LP-08` “50/50 → 90/10” as a metaphor for action hierarchy, not a numeric requirement
- `LP-09` “One quote beats ten thousand” as a quality-over-quantity proof principle

**CP-04 — Responsive Table UX**
- `RT-01` Semantic information ranking
- `RT-02` Structural transformation between wide and narrow states
- `RT-03` Stable placement of important comparable values
- `RT-04` Contextual labels only where headers/meaning are lost
- `RT-05` Inline expansion for secondary detail
- `RT-06` Bottom-sheet detail reveal
- `RT-07` Component-owned breakpoints
- `RT-08` “Hidden is not deleted” preservation of secondary information
- `RT-09` Identity → Value → State as a reference priority model
- `RT-10` ~700px as an example component threshold, not a fixed requirement

**CP-05 — Information-First Dashboard**
- `DB-01` Purposeful visual emphasis
- `DB-02` Data-first KPI hierarchy: label → primary value → supporting context
- `DB-03` Unequal visual weight for unequal information importance
- `DB-04` Semantic elevation: stronger shadow for genuinely floating layers
- `DB-05` Contextual analytical framing for metrics
- `DB-06` Metric-specific change semantics
- `DB-07` Trend visuals only when they add interpretation
- `DB-08` Prefer useful analytical context over generic high-value-space greetings

---

## 1. Design Philosophy

The recurring design philosophy across the supplied context packs is **information-first restraint**: strong visual treatment is most useful when it communicates meaning, state, priority, context, or action rather than merely adding decoration. This appears in table styling, dense productivity interfaces, outcome-led communication, responsive data restructuring, and dashboard hierarchy. (`DT-12`, `PD-02`, `PD-03`, `LP-02`, `DB-01`)

A second recurring principle is **hierarchy should reflect actual importance**. Important content, values, actions, and context may receive stronger emphasis, while secondary information remains available without competing for attention. (`LP-03`, `DB-02`, `DB-03`, `RT-01`)

A third recurring principle is **preserve meaning during compression**. Compactness is valuable only when scanability, comparison, context, and access remain intact. Dense layouts, responsive tables, sticky context, stable value placement, and selective labels all support this. (`DT-03`, `DT-04`, `DT-05`, `PD-01`, `RT-02`, `RT-03`, `RT-04`, `RT-08`)

A fourth recurring principle is **interaction should feel immediate and predictable**. Search should focus immediately, shortcuts should be discoverable, hover/focus feedback should be fast, layout geometry should remain stable, and motion should communicate state change rather than perform decoration. (`PD-05`, `PD-06`, `PD-07`, `PD-10`, `DT-09`, `DT-10`)

A fifth recurring principle is **specific evidence is stronger than generic claims**. Product views, measurable outcomes, meaningful metric context, and metric-specific change indicators communicate more than generic adjectives, decorative feature cards, or weak proof. (`LP-01`, `LP-04`, `LP-05`, `DB-05`, `DB-06`)

### Preserved alternatives rather than forced normalization

- **Density references differ by context.** CP-02 shows an observed ultra-dense model around 32px rows, while CP-01 presents ~40/48/56px compact/default/comfortable table modes. These are alternatives, not a conflict that can be resolved into one universal row height.
- **Responsive detail reveal has two distinct forms.** Inline expansion (`RT-05`) and bottom-sheet reveal (`RT-06`) solve similar problems but create different spatial/contextual experiences; both are preserved independently.
- **Accent restraint is principled rather than numerically fixed.** CP-02 favors one dominant accent; CP-03 treats “1 accent · 0 blobs” as a restraint metaphor; CP-05 explicitly says exactly one accent is optional.
- **Cards are not rejected universally.** CP-02 discourages one-card-per-repeated-record patterns, CP-03 discourages generic feature-card filler, while CP-05 allows differentiated metric containers when visual weight reflects information importance.

---

## 2. Navigation Patterns

### Searchable command layer

A global command palette provides direct access to destinations and actions through one searchable layer. The observed flow is shortcut → palette opens → search receives focus → partial query narrows results → keyboard navigation/selection. (`PD-05`)

This pattern represents a navigation alternative to deep menu traversal for frequent actions. It does not imply that conventional navigation is absent.

### Shortcut discoverability

Where keyboard shortcuts exist, showing them close to their associated commands makes fast paths visible rather than hidden knowledge. (`PD-06`)

### Navigation-related confidence

- Command palette behavior and partial-term matching: **Direct observation / explicitly identified**
- The broader interpretation that this reduces deep navigation for frequent tasks: **Interpretation supported by the source discussion**

---

## 3. Layout and Visual Hierarchy

### Subtle structural hierarchy

Normal surfaces are separated primarily through spacing, thin borders, and tonal changes rather than heavy elevation. Stronger elevation is reserved for truly floating layers. (`PD-02`, `DB-04`)

### Primary and secondary information

Visual size, placement, typography, and density can communicate unequal importance. Equal-sized components can imply equal importance, so equal geometry is not automatically desirable. (`DB-03`)

### Meaningful emphasis

Strong color, size, contrast, imagery, or typography should direct attention toward useful information, a primary action, product evidence, or significant data rather than decoration. (`LP-02`, `DB-01`)

### Stable alignment and rhythm

Repeated layout elements benefit from shared spacing increments, stable text edges, right-aligned comparable numbers, consistent icon geometry, and predictable columns. (`PD-08`, `DT-01`)

### Outcome-led content hierarchy

For value communication, a coherent sequence identified by the source material is outcome → context → primary action → product evidence → measurable proof. (`LP-06`)

---

## 4. Data and Table Interactions

### Semantic alignment

Text is left-aligned for consistent reading edges; comparable numeric values are right-aligned for vertical comparison. Tabular numerals may further stabilize numeric scanning. (`DT-01`, `PD-08`)

### Restrained row styling

The default row remains visually quiet, with subtle separators preferred over strong striping. Hover can temporarily emphasize the active row to support horizontal tracking. Strong zebra striping is treated as situational rather than default. (`DT-02`)

### Controlled density

Density is treated as a system with predictable row height and spacing rather than arbitrary per-row padding. CP-01 supplies ~40/48/56px examples; CP-02 supplies an observed ~32px dense reference. (`DT-03`, `PD-01`)

### Sticky context

Column headers can remain visible during vertical scrolling, and key identity columns can remain visible during horizontal scrolling. A subtle divider or shadow may mark the fixed/scrolling boundary. (`DT-04`, `DT-05`)

### Missing values

Absence is represented intentionally rather than as unexplained blank space. (`DT-06`)

### Long text

Long text may remain on one line to protect row rhythm, truncate with ellipsis, and expose the full value through a secondary reveal. (`DT-07`)

### Numeric preservation

Meaningful numeric magnitude and precision should not be treated like generic text overflow. (`DT-08`)

### Contextual row actions

Secondary row actions may remain visually quiet until the row becomes active. Hover, keyboard focus, and touch should each have a viable route to equivalent actions. (`DT-09`, `DT-10`)

### Sorting feedback

The active sort column receives clearer emphasis than inactive sortable headers. (`DT-11`)

### Repeated data structure

When many records share the same fields and users need to scan or compare them, structured rows/columns preserve field positions better than isolated per-record cards. (`PD-09`)

---

## 5. Forms and Input Experiences

The source packs do not establish a general form system, validation model, field layout, or error-message pattern.

One input experience is directly established: when the command/search interface opens, its text input is immediately focused so typing can begin without an extra click. (`PD-05`)

Touch sizing around ~44–48px is present only as an interpretation for touch-oriented interaction, not as a universal field/control dimension. (`PD-12`)

---

## 6. Search, Filtering and Sorting

### Partial-term command search

The command palette supports partial query matching rather than requiring exact full command names. (`PD-05`)

### Immediate search focus

Opening the command layer places focus in the search field immediately. (`PD-05`)

### Active sorting state

The current sort state is visibly associated with the sorted column, while inactive possibilities remain quieter. (`DT-11`)

The source material does not establish advanced filtering patterns, filter chips, faceted search, saved filters, or search-result ranking behavior beyond the command-palette interaction.

---

## 7. Actions and Controls

### Dominant primary action

Where actions have unequal importance, one action can be visually dominant while a secondary path remains available with lower emphasis. The source’s “50/50 → 90/10” comparison is a hierarchy metaphor, not a numeric styling requirement. (`LP-03`, `LP-08`)

### Contextual secondary actions

Repeated row-level secondary actions need not permanently dominate every record. They can appear in context while retaining keyboard and touch access. (`DT-09`, `DT-10`)

### Shortcut-visible controls

Keyboard accelerators can be shown near their associated commands so the faster interaction path is learnable. (`PD-06`)

### Control emphasis as meaning

Strong control styling should identify genuine priority rather than making several actions appear equally primary. (`LP-03`, `DB-01`)

---

## 8. Feedback and System Status

### Hover and selection feedback

Hover is temporary; selection persists. Both can use subtle surface changes, and neither should shift layout geometry. (`PD-10`)

### Fast interaction feedback

The observed source references approximately 80ms hover feedback and ordinary transitions around 150ms or less, with zero overshoot. These are reference values, not universal timings. (`PD-07`)

### Status beyond color

Status should not depend on color alone; text labels, symbols/icons, and semantic color can reinforce one another. (`PD-04`)

### Metric change semantics

A direction of change is not inherently positive or negative. Change indicators should reflect the meaning of the individual metric rather than applying one generic “increase = green/good” rule. (`DB-06`)

### Sort status

The active sort state is stronger than inactive sort capability. (`DT-11`)

---

## 9. Micro-Interactions and Animation

Motion is treated as functional feedback rather than a decorative layer. Short transitions, immediate response, stable geometry, and direct movement to the final state are favored over bounce, spring-back, overshoot, dramatic zoom, or slow generic transitions. (`PD-07`, `PD-10`)

The source provides observed timing references (~80ms hover, ~150ms or less ordinary transitions) but the broader principle is more important than those exact values.

No other packs establish detailed animation systems for responsive table disclosure, landing-page sections, or dashboard charts.

---

## 10. Progressive Disclosure and Contextual UI

### Contextual row actions

Secondary actions become prominent when a row is active rather than occupying permanent visual space in every row. (`DT-09`)

### Inline detail expansion

A compact record can expand locally to reveal secondary information while maintaining a direct visual relationship between summary and detail. (`RT-05`)

### Bottom-sheet detail reveal

Secondary information can appear in a bottom sheet while the underlying list context remains available. This is an alternative to inline expansion, not the same pattern. (`RT-06`)

### Hidden is not deleted

When responsive layouts remove lower-priority fields from the default view, those fields remain accessible through detail disclosure. (`RT-08`)

### Selective contextual labels

When headers disappear, only values that become ambiguous gain short labels. Self-explanatory values do not need redundant labels. (`RT-04`)

---

## 11. Workflow Improvements

### Fast command access

A searchable command layer can shorten repeated action/navigation paths and allow partial query retrieval. (`PD-05`)

### Discoverable acceleration

Visible shortcuts let repeated workflows become faster without relying on memorized hidden commands. (`PD-06`)

### Scan-and-compare workflows

Stable columns, semantic numeric alignment, sticky context, consistent density, and stable responsive value positions support repeated scanning and comparison. (`DT-01`, `DT-03`, `DT-04`, `DT-05`, `RT-03`)

### Evidence-led understanding

Outcome-led framing, product visibility, measurable proof, and contextual metrics reduce reliance on generic claims and help users evaluate information more directly. (`LP-01`, `LP-04`, `LP-05`, `DB-05`)

---

## 12. Mobile and Responsive Patterns

### Restructure rather than shrink

A wide table can transform into compact record layouts when space becomes constrained instead of forcing every desktop column into a narrow width. (`RT-02`)

### Semantic priority

Field visibility and placement are determined by usefulness rather than original column order alone. Identity → Value → State is one demonstrated reference model, not a mandatory schema. (`RT-01`, `RT-09`)

### Stable comparable-value slot

Important values remain in a consistent position across compact records to preserve comparison. (`RT-03`)

### Contextual labels after header loss

Labels appear only where meaning would otherwise become ambiguous. (`RT-04`)

### Component-owned breakpoint

Responsive structure can depend on the width available to the component itself rather than only the whole viewport. A ~700px threshold appears as an example, not a fixed rule. (`RT-07`, `RT-10`)

### Touch-aware interaction

Touch cannot depend on hover; compact persistent or explicitly invoked controls provide access to row actions. Larger ~44–48px touch targets are an interpretation from CP-02 rather than a directly established table requirement. (`DT-10`, `PD-12`)

---

## 13. Accessibility and Usability

### Input-method parity

Important table actions should remain available by mouse, keyboard, and touch rather than being hover-only. (`DT-10`)

### Visible keyboard focus

Keyboard-focused rows should have a visible focus state and expose equivalent actions. (`DT-10`)

### Status redundancy

Color can reinforce status but should not be the only carrier of meaning. (`PD-04`)

### Readable density

Compactness should preserve readability and predictable rhythm rather than shrinking content without limit. (`DT-03`, `PD-01`)

### Touch target interpretation

The ~44–48px target range is an inferred accessibility/usability direction for touch contexts and therefore has lower certainty than directly observed dimensions. (`PD-12`)

The source packs do not establish detailed screen-reader semantics, ARIA patterns, contrast ratios, reduced-motion behavior, or focus-order rules.

---

## 14. Empty, Loading, Error and Success States

Only part of this category is covered by the supplied material.

### Empty / missing cell state

Unexplained blanks are avoided; missing values receive an explicit absence marker such as a dash or equivalent. (`DT-06`)

### Error / warning / success communication

Semantic colors may reinforce error, warning, or success, but status meaning should also be available through text and/or symbols. (`PD-04`)

### Not established

The source packs do not establish page-level empty states, skeleton/loading behavior, retry flows, form-validation errors, success confirmations, optimistic states, or failure recovery patterns. No additional assumptions should be inferred.

---

## 15. Other Specialized Patterns

### Outcome-first communication

Lead with a specific practical result and concise audience/context rather than generic technology-first or interchangeable marketing language. (`LP-01`)

### Product as evidence

Meaningful interface views, metrics, workflow information, or outputs can demonstrate capability more concretely than adjective-based feature cards. (`LP-05`)

### Measurable proof

Evidence is stronger when it shows what changed, by how much, and for whom. Before/after comparisons with meaningful units are one example. (`LP-04`)

### Proof quality over quantity

The phrase “one quote beats ten thousand” is interpreted as a preference for strong, attributable, relevant evidence over large volumes of weak social proof. It does not prohibit multiple testimonials, logos, or user counts. (`LP-09`)

### KPI hierarchy

A dashboard metric can follow label → primary value → supporting context, with the main number receiving the strongest emphasis. (`DB-02`)

### Unequal metric prominence

Important metrics can receive more space or stronger prominence than supporting metrics; equal-sized cards are not automatically desirable. (`DB-03`)

### Contextual analytical framing

Reporting period, comparison basis, subject, direction of change, and supporting detail can be more valuable in prominent space than generic greeting copy. (`DB-05`, `DB-08`)

### Trend visuals with purpose

Sparklines or other compact trend views are useful when they reveal direction, shape, or recent movement; they should not be added merely as decoration. (`DB-07`)

### Semantic elevation

Permanent dashboard surfaces stay relatively flat; dropdowns, popovers, and temporary overlays may receive stronger shadow because they genuinely float above content. (`DB-04`, `PD-02`)

---

## 16. Unified Design Rules

These are concise, project-independent rules derived only from recurring or explicit source lessons. They are reference rules for future agents, not mandatory requirements for every future interface.

### RULE-001
**Rule:** Give strong visual treatment a communication purpose.  
**Reason:** Color, size, contrast, shadows, icons, and charts are most useful when they clarify priority, state, context, action, or meaning rather than functioning as decoration.  
**Related inspiration IDs:** UIX-011, UIX-012, UIX-021, UIX-033, UIX-035  
**Source context packs:** CP-02, CP-03, CP-05

### RULE-002
**Rule:** Let information importance determine visual hierarchy.  
**Reason:** Equal visual weight can imply equal importance even when the information is not equally important.  
**Related inspiration IDs:** UIX-021, UIX-022, UIX-033, UIX-034  
**Source context packs:** CP-03, CP-05

### RULE-003
**Rule:** Preserve meaning when increasing density or reducing available space.  
**Reason:** Compactness is useful only when readability, context, comparison, and access remain intact.  
**Related inspiration IDs:** UIX-003, UIX-026, UIX-027, UIX-028, UIX-029, UIX-032  
**Source context packs:** CP-01, CP-02, CP-04

### RULE-004
**Rule:** Align comparable data according to how users scan it.  
**Reason:** Stable text edges and right-aligned comparable numbers improve scanning and vertical comparison.  
**Related inspiration IDs:** UIX-001, UIX-017, UIX-028  
**Source context packs:** CP-01, CP-02, CP-04

### RULE-005
**Rule:** Preserve context during scrolling.  
**Reason:** Long or wide data views become difficult to interpret when headers or record identity disappear.  
**Related inspiration IDs:** UIX-004, UIX-005  
**Source context packs:** CP-01

### RULE-006
**Rule:** Treat different cell types according to their meaning.  
**Reason:** Missing values, long text, and meaningful numbers have different interpretation and overflow needs.  
**Related inspiration IDs:** UIX-006, UIX-007, UIX-008  
**Source context packs:** CP-01

### RULE-007
**Rule:** Keep repeated secondary controls contextually available rather than permanently dominant.  
**Reason:** Dense repeated action sets can overpower the data, but hidden-on-hover-only controls exclude keyboard and touch users.  
**Related inspiration IDs:** UIX-009, UIX-039  
**Source context packs:** CP-01, CP-02

### RULE-008
**Rule:** Make current state clearer than inactive capability.  
**Reason:** Users benefit from quickly identifying what is active now without every possible state competing equally.  
**Related inspiration IDs:** UIX-010, UIX-019  
**Source context packs:** CP-01, CP-02

### RULE-009
**Rule:** Use fast, direct motion to explain state change rather than decorate it.  
**Reason:** Short, non-overshooting motion preserves a responsive feel and avoids blocking the next action.  
**Related inspiration IDs:** UIX-016, UIX-019  
**Source context packs:** CP-02

### RULE-010
**Rule:** Expose efficient keyboard paths where frequent actions exist.  
**Reason:** Searchable command access and visible shortcuts can reduce repeated navigation and make acceleration learnable.  
**Related inspiration IDs:** UIX-014, UIX-015  
**Source context packs:** CP-02

### RULE-011
**Rule:** Use structured rows or lists when repeated information needs comparison.  
**Reason:** Shared field positions preserve scanability better than independently composed record cards.  
**Related inspiration IDs:** UIX-018  
**Source context packs:** CP-02

### RULE-012
**Rule:** Prefer specific outcomes and evidence over generic claims.  
**Reason:** Concrete outcomes, product views, measurable proof, and contextual metrics are easier to understand and evaluate.  
**Related inspiration IDs:** UIX-020, UIX-023, UIX-024, UIX-036  
**Source context packs:** CP-03, CP-05

### RULE-013
**Rule:** When actions differ in priority, make that difference visible.  
**Reason:** Equally prominent actions can make the intended next step ambiguous.  
**Related inspiration IDs:** UIX-022  
**Source context packs:** CP-03

### RULE-014
**Rule:** On constrained widths, restructure information instead of merely shrinking it.  
**Reason:** Structural transformation can preserve hierarchy, comparison, and meaning better than compressed desktop columns.  
**Related inspiration IDs:** UIX-026, UIX-027, UIX-028, UIX-029  
**Source context packs:** CP-04

### RULE-015
**Rule:** Hide secondary information without removing access to it.  
**Reason:** Progressive disclosure can protect compact scanning while preserving detail availability and context.  
**Related inspiration IDs:** UIX-030, UIX-031  
**Source context packs:** CP-04

### RULE-016
**Rule:** Let responsive behavior reflect the component’s available space.  
**Reason:** A component can be constrained even inside a large viewport, so viewport class alone may not describe its real layout conditions.  
**Related inspiration IDs:** UIX-032  
**Source context packs:** CP-04

### RULE-017
**Rule:** Communicate status through more than color alone.  
**Reason:** Text and symbols provide explicit meaning and reduce dependence on color perception.  
**Related inspiration IDs:** UIX-013, UIX-037  
**Source context packs:** CP-02, CP-05

### RULE-018
**Rule:** Interpret change according to the metric, not a generic positive/negative convention.  
**Reason:** An increase can be desirable for one metric and undesirable for another.  
**Related inspiration IDs:** UIX-037, UIX-038  
**Source context packs:** CP-05

### RULE-019
**Rule:** Use elevation semantically.  
**Reason:** Stronger shadow is most informative when it corresponds to an element actually floating above the base interface.  
**Related inspiration IDs:** UIX-011, UIX-035  
**Source context packs:** CP-02, CP-05

### RULE-020
**Rule:** Maintain shared visual rules rather than inventing one-off values for equivalent elements.  
**Reason:** Consistent spacing, typography, surfaces, icons, color, row heights, and motion make separate views feel like one coherent system.  
**Related inspiration IDs:** UIX-017, UIX-040  
**Source context packs:** CP-02

---

## 17. Master Inspiration Library

### UIX-001
**Name:** Semantic Table Alignment  
**Category:** Tables / Data presentation  
**Purpose:** Improve scanning and comparison across columns.  
**Problem addressed:** Uniform or arbitrary alignment makes text and especially numbers harder to compare vertically.  
**Trigger:** Repeated tabular data is presented.  
**Behavior:** Text uses a stable left edge; comparable numeric values use a stable right edge; tabular numerals may be used where available.  
**Expected feedback:** Values line up predictably across rows.  
**UX benefit:** Faster scanning and more accurate visual comparison.  
**Essential characteristics:** Semantic alignment by data type; consistency within a column.  
**Optional characteristics:** Tabular numerals; exact column widths.  
**Avoid:** Center-aligning all values without semantic reason; mixed numeric alignment within one column.  
**Related patterns:** UIX-017, UIX-028  
**Source inspiration IDs:** DT-01, PD-08  
**Source context packs:** CP-01, CP-02  
**Confidence:** Direct observation / explicitly identified

### UIX-002
**Name:** Restrained Row Styling  
**Category:** Tables / Visual hierarchy  
**Purpose:** Keep data visually dominant while still supporting row tracking.  
**Problem addressed:** Heavy striping and decoration can compete with dense information.  
**Trigger:** A table is in its default or hover state.  
**Behavior:** Default rows remain visually quiet; subtle separators are preferred; hover provides temporary emphasis; strong zebra striping is situational.  
**Expected feedback:** The active row is easier to track without making the whole table visually noisy.  
**UX benefit:** Calm scanning with targeted temporary emphasis.  
**Essential characteristics:** Restrained default state; distinguishable hover state.  
**Optional characteristics:** Zebra striping for very wide rows; exact separator treatment.  
**Avoid:** Heavy alternating backgrounds by default.  
**Related patterns:** UIX-019, UIX-021  
**Source inspiration IDs:** DT-02, DT-12  
**Source context packs:** CP-01  
**Confidence:** Direct observation / explicitly identified

### UIX-003
**Name:** Density as a Controlled System  
**Category:** Tables / Layout  
**Purpose:** Support compact information scanning without arbitrary spacing.  
**Problem addressed:** Inconsistent row heights and padding disrupt rhythm and comparison.  
**Trigger:** A dense repeated-data layout is defined or switched between density modes.  
**Behavior:** Row height and vertical rhythm remain predictable within a mode. CP-01 offers ~40/48/56px examples; CP-02 offers an observed ~32px ultra-dense reference.  
**Expected feedback:** The interface feels compact but ordered rather than cramped or irregular.  
**UX benefit:** Faster scanning and more efficient use of space.  
**Essential characteristics:** Consistent row height within a mode; predictable spacing; readable typography.  
**Optional characteristics:** Exact density values; number of density modes.  
**Avoid:** Random row heights; inconsistent padding; treating one numeric reference as universal.  
**Related patterns:** UIX-017, UIX-039, UIX-027  
**Source inspiration IDs:** DT-03, PD-01  
**Source context packs:** CP-01, CP-02  
**Confidence:** Mixed — dimensions are direct references; cross-context normalization is interpretation

### UIX-004
**Name:** Sticky Column Headers  
**Category:** Tables / Context preservation  
**Purpose:** Preserve column meaning during long vertical navigation.  
**Problem addressed:** Users lose the meaning of visible values when headers scroll out of view.  
**Trigger:** A table is vertically scrolled.  
**Behavior:** Column headers remain visible while rows move beneath them.  
**Expected feedback:** Column labels remain continuously available.  
**UX benefit:** Reduced reorientation and fewer interpretation errors.  
**Essential characteristics:** Persistent header context during vertical scroll.  
**Optional characteristics:** Exact sticky position or visual separator.  
**Avoid:** Allowing long scrolling to remove all column context.  
**Related patterns:** UIX-005  
**Source inspiration IDs:** DT-04  
**Source context packs:** CP-01  
**Confidence:** Direct observation / explicitly identified

### UIX-005
**Name:** Sticky Record Identity  
**Category:** Tables / Context preservation  
**Purpose:** Keep visible values associated with the correct record during horizontal navigation.  
**Problem addressed:** Horizontal scrolling can separate secondary values from the row identity users need to interpret them.  
**Trigger:** A wide table scrolls horizontally.  
**Behavior:** Important identifying columns remain fixed while secondary columns move.  
**Expected feedback:** The visible record anchor remains present.  
**UX benefit:** Sustained context during wide-table comparison.  
**Essential characteristics:** Persistent identity field(s); clear fixed/scrolling boundary.  
**Optional characteristics:** Divider or subtle shadow at the boundary.  
**Avoid:** Letting record identity disappear while only secondary values remain.  
**Related patterns:** UIX-004, UIX-028  
**Source inspiration IDs:** DT-05  
**Source context packs:** CP-01  
**Confidence:** Direct observation / explicitly identified

### UIX-006
**Name:** Explicit Missing-Value Representation  
**Category:** Tables / Empty state  
**Purpose:** Make absence intentional and interpretable.  
**Problem addressed:** Blank cells can be mistaken for loading, rendering failure, or overlooked data.  
**Trigger:** A field has no value.  
**Behavior:** The cell displays an explicit absence marker such as a dash or equivalent.  
**Expected feedback:** Users can distinguish “no value” from accidental blankness.  
**UX benefit:** Clearer data interpretation.  
**Essential characteristics:** Intentional, consistent absence representation.  
**Optional characteristics:** Exact symbol or wording.  
**Avoid:** Unexplained blank cells.  
**Related patterns:** UIX-013  
**Source inspiration IDs:** DT-06  
**Source context packs:** CP-01  
**Confidence:** Direct observation / explicitly identified

### UIX-007
**Name:** One-Line Long Text with Secondary Reveal  
**Category:** Tables / Overflow  
**Purpose:** Protect row rhythm while preserving access to full text.  
**Problem addressed:** Long content can create unpredictable multi-line rows and reduce scanability.  
**Trigger:** Text exceeds available cell width.  
**Behavior:** Text remains on one line, truncates with ellipsis, and exposes the full value through a secondary reveal such as a tooltip or equivalent detail interaction.  
**Expected feedback:** The table remains visually stable; the full value is still obtainable.  
**UX benefit:** Stable density without permanent information loss.  
**Essential characteristics:** Controlled truncation plus access to full value.  
**Optional characteristics:** Tooltip as the reveal mechanism.  
**Avoid:** Allowing arbitrary long text to expand individual rows when stable rhythm is important.  
**Related patterns:** UIX-030, UIX-031  
**Source inspiration IDs:** DT-07  
**Source context packs:** CP-01  
**Confidence:** Direct observation / explicitly identified

### UIX-008
**Name:** Preserve Meaningful Numeric Precision  
**Category:** Tables / Numeric data  
**Purpose:** Keep magnitude and significant digits interpretable.  
**Problem addressed:** Generic ellipsis/truncation can distort numeric meaning.  
**Trigger:** A numeric value risks overflow or compression.  
**Behavior:** Numerical content is handled separately from generic text truncation so important digits and precision remain visible.  
**Expected feedback:** Users can read the full meaningful numeric value.  
**UX benefit:** More trustworthy comparison and fewer misread values.  
**Essential characteristics:** Numeric-specific overflow handling.  
**Optional characteristics:** Exact precision policy.  
**Avoid:** Ellipsizing important numbers as if they were ordinary prose.  
**Related patterns:** UIX-001, UIX-028  
**Source inspiration IDs:** DT-08  
**Source context packs:** CP-01  
**Confidence:** Direct observation / explicitly identified

### UIX-009
**Name:** Contextual Row Actions with Input Parity  
**Category:** Tables / Actions  
**Purpose:** Keep repeated secondary actions accessible without permanently dominating the table.  
**Problem addressed:** Repeated action icons create clutter, while hover-only actions exclude keyboard and touch.  
**Trigger:** Row hover, row keyboard focus, or touch action invocation.  
**Behavior:** Active-row actions become available in context; keyboard receives visible focus and equivalent controls; touch uses a compact persistent or invoked action affordance.  
**Expected feedback:** The active row is clear and its relevant actions are clearly associated with it.  
**UX benefit:** Lower visual noise without sacrificing access across input methods.  
**Essential characteristics:** Clear row-action association; keyboard and touch access.  
**Optional characteristics:** Exact icon, menu style, or reveal timing.  
**Avoid:** Large permanent action sets on every row; hover-only functionality.  
**Related patterns:** UIX-019, UIX-039  
**Source inspiration IDs:** DT-09, DT-10  
**Source context packs:** CP-01  
**Confidence:** Direct observation / explicitly identified

### UIX-010
**Name:** Active Sort Emphasis  
**Category:** Tables / Sorting  
**Purpose:** Make the current sort condition easy to identify.  
**Problem addressed:** Equal visual weight across all sortable headers obscures the active state.  
**Trigger:** A sort is active.  
**Behavior:** The active column’s sort indicator is visually stronger; inactive sortable headers remain quieter.  
**Expected feedback:** Users can immediately identify the current sort column and direction.  
**UX benefit:** Clearer table state with less visual competition.  
**Essential characteristics:** Direct association between active state and sorted column.  
**Optional characteristics:** Exact iconography or inactive-header treatment.  
**Avoid:** Giving inactive sort capability equal emphasis to the active sort.  
**Related patterns:** UIX-019  
**Source inspiration IDs:** DT-11  
**Source context packs:** CP-01  
**Confidence:** Direct observation / explicitly identified

### UIX-011
**Name:** Subtle Surface Hierarchy  
**Category:** Layout / Surfaces  
**Purpose:** Separate structure without making every container appear elevated.  
**Problem addressed:** Heavy shadows and floating-card styling can create unnecessary visual noise.  
**Trigger:** Base canvas, panel, selected surface, or permanent container is shown.  
**Behavior:** Separation relies on spacing, tonal differences, and thin borders; ordinary shadows are absent or minimal.  
**Expected feedback:** Boundaries are visible but quiet.  
**UX benefit:** Calm, structured hierarchy with less decoration.  
**Essential characteristics:** Quiet boundaries; stable geometry; restrained contrast.  
**Optional characteristics:** ~1px border; low-opacity dark-theme borders (~8% observed reference).  
**Avoid:** Heavy shadows on ordinary containers.  
**Related patterns:** UIX-035, UIX-021  
**Source inspiration IDs:** PD-02, DB-04  
**Source context packs:** CP-02, CP-05  
**Confidence:** Direct observation / explicitly identified

### UIX-012
**Name:** Restrained Accent Color System  
**Category:** Visual system / Color  
**Purpose:** Preserve the meaning of strong color by limiting competition.  
**Problem addressed:** Too many strong unrelated colors weaken hierarchy and semantic interpretation.  
**Trigger:** Primary actions, selected states, interactive emphasis, or semantic statuses require color.  
**Behavior:** The interface remains mostly neutral with a dominant accent; semantic colors are reserved for meaningful states.  
**Expected feedback:** Primary emphasis is easy to identify.  
**UX benefit:** Stronger hierarchy and lower visual noise.  
**Essential characteristics:** Selective strong color; consistent semantic use.  
**Optional characteristics:** Exactly one accent color.  
**Avoid:** One unrelated strong color per category; decorative color without meaning.  
**Related patterns:** UIX-013, UIX-021  
**Source inspiration IDs:** PD-03, LP-07, DB-01  
**Source context packs:** CP-02, CP-03, CP-05  
**Confidence:** Mixed — dominant-accent behavior is direct; “exactly one” is explicitly non-mandatory

### UIX-013
**Name:** Status Beyond Color  
**Category:** Accessibility / Feedback  
**Purpose:** Make state meaning explicit and not dependent on color perception alone.  
**Problem addressed:** Color-only status can be ambiguous or inaccessible.  
**Trigger:** Error, warning, success, selected, or other semantic status is communicated.  
**Behavior:** Text labels and/or symbols carry explicit meaning; color reinforces rather than solely defines the state.  
**Expected feedback:** Status remains understandable without relying on hue alone.  
**UX benefit:** Better accessibility and clearer semantics.  
**Essential characteristics:** Non-color semantic carrier.  
**Optional characteristics:** Specific icon or color palette.  
**Avoid:** Color-only status systems.  
**Related patterns:** UIX-037  
**Source inspiration IDs:** PD-04  
**Source context packs:** CP-02  
**Confidence:** Strong interpretation from the source discussion

### UIX-014
**Name:** Searchable Command Palette  
**Category:** Navigation / Search / Workflow  
**Purpose:** Provide direct access to actions and destinations from one searchable layer.  
**Problem addressed:** Frequent actions can become slow when buried in deep navigation.  
**Trigger:** Keyboard shortcut or equivalent command-layer invocation.  
**Behavior:** Palette opens immediately; search receives focus; partial terms filter actions/destinations; keyboard navigation supports selection.  
**Expected feedback:** Results narrow as the user types and remain actionable without extra pointer steps.  
**UX benefit:** Faster repeated workflows and unified command access.  
**Essential characteristics:** Immediate focus; partial matching; clear labels; keyboard navigation.  
**Optional characteristics:** Exact opening shortcut or palette styling.  
**Avoid:** Requiring exact full command names; extra click before typing; slow filtering.  
**Related patterns:** UIX-015, UIX-016  
**Source inspiration IDs:** PD-05  
**Source context packs:** CP-02  
**Confidence:** Direct observation / explicitly identified

### UIX-015
**Name:** Shortcut Discoverability  
**Category:** Navigation / Workflow  
**Purpose:** Make faster keyboard paths learnable.  
**Problem addressed:** Hidden shortcuts benefit only users who already know them.  
**Trigger:** A command with an available shortcut is displayed.  
**Behavior:** The shortcut is shown near the associated command.  
**Expected feedback:** Users can discover acceleration while using ordinary navigation/search.  
**UX benefit:** Gradual learning of faster workflows.  
**Essential characteristics:** Visible association between command and shortcut.  
**Optional characteristics:** Exact keycap styling.  
**Avoid:** Treating shortcuts as undocumented hidden knowledge.  
**Related patterns:** UIX-014  
**Source inspiration IDs:** PD-06  
**Source context packs:** CP-02  
**Confidence:** Direct observation / explicitly identified

### UIX-016
**Name:** Fast Functional Motion  
**Category:** Animation / Feedback  
**Purpose:** Communicate state change without slowing interaction.  
**Problem addressed:** Slow, bouncy, or decorative motion makes a productivity interface feel less direct.  
**Trigger:** Hover, state transition, selection, or ordinary UI change.  
**Behavior:** Response is immediate; transitions are short; movement goes directly to the final state; overshoot is absent.  
**Expected feedback:** The interface feels responsive rather than animated for spectacle.  
**UX benefit:** Clear feedback with low interaction latency.  
**Essential characteristics:** Short duration; no bounce/overshoot; non-blocking feedback.  
**Optional characteristics:** ~80ms hover; ~150ms or less ordinary transitions.  
**Avoid:** Spring-back, overshoot, dramatic zoom, slow generic 300ms motion.  
**Related patterns:** UIX-019  
**Source inspiration IDs:** PD-07  
**Source context packs:** CP-02  
**Confidence:** Direct observation / explicitly identified

### UIX-017
**Name:** Shared Spacing and Alignment Rhythm  
**Category:** Layout / Design system  
**Purpose:** Create consistent spatial relationships across equivalent elements.  
**Problem addressed:** Arbitrary margins and near-but-not-equal spacing make an interface feel fragmented.  
**Trigger:** Repeated component spacing, icon placement, column alignment, or layout construction.  
**Behavior:** Equivalent elements reuse shared increments and stable alignment edges; a 4px grid and ~16px icons appear as observed references.  
**Expected feedback:** Layouts feel precise and related.  
**UX benefit:** Predictability and visual coherence.  
**Essential characteristics:** Repeated spacing logic; stable alignment.  
**Optional characteristics:** Exact 4px grid or 16px icon size.  
**Avoid:** One-off spacing and inconsistent equivalent-component dimensions.  
**Related patterns:** UIX-001, UIX-040  
**Source inspiration IDs:** PD-08  
**Source context packs:** CP-02  
**Confidence:** Direct observation / explicitly identified

### UIX-018
**Name:** Structured Repeated Data over Per-Record Cards  
**Category:** Data presentation / Layout  
**Purpose:** Preserve comparison when many records share the same fields.  
**Problem addressed:** Independent cards duplicate labels and move comparable values into inconsistent positions.  
**Trigger:** Users need to scan many records or compare repeated fields.  
**Behavior:** Repeated data uses shared rows/columns or structured lists; isolated card emphasis is reserved for cases that genuinely benefit from standing alone, such as summaries.  
**Expected feedback:** Comparable fields stay in predictable locations.  
**UX benefit:** Faster scanning, lower repetition, better comparison.  
**Essential characteristics:** Shared field structure for repeated data.  
**Optional characteristics:** Cards for high-level summaries.  
**Avoid:** One large card per repeated operational record; duplicated labels in every record container.  
**Related patterns:** UIX-027, UIX-034  
**Source inspiration IDs:** PD-09  
**Source context packs:** CP-02  
**Confidence:** Strong interpretation from the source discussion

### UIX-019
**Name:** Stable Hover and Selection States  
**Category:** Feedback / Interaction states  
**Purpose:** Communicate interactivity and persistence without changing layout.  
**Problem addressed:** Geometry shifts during hover/selection make interfaces feel unstable and can interfere with targeting.  
**Trigger:** Pointer hover or item selection.  
**Behavior:** Hover uses a subtle temporary surface change; selection uses a subtle persistent state; layout geometry does not shift.  
**Expected feedback:** Users can distinguish temporary hover from persistent selection.  
**UX benefit:** Predictable state communication and stable interaction targets.  
**Essential characteristics:** Distinct hover vs selection; stable geometry.  
**Optional characteristics:** Exact color or transition timing.  
**Avoid:** Layout movement caused by hover or selection.  
**Related patterns:** UIX-002, UIX-010, UIX-016  
**Source inspiration IDs:** PD-10  
**Source context packs:** CP-02  
**Confidence:** Direct observation / explicitly identified

### UIX-020
**Name:** Outcome-First Communication  
**Category:** Content hierarchy / Specialized  
**Purpose:** Make practical value understandable immediately.  
**Problem addressed:** Generic slogans and technology-first claims force users to infer the actual benefit.  
**Trigger:** A high-value introductory message or hero-like region is presented.  
**Behavior:** A concise concrete outcome leads; supporting context explains audience/situation and the inconvenience reduced.  
**Expected feedback:** The practical value is quickly understandable.  
**UX benefit:** Faster comprehension and more specific communication.  
**Essential characteristics:** Concrete outcome; concise context; direct language.  
**Optional characteristics:** Exact headline length or industry.  
**Avoid:** Generic slogans, excessive adjectives, interchangeable capability claims.  
**Related patterns:** UIX-022, UIX-023, UIX-024, UIX-025  
**Source inspiration IDs:** LP-01  
**Source context packs:** CP-03  
**Confidence:** Directly observed / explicitly identified from visible material

### UIX-021
**Name:** Purposeful Visual Emphasis  
**Category:** Visual hierarchy / Specialized  
**Purpose:** Direct strong visual attention toward useful information rather than ornament.  
**Problem addressed:** Decorative gradients, arbitrary color, or oversized visual treatments can compete with content.  
**Trigger:** Strong color, scale, contrast, typography, or decorative treatment is considered.  
**Behavior:** Strong emphasis is attached to important information, primary actions, meaningful product evidence, or important data.  
**Expected feedback:** Focal points correspond to what users need to understand or act on.  
**UX benefit:** Clearer hierarchy and less visual noise.  
**Essential characteristics:** Meaningful reason for strong emphasis.  
**Optional characteristics:** One dominant accent; exact visual style.  
**Avoid:** Strong decoration with no informational or interaction role.  
**Related patterns:** UIX-011, UIX-012, UIX-033, UIX-035  
**Source inspiration IDs:** LP-02, DB-01  
**Source context packs:** CP-03, CP-05  
**Confidence:** Directly identified principle across both sources

### UIX-022
**Name:** Dominant Primary Action with Quieter Secondary Path  
**Category:** Actions / Hierarchy  
**Purpose:** Make the preferred next step immediately legible without removing alternatives.  
**Problem addressed:** Two equally strong actions can create priority ambiguity.  
**Trigger:** Multiple actions differ in importance.  
**Behavior:** One action receives dominant styling; the secondary action remains available with lower visual emphasis, potentially as text or a quieter control.  
**Expected feedback:** Action priority is obvious while choice is preserved.  
**UX benefit:** Faster decision-making and clearer flow.  
**Essential characteristics:** One clear primary; visible subordinate alternative.  
**Optional characteristics:** Exact button style; exact visual ratio.  
**Avoid:** Multiple equally dominant CTAs when priorities differ.  
**Related patterns:** UIX-020, UIX-025  
**Source inspiration IDs:** LP-03, LP-08  
**Source context packs:** CP-03  
**Confidence:** Direct pattern; 90/10 numeric framing is interpretation/metaphor

### UIX-023
**Name:** Concrete Measurable Proof  
**Category:** Evidence / Specialized  
**Purpose:** Make claims easier to evaluate using specific outcomes.  
**Problem addressed:** Vague praise and popularity signals may not explain practical value.  
**Trigger:** Trust-building or proof content is presented.  
**Behavior:** Evidence states what changed, by how much, and for whom where possible; meaningful before/after units may be used.  
**Expected feedback:** The proof directly reinforces the main value claim.  
**UX benefit:** Greater clarity and credibility.  
**Essential characteristics:** Specific result; meaningful comparison; contextual attribution where available.  
**Optional characteristics:** Exact metric type or number of proof items.  
**Avoid:** Generic praise as the only evidence; large logo walls with no explanatory value.  
**Related patterns:** UIX-020, UIX-024, UIX-025, UIX-036  
**Source inspiration IDs:** LP-04, LP-09  
**Source context packs:** CP-03  
**Confidence:** Direct principle; “one quote beats ten thousand” is explicitly interpretive

### UIX-024
**Name:** Product as Evidence  
**Category:** Evidence / Specialized  
**Purpose:** Demonstrate capability through meaningful interface/product information.  
**Problem addressed:** Generic adjectives and repetitive feature cards can claim value without showing it.  
**Trigger:** Capability needs to be explained or substantiated.  
**Behavior:** Relevant interface structure, metrics, charts, transactions, workflow information, states, or outputs are shown when they communicate capability more concretely.  
**Expected feedback:** Users can infer what the product or system actually does from evidence rather than adjectives alone.  
**UX benefit:** More concrete understanding and less reliance on generic marketing language.  
**Essential characteristics:** Meaningful product visibility tied to the promised outcome.  
**Optional characteristics:** Exact screenshot or interface layout.  
**Avoid:** Generic “Fast / Secure / Easy” filler that is disconnected from observable evidence.  
**Related patterns:** UIX-020, UIX-023, UIX-025  
**Source inspiration IDs:** LP-05  
**Source context packs:** CP-03  
**Confidence:** Directly identified principle

### UIX-025
**Name:** Unified Value Narrative  
**Category:** Content architecture / Specialized  
**Purpose:** Make separate sections feel like one coherent explanation.  
**Problem addressed:** Unrelated content blocks can weaken the relationship between promise, action, evidence, and proof.  
**Trigger:** A multi-section explanatory experience is structured.  
**Behavior:** Outcome, audience/context, primary action, product evidence, and measurable proof reinforce one another in sequence.  
**Expected feedback:** Later sections substantiate rather than distract from the initial promise.  
**UX benefit:** Stronger coherence and easier comprehension.  
**Essential characteristics:** Connected message and evidence.  
**Optional characteristics:** Exact section count or visual composition.  
**Avoid:** Feature/proof sections disconnected from the primary value proposition.  
**Related patterns:** UIX-020, UIX-022, UIX-023, UIX-024  
**Source inspiration IDs:** LP-06  
**Source context packs:** CP-03  
**Confidence:** Directly identified principle

### UIX-026
**Name:** Semantic Information Ranking for Responsive Data  
**Category:** Responsive / Tables  
**Purpose:** Decide which fields remain prominent when space is constrained.  
**Problem addressed:** Desktop column order does not necessarily reflect user priority.  
**Trigger:** A wide repeated-data view approaches a constrained width.  
**Behavior:** Fields are ranked by usefulness; Identity → Value → State is one demonstrated reference hierarchy.  
**Expected feedback:** The narrow view retains the most meaningful record information first.  
**UX benefit:** Preserved meaning and scanability under constraint.  
**Essential characteristics:** Semantic prioritization rather than positional hiding.  
**Optional characteristics:** The exact Identity → Value → State model.  
**Avoid:** Treating every field as equally important; hiding solely by original column position.  
**Related patterns:** UIX-027, UIX-028, UIX-029  
**Source inspiration IDs:** RT-01, RT-09  
**Source context packs:** CP-04  
**Confidence:** Direct principle; specific hierarchy is example-level

### UIX-027
**Name:** Structural Responsive Table Transformation  
**Category:** Responsive / Tables  
**Purpose:** Preserve usability when full tabular structure no longer fits.  
**Problem addressed:** Simply shrinking all desktop columns can destroy readability and hierarchy.  
**Trigger:** The component becomes horizontally constrained.  
**Behavior:** Wide table rows transform into compact vertically organized records with primary and secondary information rather than compressing every original column.  
**Expected feedback:** The narrow state feels intentionally reorganized rather than squeezed.  
**UX benefit:** Better readability, hierarchy, and context on constrained widths.  
**Essential characteristics:** Structural change; predictable compact record layout; preserved information access.  
**Optional characteristics:** Exactly two lines per record; ~72px record height.  
**Avoid:** Horizontal scroll as the only/default response; oversized all-field cards.  
**Related patterns:** UIX-026, UIX-028, UIX-029, UIX-030, UIX-031, UIX-032  
**Source inspiration IDs:** RT-02  
**Source context packs:** CP-04  
**Confidence:** Directly identified pattern

### UIX-028
**Name:** Stable Comparable-Value Slot  
**Category:** Responsive / Comparison  
**Purpose:** Preserve table-like comparison after structural transformation.  
**Problem addressed:** Independently composed compact records can move the same value type into different locations.  
**Trigger:** Repeated records are displayed in a narrow layout.  
**Behavior:** Important comparable values occupy the same visual position across records, often right-aligned where appropriate.  
**Expected feedback:** Users can scan the same value type vertically even without desktop columns.  
**UX benefit:** Retains rapid comparison in a non-tabular narrow layout.  
**Essential characteristics:** Consistent position and formatting.  
**Optional characteristics:** Tabular numerals; exact side/line.  
**Avoid:** Moving equivalent values between different positions across records.  
**Related patterns:** UIX-001, UIX-026, UIX-027  
**Source inspiration IDs:** RT-03  
**Source context packs:** CP-04  
**Confidence:** Directly identified pattern

### UIX-029
**Name:** Contextual Labels After Header Loss  
**Category:** Responsive / Context  
**Purpose:** Restore meaning only where responsive transformation removes necessary context.  
**Problem addressed:** Values that were previously explained by a column header can become ambiguous in a compact layout.  
**Trigger:** Headers disappear and a value is no longer self-explanatory.  
**Behavior:** A short contextual label is added to the ambiguous value; already clear values remain unlabeled.  
**Expected feedback:** Meaning is restored without recreating every desktop header.  
**UX benefit:** Context with low visual noise.  
**Essential characteristics:** Label only ambiguous values; direct label-value association.  
**Optional characteristics:** Exact wording such as “Due”.  
**Avoid:** Repeating every former column label; leaving genuinely ambiguous values unlabeled.  
**Related patterns:** UIX-026, UIX-027  
**Source inspiration IDs:** RT-04  
**Source context packs:** CP-04  
**Confidence:** Directly identified pattern

### UIX-030
**Name:** Inline Detail Expansion  
**Category:** Progressive disclosure / Responsive  
**Purpose:** Reveal secondary information locally without leaving the list context.  
**Problem addressed:** Compact records cannot show all metadata without becoming overloaded.  
**Trigger:** A user requests more detail for a specific record.  
**Behavior:** The record expands in place and reveals additional information near its summary.  
**Expected feedback:** Detail appears directly connected to the selected record.  
**UX benefit:** Preserves local context and makes summary-detail association explicit.  
**Essential characteristics:** Compact default; local detail reveal; easy return to scanning.  
**Optional characteristics:** Exact expansion animation or control.  
**Avoid:** Treating inline expansion as identical to a bottom sheet; permanently showing all metadata.  
**Related patterns:** UIX-031, UIX-027  
**Source inspiration IDs:** RT-05, RT-08  
**Source context packs:** CP-04  
**Confidence:** Directly identified pattern

### UIX-031
**Name:** Bottom-Sheet Detail Reveal  
**Category:** Progressive disclosure / Responsive  
**Purpose:** Reveal secondary information in a temporary lower-layer panel while retaining underlying list context.  
**Problem addressed:** Some details need more space than a compact record can provide, without requiring full-page navigation.  
**Trigger:** A user requests more detail for a record.  
**Behavior:** A bottom sheet opens with additional information while the underlying context remains available.  
**Expected feedback:** Detail receives focused space but still feels connected to the originating list.  
**UX benefit:** More room for detail with preserved contextual continuity.  
**Essential characteristics:** Temporary detail layer; retained underlying context; reversible reveal.  
**Optional characteristics:** Exact sheet height, drag behavior, or animation.  
**Avoid:** Conflating with inline expansion; assuming a separate page is always necessary for lightweight detail.  
**Related patterns:** UIX-030, UIX-035  
**Source inspiration IDs:** RT-06, RT-08  
**Source context packs:** CP-04  
**Confidence:** Directly identified pattern

### UIX-032
**Name:** Component-Owned Responsive Breakpoint  
**Category:** Responsive / Layout  
**Purpose:** Let a component change structure according to the space it actually has.  
**Problem addressed:** A table can be narrow inside a large viewport, so device categories do not always describe component constraints.  
**Trigger:** The component’s own available width crosses a useful structural threshold.  
**Behavior:** Sufficient width keeps the wide table state; constrained width activates the compact record state.  
**Expected feedback:** The component adapts to its local layout conditions.  
**UX benefit:** More context-sensitive responsive behavior.  
**Essential characteristics:** Component-width awareness; structural transformation at constraint.  
**Optional characteristics:** ~700px example threshold.  
**Avoid:** Treating common phone/tablet/desktop viewport widths as the only responsive signal.  
**Related patterns:** UIX-027  
**Source inspiration IDs:** RT-07, RT-10  
**Source context packs:** CP-04  
**Confidence:** Direct principle; numeric threshold is example-level

### UIX-033
**Name:** Data-First KPI Hierarchy  
**Category:** Dashboard / Data presentation  
**Purpose:** Make the metric value the primary visual object.  
**Problem addressed:** Decorative icons, badges, and containers can dominate the data they are supposed to support.  
**Trigger:** A KPI or summary metric is presented.  
**Behavior:** The hierarchy follows label → primary value → supporting context, with the number/value receiving the strongest typographic weight.  
**Expected feedback:** Users notice the important value first, then read its context.  
**UX benefit:** Faster analytical scanning.  
**Essential characteristics:** Primary value dominance; quieter label and context.  
**Optional characteristics:** Presence/absence of an icon.  
**Avoid:** Oversized decorative icon containers dominating the metric.  
**Related patterns:** UIX-021, UIX-034, UIX-036  
**Source inspiration IDs:** DB-02  
**Source context packs:** CP-05  
**Confidence:** Directly identified pattern

### UIX-034
**Name:** Importance-Proportional Metric Layout  
**Category:** Dashboard / Layout  
**Purpose:** Reflect unequal information importance through unequal visual weight.  
**Problem addressed:** Identical cards can imply all metrics deserve the same attention.  
**Trigger:** Multiple metrics have different analytical importance.  
**Behavior:** More important metrics may receive more space, stronger placement, or richer context; supporting metrics remain visible but subordinate.  
**Expected feedback:** The analytical priority is legible from the layout.  
**UX benefit:** Faster orientation to what matters most.  
**Essential characteristics:** Visual weight follows information importance.  
**Optional characteristics:** Exact card sizes or grid.  
**Avoid:** Forcing every metric into identical cards when their importance differs.  
**Related patterns:** UIX-018, UIX-033, UIX-021  
**Source inspiration IDs:** DB-03  
**Source context packs:** CP-05  
**Confidence:** Directly identified principle

### UIX-035
**Name:** Semantic Elevation  
**Category:** Surfaces / Overlays  
**Purpose:** Use depth to explain actual layering.  
**Problem addressed:** Shadows on every surface flatten the semantic distinction between permanent and temporary layers.  
**Trigger:** A dropdown, popover, overlay, bottom sheet, or ordinary permanent surface appears.  
**Behavior:** Base/permanent surfaces remain relatively flat; genuinely floating temporary layers receive stronger elevation.  
**Expected feedback:** Users can perceive which element sits above the base interface.  
**UX benefit:** Clearer spatial hierarchy and less decorative shadow noise.  
**Essential characteristics:** Elevation corresponds to actual layering.  
**Optional characteristics:** Exact shadow parameters.  
**Avoid:** Box shadows on every card/container.  
**Related patterns:** UIX-011, UIX-031  
**Source inspiration IDs:** DB-04, PD-02  
**Source context packs:** CP-05, CP-02  
**Confidence:** Directly identified principle

### UIX-036
**Name:** Contextual Analytical Framing  
**Category:** Dashboard / Context  
**Purpose:** Make metrics interpretable without requiring users to search elsewhere for context.  
**Problem addressed:** Numbers and percentages can be ambiguous without subject, period, comparison basis, or direction.  
**Trigger:** Important analytical data is presented.  
**Behavior:** Prominent space communicates useful context such as subject, reporting period, comparison basis, change direction, and supporting detail.  
**Expected feedback:** Users can understand what the number refers to and how to interpret it.  
**UX benefit:** More self-contained and meaningful analysis.  
**Essential characteristics:** Context attached to important values.  
**Optional characteristics:** Exact date format, heading, or copy style.  
**Avoid:** Unexplained percentages; generic greeting copy displacing useful analytical context.  
**Related patterns:** UIX-023, UIX-033, UIX-037, UIX-038  
**Source inspiration IDs:** DB-05, DB-08  
**Source context packs:** CP-05  
**Confidence:** Directly identified principle

### UIX-037
**Name:** Metric-Specific Change Semantics  
**Category:** Dashboard / Feedback  
**Purpose:** Represent increase/decrease according to what the metric actually means.  
**Problem addressed:** A generic “up = green/good” rule can misrepresent metrics where increases are undesirable.  
**Trigger:** A change indicator is shown for a metric.  
**Behavior:** Semantic treatment reflects the interpretation of that specific metric rather than direction alone.  
**Expected feedback:** Positive/negative meaning matches domain context.  
**UX benefit:** More accurate analytical communication.  
**Essential characteristics:** Metric-aware semantics.  
**Optional characteristics:** Exact icon, color, or wording.  
**Avoid:** Applying the same green positive treatment to every increase.  
**Related patterns:** UIX-013, UIX-036, UIX-038  
**Source inspiration IDs:** DB-06  
**Source context packs:** CP-05  
**Confidence:** Directly identified principle

### UIX-038
**Name:** Meaningful Trend Microvisuals  
**Category:** Dashboard / Data visualization  
**Purpose:** Add compact temporal shape when it improves interpretation.  
**Problem addressed:** Static values can hide recent movement, while decorative charts add noise without insight.  
**Trigger:** Trend direction or shape materially helps interpret a metric.  
**Behavior:** A compact trend visual such as a sparkline may accompany the metric when it reveals direction, shape, or recent movement.  
**Expected feedback:** Users gain temporal context beyond a single number.  
**UX benefit:** Faster recognition of pattern and movement.  
**Essential characteristics:** The visual adds interpretation.  
**Optional characteristics:** Sparkline specifically; exact chart style.  
**Avoid:** Charts added only for decoration.  
**Related patterns:** UIX-036, UIX-037  
**Source inspiration IDs:** DB-07  
**Source context packs:** CP-05  
**Confidence:** Direct principle; sparkline is optional example

### UIX-039
**Name:** Input-Aware Touch Sizing  
**Category:** Mobile / Accessibility  
**Purpose:** Preserve touch usability even when desktop layouts are dense.  
**Problem addressed:** Dense desktop dimensions can produce touch targets that are difficult to activate reliably.  
**Trigger:** A compact control is used in touch-oriented interaction.  
**Behavior:** Touch targets may be larger than their dense desktop visual counterparts; ~44–48px is a suggested interpretation.  
**Expected feedback:** Touch controls remain reliably targetable.  
**UX benefit:** Better mobile/touch usability.  
**Essential characteristics:** Density does not automatically force tiny touch targets.  
**Optional characteristics:** Exact 44–48px range.  
**Avoid:** Treating the observed dense desktop row/control sizes as universal touch dimensions.  
**Related patterns:** UIX-003, UIX-009  
**Source inspiration IDs:** PD-12, DT-10  
**Source context packs:** CP-02, CP-01  
**Confidence:** Interpretation; lower certainty than directly observed dimensions

### UIX-040
**Name:** Shared Design-System Consistency  
**Category:** Design system / Cross-cutting  
**Purpose:** Make separate screens and components feel like one coherent system.  
**Problem addressed:** Independently chosen spacing, color, typography, borders, icons, row heights, and motion produce fragmented interfaces.  
**Trigger:** Equivalent visual or interaction decisions recur across multiple views.  
**Behavior:** A small shared system governs typography, spacing, surfaces, color, icon size, density, motion duration, and interaction states.  
**Expected feedback:** Equivalent elements behave and look consistently across contexts.  
**UX benefit:** Predictability, coherence, and lower cognitive overhead.  
**Essential characteristics:** Reuse of shared rules for equivalent situations.  
**Optional characteristics:** Exact token values.  
**Avoid:** One-off values for equivalent components without a contextual reason.  
**Related patterns:** UIX-017, UIX-016, UIX-012  
**Source inspiration IDs:** PD-11  
**Source context packs:** CP-02  
**Confidence:** Strong interpretation from the source discussion

---

## 18. Relationships Between Ideas

- **UIX-001 complements UIX-028:** semantic table alignment becomes stable value placement after responsive restructuring.
- **UIX-004 complements UIX-005:** sticky headers preserve field meaning while sticky identity preserves record meaning.
- **UIX-006 is similar to UIX-013 but should not be confused with it:** the former represents data absence; the latter communicates semantic status through redundant cues.
- **UIX-007 complements UIX-030 and UIX-031:** all preserve access to information that is not shown in full by default, but cell-level text reveal is different from record-level detail disclosure.
- **UIX-009 depends on input-method parity:** contextual actions should not become hover-only simply because hover is the mouse trigger.
- **UIX-010 is similar to UIX-019:** both emphasize active state, but sort state is a persistent data-view condition while hover is temporary interaction feedback.
- **UIX-011 complements UIX-035:** subtle permanent surfaces and stronger floating layers form a coherent elevation model.
- **UIX-012 complements UIX-013:** restrained color preserves emphasis, while non-color cues protect semantic clarity.
- **UIX-014 complements UIX-015:** the command palette provides direct access; visible shortcuts teach faster repeated access.
- **UIX-016 complements UIX-019:** fast motion can support hover/selection feedback, while stable geometry prevents motion from disturbing layout.
- **UIX-017 complements UIX-040:** shared spacing/alignment is one concrete layer of a broader design-system consistency model.
- **UIX-018 can coexist with UIX-034:** structured rows/lists suit repeated operational data, while intentionally weighted cards/metric regions can suit summary information with unequal importance.
- **UIX-020 complements UIX-023 and UIX-024:** a concrete outcome is strengthened by measurable proof and product evidence.
- **UIX-022 complements UIX-025:** primary-action hierarchy becomes stronger when the surrounding narrative supports the same intended outcome.
- **UIX-023 is similar to UIX-036:** both add context that makes claims/data easier to evaluate, but one is proof-oriented and the other is analytical interpretation.
- **UIX-026 depends on semantic understanding of fields:** responsive ranking cannot be derived safely from desktop column position alone.
- **UIX-027 depends on UIX-026:** structural responsive transformation needs a priority model for what remains prominent.
- **UIX-028 complements UIX-027:** stable value slots preserve the comparison benefit lost when desktop columns disappear.
- **UIX-029 complements UIX-027:** contextual labels restore meaning lost during structural transformation.
- **UIX-030 is an alternative to UIX-031:** both reveal secondary detail, but inline expansion changes local record height while a bottom sheet creates a separate temporary layer.
- **UIX-031 complements UIX-035:** a bottom sheet is a temporary layer and can participate in semantic elevation.
- **UIX-032 complements UIX-027:** component-owned breakpoints determine when structural transformation becomes relevant.
- **UIX-033 complements UIX-034:** data-first KPI hierarchy defines internal emphasis; importance-proportional layout defines emphasis between metrics.
- **UIX-036 complements UIX-037:** context explains what a metric means, while metric-specific change semantics explain what movement means.
- **UIX-037 complements UIX-038:** change semantics explain direction/value judgment; trend microvisuals can add temporal shape.
- **UIX-039 complements UIX-003:** high density and adequate touchability can coexist; they should not be treated as mutually exclusive.
- **UIX-021 is a cross-cutting principle that complements UIX-011, UIX-012, UIX-022, UIX-033, UIX-034, and UIX-035.**
- **UIX-024 should not be confused with generic feature illustration:** its purpose is evidentiary, not decorative.
- **UIX-012 should not be interpreted as “exactly one accent is mandatory”:** the consistent source principle is restraint and semantic use, not a fixed count.

---

## 19. Agent Interpretation Rules

1. **This library contains inspiration and design knowledge, not mandatory implementation requirements.**
2. **Do not blindly apply every pattern.** Select only ideas that are relevant to the future task, content, data, interaction model, and constraints.
3. **Preserve the principle behind an idea even if its visual implementation changes.**
4. **Do not assume the source interface must be copied visually.** The original visual expression is evidence of a principle, not a template that must be reproduced.
5. **Do not infer requirements that are not explicitly present.** For example, do not invent form-validation, loading, gesture, ARIA, animation, or mobile behavior where the source packs explicitly did not establish it.
6. **Treat interpretation with lower certainty than direct observation.** Entries marked `Interpretation` or `Mixed` should not be represented as confirmed source facts.
7. **Never claim an inspiration has already been implemented unless separate project context confirms that fact.**
8. **Preserve alternatives when the source material presents multiple viable patterns.** Inline expansion and bottom sheets are separate alternatives; density references are contextual alternatives.
9. **Do not convert example measurements into universal standards.** Values such as 13px text, 32px rows, 40/48/56px density modes, 4px grids, 16px icons, 80ms hover, 150ms transitions, 44–48px touch targets, ~700px breakpoints, or 72px compact records are references/examples unless a future task explicitly adopts them.
10. **Distinguish system-level principles from component-specific patterns.** “Purposeful emphasis” is cross-cutting; “sticky identity columns” is table-specific.
11. **Do not collapse similar ideas when their interaction model differs.** A tooltip/full-text reveal, inline expansion, and bottom sheet are all disclosure patterns but serve different scopes and contexts.
12. **Do not overgeneralize anti-patterns.** Cards, shadows, colors, icons, and charts are not inherently wrong; the sources object to their unmotivated or semantically weak use.
13. **Preserve data semantics.** Numeric precision, metric direction, missing values, and status meaning should not be simplified in ways that alter interpretation.
14. **Use source traceability when reusing ideas.** Cite the `UIX-*` ID and, where useful, the source-local IDs and `CP-*` pack IDs.
15. **When sources appear to conflict, keep the alternatives visible unless the future task supplies a reason to choose.**
16. **Do not infer that a recurring principle applies outside its meaningful context.** For example, a command palette is useful for frequent action/navigation access but is not automatically relevant to every interface.
17. **Keep the library project-independent.** Do not attach these patterns to a specific product, website, repository, or existing implementation unless separate future context explicitly introduces one.
18. **Separate evidence from extrapolation.** If future analysis extends a pattern beyond what is stated here, label the extension as a new inference rather than attributing it to this source library.

---

## 20. Compact Retrieval Index

- **Accessibility** → UIX-009, UIX-013, UIX-039
- **Actions / CTA hierarchy** → UIX-009, UIX-022
- **Alignment** → UIX-001, UIX-017, UIX-028
- **Animation / Motion** → UIX-016, UIX-019
- **Color / Visual emphasis** → UIX-012, UIX-021
- **Command access** → UIX-014, UIX-015
- **Context preservation** → UIX-004, UIX-005, UIX-029, UIX-036
- **Dashboard** → UIX-021, UIX-033, UIX-034, UIX-035, UIX-036, UIX-037, UIX-038
- **Data density** → UIX-003, UIX-017, UIX-039
- **Data evidence / Proof** → UIX-023, UIX-024, UIX-036
- **Data visualization** → UIX-037, UIX-038
- **Design system** → UIX-012, UIX-016, UIX-017, UIX-040
- **Empty / Missing values** → UIX-006
- **Feedback / Status** → UIX-010, UIX-013, UIX-016, UIX-019, UIX-037
- **Forms / Input** → UIX-014, UIX-039
- **Landing / Value communication** → UIX-020, UIX-021, UIX-022, UIX-023, UIX-024, UIX-025
- **Layout hierarchy** → UIX-011, UIX-017, UIX-021, UIX-034
- **Mobile / Responsive** → UIX-026, UIX-027, UIX-028, UIX-029, UIX-030, UIX-031, UIX-032, UIX-039
- **Navigation** → UIX-014, UIX-015
- **Numeric data** → UIX-001, UIX-008, UIX-028, UIX-033
- **Progressive disclosure** → UIX-007, UIX-009, UIX-030, UIX-031
- **Search** → UIX-014
- **Sorting** → UIX-010
- **Surfaces / Elevation** → UIX-011, UIX-035
- **Tables** → UIX-001, UIX-002, UIX-003, UIX-004, UIX-005, UIX-006, UIX-007, UIX-008, UIX-009, UIX-010, UIX-018, UIX-026, UIX-027, UIX-028, UIX-029, UIX-030, UIX-031, UIX-032
- **Workflow efficiency** → UIX-014, UIX-015, UIX-018
- **Content hierarchy** → UIX-020, UIX-022, UIX-025, UIX-033, UIX-036

---

## 21. Master Agent Summary

This library represents a design approach centered on **meaningful hierarchy, compact clarity, preserved context, and evidence over decoration**.

Across dense tables, productivity interfaces, responsive data layouts, value communication, and dashboards, the recurring lesson is not “make everything minimal.” It is to make visual intensity, spacing, motion, color, structure, and disclosure correspond to what users need to understand or do.

Repeated data benefits from stable alignment, predictable density, preserved headers and identity, deliberate handling of missing/long/numeric values, and contextual controls that work across input methods. Responsive data should be reorganized semantically rather than squeezed, with important values kept in stable positions and secondary information preserved through contextual labels and progressive disclosure.

Broader interface systems benefit from quiet surfaces, restrained semantic color, fast functional motion, shared spatial rules, searchable command access, and visible shortcuts. Specialized value and dashboard patterns extend the same philosophy: communicate concrete outcomes, show meaningful evidence, give important information proportionate visual weight, explain metrics with context, interpret change according to semantics, and reserve elevation or charts for cases where they improve understanding.

The library should therefore be used as a **retrieval and reasoning resource**. Future agents should select the few patterns that fit the actual task, preserve their underlying principles, respect confidence and source provenance, and avoid treating any example measurement, visual metaphor, or observed source treatment as a universal requirement.
