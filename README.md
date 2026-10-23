# Elshaddai

A self-contained JAMB CBT practice app: untimed topic practice with written
explanations, and timed papers with a palette, flags and a score breakdown.
Everything runs in the browser and stores its data in `localStorage` — no
account, no server, no upload.

**Live:** https://livelove12.github.io/elshaddai/ — installable, works offline
after the first visit.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check, then emit ./dist
npm run preview  # serve ./dist locally
```

`dist/` is a static folder. Drop it on any host, or open it from a local server
(`npx serve dist`) — the app also registers a service worker, so after one visit
it keeps working offline and can be added to a phone's home screen.

## What's in the box

| Screen | What it does |
| --- | --- |
| Home | Subject cards, a sample question, and a recap of recent papers — no bank totals |
| Practice | One question at a time, filters by subject, search across prompts, explanation on reveal, keyboard shortcuts (A–D / 1–4, ← →) |
| Timed paper | English compulsory (60 questions) plus one to three other subjects (40 questions each), custom time limit up to two hours, countdown clock, question palette, flag-for-review, auto-end at zero, results with a per-subject breakdown and a full review only after the exam ends |
| Progress | Papers sat, overall accuracy, best paper, accuracy by subject, paper log |
| Import | Paste or upload JSON to extend the bank; the owner-only **Bank coverage** table shows per-subject counts |

## The question bank

`src/data/questions.ts` ships with **original practice items written for this
app**. They are labelled *Original practice set* in the UI and are not
transcribed from any publisher's paper.

Adding your own material: use the **Import** screen, or edit the seed file
directly. Both use the same shape:

```json
{
  "questions": [
    {
      "id": "mat-101",
      "subject": "mathematics",
      "topic": "Percentages",
      "prompt": "A trader buys a bag of rice for ₦40,000 and sells it for ₦46,000. Find the percentage profit.",
      "options": { "A": "6%", "B": "13%", "C": "15%", "D": "60%" },
      "answer": "C",
      "explanation": "Profit = ₦6,000. Percentage profit = (6,000 / 40,000) × 100 = 15%.",
      "source": "My own notes",
      "year": 2024
    }
  ]
}
```

Rules:

- `subject` must be one of `english`, `mathematics`, `physics`, `chemistry`,
  `biology`, `government`, `economics`, `literature`. Add more in
  `src/data/subjects.ts`.
- Student screens never show per-subject bank counts. The **Import** screen is
  the owner's coverage view, and imported question text stays in this browser's
  `localStorage` unless you deliberately publish it.
- `options` must carry all four keys `A`, `B`, `C`, `D`; `answer` must be one of
  them.
- `prompt` and `explanation` are required. `id`, `topic`, `source` and `year` are
  optional; ids are generated when omitted, and re-importing an existing id
  replaces that item.
- Only material you have the right to use. Transcribing a publisher's or
  examination body's question bank into this app is not covered by its licence,
  and JAMB/WAEC/NECO and third-party question banks remain the property of their
  owners. This project is not affiliated with any examination body.

## Layout

```
src/
  App.tsx              hash-based view routing + shared state
  main.tsx             entry, service-worker registration
  components/          TopBar, Home, Practice, Exam, Progress, ImportPanel,
                       OptionList, Modal, Footer
  data/                subjects.ts, questions.ts (seed bank)
  lib/                 types.ts, storage.ts, importQuestions.ts, utils.ts
  styles/              tokens.css (design tokens), app.css
public/                sw.js, manifest.webmanifest, icon.svg
```

State lives in `App.tsx` and is passed down; persistence is a thin wrapper in
`src/lib/storage.ts` over versioned `localStorage` keys (`elshaddai.v1.*`).
Clearing data in the Progress screen wipes those keys only.
