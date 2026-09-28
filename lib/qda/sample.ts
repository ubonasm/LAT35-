import { DEFAULT_DEGREES, uid, type Code, type Coding, type Degree, type Project, type QDocument } from './types'

type Row = [string, string]

const lesson1: Row[] = [
  ['T', 'では、今日はグループで町の地図を作ってみましょう。'],
  ['ユウキ', 'やった、地図づくり好き。ぼくが川を描くね。'],
  ['ハルカ', 'ちょっと、それ私のペンだよ、やめてよー。'],
  ['ユウキ', 'ごめんごめん、でも青がいいんだもん。'],
  ['ハルカ', 'もう、しょうがないなあ。じゃあ交換ね。'],
  ['ソウタ', '見て見て、ここに怪獣がいることにしよう。'],
  ['ハルカ', 'やめてってば、地図がふざけたものになるじゃん。'],
  ['ソウタ', 'えー、おもしろいのに。'],
  ['T', '怪獣がいるとしたら、町の人はどう困るかな？'],
  ['ユウキ', '橋が壊れたら学校に行けなくなる。'],
  ['ハルカ', 'それなら避難所も描いたほうがいいと思う。'],
  ['ソウタ', 'じゃあ避難所はここ。ぼくの家の近く。'],
]

const lesson3: Row[] = [
  ['T', '前回の地図をもとに、町の困りごとを発表しましょう。'],
  ['ソウタ', 'ハルカの班の地図、字がへたくそだな。'],
  ['ハルカ', 'やめて。一生懸命描いたんだから。'],
  ['ユウキ', 'ソウタ、それは言いすぎだと思う。'],
  ['ソウタ', '冗談だよ、冗談。'],
  ['ハルカ', '冗談でも嫌なの。本当にやめてほしい。'],
  ['T', 'ハルカさんの気持ち、みんなはどう受け止めたかな。'],
  ['ユウキ', 'ぼくも前に言われて嫌だったことがある。'],
  ['ソウタ', '……ごめん。そんなに嫌だと思わなかった。'],
  ['ハルカ', 'わかってくれたならいい。次は一緒に描こう。'],
  ['ユウキ', '橋のところ、みんなで考え直したい。'],
  ['T', 'いいですね。困りごとを一緒に解決する地図にしましょう。'],
]

function makeDoc(name: string, rows: Row[], createdAt: number): QDocument {
  return {
    id: uid('doc'),
    name,
    createdAt,
    utterances: rows.map(([speaker, text], i) => ({ id: uid('u'), number: String(i + 1), speaker, text })),
  }
}

export function createSampleProject(): Project {
  const now = Date.now()
  const d1 = makeDoc('授業記録 第1回（地図づくり）', lesson1, now - 2000)
  const d3 = makeDoc('授業記録 第3回（発表）', lesson3, now - 1000)

  const catEmotion: Code = {
    id: uid('code'),
    name: '感情の表出',
    definition: '話者が自分の感情や気持ちを言語化している発言のカテゴリー。',
    color: '#2f6fb5',
    parentId: null,
    keywords: [],
    degrees: DEFAULT_DEGREES,
  }
  const stop: Code = {
    id: uid('code'),
    name: '制止・拒否',
    definition: '相手の行為をやめさせようとする発言。「やめて」など。遊びの中の軽いものから切実なものまで含む。',
    color: '#c2410c',
    parentId: catEmotion.id,
    keywords: ['やめて'],
    degrees: [
      { level: 1, label: '遊びの中', description: '笑いを伴う、じゃれ合いとしての制止' },
      { level: 2, label: '不満', description: '行為への不満がはっきり表れている' },
      { level: 3, label: '切実', description: '傷つきや強い拒否感を伴う制止' },
    ],
  }
  const empathy: Code = {
    id: uid('code'),
    name: '共感・理解',
    definition: '他者の気持ちを受け止めたり、自らの経験と結びつけたりする発言。',
    color: '#15803d',
    parentId: catEmotion.id,
    keywords: ['気持ち', 'ごめん'],
    degrees: DEFAULT_DEGREES,
  }
  const joke: Code = {
    id: uid('code'),
    name: 'ふざけ・冗談',
    definition: '場を笑わせたり、課題から逸れたりする発言。',
    color: '#7c5a10',
    parentId: null,
    keywords: ['冗談', '怪獣'],
    degrees: DEFAULT_DEGREES,
  }
  const collab: Code = {
    id: uid('code'),
    name: '協働の提案',
    definition: '一緒に課題に取り組むことを提案する発言。',
    color: '#0e7490',
    parentId: null,
    keywords: ['一緒', 'みんなで'],
    degrees: DEFAULT_DEGREES,
  }

  const codings: Coding[] = []
  const add = (doc: QDocument, codeId: string, degree: Degree, u: number, needle?: string, endU?: number) => {
    const text = doc.utterances[u].text
    let so = 0
    let eo = text.length
    if (needle) {
      so = text.indexOf(needle)
      eo = so + needle.length
    }
    const eu = endU ?? u
    if (endU !== undefined) eo = doc.utterances[eu].text.length
    codings.push({
      id: uid('cd'),
      docId: doc.id,
      codeId,
      degree,
      start: { u, o: so },
      end: { u: eu, o: eo },
      memo: '',
      createdAt: now,
    })
  }

  add(d1, stop.id, 1, 2, 'やめてよー')
  add(d1, stop.id, 2, 6, 'やめてってば')
  add(d1, joke.id, 1, 5, undefined, 7)
  add(d1, collab.id, 1, 10)
  add(d3, joke.id, 2, 1)
  add(d3, stop.id, 3, 2)
  add(d3, empathy.id, 2, 3)
  add(d3, joke.id, 1, 4)
  add(d3, stop.id, 3, 5, '本当にやめてほしい')
  add(d3, empathy.id, 3, 7, undefined, 8)
  add(d3, collab.id, 2, 9, '次は一緒に描こう')
  add(d3, collab.id, 3, 10)

  return {
    id: uid('prj'),
    name: 'サンプル：授業の話し合い',
    description: '「やめて」の切実性の変化を追うサンプルプロジェクト',
    createdAt: now,
    updatedAt: now,
    documents: [d1, d3],
    codes: [catEmotion, stop, empathy, joke, collab],
    codings,
  }
}
