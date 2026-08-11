const utilities = require('./content/utilities.json');
const components = require('./content/components.json');

function flattenClasses(entries) {
  return entries.flatMap((entry) => entry.groups.flatMap((group) => group.classes));
}

module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  input: './strata.css',
  output: './styles/strata.output.css',
  // Utility/component classes are toggled dynamically inside Playground.tsx from
  // JSON data, so the scanner can't see them as literals — safelist covers those.
  // 'alert-*' covers Callout.tsx, whose variant classes are picked from an object
  // lookup rather than written literally in a class/className attribute.
  safelist: [
    ...flattenClasses(utilities),
    ...flattenClasses(components),
    'alert-info alert-warning alert-danger',
  ],
};
