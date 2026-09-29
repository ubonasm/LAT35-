'use client'

import { useCallback } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Locale = 'ja' | 'en'
type Params = Record<string, string | number>

interface LocaleState {
  locale: Locale
  setLocale: (l: Locale) => void
}

export const useLocale = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'ja',
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'lat35-locale', skipHydration: true },
  ),
)

// Japanese source strings are the keys; missing keys fall back to the Japanese text.
const EN: Record<string, string> = {
  // common
  '言語／Language': 'Language／言語',
  '読み込み中…': 'Loading…',
  閉じる: 'Close',
  削除: 'Delete',
  保存: 'Save',
  キャンセル: 'Cancel',
  実行: 'Run',
  登録: 'Add',
  追加: 'Add',
  開く: 'Open',
  検索: 'Search',
  コード: 'Code',
  カテゴリ: 'Category',
  文書: 'Documents',
  度合い: 'Degree',
  '度合い{n}': 'Degree {n}',
  全文書: 'All documents',
  表示中の文書: 'Current document',
  '表示する対象がありません。': 'Nothing to display.',
  '{n}件': '{n}',
  名詞: 'Noun',
  動詞: 'Verb',
  形容詞: 'Adjective',
  副詞: 'Adverb',
  感動詞: 'Interjection',
  その他: 'Other',
  '名詞(非自立)': 'Noun (dependent)',
  軽い: 'Light',
  中程度: 'Moderate',
  切実: 'Earnest',
  '遊びや冗談の中での発言、切実さは低い': 'Said in play or jest; low earnestness',
  '一定の感情や意図がこもっている': 'Carries some emotion or intent',
  '強い感情・切迫感を伴う発言': 'Accompanied by strong emotion or urgency',

  // workbench
  KWIC検索: 'KWIC',
  コード箇所: 'Coded segments',
  詳細: 'Details',
  プロジェクトを選択: 'Select project',
  作業内容はこのブラウザ内に自動保存されています: 'Your work is saved automatically in this browser',
  自動保存済み: 'Auto-saved',
  'プロジェクトファイル（.qda.json）として保存': 'Save as a project file (.qda.json)',
  ファイルに保存: 'Save to file',
  表示切替: 'Switch view',
  コーディング: 'Coding',
  可視化: 'Visualize',
  'プロジェクトを作成するか、読み込んでください。': 'Create or load a project.',
  プロジェクトを開く: 'Open project',
  表示ペイン: 'Panes',
  '文書・コード': 'Docs & codes',
  本文: 'Text',
  '検索・箇所': 'Search & segments',
  パネル: 'Panel',

  // project dialog
  'プロジェクトファイル（.qda.json）を読み込めませんでした。': 'Could not load the project file (.qda.json).',
  プロジェクト: 'Projects',
  '作業内容はこのブラウザ内に自動保存されます。別のPCで続ける・他の人に渡すときは、書き出したプロジェクトファイル（.qda.json）を相手が「プロジェクトを読み込む」で開いてください。':
    'Your work is saved automatically in this browser. To continue on another PC or hand the project to someone else, export the project file (.qda.json) and open it with “Load project”.',
  保存済みプロジェクト: 'Saved projects',
  '文書 {d} ・ コード {c} ・ 付与 {n}': '{d} docs · {c} codes · {n} codings',
  書き出し: 'Export',
  '「{name}」を削除しますか？この操作は取り消せません。': 'Delete “{name}”? This cannot be undone.',
  'まだプロジェクトがありません。': 'No projects yet.',
  プロジェクトを読み込む: 'Load project',
  新規プロジェクト: 'New project',
  名前: 'Name',
  '例：小学校4年 総合の授業': 'e.g. Grade 4 integrated studies lesson',
  '説明・研究課題': 'Description / research question',
  作成する: 'Create',

  // document list / viewer
  '{name}（{n}発言）': '{name} ({n} utterances)',
  '読み込み: {names}': 'Loaded: {names}',
  '発言を読み取れませんでした。': 'No utterances could be read.',
  '{name}を削除': 'Delete {name}',
  '「{name}」とそのコード付与を削除しますか？': 'Delete “{name}” and its codings?',
  '発言番号・発言者・発言内容の列を持つCSV、または「番号 発言者：内容」形式のTXTを読み込んでください。':
    'Import a CSV with number, speaker and text columns, or a TXT in the form “number speaker: text”.',
  '左の「文書」から文書を選ぶか、CSV/TXTを読み込んでください。': 'Choose a document from “Documents” on the left, or import a CSV/TXT file.',
  '{u}発言 ・ {c}箇所': '{u} utterances · {c} segments',
  '{name}の発言': 'Utterances of {name}',
  '{code}・度合い{n}（{label}）': '{code} · degree {n} ({label})',
  '{code}\n度合い{n}：{label}': '{code}\nDegree {n}: {label}',
  この発言全体にコードを付す: 'Code this whole utterance',

  // coding toolbar
  コードを付す: 'Apply code',
  'コードを検索／新規作成': 'Search or create a code',
  '「{name}」を作成して付す': 'Create “{name}” and apply',

  // code tree
  コードシステム: 'Code system',
  'コードを定義するか、本文を選択してその場で新しいコードを作成できます。': 'Define codes here, or select text to create a new code on the spot.',
  'カテゴリ・コード一覧作成': 'Category & code list',
  '（カテゴリ）': '(category)',
  '含むコードの付与件数（度合い1/2/3）': 'Codings of contained codes (degree 1/2/3)',
  '度合い1/2/3の件数': 'Count by degree 1/2/3',
  '{name}に下位コードを追加': 'Add a child code to {name}',
  '{name}を編集': 'Edit {name}',

  // segments panel
  '（定義未設定）': '(No definition)',
  'コード付与された箇所はまだありません。': 'No coded segments yet.',
  コードで絞り込み: 'Filter by code',
  すべてのコード: 'All codes',
  '［カテゴリ］{name}': '[Category] {name}',
  'コード {c} ・ 付与 {n}': '{c} codes · {n} codings',
  '（カテゴリの説明が未設定です。鉛筆アイコンから入力できます）': '(No category description yet. Add one with the pencil icon.)',
  'カテゴリに直接付与（{n}）': 'Coded directly with the category ({n})',
  付与箇所なし: 'No codings',
  '含むコードがありません。コードの編集画面で「上位カテゴリー」にこのカテゴリを指定してください。':
    'No codes inside yet. In a code’s edit screen, set this category as its “Parent”.',
  '本文左の縦棒をクリックすると、その付与箇所の詳細を表示・編集できます。': 'Click a vertical bar to the left of the text to view and edit that coding.',
  コードの付け替え: 'Change code',
  'メモ（判断の根拠など）': 'Memo (e.g. reasons for the judgment)',
  このコード付与を削除: 'Remove this coding',

  // kwic
  正規表現が正しくありません: 'Invalid regular expression',
  '{n}件にコードを付しました': 'Coded {n} hits',
  '語を検索（例：やめて）': 'Search a word (e.g. やめて)',
  検索語: 'Search term',
  範囲: 'Scope',
  正規表現: 'Regex',
  前後: 'Context',
  字: 'chars',
  すべて選択: 'Select all',
  '「{q}」 {n}件': '“{q}” · {n} hits',
  '{n}を選択': 'Select {n}',
  '語を検索すると、前後の文脈とともに一覧表示（KWIC）します。行をクリックすると本文へ移動、チェックした箇所にまとめてコードを付せます。':
    'Search a word to list it with its surrounding context (KWIC). Click a row to jump to the text, or check rows to code them all at once.',
  付すコード: 'Code to apply',
  コードを選択: 'Select a code',
  '{n}件に付す': 'Apply to {n}',

  // figures
  '図の書き出しに失敗しました。もう一度お試しください。': 'Could not export the figure. Please try again.',
  図を保存: 'Save figure',
  類似度ヒートマップ: 'Similarity heatmap',
  'コードライン（発言の流れに沿った度合い）': 'Code line (degree along the flow of talk)',
  '横軸は発言の順序、縦棒の太さと高さが度合い（1〜3）です。棒をクリックすると本文へ移動します。':
    'The horizontal axis is utterance order; bar width and height show the degree (1–3). Click a bar to jump to the text.',
  '#{n} 度合い{d}': '#{n} degree {d}',
  '文書（回）ごとの平均度合い': 'Mean degree per document (session)',
  '表示できる線がありません。描画する線の数を増やすか、閾値を下げてください。': 'No edges to display. Increase the number of edges or lower the threshold.',
  共起ネットワーク: 'Co-occurrence network',
  グループ: 'Group',
  頻度: 'Frequency',
  ' ・ グループ {n}（modularity） ・ 実線＝同じグループ内、点線＝グループ間': ' · {n} groups (modularity) · solid = within group, dotted = between groups',
  '多次元尺度構成法には3つ以上の対象が必要です。': 'MDS needs at least three items.',
  'クラスター {n}': 'Cluster {n}',
  '色＝コードの色': 'color = code color',
  '{v}＝平均連結法によるクラスター {n}': '{v} = {n} clusters (average linkage)',
  濃淡: 'shade',
  色: 'color',
  '次元{d}（{p}%）': 'Dimension {d} ({p}%)',
  'N {n} ・ 古典的MDS（距離＝1−類似度） ・ Kruskal Stress-1 {s} ・ 累積寄与率（次元1–2） {c}% ・ {note} ・ 円の大きさ＝出現数':
    'N {n} · classical MDS (distance = 1 − similarity) · Kruskal Stress-1 {s} · cumulative contribution (dims 1–2) {c}% · {note} · circle size = frequency',

  // analysis view
  日本語: '日本語',
  分析: 'Analysis',
  '語の共起・類似度': 'Word co-occurrence & similarity',
  対応分析: 'Correspondence analysis',
  'コードの類似・近接': 'Code similarity & proximity',
  度合いの推移: 'Degree over time',
  '語の取り扱い（辞書）': 'Word handling (dictionary)',
  多次元尺度構成法: 'Multidimensional scaling',
  ヒートマップ: 'Heatmap',
  描画する線: 'Edges to draw',
  類似度の上位から: 'Top by similarity',
  閾値以上のみ: 'Above threshold only',
  線の本数: 'Number of edges',
  閾値: 'Threshold',
  線を引く閾値: 'Edge threshold',
  色分け: 'Coloring',
  グループ別: 'By group',
  コードの色: 'Code colors',
  'なし（白黒・論文用）': 'None (grayscale, for papers)',
  カラー: 'Color',
  クラスター別: 'By cluster',
  クラスター数: 'Clusters',
  '最小スパニング・ツリーのみ': 'Minimum spanning tree only',
  孤立した語を隠す: 'Hide isolated words',
  '形態素解析：kuromoji（IPA辞書）＋プロジェクトのユーザー辞書': 'Morphological analysis: kuromoji (IPA dictionary) + project user dictionary',
  '形態素解析：簡易分割（kuromojiを読み込めなかったため、品詞は推定です）':
    'Morphological analysis: simple split (kuromoji could not be loaded, so parts of speech are estimated)',
  'Jaccard係数（共起）': 'Jaccard coefficient (co-occurrence)',
  'コサイン類似度（TF-IDF重み）': 'Cosine similarity (TF-IDF weighted)',
  'コサイン類似度（出現頻度）': 'Cosine similarity (frequency)',
  対象の文書: 'Documents',
  '対象の文書（並び順＝時系列）': 'Documents (order = time sequence)',
  '発言番号の区間（行番号）': 'Utterance range (row numbers)',
  開始: 'Start',
  終了: 'End',
  最初: 'First',
  最後: 'Last',
  発言者: 'Speakers',
  最小頻度: 'Min. frequency',
  上位語数: 'Top words',
  '単位(発言)': 'Unit (utterances)',
  何発言をひとまとまりとして共起を数えるか: 'How many utterances form one unit for counting co-occurrence',
  '注目語（指定すると、その語だけで図を作ります）': 'Focus words (if set, the figure uses only these words)',
  '例：戦争 日本人 やめる': 'e.g. 戦争 日本人 やめる',
  注目語を追加: 'Add focus word',
  '{w}を注目語から外す': 'Remove {w} from focus words',
  すべて外す: 'Clear all',
  '下の頻出語の表をクリックしても追加できます。': 'You can also add words by clicking the frequency table below.',
  類似度の指標: 'Similarity measure',
  可視化する: 'Visualize',
  '条件を選んで「可視化する」を押してください。': 'Choose the conditions and press “Visualize”.',
  '発言（または指定した発言数のまとまり）を単位に、語同士の共起・類似度を計算します。':
    'Co-occurrence and similarity between words are computed per utterance (or per group of utterances).',
  '{u}発言 ・ {n}単位 ・ 異なり語数 {w}': '{u} utterances · {n} units · {w} distinct words',
  ' ・ 注目語 {n}語': ' · {n} focus words',
  表示形式: 'Display',
  '見つからなかった注目語：{w}（語の分割のされ方は「語の取り扱い（辞書）」で調整できます）':
    'Focus words not found: {w} (adjust how words are split in “Word handling (dictionary)”)',
  語: 'Word',
  '頻出語（上位100） ・ 行をクリックで注目語に追加／解除 → 「可視化する」で反映':
    'Frequent words (top 100) · click a row to add/remove a focus word → press “Visualize” to apply',
  注目語: 'Focus word',
  出現頻度: 'Frequency',
  出現単位数: 'Units',
  '{w}を注目語にする': 'Make {w} a focus word',
  'コード（コード付けされた箇所の語）': 'Codes (words in coded segments)',
  'コード×度合い': 'Code × degree',
  '外部変数（列）': 'External variable (columns)',
  外部変数: 'External variable',
  'コード（クラスターとして扱う）': 'Codes (treated as clusters)',
  '度合い（1〜3）で語の出現を重み付けする': 'Weight word occurrences by degree (1–3)',
  対応分析を実行: 'Run correspondence analysis',
  '「対応分析を実行」を押してください。': 'Press “Run correspondence analysis”.',
  '語 × コード（または発言者・文書）の集計表から、両者の対応関係を2次元に配置します。':
    'Places words and codes (or speakers/documents) in two dimensions from their cross table.',
  '対応分析には、語が2つ以上、列（コードなど）が3つ以上必要です。':
    'Correspondence analysis needs at least two words and three columns (codes, etc.).',
  '現在：語 {r} ・ 列 {c}。コード付けを増やすか、最小頻度を下げてください。':
    'Currently: {r} words · {c} columns. Add more codings or lower the minimum frequency.',
  '{col} ・ 語 {r} × 列 {c} ・ ●＝語（大きさ＝出現数）、□＝{kind}': '{col} · {r} words × {c} columns · ● = word (size = frequency), □ = {kind}',
  _白黒: '_grayscale',
  '成分{d}（{i}, {p}%）': 'Component {d} ({i}, {p}%)',
  抽出語: 'Words',
  '語 {r} × 列 {c}, 総度数 {n} ・ 総慣性 {i} ・ 累積寄与率（成分1–2） {p}% ・ χ²({df}) = {chi}, {pv}':
    '{r} words × {c} columns, total {n} · total inertia {i} · cumulative contribution (comp. 1–2) {p}% · χ²({df}) = {chi}, {pv}',
  'Jaccard係数（同じ発言での重なり）': 'Jaccard coefficient (overlap in the same utterance)',
  'コサイン類似度（度合いで重み付け）': 'Cosine similarity (weighted by degree)',
  '近接度（前後n発言以内に出現）': 'Proximity (within n utterances)',
  指標: 'Measure',
  前後n発言: 'n utterances',
  度合いの下限: 'Minimum degree',
  '1以上（すべて）': '1 or more (all)',
  '2以上': '2 or more',
  '3のみ': '3 only',
  '円の大きさ＝コードが付された発言数': 'circle size = number of coded utterances',

  // category report
  'A4 横': 'A4 landscape',
  'レター 横': 'Letter landscape',
  'カテゴリ・コード一覧': 'Category & code list',
  用紙サイズ: 'Paper size',
  'A4 横（余白20mm）': 'A4 landscape (20mm margins)',
  'レター 横（余白20mm）': 'Letter landscape (20mm margins)',
  'PDFにする場合は、印刷画面で「PDFに保存」を選んでください。': 'To make a PDF, choose “Save as PDF” in the print dialog.',
  '印刷・PDF': 'Print / PDF',
  '{size} ・ {date} ・ カテゴリ {cat} ・ コード {code} ・ 付与 {n}': '{size} · {date} · {cat} categories · {code} codes · {n} codings',
  'カテゴリ {c} ・ コード {k} ・ 付与 {n}': '{c} categories · {k} codes · {n} codings',
  '例：「日本」＋「人」→「日本人」、「太平洋」＋「戦争」→「太平洋戦争」。すべての連続名詞が対象になるため、必要な語だけ登録したい場合は下の候補から選んでください。':
    'e.g. 日本 + 人 → 日本人, 太平洋 + 戦争 → 太平洋戦争. Every run of nouns is joined, so to register only the words you need, pick them from the candidates below.',
  カテゴリ定義: 'Category definition',
  発言番号: 'Utterance no.',
  付された文章: 'Coded text',
  '（未定義）': '(undefined)',
  '（カテゴリに直接付与）': '(coded directly with the category)',
  '（コードなし）': '(no codes)',
  '（カテゴリ未設定）': '(no category)',

  // code dialog
  カテゴリを編集: 'Edit category',
  コードを編集: 'Edit code',
  新しいカテゴリ: 'New category',
  新しいコード: 'New code',
  'カテゴリ名・カテゴリを説明する文章・上位カテゴリーを設定します。含むコードは、各コードの上位にこのカテゴリを指定します。':
    'Set the category name, a description and its parent. To put codes inside, set this category as the parent of each code.',
  'コード名・定義・カテゴリー関係・度合い（3段階）を設定します。': 'Set the code name, definition, parent and three degrees.',
  種類: 'Type',
  カテゴリ名: 'Category name',
  コード名: 'Code name',
  '例：社会的問題': 'e.g. Social issues',
  '例：制止・拒否': 'e.g. Stopping / refusal',
  '色 {c}': 'Color {c}',
  'カテゴリの説明（定義）': 'Category description (definition)',
  定義: 'Definition',
  '下位のコード群から、このカテゴリが何を表すかを説明する文章': 'Explain what this category represents, based on the codes under it',
  'このコードを付す基準、含む／含まない例など': 'Criteria for applying this code, examples of what is and is not included',
  上位カテゴリー: 'Parent',
  '（なし：最上位）': '(None: top level)',
  '■ カテゴリ': '■ Categories',
  '● コード': '● Codes',
  'カテ：{name}': 'Cat: {name}',
  'コード：{name}': 'Code: {name}',
  'カテゴリの上位にはカテゴリのみ指定できます。': 'Only a category can be the parent of a category.',
  'カテゴリ（カテ：）またはコード（コード：）を指定できます。': 'You can choose a category (Cat:) or a code (Code:).',
  含むコード: 'Contained codes',
  下位カテゴリー: 'Children',
  'なし（下位コードの編集画面で上位に指定）': 'None (set the parent from each child code’s edit screen)',
  '度合い（同じ語でも発言の奥行きを区別）': 'Degrees (distinguish depth even for the same words)',
  '度合い{n}のラベル': 'Label for degree {n}',
  '度合い{n}の説明': 'Description of degree {n}',
  '自動コーディング用の語（読点・カンマ区切り）': 'Words for auto-coding (comma-separated)',
  '例：やめて、やめろ、いやだ': 'e.g. やめて, やめろ, いやだ',
  自動コーディング: 'Auto-coding',
  対象: 'Target',
  初期の度合い: 'Initial degree',
  '度合い{n}：{label}': 'Degree {n}: {label}',
  '{n}件を付与しました。度合いは各箇所で見直してください。': 'Applied {n} codings. Please review the degree of each one.',
  'このカテゴリを削除しますか？（含むコードは一つ上の階層に移動し、コード自体は残ります）':
    'Delete this category? (Its codes move up one level and are kept.)',
  'このコードと付与箇所をすべて削除しますか？': 'Delete this code and all of its codings?',

  // dictionary dialog
  '語の取り扱い（ユーザー辞書）': 'Word handling (user dictionary)',
  'このプロジェクトだけに適用され、プロジェクトファイルにも保存されます。変更後は「可視化する」を押し直してください。':
    'Applies to this project only and is saved in the project file. After changes, press “Visualize” again.',
  連続する名詞を複合語としてまとめる: 'Join consecutive nouns into compound words',
  強制抽出する語: 'Words to keep whole',
  '分割されてほしくない語を登録します。空白や読点で区切ると複数を一度に登録できます。':
    'Register words that should not be split. Separate several with spaces or commas.',
  '例：日本人、満州事変': 'e.g. 日本人, 満州事変',
  登録する語: 'Word to add',
  品詞: 'Part of speech',
  'まだ登録されていません。': 'Nothing registered yet.',
  複合語の候補: 'Compound-word candidates',
  '全文書から「名詞＋名詞」の並びを探し、よく出るものから表示します。': 'Finds “noun + noun” sequences in all documents, most frequent first.',
  '形態素解析器を準備中…': 'Preparing the analyzer…',
  再検索: 'Search again',
  候補を探す: 'Find candidates',
  '候補は見つかりませんでした。': 'No candidates found.',
  候補: 'Candidate',
  現在の分割: 'Current split',
  回数: 'Count',
  使用しない語: 'Stop words',
  '分析から除外する語（基本形）を登録します。「思う」「ええ」など、分析に不要な語に使います。':
    'Words (base form) to exclude from analysis, such as 思う or ええ.',
  '例：思う ええ てる': 'e.g. 思う ええ てる',
  除外する語: 'Word to exclude',
  '{w}を除外リストから削除': 'Remove {w} from the stop list',
}

export function translate(locale: Locale, key: string, params?: Params): string {
  let s = locale === 'en' ? (EN[key] ?? key) : key
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v))
  return s
}

export type TFunc = (key: string, params?: Params) => string

export function useT(): TFunc {
  const locale = useLocale((s) => s.locale)
  return useCallback((key: string, params?: Params) => translate(locale, key, params), [locale])
}
