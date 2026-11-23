import { useState } from 'react'
import { ArrowRight, CalendarDays, Check, Clock3, LogOut, Search, ShieldCheck, Sparkles, UserPlus, Users, UserX, X } from 'lucide-react'

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

type Props = {
  user: DashboardUser
  workers: Worker[]
  selectedWorkerId: string
  page: 'attendance' | 'workers'
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
  onPageChange: (page: 'attendance' | 'workers') => void
  onSelectWorker: (workerId: string) => void
  onCreateWorker: (name: string, employeeCode: string) => void
  onDeactivateWorker: (workerId: string) => void
  onPunch: (action: 'check-in' | 'check-out') => void
  onDismiss: () => void
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
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
    user, workers, selectedWorkerId, page, rows, active, todayRecord, shift, from, to, loading, busy, error, notice,
    onLogout, onPageChange, onSelectWorker, onCreateWorker, onDeactivateWorker, onPunch, onDismiss, onFromChange, onToChange,
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
      <header>Workspace <i>/</i> <b>{page === 'workers' ? 'Workers' : 'Attendance'}</b><span className="top-user"><i /> Administrator <span className="avatar">{user.fullName[0].toUpperCase()}</span></span></header>
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

        {page === 'workers' ? <section className="card worker-management">
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
