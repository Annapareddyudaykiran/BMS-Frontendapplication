import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Check, Clock3, Search, ShieldCheck, Sparkles, UserPlus, Users, UserX, X, Building2, Ticket, LayoutDashboard } from 'lucide-react'

export type DashboardUser = { id: string; email: string; fullName: string }
export type Shift = { shiftStart: string; shiftEnd: string; zoneId: string }
export type Worker = { id: string; name: string; employeeCode: string | null; active: boolean }
export type AttendanceRow = {
  id: string
  workerId: string | null
  workerName: string | null
  checkIn: string
  checkOut: string | null
  scheduledStart: string
  scheduledEnd: string
  shiftZoneId: string
  lateEntry: boolean
  lateEntryMinutes: number
  earlyExit: boolean
  earlyExitMinutes: number
  attendanceStatus: string
}
export type PropertyTower = { id: string; name: string; floorCount: number; unitCount: number; occupied: number }
export type PropertyUnit = { id: string; towerId: string; floorNumber: number; unitNumber: string; spaceType: string; occupancy: string; occupant: string | null }
export type PropertyData = { property: { id: string; name: string; city: string; state: string; propertyType: string }; towers: PropertyTower[]; units: PropertyUnit[] }
export type HelpdeskTicket = { id: string; ticketNumber: string; description: string; floorArea: string; category: string; priority: string; status: string; createdAt: string; tower: string; unitNumber: string | null; workOrderStatus: string; ownerName: string | null }
export type ModuleItem = Record<string, string | number | null>

type Props = {
  user: DashboardUser
  workers: Worker[]
  selectedWorkerId: string
  page: 'overview' | 'attendance' | 'workers' | 'property' | 'helpdesk' | 'work-orders' | 'assets' | 'inventory' | 'procurement' | 'hse' | 'amc' | 'iot'
  property: PropertyData | null
  tickets: HelpdeskTicket[]
  moduleItems: ModuleItem[]
  overviewWorkOrders: ModuleItem[]
  overviewAttendance: { checkedIn: number; activeWorkers: number }
  rows: AttendanceRow[]
  active: AttendanceRow | null
  todayRecord: AttendanceRow | null
  shift: Shift | null
  from: string
  to: string
  loading: boolean
  busy: boolean
  error: string
  notice: string
  onLogout: () => void
  onPageChange: (page: Props['page']) => void
  onSelectWorker: (workerId: string) => void
  onCreateWorker: (name: string, employeeCode: string) => void
  onDeactivateWorker: (workerId: string) => void
  onPunch: (action: 'check-in' | 'check-out') => void
  onDismiss: () => void
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onCreateTower: (name: string, floorCount: number) => void
  onUpdateProperty: (details: { name: string; city: string; state: string; propertyType: string }) => void
  onCreateUnit: (unit: Omit<PropertyUnit, 'id' | 'occupant'> & { occupant: string | null }) => void
  onCreateTicket: (ticket: { description: string; towerId: string; floorArea: string; unitId: string | null; category: string; priority: string }) => void
  onModuleCreate: (page: 'work-orders' | 'assets' | 'inventory' | 'procurement' | 'hse' | 'amc' | 'iot', item: ModuleItem) => void
  onModuleAction: (page: 'hse' | 'iot' | 'amc', action: string, item: ModuleItem, value?: string) => void
}

function localTime(value: string) {
  const parts = value.split(':').map(Number)
  const hour = parts[0] || 0
  const minute = parts[1] || 0
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}

function time(value: string | null) {
  return value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'
}

