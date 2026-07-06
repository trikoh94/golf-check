import { createContext, useContext, useReducer, useCallback, useState, useEffect, useRef } from 'react'
import { initAllHoles } from '../constants'
import { uploadPhoto } from '../lib/uploadPhoto'
import { fetchWeights, saveWeights, DEFAULT_WEIGHTS } from '../lib/scoreCalc'
import { supabase } from '../lib/supabase'

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  club: '솔라시도 골프클럽',
  course: '',
  inspector: '',
  weather: '',
  weatherDetail: null,
  nextVisit: '',
  memo: '',
  holeCount: 9,
}

function makeHoleState(count) {
  return {
    tee:   initAllHoles(count),
    fw:    initAllHoles(count),
    green: initAllHoles(count),
  }
}

const initialState = {
  formData: initialForm,
  holeState: makeHoleState(9),
  toast: null,
  lightbox: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FORM':
      return { ...state, formData: { ...state.formData, ...action.payload } }

    case 'SET_HOLE_COUNT': {
      const count = action.payload
      return {
        ...state,
        formData: { ...state.formData, holeCount: count },
        holeState: makeHoleState(count),
      }
    }

    case 'ACTIVATE_HOLE': {
      const { sec, hole } = action.payload
      if (state.holeState[sec][hole].score !== null) return state
      return {
        ...state,
        holeState: {
          ...state.holeState,
          [sec]: { ...state.holeState[sec], [hole]: { ...state.holeState[sec][hole], score: 5 } },
        },
      }
    }

    case 'SET_HOLE_SCORE': {
      const { sec, hole, score } = action.payload
      return {
        ...state,
        holeState: {
          ...state.holeState,
          [sec]: { ...state.holeState[sec], [hole]: { ...state.holeState[sec][hole], score } },
        },
      }
    }

    case 'SET_HOLE_UNINSPECTED': {
      const { sec, hole } = action.payload
      return {
        ...state,
        holeState: {
          ...state.holeState,
          [sec]: { ...state.holeState[sec], [hole]: { score: null, detail: {}, weedTypes: {}, memo: '', photos: [] } },
        },
      }
    }

    case 'SET_HOLE_DETAIL': {
      const { sec, hole, detail, score, weedTypes } = action.payload
      return {
        ...state,
        holeState: {
          ...state.holeState,
          [sec]: { ...state.holeState[sec], [hole]: { ...state.holeState[sec][hole], detail, score, weedTypes } },
        },
      }
    }

    case 'TOGGLE_HOLE_ISSUE': {
      const { sec, hole, issue } = action.payload
      const current = state.holeState[sec][hole].issues ?? []
      const next = current.includes(issue) ? current.filter(i => i !== issue) : [...current, issue]
      return {
        ...state,
        holeState: {
          ...state.holeState,
          [sec]: { ...state.holeState[sec], [hole]: { ...state.holeState[sec][hole], issues: next } },
        },
      }
    }

    case 'SET_HOLE_MEMO': {
      const { sec, hole, memo } = action.payload
      return {
        ...state,
        holeState: {
          ...state.holeState,
          [sec]: { ...state.holeState[sec], [hole]: { ...state.holeState[sec][hole], memo } },
        },
      }
    }

    case 'ADD_HOLE_PHOTOS': {
      const { sec, hole, photos } = action.payload
      const merged = [...state.holeState[sec][hole].photos, ...photos]
      return {
        ...state,
        holeState: {
          ...state.holeState,
          [sec]: { ...state.holeState[sec], [hole]: { ...state.holeState[sec][hole], photos: merged } },
        },
      }
    }

    case 'REMOVE_HOLE_PHOTO': {
      const { sec, hole, index } = action.payload
      const photos = state.holeState[sec][hole].photos.filter((_, i) => i !== index)
      return {
        ...state,
        holeState: {
          ...state.holeState,
          [sec]: { ...state.holeState[sec], [hole]: { ...state.holeState[sec][hole], photos } },
        },
      }
    }

    case 'LOAD_DRAFT': {
      const { formData, holeState } = action.payload
      return { ...state, formData, holeState }
    }

    case 'RESET_ALL':
      return {
        ...initialState,
        formData: { ...initialForm, date: new Date().toISOString().slice(0, 10) },
        holeState: makeHoleState(9),
      }

    case 'SHOW_TOAST': return { ...state, toast: action.payload }
    case 'HIDE_TOAST':  return { ...state, toast: null }
    case 'SHOW_LIGHTBOX': return { ...state, lightbox: action.payload }
    case 'HIDE_LIGHTBOX': return { ...state, lightbox: null }

    default: return state
  }
}

