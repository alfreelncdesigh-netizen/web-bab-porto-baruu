import os

css_append = """
/* TEMA CUSTOM */
html[data-theme="tiffany"] {
  /* Overrides for arbitrary values */
  --bg-dark-1: #171717;
  --bg-dark-2: #1f1f1f;
  --text-light: #21F1A8;
  --border-dark: #2a2a2a;
}
html[data-theme="charcoal"] {
  --bg-dark-1: #3C1A47;
  --bg-dark-2: #4a2057;
  --text-light: #B6FF00;
  --border-dark: #5a276b;
}
html[data-theme="cyprus"] {
  --bg-dark-1: #004741;
  --bg-dark-2: #005a52;
  --text-light: #F0EDE4;
  --border-dark: #007369;
}

html[data-theme="tiffany"],
html[data-theme="charcoal"],
html[data-theme="cyprus"] {
  /* Override Tailwind v4 CSS variables for zinc and white */
  --color-white: var(--text-light);
  --color-zinc-50: var(--text-light);
  --color-zinc-100: var(--text-light);
  --color-zinc-200: var(--text-light);
  --color-zinc-300: var(--text-light);
  --color-zinc-400: var(--text-light);
  
  --color-zinc-800: var(--border-dark);
  --color-zinc-900: var(--bg-dark-2);
  --color-zinc-950: var(--bg-dark-1);
  --color-black: var(--bg-dark-1);
}

/* Override explicit classes used in the app */
html[data-theme="tiffany"] .dark\:bg-\[\#0A0A0A\]:where(.dark, .dark *),
html[data-theme="charcoal"] .dark\:bg-\[\#0A0A0A\]:where(.dark, .dark *),
html[data-theme="cyprus"] .dark\:bg-\[\#0A0A0A\]:where(.dark, .dark *) {
  background-color: var(--bg-dark-1) !important;
}

html[data-theme="tiffany"] .dark\:bg-\[\#111111\]:where(.dark, .dark *),
html[data-theme="charcoal"] .dark\:bg-\[\#111111\]:where(.dark, .dark *),
html[data-theme="cyprus"] .dark\:bg-\[\#111111\]:where(.dark, .dark *) {
  background-color: var(--bg-dark-2) !important;
}

html[data-theme="tiffany"] .dark\:bg-\[\#111111\]\\/50:where(.dark, .dark *),
html[data-theme="charcoal"] .dark\:bg-\[\#111111\]\\/50:where(.dark, .dark *),
html[data-theme="cyprus"] .dark\:bg-\[\#111111\]\\/50:where(.dark, .dark *) {
  background-color: color-mix(in srgb, var(--bg-dark-2) 50%, transparent) !important;
}

html[data-theme="tiffany"] .dark\:bg-\[\#111111\]\\/30:where(.dark, .dark *),
html[data-theme="charcoal"] .dark\:bg-\[\#111111\]\\/30:where(.dark, .dark *),
html[data-theme="cyprus"] .dark\:bg-\[\#111111\]\\/30:where(.dark, .dark *) {
  background-color: color-mix(in srgb, var(--bg-dark-2) 30%, transparent) !important;
}

html[data-theme="tiffany"] .dark\:text-white:where(.dark, .dark *),
html[data-theme="charcoal"] .dark\:text-white:where(.dark, .dark *),
html[data-theme="cyprus"] .dark\:text-white:where(.dark, .dark *) {
  color: var(--text-light) !important;
}

html[data-theme="tiffany"] .text-white,
html[data-theme="charcoal"] .text-white,
html[data-theme="cyprus"] .text-white {
  color: var(--text-light) !important;
}
html[data-theme="tiffany"] .bg-black,
html[data-theme="charcoal"] .bg-black,
html[data-theme="cyprus"] .bg-black {
  background-color: var(--bg-dark-1) !important;
}
html[data-theme="tiffany"] .dark\:bg-white:where(.dark, .dark *),
html[data-theme="charcoal"] .dark\:bg-white:where(.dark, .dark *),
html[data-theme="cyprus"] .dark\:bg-white:where(.dark, .dark *) {
  background-color: var(--text-light) !important;
}
html[data-theme="tiffany"] .dark\:text-black:where(.dark, .dark *),
html[data-theme="charcoal"] .dark\:text-black:where(.dark, .dark *),
html[data-theme="cyprus"] .dark\:text-black:where(.dark, .dark *) {
  color: var(--bg-dark-1) !important;
}

/* Also handle placeholder and border colors */
html[data-theme="tiffany"] .dark\:border-zinc-800:where(.dark, .dark *),
html[data-theme="charcoal"] .dark\:border-zinc-800:where(.dark, .dark *),
html[data-theme="cyprus"] .dark\:border-zinc-800:where(.dark, .dark *) {
  border-color: var(--border-dark) !important;
}
html[data-theme="tiffany"] .dark\:border-zinc-800\\/50:where(.dark, .dark *),
html[data-theme="charcoal"] .dark\:border-zinc-800\\/50:where(.dark, .dark *),
html[data-theme="cyprus"] .dark\:border-zinc-800\\/50:where(.dark, .dark *) {
  border-color: color-mix(in srgb, var(--border-dark) 50%, transparent) !important;
}
"""

with open("src/index.css", "a") as f:
    f.write(css_append)

print("CSS appended.")
