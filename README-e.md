# LAT35++ v0.1

A data analysis workbench for qualitative research

Developed by Masanobu Sakamoto

---

## What is LAT35++?

LAT35++ lets you code utterance data from interviews, classroom records and similar sources (utterance number, speaker, text) and visualize the relationships between words and codes.

Its key feature is that each code can carry a **degree (3 levels)**. For example, the same "stop it" can be coded differently depending on whether it was said lightly during play or with real urgency, so you can see how a speaker's urgency builds up over the course of an interview or a lesson.

The interface can be switched between Japanese and English with **Language／言語** at the top right of the screen.

### Main features

| Feature | Description |
| --- | --- |
| Project management | Create, switch and auto-save projects; save and load project files (`.qda.json`) |
| Documents | Import CSV / TXT (UTF-8 and Shift_JIS detected automatically) |
| Codes | Name, definition, color, parent category, degree (3 levels), words for auto-coding |
| Categories | Higher-level concepts that group several codes, shown with their description, codes and coded segments |
| Coding | Code a single utterance, several utterances (across utterances) or part of an utterance; shown as vertical bars whose thickness reflects the degree |
| KWIC | Search a word and list it with its surrounding context |
| Word analysis | Frequent words, co-occurrence network (Jaccard, TF-IDF, cosine similarity), multidimensional scaling (MDS) |
| Code analysis | Code similarity and proximity (heatmap, network), degree over time |
| Correspondence analysis | Words × codes (or speakers / ranges) with a χ² test |
| User dictionary | Register words such as 日本人 that would otherwise be split, per project |
| Saving figures | PNG / JPG / PDF / SVG. Color "None" gives grayscale output for papers |
| Table output | Print the category & code list (A4 / Letter landscape, 20 mm margins) or save it as PDF, CSV or Excel (xlsx) |

---

## Requirements

- **Windows 10 / 11**, **macOS** or **Linux**
- **Node.js 20 or later** (LTS recommended)
- Browser: latest Chrome, Edge, Firefox or Safari

An internet connection is needed **only for the first installation**. After that, the app works offline. The morphological analysis dictionary (kuromoji / IPA dictionary) is included.

---

## Installation

### 1. Install Node.js

