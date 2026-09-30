# Chōwa 調和 — Linee guida di design

**Sistema:** "Onyx & Perla" · monocromatico elegante
**Filosofia:** *Strength in Balance*. Nero profondo, bianco perla caldo e luminoso.
L'accento **non è un colore, è la perla stessa**. Calma, spazio, disciplina.

Mobile-first (PWA). Stack: Vite + React + TypeScript + **Tailwind v4** + Firebase.

---

## 1. Principi

1. **Monocromia disciplinata** — nero + perla + pochi grigi caldi. Niente colori accesi.
2. **La luce è l'accento** — bagliori perla tenui, aloni radiali, riflessi. Mai tinte sature.
3. **Spazio e silenzio** — molto respiro, gerarchia chiara, un solo elemento protagonista per schermata.
4. **Movimento micro** — animazioni brevi, morbide (`cubic-bezier(0.22, 1, 0.36, 1)`), mai vistose.
5. **Leggibilità sul nero** — testo perla su onice; sugli accenti chiari, testo scuro (`#1a1012`).

---

## 2. Colori (token)

I colori sono **token Tailwind v4** definiti in `src/index.css` dentro `@theme`.
I *nomi* sono storici (viola, teal, arancio…) ma i **valori** sono monocromatici: cambiando i valori si re-skinna tutta l'app senza toccare i componenti.

### Superfici e testo
| Token | Hex | Uso |
|---|---|---|
| `--color-bg` | `#070707` | Sfondo onice (fondo app) |
| `--color-surface` | `#131313` | Superficie / sheet |
| `--color-surface2` | `#1a1a1a` | Card in rilievo |
| `--color-ink` | `#e9e4da` | Testo (perla calda) |
| `--color-muted` | `#8f8a81` | Testo secondario (grigio caldo) |

### Accenti (perla + funzionali)
| Token | Hex | Uso |
|---|---|---|
| `--color-teal` | `#f4f0e7` | **Accento principale** — anelli, pulsanti, highlight |
| `--color-viola` | `#f4f0e7` | Accento (alias perla brillante) |
| `--color-arancio` | `#cbb48f` | Alert / surplus — champagne caldo |
| `--color-verde` | `#b6c6ba` | OK / deficit — eucalipto tenue |
| `--color-magenta` | `#8a857c` | Grigio neutro |
| `--color-blunotte` | `#1a1a1a` | Superficie scura in rilievo |

### Macro (toni metallici distinti)
| Token | Hex | Macro |
|---|---|---|
| `--color-prot` | `#ece6d9` | Proteine — perla |
| `--color-carb` | `#cbb48f` | Carboidrati — champagne |
| `--color-fat` | `#8f8a81` | Grassi — grigio |

**Regola contrasto:** su un accento chiaro (teal/viola/arancio/verde) il testo e le icone vanno **scuri** — usa `text-[#1a1012]` o `text-[#141210]`. Mai testo bianco su perla.

**Meta / PWA:** `theme_color` e `background_color` = `#070707` (in `index.html`, `vite.config.ts`, manifest).

---

## 3. Tipografia

| Ruolo | Font | Peso | Note |
|---|---|---|---|
| Titoli (`.font-display`) | **Manrope** | 200 (ExtraLight) | `letter-spacing: 0`. Regola forte: vince sulle utility di peso |
| Brand / wordmark (`.font-brand`) | Manrope | 200–300 | Molto spaziato: `tracking-[0.35em]`→`0.42em` |
| Testo (`body`, `.font-sans`) | **Inter** | 400 | `letter-spacing: 0.01em` |
| Numeri / tecnico (`.font-mono`, `.tabular`) | Inter | 600–700 | `font-variant-numeric: tabular-nums` |

Font caricati da Google Fonts in `index.html` (Inter 300–700, Manrope 200–500).

**Micro-tipografia ricorrente:**
- Etichette/eyebrow: `text-[11px] uppercase tracking-[0.3em] text-muted`
- Wordmark: `font-brand font-extralight tracking-[0.4em] text-ink`

---

## 4. Forma, spazio, ombre

- **Raggio card:** `--radius-card: 24px` (`rounded-[var(--radius-card)]`). Sheet: `rounded-t-[28px]`. Pill/bottoni: `rounded-2xl`. Elementi tondi: `rounded-full`.
- **Larghezza contenuto:** colonna centrata `max-w-[480px]` (mobile-first).
- **Gutter laterale:** `px-5` … `px-7`. Safe-area sempre inclusa:
  `paddingTop: calc(env(safe-area-inset-top) + …)` e stesso per il bottom.
- **Bordi:** hairline chiarissimo — `ring-1 ring-white/[0.04]`.
- **Ombre:** profonde ma morbide — `shadow-[0_16px_50px_-20px_rgba(0,0,0,0.7)]`.
- **Alone perla (`.glow-soft`):** `box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(244,240,231,0.08)`.

