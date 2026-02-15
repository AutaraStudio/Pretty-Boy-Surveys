# Laundry Sauce Surveys

A collection of branded customer survey experiences for [Laundry Sauce](https://laundrysauce.com), built with React and featuring polished GSAP-powered animations. Responses are submitted to Google Sheets for easy tracking and analysis.

## Surveys

### NPS Survey (`/nps`)

A Net Promoter Score survey that asks customers how likely they are to recommend Laundry Sauce. The flow adapts based on the score given:

- **Promoters (9–10)** — asked what they love most
- **Passives (7–8)** — asked what would make them more likely to recommend
- **Detractors (0–6)** — asked how things could be improved

The NPS score is selected via an interactive 0–10 scale that auto-advances to the follow-up question. Ends with a branded thank-you screen linking to the Scent Quiz.

### Subscription Survey (`/subscription`)

A multi-step survey for active subscribers covering satisfaction, delivery frequency, scent preference, scent strength, and likelihood to continue. Includes conditional logic — if a subscriber indicates they're unlikely to continue, an open-text question asks why.

Supports single-select, multi-select, and free-text question types.

## Features

- **GSAP animations** — staggered entrance/exit transitions with custom easing (`buttery`, `smooth`) and a full-screen crossfade to the thank-you screen
- **Google Sheets integration** — responses are submitted via a Google Apps Script web app endpoint on every step, so partial completions are captured
- **URL parameter pre-fill** — surveys can be linked from emails with pre-filled answers (e.g. `?email=user@example.com&nps=9` or `?email=user@example.com&question=1&answer=2`), allowing one-click scoring from email campaigns
- **Conditional question logic** — questions show/hide based on previous answers
- **Responsive design** — desktop uses a split-panel layout with a static image; mobile hides the image and uses a full-width form with a fixed bottom submit button
- **Branded UI** — custom fonts (D-DIN Condensed Bold for headings, Inter for body), dark theme, and Laundry Sauce logo throughout

## Tech Stack

- **React 19** with Vite 7
- **React Router 7** for page routing
- **GSAP 3** (with CustomEase plugin) for animations
- **Vanilla CSS** with CSS custom properties
- **Google Apps Script** for backend data collection

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens a local dev server (default `http://localhost:5173`).

### Build

```bash
npm run build
```

Outputs production files to `dist/`.

### Preview

```bash
npm run preview
```

Serves the production build locally.

## Project Structure

```
├── public/
│   ├── fonts/                    # Custom fonts (D-DIN Condensed Bold)
│   └── images/
│       ├── nps/                  # NPS survey images
│       └── subscription/         # Subscription survey images
├── src/
│   ├── components/
│   │   └── Logo.jsx              # Laundry Sauce SVG logo component
│   ├── pages/
│   │   ├── NpsSurvey/
│   │   │   ├── NpsSurvey.jsx     # NPS survey page component
│   │   │   ├── NpsSurvey.css     # NPS survey styles
│   │   │   └── questions.js      # NPS question definitions
│   │   └── SubscriptionSurvey/
│   │       ├── SubscriptionSurvey.jsx
│   │       ├── SubscriptionSurvey.css
│   │       └── questions.js      # Subscription question definitions
│   ├── App.jsx                   # Route definitions
│   ├── App.css                   # Global app styles
│   └── main.jsx                  # Entry point
├── index.html
├── vite.config.js
└── package.json
```

## URL Parameters

### NPS Survey

| Parameter | Description | Example |
|-----------|-------------|---------|
| `email` | Customer email (used for sheet submission) | `user@example.com` |
| `nps` | Pre-selected NPS score (0–10) | `9` |

Example: `/nps?email=user@example.com&nps=9`

### Subscription Survey

| Parameter | Description | Example |
|-----------|-------------|---------|
| `email` | Customer email | `user@example.com` |
| `question` | Question number to pre-fill (1-indexed) | `1` |
| `answer` | Answer option index (1-indexed) | `2` |

Example: `/subscription?email=user@example.com&question=1&answer=2`