If you do not have it yet, download and install the **LTS** version from [https://nodejs.org/](https://nodejs.org/).

To check the installation, open Command Prompt (Terminal on Mac) and run:

```
node -v
```

If it shows `v20.x.x` or later, you are ready.

### 2. Extract LAT35++

Extract the downloaded ZIP file to any folder you like.

> **Note (Windows)**
> Placing it in a folder whose path has no Japanese characters or spaces (e.g. `C:\LAT35pp`) helps avoid problems.

### 3. First-time setup (once only)

| OS | Action |
| --- | --- |
| Windows | Double-click `setup.bat` |
| Mac / Linux | Run `./setup.sh` in Terminal |

This installs the required packages and builds the app. It takes a few minutes. Setup is complete when "Setup finished." is shown.

> If you see "Permission denied" on Mac / Linux, run this first:
> ```
> chmod +x setup.sh start.sh
> ```

---

## Starting and stopping

### Start (this is all you need from the second time on)

| OS | Action |
| --- | --- |
| Windows | Double-click `start.bat` |
| Mac / Linux | Run `./start.sh` in Terminal |

After a few seconds your browser opens `http://localhost:3000`. If it does not open, type that address into your browser.

If you run `start` before setting up, setup starts automatically.

### Stop

Close the black window (Command Prompt / Terminal), or press `Ctrl + C` in it. Your work is saved automatically, so you can simply quit.

---

## How to use

### 1. Create or load a project

Click the project name at the top left and choose one of:

- **New project**: give it a name and create it
- **Load project**: open a `.qda.json` file you saved earlier

The first time you start the app, a sample project opens so you can try things out.

### 2. Import text

Import a CSV or TXT file from the document list on the left.

**CSV**: put headings in the first row. Any of the following column names is recognized automatically.

| Item | Recognized column names |
| --- | --- |
| Utterance number | 発言番号, 番号, 通し番号, No, ID |
| Speaker | 発言者, 話者, 名前, 氏名, Speaker |
| Text | 発言内容, 発言, 内容, テキスト, Text |

```csv
No,Speaker,Text
1,T,Today we will think about war.
2,Tatsuya,Stop it, don't say that.
```

**TXT**: the following formats are supported.

```
1	T	Today we will think about war.      ← tab-separated
2 Tatsuya: Stop it, don't say that.      ← number speaker: text
Tatsuya: Stop it.                        ← speaker: text
```

Both UTF-8 and Shift_JIS (CSV saved from Japanese Excel) can be read.

### 3. Define codes

Create codes with **"+ Code"** in the code system.

- **Name and definition**: the criteria for applying the code, with examples of what it does and does not include
- **Color**: used for the vertical bars and charts
- **Parent**: the category or code this code belongs to (in the list, categories and codes are marked `Cat` / `Code`)
- **Degree (3 levels)**: what each level means (e.g. 1 = in play, 2 = somewhat intentional, 3 = urgent)
- **Words for auto-coding**: enter comma-separated words to automatically code the utterances that contain them

With **"+ Category"** you can create a higher-level concept that groups several codes. When you select a category, its description, codes and coded utterances are shown on the right.

### 4. Apply codes

1. Select the passage in the text with the mouse (it may span several utterances or be only part of one).
2. Choose the code and degree in the toolbar at the top and apply it.
3. Coded passages are marked with a **vertical bar** to the left of the text. The higher the degree, the thicker the bar.

### 5. KWIC search

Enter a word in the search panel to list it with the text before and after it (like the KWIC concordance in KH Coder). This is useful for revising code definitions while looking at the results.

### 6. Visualize

Open **"Visualize"** at the top of the screen, set the conditions and press **"Visualize"**.

- **Filters**: documents, speakers, parts of speech, minimum frequency, utterance number range
- **Focus words**: words you want to include in the analysis
- **Similarity measure**: Jaccard coefficient, TF-IDF, cosine similarity

| Figure | Statistics shown |
| --- | --- |
| Co-occurrence network | N (words), E (edges), D (density), number of groups (modularity) |
| Multidimensional scaling | Kruskal Stress-1, cumulative contribution |
| Correspondence analysis | Total inertia, cumulative contribution, χ² value, degrees of freedom, p value |
| Code similarity & proximity | Heatmap, network |
| Degree over time | Change of degree as the utterance number progresses |

Choosing **"None"** in the color setting displays the figure in black and white (grayscale), which is convenient for papers and reports.

Each figure can be saved as **PNG / JPG / PDF / SVG** from its top right. SVG is a vector format, so it stays sharp when enlarged and its text and lines can be edited later in Illustrator, Inkscape, PowerPoint and similar tools.

### 7. Fix word splitting (user dictionary)

If words are split in unintended ways (for example 日本人 split into 日本 and 人), register them under **"Word handling (dictionary)"** on the visualization screen. Registrations are saved per project.

### 8. Create the category & code list

Press **"Category & code list"** at the bottom of the code system to show a table with these columns:

Category / Category definition / Code / Utterance no. / Coded text

Choose the paper size (A4 / Letter) and press **"Print / PDF"**. To make a PDF, choose "Save as PDF" as the destination in the print dialog. The paper is set to landscape with 20 mm margins on all sides.

Press **"CSV"** or **"Excel (xlsx)"** to save the same content as table data (columns: Category / Category definition / Code / Utterance no. / Coded text / Degree; a "Documents" column is added when there are several documents). The CSV is saved as UTF-8 with BOM, so Japanese text is not garbled when opened in Excel.

---

## Saving and sharing data

### Auto-save

Your work is **saved automatically in the browser** each time you make a change. When you quit and start the app again, you can continue where you left off.

> **Note**
> Auto-save is per browser. Clearing the browser history or site data also erases the saved content. Save important data as a file as well, as described below.

### Save as a project file

Press **"Save to file"** at the top of the screen to download the whole project (documents, codes, categories, codings and user dictionary) as a `.qda.json` file.

- **Backup**: saving regularly keeps your work safe.
- **Sharing with others**: give them the `.qda.json` file; when they open it with "Load project", they can continue from the same state.
- **Continuing on another PC**: move it the same way.

All data is processed only on your own PC. Nothing is sent over the internet.

---

## Troubleshooting

| Symptom | Solution |
| --- | --- |
| `setup.bat` shows "Node.js was not found" | Install Node.js, restart your PC and run it again. |
| "port 3000 is already in use" at startup | LAT35++ is already running. Close the previous window and start again. |
| The browser does not open automatically | Open `http://localhost:3000` in your browser. |
| CSV text is garbled | Save it again from Excel in "CSV UTF-8" format. |
| Words are not split as intended | Register them under "Word handling (dictionary)". |
| The app does not work properly after an update | Delete the `.next` folder and run `start.bat` (`start.sh`). The app will be rebuilt. |

---

## Technical information

- Next.js 16 / React 19 / TypeScript / Tailwind CSS
- Morphological analysis: kuromoji.js (IPA dictionary)
- Statistics (correspondence analysis, MDS, similarity, community detection) are computed inside the app

For developers:

```
pnpm install     # install packages
pnpm dev         # start in development mode
pnpm build       # production build
pnpm start       # start in production mode
```

---

LAT35++ v0.1 — Developed by Masanobu Sakamoto
