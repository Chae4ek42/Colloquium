export type StatementKind =
  | 'definition'
  | 'theorem'
  | 'lemma'
  | 'corollary'
  | 'example'
  | 'remark'
  | 'exercise'
  | 'axiom'
  | 'principle'
  | 'prose'

export interface StatementRecord {
  id: string
  kind: StatementKind
  number: string | null
  title: string
  sectionId: string
  sectionTitle: string
  bookPage: number
  bookPages: number[]
  text: string
  mentions: string[]
  dependsOn: string[]
}

export interface StreamMark {
  /** Вопрос или пункт только для этих потоков. */
  only?: string[]
  /** Вопрос или пункт не входит в билет этих потоков. */
  except?: string[]
}

export interface ExamItem {
  statementId: string
  /** Как пункт называется в раскрытии вопроса. */
  label: string
  streams?: StreamMark
}

export interface ExamQuestion {
  number: number
  title: string
  note?: string
  streams?: StreamMark
  items: ExamItem[]
}
