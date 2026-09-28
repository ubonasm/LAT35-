'use client'

import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import { createSampleProject } from './sample'
import {
  CODE_COLORS,
  DEFAULT_DEGREES,
  uid,
  type Code,
  type Coding,
  type Degree,
  type Project,
  type TextSettings,
  type Utterance,
} from './types'

const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet(name)) ?? null,
  setItem: async (name, value) => idbSet(name, value),
  removeItem: async (name) => idbDel(name),
}

interface ProjectState {
  projects: Project[]
  activeProjectId: string | null
  activeDocId: string | null
  hydrated: boolean
  setHydrated: () => void
  ensureSeed: () => void
  createProject: (name: string, description: string) => void
  openProject: (id: string) => void
  deleteProject: (id: string) => void
  importProject: (p: Project) => void
  updateProjectMeta: (patch: Partial<Pick<Project, 'name' | 'description'> & TextSettings>) => void
  addDocument: (name: string, utterances: Utterance[]) => void
  openDocument: (id: string) => void
  deleteDocument: (id: string) => void
  addCode: (data: Omit<Code, 'id'>) => string
  updateCode: (id: string, patch: Partial<Code>) => void
  deleteCode: (id: string) => void
  addCoding: (c: Omit<Coding, 'id' | 'createdAt' | 'memo'> & { memo?: string }) => void
  updateCoding: (id: string, patch: Partial<Coding>) => void
  deleteCoding: (id: string) => void
  autoCode: (codeId: string, docIds: string[], degree: Degree) => number
}

function touch(p: Project): Project {
  return { ...p, updatedAt: Date.now() }
}

