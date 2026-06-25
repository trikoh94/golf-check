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

function AppInner() {
  const [tab, setTab] = useState('new')
  const [selectedId, setSelectedId] = useState(null)

  function handleTabChange(t) {
    setTab(t)
    setSelectedId(null)
  }

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
