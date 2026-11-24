import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Check, Clock3, LogOut, Search, ShieldCheck, Sparkles, UserPlus, Users, UserX, X, Building2, Ticket } from 'lucide-react'

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

type Props = {
  user: DashboardUser
  workers: Worker[]
  selectedWorkerId: string
  page: 'attendance' | 'workers' | 'property' | 'helpdesk'
  property: PropertyData | null
  tickets: HelpdeskTicket[]
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
  onPageChange: (page: 'attendance' | 'workers' | 'property' | 'helpdesk') => void
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
    user, workers, selectedWorkerId, page, rows, active, todayRecord, shift, from, to, loading, busy, error, notice, property, tickets,
    onLogout, onPageChange, onSelectWorker, onCreateWorker, onDeactivateWorker, onPunch, onDismiss, onFromChange, onToChange, onCreateTower, onUpdateProperty, onCreateUnit, onCreateTicket,
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
      <button className={'nav-item ' + (page === 'attendance' ? 'selected' : '')} onClick={() => onPageChange('attendance')}><CalendarDays size={17} /> Attendance</button>
      <button className={'nav-item ' + (page === 'workers' ? 'selected' : '')} onClick={() => onPageChange('workers')}><Users size={17} /> Workers</button>
      <button className={'nav-item ' + (page === 'property' ? 'selected' : '')} onClick={() => onPageChange('property')}><Building2 size={17} /> Property & Units</button>
      <button className={'nav-item ' + (page === 'helpdesk' ? 'selected' : '')} onClick={() => onPageChange('helpdesk')}><Ticket size={17} /> Helpdesk & SLA</button>
      <div className="side-end">
        <div className="privacy"><ShieldCheck size={16} /> Your time is in good hands.</div>
        <button className="account" onClick={onLogout}>
          <span className="avatar">{user.fullName[0].toUpperCase()}</span>
          <span><b>{user.fullName}</b><small>{user.email}</small></span>
          <LogOut size={15} />
        </button>
      </div>
    </aside>

    <main className="main">
      <header>Workspace <i>/</i> <b>{page === 'workers' ? 'Workers' : page === 'property' ? 'Property & Units' : page === 'helpdesk' ? 'Helpdesk & SLA' : 'Attendance'}</b><span className="top-user"><i /> Administrator <span className="avatar">{user.fullName[0].toUpperCase()}</span></span></header>
      <div className="content">
        <div className="welcome">
          <div>
            <p className="eyebrow">{today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</p>
            <h1>Good {today.getHours() < 12 ? 'morning' : today.getHours() < 18 ? 'afternoon' : 'evening'}, {user.fullName.split(' ')[0]} <em>✳</em></h1>
            <p className="muted">Here's your day at a glance. Take a breath and make it count.</p>
          </div>
          <span className="date-chip"><CalendarDays size={15} />{today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
        </div>

        {(error || notice) && <div className={'alert ' + (error ? 'error' : 'success')}>
          {error || notice}<button onClick={onDismiss} aria-label="Dismiss"><X size={15} /></button>
        </div>}

        {page === 'property' ? <PropertyView property={property} busy={busy} onCreateTower={onCreateTower} onUpdateProperty={onUpdateProperty} onCreateUnit={onCreateUnit} /> : page === 'helpdesk' ? <HelpdeskView property={property} tickets={tickets} busy={busy} onCreateTicket={onCreateTicket} /> : page === 'workers' ? <section className="card worker-management">
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
    {open && <div className="modal-backdrop" role="presentation"><form className="modal-card" onSubmit={e => { e.preventDefault(); onCreateTicket({ description: description.trim(), towerId: selectedTower?.id || '', floorArea, unitId: unitId || null, category, priority }); setOpen(false); setDescription(''); setUnitId('') }}><h3>Raise a new ticket</h3><label>Issue description<input autoFocus required maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue" /></label><div className="modal-grid"><label>Tower *<select required value={selectedTower?.id || ''} onChange={e => { setTowerId(e.target.value); setUnitId('') }}>{property?.towers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Floor / area *<input required maxLength={100} value={floorArea} onChange={e => setFloorArea(e.target.value)} placeholder="e.g. Floor 4" /></label><label>Unit (optional)<select value={unitId} onChange={e => setUnitId(e.target.value)}><option value="">No specific unit / common area</option>{visibleUnits.map(u => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}</select></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{['HVAC','Plumbing','Electrical','Cleaning','Security','Lift','Civil','Other'].map(c => <option key={c}>{c}</option>)}</select></label><label>Impact / priority<select value={priority} onChange={e => setPriority(e.target.value)}>{['Critical','High','Medium','Low'].map(p => <option key={p}>{p}</option>)}</select></label></div><p className="muted">Submitting automatically creates an unassigned work order. Assign responsible staff from Work Orders.</p><div className="modal-actions"><button className="primary" disabled={busy || !selectedTower}>Save</button><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button></div></form></div>}
    {workOrderTicket && <div className="modal-backdrop" role="presentation"><section className="modal-card"><h3>Work order · {workOrderTicket.ticketNumber}</h3><p><b>{workOrderTicket.description}</b></p><p>{workOrderTicket.tower} · {workOrderTicket.floorArea}{workOrderTicket.unitNumber ? ` · ${workOrderTicket.unitNumber}` : ''}</p><div className="property-stats compact"><div><small>Work order status</small><b>{workOrderTicket.workOrderStatus}</b></div><div><small>Owner</small><b>{workOrderTicket.ownerName || 'Unassigned'}</b></div></div><div className="modal-actions"><button className="secondary" onClick={() => setWorkOrderTicket(null)}>Close</button></div></section></div>}
  </section>
}