export const useProjects = create<ProjectState>()(
  persist(
    (set, get) => {
      const mutate = (fn: (p: Project) => Project) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === s.activeProjectId ? touch(fn(p)) : p)),
        }))

      return {
        projects: [],
        activeProjectId: null,
        activeDocId: null,
        hydrated: false,
        setHydrated: () => set({ hydrated: true }),
        ensureSeed: () => {
          if (get().projects.length > 0) return
          const p = createSampleProject()
          set({ projects: [p], activeProjectId: p.id, activeDocId: p.documents[0]?.id ?? null })
        },
        createProject: (name, description) => {
          const now = Date.now()
          const p: Project = {
            id: uid('prj'),
            name,
            description,
            createdAt: now,
            updatedAt: now,
            documents: [],
            codes: [],
            codings: [],
          }
          set((s) => ({ projects: [...s.projects, p], activeProjectId: p.id, activeDocId: null }))
        },
        openProject: (id) => {
          const p = get().projects.find((x) => x.id === id)
          set({ activeProjectId: id, activeDocId: p?.documents[0]?.id ?? null })
        },
        deleteProject: (id) =>
          set((s) => {
            const projects = s.projects.filter((p) => p.id !== id)
            const next = s.activeProjectId === id ? projects[0] : s.projects.find((p) => p.id === s.activeProjectId)
            return {
              projects,
              activeProjectId: next?.id ?? null,
              activeDocId: s.activeProjectId === id ? (next?.documents[0]?.id ?? null) : s.activeDocId,
            }
          }),
        importProject: (p) => {
          const imported: Project = { ...p, id: uid('prj'), updatedAt: Date.now() }
          set((s) => ({
            projects: [...s.projects, imported],
            activeProjectId: imported.id,
            activeDocId: imported.documents[0]?.id ?? null,
          }))
        },
        updateProjectMeta: (patch) => mutate((p) => ({ ...p, ...patch })),
        addDocument: (name, utterances) => {
          const doc = { id: uid('doc'), name, createdAt: Date.now(), utterances }
          mutate((p) => ({ ...p, documents: [...p.documents, doc] }))
          set({ activeDocId: doc.id })
        },
        openDocument: (id) => set({ activeDocId: id }),
        deleteDocument: (id) => {
          mutate((p) => ({
            ...p,
            documents: p.documents.filter((d) => d.id !== id),
            codings: p.codings.filter((c) => c.docId !== id),
          }))
          const s = get()
          if (s.activeDocId === id) {
            const p = s.projects.find((x) => x.id === s.activeProjectId)
            set({ activeDocId: p?.documents[0]?.id ?? null })
          }
        },
        addCode: (data) => {
          const id = uid('code')
          mutate((p) => ({ ...p, codes: [...p.codes, { ...data, id }] }))
          return id
        },
        updateCode: (id, patch) =>
          mutate((p) => ({ ...p, codes: p.codes.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
        deleteCode: (id) =>
          mutate((p) => {
            const target = p.codes.find((c) => c.id === id)
            return {
              ...p,
              codes: p.codes
                .filter((c) => c.id !== id)
                .map((c) => (c.parentId === id ? { ...c, parentId: target?.parentId ?? null } : c)),
              codings: p.codings.filter((c) => c.codeId !== id),
            }
          }),
        addCoding: (c) =>
          mutate((p) => ({
            ...p,
            codings: [...p.codings, { memo: '', ...c, id: uid('cd'), createdAt: Date.now() }],
          })),
        updateCoding: (id, patch) =>
          mutate((p) => ({ ...p, codings: p.codings.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
        deleteCoding: (id) => mutate((p) => ({ ...p, codings: p.codings.filter((c) => c.id !== id) })),
        autoCode: (codeId, docIds, degree) => {
          const s = get()
          const project = s.projects.find((p) => p.id === s.activeProjectId)
          const code = project?.codes.find((c) => c.id === codeId)
          if (!project || !code || code.keywords.length === 0) return 0
          const added: Coding[] = []
          for (const doc of project.documents.filter((d) => docIds.includes(d.id))) {
            doc.utterances.forEach((u, ui) => {
              for (const kw of code.keywords) {
                if (!kw) continue
                let from = 0
                let idx = u.text.indexOf(kw, from)
                while (idx >= 0) {
                  const exists = project.codings.some(
                    (c) =>
                      c.codeId === codeId &&
                      c.docId === doc.id &&
                      c.start.u <= ui &&
                      c.end.u >= ui &&
                      (c.start.u < ui || c.start.o <= idx) &&
                      (c.end.u > ui || c.end.o >= idx + kw.length),
                  )
                  if (!exists) {
                    added.push({
                      id: uid('cd'),
                      docId: doc.id,
                      codeId,
                      degree,
                      start: { u: ui, o: idx },
                      end: { u: ui, o: idx + kw.length },
                      memo: '自動コーディング',
                      createdAt: Date.now(),
                    })
                  }
                  from = idx + kw.length
                  idx = u.text.indexOf(kw, from)
                }
              }
            })
          }
          mutate((p) => ({ ...p, codings: [...p.codings, ...added] }))
          return added.length
        },
      }
    },
    {
      name: 'qda-workbench',
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        projects: s.projects,
        activeProjectId: s.activeProjectId,
        activeDocId: s.activeDocId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
        state?.ensureSeed()
      },
    },
  ),
)

export function useActiveProject() {
  return useProjects((s) => s.projects.find((p) => p.id === s.activeProjectId) ?? null)
}

export function nextCodeColor(codes: Code[]) {
  return CODE_COLORS[codes.length % CODE_COLORS.length]
}

export function blankCode(codes: Code[]): Omit<Code, 'id'> {
  return {
    name: '',
    definition: '',
    color: nextCodeColor(codes),
    parentId: null,
    keywords: [],
    degrees: DEFAULT_DEGREES.map((d) => ({ ...d })),
  }
}

export type PanelTab = 'kwic' | 'segments' | 'detail'

interface UIState {
  view: 'coding' | 'analysis'
  panelTab: PanelTab
  selectedCodingId: string | null
  focusCodeId: string | null
  jump: { docId: string; u: number; t: number } | null
  setView: (v: UIState['view']) => void
  setPanelTab: (t: PanelTab) => void
  selectCoding: (id: string | null) => void
  setFocusCode: (id: string | null) => void
  jumpTo: (docId: string, u: number) => void
}

export const useUI = create<UIState>()((set) => ({
  view: 'coding',
  panelTab: 'kwic',
  selectedCodingId: null,
  focusCodeId: null,
  jump: null,
  setView: (view) => set({ view }),
  setPanelTab: (panelTab) => set({ panelTab }),
  selectCoding: (selectedCodingId) =>
    set(selectedCodingId ? { selectedCodingId, panelTab: 'detail' } : { selectedCodingId }),
  setFocusCode: (focusCodeId) => set({ focusCodeId }),
  jumpTo: (docId, u) => {
    useProjects.getState().openDocument(docId)
    set({ view: 'coding', jump: { docId, u, t: Date.now() } })
  },
}))
