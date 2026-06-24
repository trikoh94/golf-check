import { createContext, useContext, useReducer, useCallback } from 'react'
import { initAllHoles, compressImage } from '../constants'

// ─── State shape ────────────────────────────────────────────────
// formData: { date, club, course, inspector, weather, nextVisit, memo, holeCount }
// holeState: { tee: { [holeNum]: HoleState }, fw: ..., green: ... }
//   HoleState: { score: null|1-9, issues: string[], memo: string, photos: [{dataUrl, name}] }
// ui: { toast: null|{msg, type}, lightbox: null|{photos, index} }

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  club: '해남 파인트리 골프장',
  course: '',
  inspector: '',
  weather: '',
  nextVisit: '',
  memo: '',
  holeCount: 18,
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
  holeState: makeHoleState(18),
  toast: null,
  lightbox: null,
}

// ─── Reducer ────────────────────────────────────────────────────
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
          [sec]: {
            ...state.holeState[sec],
            [hole]: { ...state.holeState[sec][hole], score: 5 },
          },
        },
      }
    }

    case 'SET_HOLE_SCORE': {
      const { sec, hole, score } = action.payload
      return {
        ...state,
        holeState: {
          ...state.holeState,
          [sec]: {
            ...state.holeState[sec],
            [hole]: { ...state.holeState[sec][hole], score },
          },
        },
      }
    }

    case 'SET_HOLE_UNINSPECTED': {
      const { sec, hole } = action.payload
      return {
        ...state,
        holeState: {
          ...state.holeState,
          [sec]: {
            ...state.holeState[sec],
            [hole]: { score: null, issues: [], memo: '', photos: [] },
          },
        },
      }
    }

    case 'TOGGLE_HOLE_ISSUE': {
      const { sec, hole, issue } = action.payload
      const current = state.holeState[sec][hole].issues
      const next = current.includes(issue)
        ? current.filter((i) => i !== issue)
        : [...current, issue]
      return {
        ...state,
        holeState: {
          ...state.holeState,
          [sec]: {
            ...state.holeState[sec],
            [hole]: { ...state.holeState[sec][hole], issues: next },
          },
        },
      }
    }

    case 'SET_HOLE_MEMO': {
      const { sec, hole, memo } = action.payload
      return {
        ...state,
        holeState: {
          ...state.holeState,
          [sec]: {
            ...state.holeState[sec],
            [hole]: { ...state.holeState[sec][hole], memo },
          },
        },
      }
    }

    case 'ADD_HOLE_PHOTOS': {
      const { sec, hole, photos } = action.payload
      const existing = state.holeState[sec][hole].photos
      const merged = [...existing, ...photos].slice(0, 2)
      return {
        ...state,
        holeState: {
          ...state.holeState,
          [sec]: {
            ...state.holeState[sec],
            [hole]: { ...state.holeState[sec][hole], photos: merged },
          },
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
          [sec]: {
            ...state.holeState[sec],
            [hole]: { ...state.holeState[sec][hole], photos },
          },
        },
      }
    }

    case 'RESET_ALL':
      return {
        ...initialState,
        formData: {
          ...initialForm,
          date: new Date().toISOString().slice(0, 10),
        },
        holeState: makeHoleState(18),
      }

    case 'SHOW_TOAST':
      return { ...state, toast: action.payload }
    case 'HIDE_TOAST':
      return { ...state, toast: null }
    case 'SHOW_LIGHTBOX':
      return { ...state, lightbox: action.payload }
    case 'HIDE_LIGHTBOX':
      return { ...state, lightbox: null }

    default:
      return state
  }
}

// ─── Context ────────────────────────────────────────────────────
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const setForm = useCallback((payload) => dispatch({ type: 'SET_FORM', payload }), [])
  const setHoleCount = useCallback((count) => dispatch({ type: 'SET_HOLE_COUNT', payload: count }), [])
  const activateHole = useCallback((sec, hole) => dispatch({ type: 'ACTIVATE_HOLE', payload: { sec, hole } }), [])
  const setHoleScore = useCallback((sec, hole, score) => dispatch({ type: 'SET_HOLE_SCORE', payload: { sec, hole, score } }), [])
  const setHoleUninspected = useCallback((sec, hole) => dispatch({ type: 'SET_HOLE_UNINSPECTED', payload: { sec, hole } }), [])
  const toggleHoleIssue = useCallback((sec, hole, issue) => dispatch({ type: 'TOGGLE_HOLE_ISSUE', payload: { sec, hole, issue } }), [])
  const setHoleMemo = useCallback((sec, hole, memo) => dispatch({ type: 'SET_HOLE_MEMO', payload: { sec, hole, memo } }), [])
  const resetAll = useCallback(() => dispatch({ type: 'RESET_ALL' }), [])

  const addHolePhotos = useCallback(async (sec, hole, files) => {
    const results = []
    for (const file of files) {
      const reader = new FileReader()
      const dataUrl = await new Promise((res) => {
        reader.onload = (e) => res(e.target.result)
        reader.readAsDataURL(file)
      })
      const compressed = await compressImage(dataUrl)
      results.push({ dataUrl: compressed, name: file.name })
    }
    dispatch({ type: 'ADD_HOLE_PHOTOS', payload: { sec, hole, photos: results } })
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
      setForm,
      setHoleCount,
      activateHole,
      setHoleScore,
      setHoleUninspected,
      toggleHoleIssue,
      setHoleMemo,
      addHolePhotos,
      removeHolePhoto,
      resetAll,
      showToast,
      showLightbox,
      hideLightbox,
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
