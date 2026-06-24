import { useState } from 'react'
import { AppProvider } from './context/AppContext'
import Header from './components/layout/Header'
import Toast from './components/ui/Toast'
import Lightbox from './components/ui/Lightbox'
import NewRecord from './pages/NewRecord'
import RecordList from './pages/RecordList'
import MapView from './pages/MapView'

function AppInner() {
  const [tab, setTab] = useState('new')

  return (
    <div className="app-root">
      <Header tab={tab} onTabChange={setTab} />
      <main className="app-main">
        {tab === 'new' && <NewRecord onSaved={() => setTab('list')} />}
        {tab === 'list' && <RecordList onSelect={(id) => console.log('view', id)} />}
        {tab === 'map' && <MapView />}
      </main>
      <Toast />
      <Lightbox />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
