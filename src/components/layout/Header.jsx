export default function Header({ tab, onTabChange }) {
  const tabs = [
    { key: 'new',       label: '✏️ 점검' },
    { key: 'list',      label: '📋 기록' },
    { key: 'workcheck', label: '✅ 작업확인' },
    { key: 'map',       label: '🗺️ 지도' },
  ]
  return (
    <header className="app-header">
      <div className="header-top">
        <span className="app-logo">🌱</span>
        <span className="app-title">잔디 점검 기록</span>
      </div>
      <nav className="main-tabs">
        {tabs.map(t => (
          <button key={t.key}
            className={'main-tab' + (tab === t.key ? ' active' : '')}
            onClick={() => onTabChange(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