const AppContext = createContext(null)

const DRAFT_KEY = 'turf_draft_v2'
const SUPABASE_DRAFT_KEY = 'turf_draft_supabase_id'

export function AppProvider({ children }) {
  const savedDraft = (() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) } catch { return null }
  })()

  const [state, dispatch] = useReducer(reducer, savedDraft ?? initialState)
  const [weights, setWeightsState] = useState(DEFAULT_WEIGHTS)
  const [hasDraft] = useState(!!savedDraft)

  const [draftId, setDraftId] = useState(() => localStorage.getItem(SUPABASE_DRAFT_KEY))
  const [supabaseDraft, setSupabaseDraft] = useState(null)

  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    fetchWeights().then(w => setWeightsState(w))
  }, [])

  useEffect(() => {
    const id = localStorage.getItem(SUPABASE_DRAFT_KEY)
    if (!id) return
    supabase
      .from('inspections')
      .select('id, date, inspector, course, club, status, tee, fairway, green, hole_count, weather, next_visit, memo')
      .eq('id', id)
      .eq('status', 'draft')
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          setSupabaseDraft(data)
        } else {
          localStorage.removeItem(SUPABASE_DRAFT_KEY)
          setDraftId(null)
        }
      })
  }, [])

  useEffect(() => {
    const { toast, lightbox, ...saveable } = state
    localStorage.setItem(DRAFT_KEY, JSON.stringify(saveable))
  }, [state])

  const saveDraft = useCallback(async () => {
    const { formData, holeState } = stateRef.current
    const { date, club, course, inspector, weather, weatherDetail, nextVisit, memo, holeCount } = formData
    const r = weatherDetail?._raw ?? {}

    const payload = {
      date: date || new Date().toISOString().slice(0, 10),
      club: club || '솔라시도 골프클럽',
      course: course || null,
      inspector: inspector || '(미입력)',
      weather: weather || null,
      temperature:    r.temperature   ?? null,
      humidity:       r.humidity      ?? null,
      wind_speed:     r.wind_speed    ?? null,
      dew_point:      r.dew_point     ?? null,
      surface_temp:   r.surface_temp  ?? null,
      soil_temp_0:    r.soil_temp_0   ?? null,
      soil_temp_6:    r.soil_temp_6   ?? null,
      et_day:         r.et_day        ?? null,
      radiation_day:  r.radiation_day ?? null,
      next_visit: nextVisit || null,
      memo: memo || null,
      hole_count: holeCount,
      tee:     holeState.tee,
      fairway: holeState.fw,
      green:   holeState.green,
      status: 'draft',
    }

    const currentId = localStorage.getItem(SUPABASE_DRAFT_KEY)
    if (currentId) {
      const { error } = await supabase.from('inspections').update(payload).eq('id', currentId)
      if (error) return { error }
      return { id: currentId }
    } else {
      const { data, error } = await supabase.from('inspections').insert([payload]).select('id').single()
      if (error) return { error }
      localStorage.setItem(SUPABASE_DRAFT_KEY, data.id)
      setDraftId(data.id)
      return { id: data.id }
    }
  }, [])

  const restoreSupabaseDraft = useCallback(() => {
    if (!supabaseDraft) return
    const count = supabaseDraft.hole_count || 27
    const fd = {
      date: supabaseDraft.date || new Date().toISOString().slice(0, 10),
      club: supabaseDraft.club || '해남 파인비치 골프링크스',
      course: supabaseDraft.course || '',
      inspector: supabaseDraft.inspector || '',
      weather: supabaseDraft.weather || '',
      weatherDetail: null,
      nextVisit: supabaseDraft.next_visit || '',
      memo: supabaseDraft.memo || '',
      holeCount: count,
    }
    const hs = {
      tee:   supabaseDraft.tee     || initAllHoles(count),
      fw:    supabaseDraft.fairway || initAllHoles(count),
      green: supabaseDraft.green   || initAllHoles(count),
    }
    dispatch({ type: 'LOAD_DRAFT', payload: { formData: fd, holeState: hs } })
    setSupabaseDraft(null)
  }, [supabaseDraft])

  const dismissSupabaseDraft = useCallback(() => {
    setSupabaseDraft(null)
    localStorage.removeItem(SUPABASE_DRAFT_KEY)
    setDraftId(null)
  }, [])

  const updateWeights = useCallback(async (w) => {
    await saveWeights(w)
    setWeightsState(w)
  }, [])

  const setForm = useCallback((payload) => dispatch({ type: 'SET_FORM', payload }), [])
  const setHoleCount = useCallback((count) => dispatch({ type: 'SET_HOLE_COUNT', payload: count }), [])
  const activateHole = useCallback((sec, hole) => dispatch({ type: 'ACTIVATE_HOLE', payload: { sec, hole } }), [])
  const setHoleScore = useCallback((sec, hole, score) => dispatch({ type: 'SET_HOLE_SCORE', payload: { sec, hole, score } }), [])
  const setHoleUninspected = useCallback((sec, hole) => dispatch({ type: 'SET_HOLE_UNINSPECTED', payload: { sec, hole } }), [])
  const toggleHoleIssue = useCallback((sec, hole, issue) => dispatch({ type: 'TOGGLE_HOLE_ISSUE', payload: { sec, hole, issue } }), [])
  const setHoleMemo = useCallback((sec, hole, memo) => dispatch({ type: 'SET_HOLE_MEMO', payload: { sec, hole, memo } }), [])
  const setHoleDetail = useCallback((sec, hole, detail, score, weedTypes) =>
    dispatch({ type: 'SET_HOLE_DETAIL', payload: { sec, hole, detail, score, weedTypes } }), [])
  const resetAll = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY)
    localStorage.removeItem(SUPABASE_DRAFT_KEY)
    setDraftId(null)
    dispatch({ type: 'RESET_ALL' })
  }, [])

  const addHolePhotos = useCallback(async (sec, hole, files) => {
    const date = new Date().toISOString().slice(0, 10)
    const results = []
    for (const file of files) {
      try {
        const url = await uploadPhoto(file, 'inspection-photos', `${date}/${sec}/${hole}`)
        results.push({ dataUrl: url, name: file.name })
      } catch (e) {
        console.error('사진 업로드 실패:', e.message)
      }
    }
    if (results.length) dispatch({ type: 'ADD_HOLE_PHOTOS', payload: { sec, hole, photos: results } })
  }, [])

  const removeHolePhoto = useCallback((sec, hole, index) =>
    dispatch({ type: 'REMOVE_HOLE_PHOTO', payload: { sec, hole, index } }), [])

  const showToast = useCallback((msg, type = 'success') => {
    dispatch({ type: 'SHOW_TOAST', payload: { msg, type } })
    setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 2500)
  }, [])

  const showLightbox = useCallback((photos, index = 0) =>
    dispatch({ type: 'SHOW_LIGHTBOX', payload: { photos, index } }), [])
  const hideLightbox = useCallback(() => dispatch({ type: 'HIDE_LIGHTBOX' }), [])

  return (
    <AppContext.Provider value={{
      ...state,
      weights, updateWeights,
      hasDraft,
      draftId,
      supabaseDraft,
      saveDraft,
      restoreSupabaseDraft,
      dismissSupabaseDraft,
      setForm, setHoleCount, activateHole, setHoleScore, setHoleUninspected,
      toggleHoleIssue, setHoleMemo, setHoleDetail, addHolePhotos, removeHolePhoto, resetAll,
      showToast, showLightbox, hideLightbox,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