function date(value: string) {
  return new Date(value).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function localDate(value: Date) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function entryLabel(row: AttendanceRow) {
  if (!row.lateEntry) return 'Present'
  return row.lateEntryMinutes === 0 ? 'Late Entry · under 1 minute late' : `Late Entry · ${row.lateEntryMinutes} minutes late`
}

function exitLabel(row: AttendanceRow) {
  if (!row.checkOut) return 'In progress'
  if (!row.earlyExit) return 'On time'
  return row.earlyExitMinutes === 0 ? 'Early Exit · under 1 minute early' : `Early Exit · ${row.earlyExitMinutes} minutes early`
}

export default function Dashboard(props: Props) {
  const {
    user, workers, selectedWorkerId, page, rows, active, todayRecord, shift, from, to, loading, busy, error, notice, property, tickets, moduleItems, overviewWorkOrders, overviewAttendance,
    onLogout, onPageChange, onSelectWorker, onCreateWorker, onDeactivateWorker, onPunch, onDismiss, onFromChange, onToChange, onCreateTower, onUpdateProperty, onCreateUnit, onCreateTicket, onModuleCreate, onModuleAction,
  } = props
  const [workerSearch, setWorkerSearch] = useState('')
  const [workerPickerOpen, setWorkerPickerOpen] = useState(false)
  const [newWorkerName, setNewWorkerName] = useState('')
  const [newEmployeeCode, setNewEmployeeCode] = useState('')
  const today = new Date()
  const activeWorkers = workers
  const selectedWorker = workers.find(worker => worker.id === selectedWorkerId) || null
  const visibleWorkers = activeWorkers
    .filter(worker => !workerSearch || `${worker.name} ${worker.employeeCode || ''}`.toLowerCase().includes(workerSearch.toLowerCase()))
    .slice(0, workerSearch ? activeWorkers.length : 5)
  const hours = rows.reduce((sum, row) => sum + (row.checkOut
    ? (new Date(row.checkOut).getTime() - new Date(row.checkIn).getTime()) / 3600000
    : 0), 0)
  const todayStatus = todayRecord?.attendanceStatus || 'Ready'
  const todayTime = active ? time(active.checkIn) : todayRecord?.checkOut ? time(todayRecord.checkOut) : 'Not checked in'

  return <div className="layout">
    <aside>
      <img className="sidebar-brand-image" src="/ibest-logo.png" alt="iBEST Solutions" />
      <p className="section-label">WORKSPACE</p>
      <nav className="nav-scroll">
      <button className={'nav-item ' + (page === 'overview' ? 'selected' : '')} onClick={() => onPageChange('overview')}><LayoutDashboard size={17} /> Executive Overview</button>
      <button className={'nav-item ' + (page === 'attendance' ? 'selected' : '')} onClick={() => onPageChange('attendance')}><CalendarDays size={17} /> Attendance</button>
      <button className={'nav-item ' + (page === 'workers' ? 'selected' : '')} onClick={() => onPageChange('workers')}><Users size={17} /> Workers</button>
      <button className={'nav-item ' + (page === 'property' ? 'selected' : '')} onClick={() => onPageChange('property')}><Building2 size={17} /> Property & Units</button>
      <button className={'nav-item ' + (page === 'helpdesk' ? 'selected' : '')} onClick={() => onPageChange('helpdesk')}><Ticket size={17} /> Helpdesk & SLA</button>
      <button className={'nav-item ' + (page === 'work-orders' ? 'selected' : '')} onClick={() => onPageChange('work-orders')}><Ticket size={17} /> Work Orders</button>
      <button className={'nav-item ' + (page === 'assets' ? 'selected' : '')} onClick={() => onPageChange('assets')}><Building2 size={17} /> Assets & PPM</button>
      <button className={'nav-item ' + (page === 'inventory' ? 'selected' : '')} onClick={() => onPageChange('inventory')}><Building2 size={17} /> Inventory</button>
      <button className={'nav-item ' + (page === 'procurement' ? 'selected' : '')} onClick={() => onPageChange('procurement')}><Building2 size={17} /> Procurement</button>
      <button className={'nav-item ' + (page === 'hse' ? 'selected' : '')} onClick={() => onPageChange('hse')}><ShieldCheck size={17} /> HSE & Safety</button>
      <button className={'nav-item ' + (page === 'amc' ? 'selected' : '')} onClick={() => onPageChange('amc')}><Building2 size={17} /> AMC & Vendors</button>
      <button className={'nav-item ' + (page === 'iot' ? 'selected' : '')} onClick={() => onPageChange('iot')}><Clock3 size={17} /> IoT Monitoring</button>
      </nav>
      <div className="side-end">
        <div className="account">
          <span className="avatar">{user.fullName[0].toUpperCase()}</span>
          <span><b>{user.fullName}</b><small>{user.email}</small></span>
        </div>
        <button className="logout-button" onClick={onLogout}>Log out</button>
      </div>
    </aside>

    <main className="main">
      <header><span className="top-user"><i /> Administrator <span className="avatar">{user.fullName[0].toUpperCase()}</span></span></header>
      <div className="content">
        <div className="welcome">
          <div>
            <p className="eyebrow">{today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</p>
            <h1>{page === 'overview' ? 'Operations Dashboard' : page === 'attendance' ? 'Attendance overview' : page === 'workers' ? 'Workforce & Attendance' : page === 'property' ? 'Property & Units' : page === 'helpdesk' ? 'Helpdesk & SLA' : page === 'work-orders' ? 'Work Orders' : page === 'assets' ? 'Assets & PPM' : page === 'inventory' ? 'Inventory Management' : page === 'procurement' ? 'Procurement' : page === 'hse' ? 'HSE & Safety' : page === 'amc' ? 'AMC & Vendors' : 'IoT Monitoring'}</h1>
            <p className="muted">{today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · iBEST Operations</p>
          </div>
          <span className="date-chip"><CalendarDays size={15} />{today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
        </div>

        {error && <div className="alert error">
          {error}<button onClick={onDismiss} aria-label="Dismiss"><X size={15} /></button>
        </div>}

        {page === 'overview' ? <ExecutiveOverview onOpenTickets={() => onPageChange('helpdesk')} property={property} tickets={tickets} workOrders={overviewWorkOrders} attendance={overviewAttendance} /> : (['work-orders','assets','inventory','procurement','hse','amc','iot'] as string[]).includes(page) ? <OperationsModule page={page as 'work-orders' | 'assets' | 'inventory' | 'procurement' | 'hse' | 'amc' | 'iot'} items={moduleItems} busy={busy} onCreate={onModuleCreate} onAction={onModuleAction} /> : page === 'property' ? <PropertyView property={property} busy={busy} onCreateTower={onCreateTower} onUpdateProperty={onUpdateProperty} onCreateUnit={onCreateUnit} /> : page === 'helpdesk' ? <HelpdeskView property={property} tickets={tickets} busy={busy} onCreateTicket={onCreateTicket} /> : page === 'workers' ? <section className="card worker-management">
          <p className="eyebrow">WORKER DIRECTORY</p>
          <h2>Register workers</h2>
          <p className="muted">Add the people whose attendance you manage. Deactivating a worker preserves their attendance history.</p>
          <form className="worker-form" onSubmit={event => { event.preventDefault(); onCreateWorker(newWorkerName.trim(), newEmployeeCode.trim()); setNewWorkerName(''); setNewEmployeeCode('') }}>
            <label>Worker name<input value={newWorkerName} onChange={event => setNewWorkerName(event.target.value)} placeholder="Enter worker name" maxLength={120} required /></label>
            <label>Employee ID <span>(optional)</span><input value={newEmployeeCode} onChange={event => setNewEmployeeCode(event.target.value)} placeholder="e.g. EMP-001" maxLength={40} /></label>
            <button className="primary" type="submit" disabled={busy}><UserPlus size={15} /> {busy ? 'Saving…' : 'Add worker'}</button>
          </form>
          <div className="table-scroll worker-table"><table>
            <thead><tr><th>WORKER NAME</th><th>EMPLOYEE ID</th><th>STATUS</th><th>ACTION</th></tr></thead>
            <tbody>{workers.length === 0
              ? <tr><td colSpan={4} className="empty">No workers registered yet.</td></tr>
              : workers.map(worker => <tr key={worker.id}>
                <td>{worker.name}</td><td>{worker.employeeCode || '—'}</td>
                <td><span className={'pill ' + (worker.active ? 'present' : '')}>{worker.active ? 'Active' : 'Inactive'}</span></td>
                <td>{worker.active && <button className="text-action" disabled={busy} onClick={() => onDeactivateWorker(worker.id)}><UserX size={14} /> Deactivate</button>}</td>
              </tr>)}</tbody>
          </table></div>
        </section> : <>
        <div className="grid">
          <section className="card">
            <p className="eyebrow">TODAY'S ATTENDANCE</p>
            <h2>Your time, your pace.</h2>
            <div className="worker-selector">
              <label><Users size={15} /> Worker</label>
              <button className="worker-current" onClick={() => { setWorkerPickerOpen(!workerPickerOpen); setWorkerSearch('') }} disabled={activeWorkers.length === 0}>
                {selectedWorker ? `${selectedWorker.name}${selectedWorker.active ? '' : ' (inactive)'}` : (activeWorkers.length ? 'Select a worker' : 'Register a worker first')}<span>⌄</span>
              </button>
              {workerPickerOpen && <div className="worker-options">
                <div className="worker-search"><Search size={14} /><input autoFocus value={workerSearch} onChange={event => setWorkerSearch(event.target.value)} placeholder="Search workers…" /></div>
                {visibleWorkers.length ? visibleWorkers.map(worker => <button key={worker.id} onClick={() => { onSelectWorker(worker.id); setWorkerPickerOpen(false); setWorkerSearch('') }}>
                  <span>{worker.name}</span><small>{worker.employeeCode || 'Worker'}{worker.active ? '' : ' · inactive'}</small>
                </button>) : <p>No matching workers.</p>}
              </div>}
            </div>
            <p className="shift-line">Assigned shift <b>{shift ? `${localTime(shift.shiftStart)} – ${localTime(shift.shiftEnd)}` : 'Loading…'}</b></p>
            <div className="statusline">
              <span className="round"><Clock3 size={23} /></span>
              <span><small>{active ? 'CHECKED IN AT' : todayRecord?.checkOut ? 'CHECKED OUT AT' : 'CURRENT STATUS'}</small><b>{todayTime}</b></span>
              <span className="badge">● {todayStatus}</span>
            </div>
            {todayRecord && <div className="today-details">
              <span className={todayRecord.lateEntry ? 'attendance-flag late' : 'attendance-flag present'}>{entryLabel(todayRecord)}</span>
              {todayRecord.checkOut && <span className={todayRecord.earlyExit ? 'attendance-flag early' : 'attendance-flag present'}>{exitLabel(todayRecord)}</span>}
            </div>}
            <div className="buttons">
              <button className="primary" disabled={busy || !!active || !selectedWorker?.active} onClick={() => onPunch('check-in')}><Check size={16} /> Check in</button>
              <button className="secondary" disabled={busy || !active || !selectedWorker?.active} onClick={() => onPunch('check-out')}>Check out <ArrowRight size={15} /></button>
            </div>
            <p className="hint"><ShieldCheck size={14} /> Attendance is recorded securely.</p>
          </section>

          <section className="card">
            <p className="eyebrow">YOUR SUMMARY</p>
            <h2>Little wins add up.</h2>
            <div className="stats">
              <div><CalendarDays size={17} /><b>{new Set(rows.map(row => row.checkIn.slice(0, 10))).size}</b><small>Days attended</small></div>
              <div><Clock3 size={17} /><b>{hours.toFixed(1)} hrs</b><small>Time tracked</small></div>
            </div>
            <p className="hint"><Sparkles size={14} /> Your progress is looking good</p>
          </section>
        </div>

        <section className="card history">
          <div className="history-head">
            <div><p className="eyebrow">YOUR ACTIVITY</p><h2>Attendance history</h2><p className="muted">A clear view of the time you've put in.</p></div>
            <div className="filters">
              <label>FROM<input type="date" value={from} max={to} onChange={event => onFromChange(event.target.value)} /></label>
              <label>TO<input type="date" value={to} min={from} max={localDate(new Date())} onChange={event => onToChange(event.target.value)} /></label>
            </div>
          </div>
          <div className="table-scroll"><table>
            <thead><tr><th>WORKER</th><th>DATE</th><th>SHIFT</th><th>CHECK IN</th><th>CHECK OUT</th><th>HOURS</th><th>STATUS</th></tr></thead>
            <tbody>
              {loading
                ? <tr><td colSpan={7} className="empty">Loading attendance…</td></tr>
                : rows.length === 0
                  ? <tr><td colSpan={7} className="empty">{error ? 'Unable to load history.' : 'No attendance yet. Your check-ins will appear here.'}</td></tr>
                  : rows.map(row => {
                    const duration = row.checkOut ? (new Date(row.checkOut).getTime() - new Date(row.checkIn).getTime()) / 3600000 : null
                    return <tr key={row.id}>
                      <td>{row.workerName || '—'}</td>
                      <td>{date(row.checkIn)}</td>
                      <td>{localTime(row.scheduledStart)} – {localTime(row.scheduledEnd)}</td>
                      <td>{time(row.checkIn)}<small className="table-substatus">{entryLabel(row)}</small></td>
                      <td>{time(row.checkOut)}<small className="table-substatus">{exitLabel(row)}</small></td>
                      <td>{duration === null ? '—' : `${duration.toFixed(1)} hrs`}</td>
                      <td><span className={'pill ' + (row.lateEntry ? 'late' : row.earlyExit ? 'early' : 'present')}>{row.attendanceStatus}</span></td>
                    </tr>
                  })}
            </tbody>
          </table></div>
          <div className="table-foot">Showing {rows.length} {rows.length === 1 ? 'entry' : 'entries'} <span><ShieldCheck size={13} /> Updated just now</span></div>
        </section>
        <footer>Made for a little more peace of mind <em>✳</em></footer>
        </>}
      </div>
    </main>
  </div>
}

function ExecutiveOverview({ onOpenTickets, property, tickets, workOrders, attendance }: {
  onOpenTickets: () => void
  property: PropertyData | null
  tickets: HelpdeskTicket[]
  workOrders: ModuleItem[]
  attendance: { checkedIn: number; activeWorkers: number }
}) {
  const openTickets = tickets.filter(ticket => !['closed', 'resolved', 'cancelled'].includes(ticket.status.toLowerCase()))
  const priorityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const priorityTickets = [...openTickets].sort((a, b) =>
    (priorityRank[a.priority.toLowerCase()] ?? 4) - (priorityRank[b.priority.toLowerCase()] ?? 4)
      || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  ).slice(0, 3)
  const activeWorkOrders = workOrders.filter(order => !['closed', 'complete', 'completed', 'cancelled', 'verified'].includes(String(order.status || '').toLowerCase()))
  const totalUnits = property?.units.length || 0
  const occupiedUnits = property?.units.filter(unit => unit.occupancy.toLowerCase() === 'occupied').length || 0
  const occupancyPercent = totalUnits ? Math.round(occupiedUnits / totalUnits * 100) : 0
  const attendancePercent = attendance.activeWorkers ? Math.round(attendance.checkedIn / attendance.activeWorkers * 100) : 0
  const towerCount = property?.towers.length || 0
  const floorCount = property?.towers.reduce((total, tower) => total + tower.floorCount, 0) || 0
  const metrics = [
    ['Active properties', property ? '1' : '0', property?.property.name || 'No property registered'],
    ['Occupied units', String(occupiedUnits), `${occupancyPercent}% of ${totalUnits} units`],
    ['Open tickets', String(openTickets.length), openTickets.length ? 'Prioritize critical incidents' : 'No open tickets'],
    ['Active work orders', String(activeWorkOrders.length), 'Scheduled + reactive'],
  ]
  return <section className="executive-overview">
    <div className="command-banner">
      <div><h2>Facility command center</h2><p>{property ? `${property.property.name} · ${towerCount} towers · ${floorCount} floors · ${totalUnits} units` : 'No property data is available yet.'}</p></div>
      <button className="overview-manage" onClick={onOpenTickets}>Manage tickets <ArrowRight size={15} /></button>
    </div>
    <div className="overview-metrics">{metrics.map(([label, value, note]) => <div className="overview-metric card" key={label}><small>{label}</small><b>{value}</b><span>{note}</span></div>)}</div>
    <div className="overview-panels">
      <section className="card"><h2>Priority ticket queue</h2><div className="table-scroll"><table><thead><tr><th>TICKET</th><th>ISSUE</th><th>PRIORITY</th><th>STATUS</th></tr></thead><tbody>{priorityTickets.map(ticket => <tr key={ticket.id}><td>{ticket.ticketNumber}</td><td>{ticket.description}</td><td><span className={'overview-tag priority-' + ticket.priority.toLowerCase()}>{ticket.priority}</span></td><td><span className={'overview-tag status-' + ticket.status.toLowerCase().replace(/\s+/g, '-')}>{ticket.status}</span></td></tr>)}{!priorityTickets.length && <tr><td className="empty" colSpan={4}>No open tickets.</td></tr>}</tbody></table></div></section>
      <section className="card readiness"><h2>Operational readiness</h2><label>Shift attendance <b>{attendancePercent}%</b></label><div className="progress"><span style={{ width: `${attendancePercent}%` }} /></div><label>Occupancy <b>{occupancyPercent}%</b></label><div className="progress"><span style={{ width: `${occupancyPercent}%` }} /></div><p>{attendance.activeWorkers ? `${attendance.checkedIn} of ${attendance.activeWorkers} active workers checked in.` : 'No active workers registered.'}</p></section>
    </div>
    <p className="overview-footnote">Live data from property, helpdesk, work orders, and attendance.</p>
  </section>
}

function PropertyView({ property, busy, onCreateTower, onUpdateProperty, onCreateUnit }: { property: PropertyData | null; busy: boolean; onCreateTower: (name: string, floors: number) => void; onUpdateProperty: Props['onUpdateProperty']; onCreateUnit: Props['onCreateUnit'] }) {
  const [towerId, setTowerId] = useState('')
  const [floor, setFloor] = useState(1)
  const [towerName, setTowerName] = useState('')
  const [floorCount, setFloorCount] = useState(6)
  const [unitNumber, setUnitNumber] = useState('')
  const [spaceType, setSpaceType] = useState('Residential')
  const [occupancy, setOccupancy] = useState('Vacant')
  const [occupant, setOccupant] = useState('')
  const tower = property?.towers.find(item => item.id === (towerId || property.towers[0]?.id))
  const towerUnits = property?.units.filter(unit => unit.towerId === tower?.id) || []
  const floors = tower?.floorCount || 0
  const [showUnitForm, setShowUnitForm] = useState(false)
  const [showTowerForm, setShowTowerForm] = useState(false)
  const [showPropertyForm, setShowPropertyForm] = useState(false)
  const [propertyName, setPropertyName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [propertyType, setPropertyType] = useState('')
  useEffect(() => { if (tower && floor > tower.floorCount) setFloor(tower.floorCount) }, [tower, floor])
  if (!property) return <section className="card"><h2>Loading property…</h2></section>
  return <section className="property-page">
    <div className="property-title"><div><p className="eyebrow">PROPERTY & UNIT SETUP</p><h2>{property.property.name}</h2><p className="muted">{property.property.city}, {property.property.state} · {property.property.propertyType}</p></div><div className="property-actions"><button className="secondary" onClick={() => { setPropertyName(property.property.name); setCity(property.property.city); setState(property.property.state); setPropertyType(property.property.propertyType); setShowPropertyForm(!showPropertyForm) }}>Edit property</button><button className="primary" onClick={() => setShowTowerForm(!showTowerForm)}>+ Add tower</button></div></div>
    {showPropertyForm && <form className="worker-form property-edit-form" onSubmit={e => { e.preventDefault(); onUpdateProperty({ name: propertyName.trim(), city: city.trim(), state: state.trim(), propertyType: propertyType.trim() }); setShowPropertyForm(false) }}><label>Property name<input required maxLength={160} value={propertyName} onChange={e => setPropertyName(e.target.value)} /></label><label>City<input required maxLength={100} value={city} onChange={e => setCity(e.target.value)} /></label><label>State<input required maxLength={100} value={state} onChange={e => setState(e.target.value)} /></label><label>Property type<input required maxLength={40} value={propertyType} onChange={e => setPropertyType(e.target.value)} /></label><button className="primary" disabled={busy}>Save property</button></form>}
    {showTowerForm && <form className="worker-form" onSubmit={e => { e.preventDefault(); onCreateTower(towerName.trim(), floorCount); setTowerName(''); setShowTowerForm(false) }}><label>Tower name<input required maxLength={80} value={towerName} onChange={e => setTowerName(e.target.value)} placeholder="e.g. Tower D" /></label><label>Number of floors<input required type="number" min="1" max="100" value={floorCount} onChange={e => setFloorCount(Number(e.target.value))} /></label><button className="primary" disabled={busy}>Save tower</button></form>}
    <div className="property-stats"><div><small>Towers</small><b>{property.towers.length}</b></div><div><small>Floors</small><b>{property.towers.reduce((n, t) => n + t.floorCount, 0)}</b></div><div><small>Units</small><b>{property.units.length}</b></div><div><small>Occupied</small><b>{property.units.filter(u => u.occupancy === 'Occupied').length}</b></div></div>
    <section className="card"><h3>Select a tower</h3><div className="tower-list">{property.towers.map(t => <button key={t.id} className={'tower-card ' + (tower?.id === t.id ? 'active' : '')} onClick={() => { setTowerId(t.id); setFloor(1) }}><b>{t.name}</b><small>{t.floorCount} floors · {t.unitCount} units</small><small>{t.occupied} occupied · {t.unitCount - t.occupied} vacant</small></button>)}</div>{!property.towers.length && <p className="muted">Add a tower to start organizing property units.</p>}</section>
    {tower && <section className="card"><div className="property-title"><h3>{tower.name} · Floor explorer</h3><button className="secondary" onClick={() => setShowUnitForm(!showUnitForm)}>+ Add unit / floor</button></div>
      <div className="property-stats compact"><div><small>Selected tower</small><b>{tower.name}</b></div><div><small>Floors</small><b>{floors}</b></div><div><small>Total units</small><b>{tower.unitCount}</b></div><div><small>Occupied</small><b>{tower.occupied}</b></div></div>
      <div className="floor-buttons">{Array.from({ length: floors }, (_, i) => floors - i).map(n => <button className={floor === n ? 'active' : ''} key={n} onClick={() => setFloor(n)}>Floor {n}</button>)}</div>
      {showUnitForm && <form className="worker-form unit-form" onSubmit={e => { e.preventDefault(); onCreateUnit({ towerId: tower.id, floorNumber: floor, unitNumber: unitNumber.trim(), spaceType, occupancy, occupant: occupant.trim() || null }); setUnitNumber(''); setOccupant(''); setShowUnitForm(false) }}><label>Unit number<input required maxLength={40} value={unitNumber} onChange={e => setUnitNumber(e.target.value)} placeholder={`${tower.name.slice(-1)}-${String(floor).padStart(2, '0')}-01`} /></label><label>Floor<select value={floor} onChange={e => setFloor(Number(e.target.value))}>{Array.from({ length: floors }, (_, i) => i + 1).map(n => <option key={n} value={n}>Floor {n}</option>)}</select></label><label>Space type<select value={spaceType} onChange={e => setSpaceType(e.target.value)}><option>Residential</option><option>Office</option><option>Retail</option><option>Common area</option><option>Parking</option></select></label><label>Occupancy<select value={occupancy} onChange={e => setOccupancy(e.target.value)}><option>Vacant</option><option>Occupied</option></select></label>{occupancy === 'Occupied' && <label>Occupant<input value={occupant} onChange={e => setOccupant(e.target.value)} maxLength={160} /></label>}<button className="primary" disabled={busy}>Save unit</button></form>}
      <h3>Floor {floor} units</h3><div className="unit-grid">{towerUnits.filter(u => u.floorNumber === floor).map(unit => <div className={'unit-card ' + unit.occupancy.toLowerCase()} key={unit.id}><b>{unit.unitNumber}</b><span>{unit.spaceType}</span><small>{unit.occupancy}</small>{unit.occupant && <small>{unit.occupant}</small>}</div>)}{!towerUnits.some(u => u.floorNumber === floor) && <p className="muted">No units on this floor yet.</p>}</div>
    </section>}
  </section>
}

function HelpdeskView({ property, tickets, busy, onCreateTicket }: { property: PropertyData | null; tickets: HelpdeskTicket[]; busy: boolean; onCreateTicket: Props['onCreateTicket'] }) {
  const [open, setOpen] = useState(false)
  const [workOrderTicket, setWorkOrderTicket] = useState<HelpdeskTicket | null>(null)
  const [description, setDescription] = useState('')
  const [towerId, setTowerId] = useState('')
  const [floorArea, setFloorArea] = useState('Lobby / common area')
  const [unitId, setUnitId] = useState('')
  const [category, setCategory] = useState('HVAC')
  const [priority, setPriority] = useState('Medium')
  const selectedTower = property?.towers.find(t => t.id === towerId) || property?.towers[0]
  const visibleUnits = property?.units.filter(u => u.towerId === selectedTower?.id) || []
  return <section className="helpdesk-page"><div className="property-title"><div><p className="eyebrow">HELPDESK & SLA</p><h2>{property?.property.name || 'Property'} / Helpdesk queue</h2><p className="muted">Report a property issue and track its response target.</p></div><button className="primary" onClick={() => setOpen(true)}>+ Raise ticket</button></div>
    <div className="sla-chips"><span>Critical: 30 min</span><span>High: 2 hrs</span><span>Medium: 8 hrs</span><span>Low: 24 hrs</span></div>
    <section className="card"><h3>Helpdesk queue and SLA</h3><div className="table-scroll"><table><thead><tr><th>TICKET</th><th>ISSUE / LOCATION</th><th>PRIORITY</th><th>STATUS</th><th>WORK ORDER OWNER</th><th>TARGET</th><th>ACTION</th></tr></thead><tbody>{tickets.length ? tickets.map(t => <tr key={t.id}><td><b>{t.ticketNumber}</b><small className="table-substatus">{t.category}</small></td><td>{t.description}<small className="table-substatus">{t.tower} · {t.floorArea}{t.unitNumber ? ` · ${t.unitNumber}` : ''}</small></td><td><span className={'pill priority-' + t.priority.toLowerCase()}>{t.priority}</span></td><td><span className="pill">{t.status}</span></td><td>{t.ownerName || 'Unassigned'}</td><td>{({ Critical: '30 min', High: '2 hrs', Medium: '8 hrs', Low: '24 hrs' } as Record<string, string>)[t.priority] || '8 hrs'}</td><td><button className="secondary" onClick={() => setWorkOrderTicket(t)}>View work orders</button></td></tr>) : <tr><td colSpan={7} className="empty">No tickets have been raised.</td></tr>}</tbody></table></div></section>
    <p className="helpdesk-note">SLA targets are illustrative defaults. Configure response and resolution clocks by contract, category, impact, and operating calendar.</p>
    {open && <div className="modal-backdrop" role="presentation"><form className="modal-card" onSubmit={e => { e.preventDefault(); onCreateTicket({ description: description.trim(), towerId: selectedTower?.id || '', floorArea, unitId: unitId || null, category, priority }); setOpen(false); setDescription(''); setUnitId('') }}><h3>Raise a new ticket</h3><label>Issue description<input autoFocus required maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue" /></label><div className="modal-grid"><label>Tower *<select required value={selectedTower?.id || ''} onChange={e => { setTowerId(e.target.value); setUnitId('') }}>{property?.towers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Floor / area *<input required maxLength={100} value={floorArea} onChange={e => setFloorArea(e.target.value)} placeholder="e.g. Floor 4" /></label><label>Unit (optional)<select value={unitId} onChange={e => setUnitId(e.target.value)}><option value="">No specific unit / common area</option>{visibleUnits.map(u => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}</select></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{['HVAC','Plumbing','Electrical','Cleaning','Security','Lift','Civil','Other'].map(c => <option key={c}>{c}</option>)}</select></label><label>Impact / priority<select value={priority} onChange={e => setPriority(e.target.value)}>{['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}</select></label></div><p className="muted">The ticket is recorded in the property database. Create its linked operational order in Work Orders using the ticket number.</p><div className="modal-actions"><button className="primary" disabled={busy || !selectedTower}>Save</button><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button></div></form></div>}
    {workOrderTicket && <div className="modal-backdrop" role="presentation"><section className="modal-card"><h3>Work order · {workOrderTicket.ticketNumber}</h3><p><b>{workOrderTicket.description}</b></p><p>{workOrderTicket.tower} · {workOrderTicket.floorArea}{workOrderTicket.unitNumber ? ` · ${workOrderTicket.unitNumber}` : ''}</p><div className="property-stats compact"><div><small>Work order status</small><b>{workOrderTicket.workOrderStatus}</b></div><div><small>Owner</small><b>{workOrderTicket.ownerName || 'Unassigned'}</b></div></div><div className="modal-actions"><button className="secondary" onClick={() => setWorkOrderTicket(null)}>Close</button></div></section></div>}
  </section>
}

function OperationsModule({ page, items, busy, onCreate, onAction }: { page: 'work-orders' | 'assets' | 'inventory' | 'procurement' | 'hse' | 'amc' | 'iot'; items: ModuleItem[]; busy: boolean; onCreate: Props['onModuleCreate']; onAction: Props['onModuleAction'] }) {
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('report')
  const commonFields: Record<'work-orders' | 'assets' | 'inventory' | 'procurement', { key: string; label: string; type?: string; options?: string[] }[]> = {
    'work-orders': [{key:'source',label:'Source',options:['Helpdesk ticket','PPM','Inspection','Manual']},{key:'relatedTicket',label:'Related helpdesk ticket (optional)'},{key:'task',label:'Task / work required'},{key:'location',label:'Location'},{key:'priority',label:'Priority',options:['Critical','High','Medium','Low']},{key:'trade',label:'Department / Trade',options:['HVAC','Electrical','Plumbing','Fire & Safety','Lift','Civil','Other']},{key:'assignedTo',label:'Assigned person / team'},{key:'status',label:'Status',options:['Awaiting assignment','Scheduled','In Progress','Awaiting verification','Closed']}],
    assets: [{key:'recordType',label:'Record type',options:['Asset','PPM schedule']},{key:'name',label:'Asset name'},{key:'category',label:'Category',options:['HVAC','Electrical','Fire & Safety','Lift','Plumbing','Other']},{key:'location',label:'Location'},{key:'condition',label:'Condition',options:['Operational','Needs attention','Out of service']},{key:'maintenanceTask',label:'Maintenance task'},{key:'frequency',label:'Frequency',options:['Weekly','Monthly','Quarterly','Half-yearly','Annual']},{key:'nextDue',label:'Next due date',type:'date'}],
    inventory: [{key:'name',label:'Item name'},{key:'category',label:'Category',options:['HVAC','Electrical','Plumbing','Fire & Safety','Other']},{key:'quantity',label:'Opening stock',type:'number'},{key:'minimum',label:'Minimum / reorder level',type:'number'},{key:'unit',label:'Unit',options:['pcs','box','litre','kg','set']}],
    procurement: [{key:'item',label:'Inventory item'},{key:'quantity',label:'Quantity',type:'number'},{key:'supplier',label:'Supplier / vendor'},{key:'unitCost',label:'Estimated unit cost (₹)',type:'number'},{key:'requiredBy',label:'Required by',type:'date'},{key:'reason',label:'Reason'}],
  }
  const safetyReportFields = [{key:'type',label:'Type',options:['Incident','Hazard','Near miss']},{key:'title',label:'Title'},{key:'location',label:'Location'},{key:'severity',label:'Severity',options:['Low','Medium','High','Critical']},{key:'details',label:'Details / immediate controls'}]
  const safetyInspectionFields = [{key:'name',label:'Inspection'},{key:'location',label:'Location'},{key:'dueDate',label:'Scheduled date',type:'date'}]
  const extraFields: Partial<Record<typeof page,{key:string;label:string;type?:string;options?:string[]}[]>>={
    hse: formMode==='inspection'?safetyInspectionFields:safetyReportFields,
    amc:[{key:'vendor',label:'Vendor / contractor'},{key:'coveredAsset',label:'Covered asset'},{key:'contractStart',label:'Contract start',type:'date'},{key:'contractExpiry',label:'Contract expiry',type:'date'},{key:'annualValue',label:'Annual contract value (₹)',type:'number'},{key:'serviceFrequency',label:'Service frequency',options:['Monthly','Quarterly','Half-yearly','Annual']},{key:'vendorContact',label:'Vendor contact'},{key:'scope',label:'Scope of work'}],
    iot:[{key:'name',label:'Device name'},{key:'linkedAsset',label:'Linked asset (optional)'},{key:'location',label:'Location'},{key:'readingUnit',label:'Unit',options:['°C','%','kPa','kWh','ppm']},{key:'initialReading',label:'Initial reading',type:'number'},{key:'alertThreshold',label:'Alert threshold',type:'number'},{key:'thresholdDirection',label:'Alert when',options:['ABOVE','BELOW']}],
  }
  const title = page === 'work-orders' ? 'Work Orders' : page === 'assets' ? 'Assets & PPM' : page === 'inventory' ? 'Inventory Management' : page === 'procurement' ? 'Procurement' : page === 'hse' ? 'HSE & Safety' : page === 'amc' ? 'AMC & Vendors' : 'IoT Monitoring'
  const values = extraFields[page] || (page==='work-orders'||page==='assets'||page==='inventory'||page==='procurement'?commonFields[page]:[])
  const openForm=(mode='report')=>{setFormMode(mode);setFormOpen(true)}
  const heading = page==='hse'?'Incident & hazard register':page==='amc'?'Annual maintenance contracts & vendor coverage':page==='iot'?'Device register & simulated readings':page==='work-orders'?'Work order queue':page==='assets'?'Asset register and planned preventive maintenance':page==='inventory'?'Item register and low stock alerts':'Purchase requests and goods receipt'
  const stats=page==='hse'?[['Safety reports',items.filter(i=>i.recordType==='report').length],['Open HSE actions',items.filter(i=>i.recordType==='report'&&i.status!=='Verified').length],['Inspections',items.filter(i=>i.recordType==='inspection').length]]:page==='amc'?[['Service contracts',items.length],['Active contracts',items.filter(i=>i.status==='Active').length],['Expired / expiring',items.filter(i=>i.status==='Expired').length],['AMC work orders',0]]:page==='iot'?[['Devices',items.filter(i=>i.recordType==='device').length],['Open alerts',items.filter(i=>i.recordType==='alert'&&i.status==='Open').length],['Work orders from alerts',items.filter(i=>i.recordType==='alert'&&!!i.workOrder).length]]:[]
  const submit=(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();const data=new FormData(event.currentTarget);const item:ModuleItem={};values.forEach(field=>item[field.key]=String(data.get(field.key)||''));if(page==='hse')item.recordType=formMode;onCreate(page,item);setFormOpen(false)}
  return <section className="operations-module">
    <div className="module-actions module-toolbar">{page==='hse'?<><button className="primary" onClick={()=>openForm('report')}>+ Report incident / hazard</button><button className="secondary" onClick={()=>openForm('inspection')}>+ Schedule inspection</button></>:<button className="primary" onClick={()=>openForm()}>{page === 'work-orders' ? '+ Create work order' : page === 'assets' ? '+ Add asset / PPM schedule' : page === 'inventory' ? '+ Add item' : page==='amc'?'+ Add AMC / contract':page==='iot'?'+ Register device':'+ Create purchase request'}</button>}</div>
    {!!stats.length&&<div className="module-stats">{stats.map(([label,count])=><div className="card" key={label}><small>{label}</small><b>{count}</b></div>)}</div>}
    {page === 'inventory' && <div className="module-actions"><button className="secondary" onClick={() => setFormOpen(true)}>Stock in / receive goods</button><button className="secondary" onClick={() => setFormOpen(true)}>Stock out / issue to work order</button><button className="secondary" onClick={() => onCreate('procurement',{item:'',quantity:1,reason:'Low stock reorder'})}>Create reorder request</button></div>}
    {page === 'assets' && <p className="module-note">PPM schedules generate related work orders for technicians to complete and supervisors to verify.</p>}
    {page==='hse'?<><section className="card"><h3>Incident & hazard register</h3><div className="table-scroll"><table><thead><tr><th>REPORT</th><th>LOCATION</th><th>SEVERITY</th><th>STATUS</th><th>WORK ORDER</th><th>ACTIONS</th></tr></thead><tbody>{items.filter(i=>i.recordType==='report').map((i,n)=><tr key={String(i.id||n)}><td><b>{String(i.reportCode||'HSE')}</b><small className="table-substatus">{String(i.title)} · {String(i.type)}</small><small className="table-substatus">{String(i.details||'')}</small></td><td>{String(i.location)}</td><td>{String(i.severity)}</td><td>{String(i.status)}</td><td>{String(i.workOrder||'—')}</td><td><button className="secondary" onClick={()=>onAction('hse','review',i)}>Review / Verify</button> <button className="secondary" onClick={()=>onAction('hse','corrective',i)}>Create corrective WO</button></td></tr>)}</tbody></table></div></section><section className="card"><h3>Safety inspections</h3><div className="table-scroll"><table><thead><tr><th>INSPECTION</th><th>LOCATION</th><th>DUE</th><th>STATUS</th><th>RESULT</th><th>ACTION</th></tr></thead><tbody>{items.filter(i=>i.recordType==='inspection').map((i,n)=><tr key={String(i.id||n)}><td>{String(i.name)}</td><td>{String(i.location)}</td><td>{String(i.dueDate)}</td><td>{String(i.status)}</td><td>{String(i.result||'—')}</td><td><button className="secondary" onClick={()=>onAction('hse','inspection-result',i)}>Record result</button></td></tr>)}</tbody></table></div></section></>:page==='iot'?<><section className="card"><h3>Device register & simulated readings</h3><div className="table-scroll"><table><thead><tr><th>DEVICE</th><th>LOCATION / ASSET</th><th>READING</th><th>ALERT RULE</th><th>ACTION</th></tr></thead><tbody>{items.filter(i=>i.recordType==='device').map((i,n)=><tr key={String(i.id||n)}><td><b>{String(i.name)}</b><small className="table-substatus">{String(i.deviceCode||'')}</small></td><td>{String(i.location)} · {String(i.linkedAsset||'No asset linked')}</td><td>{String(i.currentReading??'—')} {String(i.readingUnit||'')}</td><td>{String(i.thresholdDirection||'ABOVE')} {String(i.alertThreshold)} {String(i.readingUnit||'')}</td><td><button className="secondary" onClick={()=>onAction('iot','simulate',i)}>Simulate reading</button></td></tr>)}</tbody></table></div></section><section className="card"><h3>Alert history & work order generation</h3><div className="table-scroll"><table><thead><tr><th>ALERT</th><th>DETAILS</th><th>STATUS</th><th>WORK ORDER</th><th>ACTION</th><th>TIME</th></tr></thead><tbody>{items.filter(i=>i.recordType==='alert').map((i,n)=><tr key={String(i.id||n)}><td>{String(i.deviceCode||i.device)}</td><td>{String(i.details)}</td><td>{String(i.status)}</td><td>{String(i.workOrder||'—')}</td><td>{!i.workOrder&&<button className="secondary" onClick={()=>onAction('iot','create-work-order',i)}>Create work order</button>}</td><td>{String(i.createdAt)}</td></tr>)}</tbody></table></div><p className="module-note">Threshold crossings from a simulated reading create an alert record. Configure a live device integration separately.</p></section></>:<section className="card"><h3>{heading}</h3><div className="table-scroll"><table><thead><tr>{(page==='amc'?['Contract','Vendor','Covered asset','Start','Expiry','Annual value','Frequency','Status','Work order','Action']:values.map(field=>field.label.toUpperCase())).map(field=><th key={field}>{field.toUpperCase()}</th>)}<th>CREATED</th></tr></thead><tbody>{items.length ? items.map((item,index)=><tr key={String(item.id || index)}>{page==='amc'?<><td>{String(item.contractCode||'—')}</td><td>{String(item.vendor)}</td><td>{String(item.coveredAsset)}</td><td>{String(item.contractStart)}</td><td>{String(item.contractExpiry)}</td><td>{String(item.annualValue)}</td><td>{String(item.serviceFrequency)}</td><td>{String(item.status)}</td><td>{String(item.workOrder||'—')}</td><td>{!item.workOrder&&<button className="secondary" onClick={()=>onAction('amc','contract-work-order',item)}>Create work order</button>}</td></>:values.map(field=><td key={field.key}>{String(item[field.key] ?? '—')}</td>)}<td>{String(item.createdAt ?? '—')}</td></tr>) : <tr><td colSpan={values.length+1} className="empty">No records yet. Add a record to begin.</td></tr>}</tbody></table></div></section>}
    {page === 'inventory' && <section className="card"><h3>Stock movement history</h3><p className="muted">Stock receipts, issues, quantity, linked work order, and reference are recorded here.</p></section>}
    {formOpen && <div className="modal-backdrop"><form className="modal-card" onSubmit={submit}><h3>{page==='hse'?(formMode==='inspection'?'Schedule safety inspection':'Report safety incident / hazard'):page==='amc'?'Register AMC / service contract':page==='iot'?'Register simulated IoT device':title+': create record'}</h3><div className="modal-grid">{values.map(field=><label key={field.key}>{field.label}{field.options ? <select name={field.key}>{field.options.map(option=><option key={option}>{option}</option>)}</select> : field.key==='details'||field.key==='scope'?<textarea name={field.key} required={field.key==='scope'} />:<input name={field.key} type={field.type||'text'} required={['task','name','title','location','quantity','item','vendor','coveredAsset','contractStart','contractExpiry','serviceFrequency','scope','dueDate','readingUnit','alertThreshold'].includes(field.key)} />}</label>)}</div><div className="modal-actions"><button className="primary" disabled={busy}>Save</button><button className="secondary" type="button" onClick={()=>setFormOpen(false)}>Cancel</button></div></form></div>}
  </section>
}
