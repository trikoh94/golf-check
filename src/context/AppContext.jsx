import { createContext, useContext, useReducer, useCallback, useState, useEffect } from 'react'
import { initAllHoles } from '../constants'
import { uploadPhoto } from '../lib/uploadPhoto'
import { fetchWeights, saveWeights, DEFAULT_WEIGHTS } from '../lib/scoreCalc'

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  club: '해남 파인트리 골프장',
  course: '',
  inspector: '',
  weather: '',
  weatherDetail: null, // { temp, humidity, wind, dewPoint, surfaceTemp, soilTemp0, soilTemp6 }
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

    case 'RESET_ALL':
      return {
        ...initialState,
        formData: { ...initialForm, date: new Date().toISOString().slice(0, 10) },
        holeState: makeHoleState(18),
      }

    case 'SHOW_TOAST': return { ...state, toast: action.payload }
    case 'HIDE_TOAST':  return { ...state, toast: null }
    case 'SHOW_LIGHTBOX': return { ...state, lightbox: action.payload }
    case 'HIDE_LIGHTBOX': return { ...state, lightbox: null }

    default: return state
  }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [weights, setWeightsState] = useState(DEFAULT_WEIGHTS)

  useEffect(() => {
    fetchWeights().then(w => setWeightsState(w))
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
  const resetAll = useCallback(() => dispatch({ type: 'RESET_ALL' }), [])

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
