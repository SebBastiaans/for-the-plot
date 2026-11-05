# Schaduw van de mobiele navigatiebalk weghalen

## Waar het zit
- `src/components/SiteNav.tsx`, regel 109: de mobiele balk onderaan heeft de class `shadow-sticker`.
- Regel 114: de ronde groene "+"-knop in die balk heeft ook `shadow-sticker`.
- De schaduw zelf staat in `src/styles.css`: `--shadow-sticker` (regel 112 voor licht, regel 164 voor donker) en de utility `shadow-sticker` (regel 241-243).

## Wijziging (als je dat wilt)
- Haal `shadow-sticker` weg van de balk op regel 109, net als eerder bij de bovenste balk.
- De "+"-knop houdt zijn schaduw, tenzij je die ook weg wilt.
