# Repository Guidelines

## Project structure

UNTETHERED is a browser-based EVA return simulator. Edit `index.html` for the interface, inline SVG artwork, CSS, and simulation logic. The script starts with equipment and scenario definitions. Use `impulse()` for throw calculations, `advance()` for elapsed flight time, and `renderPlot()` for the trajectory display. Keep the throw preview and the actual throw on the same physics calculation.

The root also contains two browser test pages and `preview-qa.png`, a visual reference.

## Local development

The simulator runs directly in a browser without installing dependencies or building assets. From the repository root in PowerShell, use these commands:

- `Start-Process .\index.html` opens the simulator. Select a tool, set its bearing and power, and throw it to check an interaction.
- `Start-Process .\qa-runner.html` runs the browser assertions at the current window width. Read the `PASS` or `FAIL` result at the bottom of the page.
- `Start-Process .\qa-widths.html` runs the checks at 320, 390, and 768 pixels. Look for a passing result at each width.

## Coding style

Use two spaces for JavaScript block indentation and camelCase for functions and variables, as in `throwTool` and `captureRadius`. Use `const` for stable bindings and `let` for values that change. Reuse the CSS custom properties in `:root` for interface colors and fonts. There is no configured formatter or linter.

## Testing

Both QA pages embed simulator code. After changing `index.html`, refresh the simulator copy in `qa-runner.html` and the runner copies in the `srcdoc` frames of `qa-widths.html` before relying on their results. Add regression cases to the runner using `test('descriptive behavior', ...)`. Use `near()` for floating-point comparisons and `yes()` for state or DOM assertions. Existing groups cover momentum conservation, capture timing, oxygen expiry, keyboard controls, and layout. There is no configured coverage threshold.

## Commits and pull requests

Use a short imperative commit subject such as `Fix capture timing at oxygen expiry`. In a pull request, describe the behavior change, report the browser QA results, and link any related issue. Include a screenshot for visible interface changes.
