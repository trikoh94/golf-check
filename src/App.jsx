import { useState } from 'react'
import { AppProvider } from './context/AppContext'
import Header from './components/layout/Header'
import Toast from './components/ui/Toast'
import Lightbox from './components/ui/Lightbox'
import NewRecord from './pages/NewRecord'
import RecordList from './pages/RecordList'
import RecordDetail from './pages/RecordDetail'
import MapView from './pages/MapView'
import WorkLog from './pages/WorkLog'
import WorkerView from './pages/WorkerView'

// URL 기반 역할 분리: /worker → 직원 뷰, 그 외 → 관리자
const isWorker = window.location.pathname.startsWith('/worker')

function AppInner() {
  const [tab, setTab] = useState('new')
  const [selectedId, setSelectedId] = useState(null)

  function handleTabChange(t) {
    setTab(t)
    setSelectedId(null)
  }

  // 직원 뷰: 단순 작업지시 화면
  if (isWorker) {
    return (
      <div className="app-root">
        <div className="worker-top-bar">
          <span className="worker-badge">👷 직원 모드</span>
          <span className="worker-course">해남 파인트리 골프장</span>
        </div>
        <main className="app-main">
          <WorkerView />
        </main>
        <Toast />
      </div>
    )
  }

  // 관리자 뷰: 전체 기능
  return (
    <div className="app-root">
      <Header tab={tab} onTabChange={handleTabChange} />
      <main className="app-main">
        {tab === 'new'  && <NewRecord onSaved={() => handleTabChange('list')} />}
        {tab === 'list' && !selectedId && <RecordList onSelect={id => setSelectedId(id)} />}
        {tab === 'list' && selectedId  && <RecordDetail id={selectedId} onBack={() => setSelectedId(null)} />}
        {tab === 'map'  && <MapView />}
        {tab === 'work' && <WorkLog />}
      </main>
      <Toast />
      <Lightbox />
    </div>
  )
}

export default function App() {
  return <AppProvider><AppInner /></AppProvider>
}