### Sfondo app
Onice con due aloni perla tenui (radial-gradient a ~5% e ~3% di opacità), `background-attachment: fixed`. Luminoso ma silenzioso.

---

## 5. Componenti base (`src/components/ui.tsx`)

- **Card** — `bg-surface2`, `ring-1 ring-white/[0.04]`, raggio 24, ombra morbida. Prop `gradient` per varianti.
- **Button** — varianti:
  - `primary`: `bg-teal text-[#1a1012] shadow-[0_10px_30px_-12px_rgba(244,240,231,0.35)]`
  - `soft`: `bg-teal/[0.12] text-teal`
  - `ghost`: `bg-white/[0.05] text-ink`
  - `danger`: `bg-red-500/10 text-red-300`
  - Base: `min-h-[46px] rounded-2xl active:scale-[0.98]`
- **Stepper / NumberInput** — input testuale (`inputMode="decimal"`) che **accetta la virgola** (es. `150,5`): converte `,`→`.`, niente clamp durante la digitazione, clamp all'uscita dal campo.
- **Segmented** — tab pill: attivo `bg-surface2 text-teal shadow-sm`, inattivo `text-muted`.
- **Sheet** — bottom sheet: overlay `bg-black/40`, pannello `rounded-t-[28px] bg-surface`, `max-h-[88dvh]`. Prop `flush` per header fisso + corpo che scrolla.
- **Field** — label eyebrow (`text-[11px] uppercase tracking-[0.12em] text-muted`) + controllo.

**Feedback tattile:** ogni elemento premibile ha `active:scale-[0.98]` (o `active:scale-90` per i tondi).

---

## 6. Grafici e dati

- **Anelli / donut (`charts.tsx`, `Ring`)**: colore di default perla `#f4f0e7`.
- **Macro donut**: proteine `#ece6d9`, carbo `#cbb48f`, grassi `#8f8a81`.
- **Peso (linea)**: stroke e dot `#f4f0e7`. Grafico a **linea** (andamento calo/aumento), non a barre.
- **Passi / Storico**: card gradiente scura `from-[#1c1c1c] to-[#121212]`, celle attive perla `#f4f0e7`, inattive grigio `#6f6a62`.
- **Badge "on"**: `bg-teal text-[#141210] shadow-sm`.

---

## 7. Animazioni (`src/index.css`)

Curva standard: `cubic-bezier(0.22, 1, 0.36, 1)`. Durate brevi.

- `.animate-pop` — entrata scale+fade (0.4s).
- `.animate-fade-up` — comparsa dal basso; usata a cascata con `animationDelay` crescente (`rise(delay)`).
- `.logo-reveal` / `.logo-spin` — enso: reveal + rotazione lentissima (50s).
- `.animated-gradient` — onice che "respira" (26s), quasi impercettibile.

### Welcome — kanji 調和 protagonista
Effetto "cromato" con luce che scorre **dentro** i tratti (non una fascia sopra):
- Glifi in **serif giapponese** (`Hiragino Mincho ProN`, `Yu Mincho`, `Noto Serif JP`…).
- `.kanji-hero`: gradiente argento→bianco→argento con `background-clip: text` + `-webkit-text-fill-color: transparent`; `@keyframes kanjiShine` anima `background-position` → riflesso che attraversa (3.6s + pausa).
- `.kanji-focus`: entrata "a fuoco" (blur+scale→nitido), staggerata per carattere.
- `.kanji-glow`: `drop-shadow` perla che "respira" (5s).
- `.kanji-aura`: alone radiale che pulsa dietro (6s).

Principio: **un solo protagonista**, fondo onice puro, tutto il resto entra in cascata sotto.

---

## 8. Do & Don't

**Do**
- Usa i **token** (`bg-teal`, `text-ink`, `bg-prot`…), mai hex hardcoded nei componenti.
- Testo **scuro** sugli accenti chiari.
- Molto spazio negativo; una gerarchia, un focus per schermata.
- Animazioni micro e morbide.

**Don't**
- Niente colori saturi/vivaci (rosa, teal acceso, arancione pieno): fuori palette.
- Niente testo bianco puro su perla (contrasto insufficiente).
- Niente ombre dure o bordi spessi: solo hairline e aloni.
- Non reintrodurre immagini-file per il logo: l'enso è **SVG in codice** (`brand.tsx`), così non si "perde" più.

---

## 9. Dove sta cosa

| Ambito | File |
|---|---|
| Token colore/tipografia, utility, animazioni | `src/index.css` (`@theme`) |
| Componenti base (Card, Button, Sheet, Input…) | `src/components/ui.tsx` |
| Logo/enso SVG + set di icone | `src/components/brand.tsx` |
| Grafici (anelli, donut, linea) | `src/components/charts.tsx` |
| Welcome (kanji protagonista) | `src/auth/Welcome.tsx` |
| Meta/PWA (theme-color, manifest) | `index.html`, `vite.config.ts` |

> Per re-skinnare l'intera app basta cambiare i **valori** dei token in `@theme`: i nomi restano, la logica non si tocca.
