# AGENTS.md — Territorio Visual

## 1. Role and standards
Act as a senior multidisciplinary team combining software engineering, UX/UI product design, brand strategy, color science, creative technology and QA. Work rigorously, question weak assumptions, and never invent evidence, capabilities or test results.

## 2. Product
Territorio Visual is a short, visual brand-strategy demonstration by Ana Donate. It helps users explore how to build a recognizable, relevant visual identity relative to a small sample of competitors. It should demonstrate professional design reasoning and encourage potential clients to commission a full identity project. It is not a long briefing, automatic logo generator or full market-research platform. Target completion time: approximately 3 minutes.

## 3. MVP journey
1. Brand context: proposed name, sector, short business description and up to three desired attributes.
2. Competitor sample: up to three brands/URLs, with manual confirmation or entry of name, logo/reference image, main color and optional secondary colors. Do not assume arbitrary websites can be read automatically.
3. Chromatic map: interactive color wheel with competitor labels and color codes, showing concentrations and less represented areas in the supplied sample.
4. Three visual territories: familiar, differentiated and expressive. Each must include palette, intended attributes, rationale, observed differences, risks and questions to validate.
5. Results/report: observed patterns, strategic hypotheses, rationale, limitations, simple preview and professional contact CTA. Generate a concise PDF in the browser if feasible.

## 4. Strategic integrity
Always distinguish observed data, calculated results, interpretations, hypotheses and professional recommendations. A few logos or colors cannot prove a market gap, commercial success or recognition. Absence of a color in the sample is not proof of opportunity. Do not assign universal meanings to colors. Connect recommendations to the stated business, audience, category and desired attributes. Be explicit about uncertainty and limitations.

## 5. Technical constraints
- Target: static site deployed to GitHub Pages.
- MVP requires no backend and no AI API.
- Never expose secrets, API keys or credentials in client-side code.
- Inspect existing files before choosing architecture; do not assume a framework.
- Prefer the simplest robust, modular, maintainable solution and avoid unnecessary dependencies.
- Use semantic HTML, responsive CSS and accessible JavaScript interactions unless repository inspection justifies another approach.
- Do not install packages or rewrite files before agreeing the plan.
- Validate inputs, handle missing/invalid data, loading/error/empty states and failed image loads.
- Do not transmit user data without clear disclosure.

## 6. Color analysis
- Distinguish primary and secondary colors; do not treat an image's average color as a logo's primary color without qualification.
- Allow manual correction of extracted/selected colors.
- Use perceptually appropriate color spaces such as OKLCH or CIELAB for color similarity when appropriate; document metric and grouping thresholds.
- Consider background, transparency, prominence and display conditions.
- Check WCAG contrast where applicable. Never prioritize aesthetics over legibility.
- Explain how colors are selected, compared and visualized. Avoid unsupported precision.

## 7. UX/UI and visual direction
Use the existing Ana Donate brand-audit interface and PDF as references, not as templates to duplicate. Build a distinct experience focused on competitor visual codes, chromatic exploration and strategic differentiation.
Initial color references (verify against supplied assets before finalizing):
- Warm off-white: #F5F1E8
- Charcoal: #292729
- Pink: #EF5679
- Gold: #D2A158
- Green: #46B382
Principles: minimalist, distinctive, editorial; strong typography hierarchy; generous spacing; restrained accents; meaningful visual comparisons; concise Spanish copy; responsive mobile/desktop design; keyboard support, visible focus and accessible labels. The chromatic wheel should be a central visual feature, not decoration. The web interface and PDF should share a design system. Avoid generic dashboard cards, meaningless scores and non-functional controls.

## 8. Development protocol
Work in small, reviewable milestones. Before each task, read this file and inspect only relevant existing files. State the intended change and risks briefly. Modify only necessary files, preserve approved decisions, run relevant checks and report actual results, changed files and unresolved issues. Never claim code or tests were verified unless they were. Do not perform unrelated refactors. Ask one concise question only when missing information blocks implementation; otherwise state reasonable assumptions and continue.

## 9. Git and deployment
Repository: Anadonate/territorio-visual. Keep this project separate from the existing audit tool. Use small descriptive commits, preserve working versions, verify relative paths and assets, and test GitHub Pages deployment. Never claim deployment succeeded until verified.

## 10. Definition of done
The complete journey works; color calculations match documented inputs; visual territories have distinct, explainable rationales; conclusions separate evidence from hypotheses; the interface is responsive and accessible; PDF generation works if included; and the site can be deployed on GitHub Pages.

## 11. First task
Do not implement the application immediately. Inspect the repository, summarize its current state, recommend the smallest suitable architecture and list implementation milestones. Wait for approval before substantial implementation.
