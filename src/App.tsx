import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight, CalendarDays, Check, Clock3, Eye, EyeOff, LogOut, Mail,
  ShieldCheck, UserRound, X,
} from 'lucide-react'
import Dashboard, { type AttendanceRow, type DashboardUser, type Shift, type Worker, type PropertyData, type HelpdeskTicket, type PropertyUnit, type ModuleItem } from './Dashboard'

const API = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')
type User = DashboardUser
type Row = AttendanceRow

async function call<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(API + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...init.headers },
  })
  const body = await response.json().catch(() => ({}))
  if (response.status === 401) throw Error('Your session has expired. Sign out and sign in again.')
  if (response.status === 404) throw Error(`API route ${path} was not found. Restart the API Gateway after rebuilding it.`)
  if (!response.ok) throw Error(body.message || body.detail || body.error || `Request failed (${response.status}). Please try again.`)
  return body as T
}

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

function LoginView({
  mode, setMode, busy, error, showPassword, setShowPassword, onSubmit,
}: {
  mode: 'login' | 'register'
  setMode: (mode: 'login' | 'register') => void
  busy: boolean
  error: string
  showPassword: boolean
  setShowPassword: (show: boolean) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return <main className="auth-shell">
    <section className="auth-visual">
      <div className="visual-glow" />
      <div className="visual-building building-back" />
      <div className="visual-building building-mid" />
      <div className="visual-building building-front" />
      <div className="visual-top">
        <img className="visual-logo" src="/ibest-logo.png" alt="iBEST Solutions" />
        <span className="visual-tag"><i /> ATTENDANCE, MADE SIMPLE</span>
      </div>
      <div className="visual-copy">
        <p className="visual-kicker">YOUR WORKDAY, IN FOCUS</p>
        <h1>{mode === 'login' ? <>A better way to<br />keep your day.</> : <>Make every day<br />count.</>}</h1>
        <p className="visual-description">Sign in to keep your attendance simple, clear, and right on time.</p>
        <div className="visual-features">
          <div><span><Clock3 size={21} /></span><small>Simple<br />check-ins</small></div>
          <div><span><CalendarDays size={21} /></span><small>Clear daily<br />history</small></div>
          <div><span><ShieldCheck size={21} /></span><small>Secure by<br />design</small></div>
        </div>
      </div>
      <div className="visual-bottom"><span>Make space for a better workday.</span><span>DAYMARK <b>✳</b></span></div>
    </section>

    <section className="auth-main">
      <div className="auth-card">
        <p className="auth-eyebrow">WELCOME TO iBEST</p>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your iBEST account'}</h2>
        <p className="auth-intro">{mode === 'login' ? 'Sign in to your workspace.' : 'Get started with a calmer workday.'}</p>

        <form onSubmit={onSubmit} className="auth-form">
          {mode === 'register' && <label>Full name<span className="input-wrap"><UserRound size={16} /><input name="fullName" placeholder="Your full name" required maxLength={120} /></span></label>}
          <label>Email address<span className="input-wrap"><Mail size={16} /><input name="email" type="email" placeholder="you@company.com" required maxLength={254} autoComplete="email" /></span></label>
          <label>Password<span className="input-wrap"><span className="lock-icon"><ShieldCheck size={16} /></span><input name="password" type={showPassword ? 'text' : 'password'} placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'} required minLength={mode === 'register' ? 8 : undefined} maxLength={72} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
          {error && <div className="auth-error"><X size={15} /><span>{error}</span></div>}
          <button className="primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={16} /></button>
        </form>

        <div className="auth-switch"><span>{mode === 'login' ? 'New to iBEST?' : 'Already have an account?'}</span><button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div>
        <div className="auth-divider"><span /> <i>YOUR TIME, IN GOOD HANDS</i> <span /></div>
        <p className="secure"><ShieldCheck size={15} /> Your data is private and secure</p>
      </div>
      <div className="mobile-footer">iBEST Solutions <b>✳</b> · Your workday, in focus</div>
    </section>
  </main>
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('daymark-token') || '')
  const [user, setUser] = useState<User | null>(() => { try { return JSON.parse(localStorage.getItem('daymark-user') || 'null') } catch { return null } })
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [active, setActive] = useState<Row | null>(null)
  const [todayRecord, setTodayRecord] = useState<Row | null>(null)
  const [shift, setShift] = useState<Shift | null>(null)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [page, setPage] = useState<'attendance' | 'workers' | 'property' | 'helpdesk' | 'work-orders' | 'assets' | 'inventory' | 'procurement' | 'hse' | 'amc' | 'iot'>('attendance')
  const [moduleItems, setModuleItems] = useState<ModuleItem[]>([])
  const [property, setProperty] = useState<PropertyData | null>(null)
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([])
  const [from, setFrom] = useState(iso(new Date(Date.now() - 30 * 86400000)))
  const [to, setTo] = useState(iso(new Date()))
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadWorkers = useCallback(async () => {
    if (!token) return
    try {
      const list = await call<Worker[]>('/api/attendance/workers', token)
      setWorkers(list)
      setSelectedWorkerId(current => current && list.some(worker => worker.id === current && worker.active)
        ? current : list.find(worker => worker.active)?.id || '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load workers.')
    }
  }, [token])

  useEffect(() => { void loadWorkers() }, [loadWorkers])

  const loadProperty = useCallback(async () => {
    if (!token) return
    try { setProperty(await call<PropertyData>('/api/property', token)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load property.') }
  }, [token])
  const loadTickets = useCallback(async () => {
    if (!token) return
    try { setTickets(await call<HelpdeskTicket[]>('/api/helpdesk/tickets', token)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load tickets.') }
  }, [token])
  useEffect(() => { void loadProperty(); void loadTickets() }, [loadProperty, loadTickets])

  const moduleApi: Record<'work-orders' | 'assets' | 'inventory' | 'procurement' | 'hse' | 'amc' | 'iot', string> = { 'work-orders': '/api/work-orders', assets: '/api/assets', inventory: '/api/inventory', procurement: '/api/procurement', hse:'/api/safety', amc:'/api/contracts', iot:'/api/iot' }
  const loadModule = useCallback(async () => {
    if (!token || !Object.hasOwn(moduleApi,page)) { setModuleItems([]); return }
    try {
      if (page === 'hse') {
        const [reports,inspections]=await Promise.all([call<ModuleItem[]>('/api/safety/reports',token),call<ModuleItem[]>('/api/safety/inspections',token)])
        setModuleItems([...reports.map(row=>({...row,recordType:'report'})),...inspections.map(row=>({...row,recordType:'inspection'}))])
      } else if (page === 'iot') {
        const [devices,alerts]=await Promise.all([call<ModuleItem[]>('/api/iot/devices',token),call<ModuleItem[]>('/api/iot/alerts',token)])
        setModuleItems([...devices.map(row=>({...row,recordType:'device'})),...alerts.map(row=>({...row,recordType:'alert'}))])
      } else setModuleItems(await call<ModuleItem[]>(moduleApi[page as keyof typeof moduleApi], token))
    }
    catch (e) { setError(e instanceof Error ? e.message : `Unable to load ${page}.`) }
  }, [token, page])
  useEffect(() => { void loadModule() }, [loadModule])
  async function createModuleItem(module: 'work-orders' | 'assets' | 'inventory' | 'procurement' | 'hse' | 'amc' | 'iot', item: ModuleItem) {
    setBusy(true); setError('')
    try {
      const path = module === 'hse' ? `/api/safety/${item.recordType === 'inspection' ? 'inspections' : 'reports'}` : module === 'iot' ? '/api/iot/devices' : moduleApi[module]
      const data={...item}; delete data.recordType
      await call(path, token, { method: 'POST', body: JSON.stringify(data) })
      setPage(module); setNotice('Record saved successfully.')
      if(module==='hse'||module==='iot') { const [a,b]=await Promise.all([call<ModuleItem[]>(module==='hse'?'/api/safety/reports':'/api/iot/devices',token),call<ModuleItem[]>(module==='hse'?'/api/safety/inspections':'/api/iot/alerts',token)]);setModuleItems(module==='hse'?[...a.map(row=>({...row,recordType:'report'})),...b.map(row=>({...row,recordType:'inspection'}))]:[...a.map(row=>({...row,recordType:'device'})),...b.map(row=>({...row,recordType:'alert'}))]) }
      else setModuleItems(await call<ModuleItem[]>(moduleApi[module], token))
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save record.') }
    finally { setBusy(false) }
  }
  async function moduleAction(module:'hse'|'iot'|'amc',action:string,item:ModuleItem) {
    const id=String(item.id||''); if(!id)return
    setBusy(true);setError('')
    try {
      if(module==='hse'&&action==='review') await call(`/api/safety/reports/${id}/status`,token,{method:'PATCH',body:JSON.stringify({status:'Verified'})})
      if(module==='hse'&&action==='inspection-result') { const result=window.prompt('Inspection result / findings');if(result===null)return;await call(`/api/safety/inspections/${id}/result`,token,{method:'PATCH',body:JSON.stringify({result})}) }
      if(module==='hse'&&action==='corrective') { const work=await call<ModuleItem>('/api/work-orders',token,{method:'POST',body:JSON.stringify({source:'HSE',relatedTicket:item.reportCode,task:item.title,location:item.location,priority:item.severity,trade:'HSE & Safety',status:'Awaiting assignment'})});await call(`/api/safety/reports/${id}/work-order`,token,{method:'PATCH',body:JSON.stringify({workOrder:work.id})}) }
      if(module==='iot'&&action==='simulate') { const reading=window.prompt(`Enter reading in ${String(item.readingUnit||'unit')}`);if(reading===null)return;if(!Number.isFinite(Number(reading)))throw Error('Enter a valid numeric reading.');await call(`/api/iot/devices/${id}/readings`,token,{method:'POST',body:JSON.stringify({reading:Number(reading)})}) }
      if(module==='iot'&&action==='create-work-order') { const work=await call<ModuleItem>('/api/work-orders',token,{method:'POST',body:JSON.stringify({source:'IoT alert',relatedTicket:item.deviceCode,task:item.details,location:item.device,priority:'High',trade:'IoT / Facilities',status:'Awaiting assignment'})});await call(`/api/iot/alerts/${id}/work-order`,token,{method:'PATCH',body:JSON.stringify({workOrder:work.id})}) }
      if(module==='amc'&&action==='contract-work-order') { const work=await call<ModuleItem>('/api/work-orders',token,{method:'POST',body:JSON.stringify({source:'AMC',relatedTicket:item.contractCode,task:item.scope,location:item.coveredAsset,priority:'Medium',trade:'Vendor / AMC',status:'Awaiting assignment'})});await call(`/api/contracts/${id}/work-order`,token,{method:'PATCH',body:JSON.stringify({workOrder:work.id})}) }
      setNotice(action==='corrective'?'Corrective work order created and linked.':action==='simulate'?'Reading saved. Any threshold alert is listed below.':'Record updated.')
      await loadModule()
    } catch(e) { setError(e instanceof Error?e.message:'Unable to complete the action.') }
    finally { setBusy(false) }
  }

  async function createTower(name: string, floorCount: number) {
    setBusy(true); setError('')
    try { await call('/api/property/towers', token, { method: 'POST', body: JSON.stringify({ name, floorCount }) }); await loadProperty(); setNotice(`${name} was added.`) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to add tower.') }
    finally { setBusy(false) }
  }
  async function updateProperty(details: { name: string; city: string; state: string; propertyType: string }) {
    setBusy(true); setError('')
    try { await call('/api/property', token, { method: 'PUT', body: JSON.stringify(details) }); await loadProperty(); setNotice('Property details were updated.') }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to update property.') }
    finally { setBusy(false) }
  }
  async function createUnit(unit: Omit<PropertyUnit, 'id'>) {
    setBusy(true); setError('')
    try { await call('/api/property/units', token, { method: 'POST', body: JSON.stringify(unit) }); await loadProperty(); setNotice(`${unit.unitNumber} was added.`) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to add unit.') }
    finally { setBusy(false) }
  }
  async function createTicket(ticket: { description: string; towerId: string; floorArea: string; unitId: string | null; category: string; priority: string }) {
    setBusy(true); setError('')
    try { await call('/api/helpdesk/tickets', token, { method: 'POST', body: JSON.stringify(ticket) }); await loadTickets(); setNotice('Ticket raised and an unassigned work order was created.') }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to raise ticket.') }
    finally { setBusy(false) }
  }

  const refresh = useCallback(async () => {
    if (!token || !selectedWorkerId) {
      setRows([]); setActive(null); setTodayRecord(null); setShift(null)
      return
    }
    setLoading(true)
    try {
      const [history, status] = await Promise.all([
        call<Row[]>('/api/attendance?workerId=' + selectedWorkerId + '&from=' + from + '&to=' + to, token),
        call<{ checkedIn: boolean; shift: Shift; attendance: Row | null }>('/api/attendance/status?workerId=' + selectedWorkerId, token),
      ])
      setRows(history); setActive(status.checkedIn ? status.attendance : null); setTodayRecord(status.attendance); setShift(status.shift); setError('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load attendance.') }
    finally { setLoading(false) }
  }, [token, selectedWorkerId, from, to])

  useEffect(() => { void refresh() }, [refresh])

  async function auth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    const data = mode === 'register'
      ? { fullName: form.get('fullName'), email: form.get('email'), password: form.get('password') }
      : { email: form.get('email'), password: form.get('password') }
    try {
      const result = await call<{ token: string; user: User }>('/api/auth/' + mode, undefined, { method: 'POST', body: JSON.stringify(data) })
      localStorage.setItem('daymark-token', result.token); localStorage.setItem('daymark-user', JSON.stringify(result.user))
      setToken(result.token); setUser(result.user); setNotice('Welcome to iBEST.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in.') }
    finally { setBusy(false) }
  }

  async function punch(action: 'check-in' | 'check-out') {
    if (!selectedWorkerId) { setError('Select a worker first.'); return }
    setBusy(true); setError('')
    try {
      await call('/api/attendance/' + action, token, { method: 'POST', body: JSON.stringify({ workerId: selectedWorkerId }) })
      const workerName = workers.find(worker => worker.id === selectedWorkerId)?.name || 'Worker'
      setNotice(action === 'check-in' ? `${workerName} checked in successfully.` : `${workerName} checked out successfully.`)
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update attendance.') }
    finally { setBusy(false) }
  }

  async function createWorker(name: string, employeeCode: string) {
    setBusy(true); setError(''); setNotice('')
    try {
      const created = await call<Worker>('/api/attendance/workers', token, {
        method: 'POST', body: JSON.stringify({ name, employeeCode: employeeCode || null }),
      })
      setWorkers(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedWorkerId(created.id)
      setPage('attendance')
      setNotice(`${created.name} was added to the worker list.`)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to add worker.') }
    finally { setBusy(false) }
  }

  async function deactivateWorker(workerId: string) {
    setBusy(true); setError(''); setNotice('')
    try {
      await call<void>('/api/attendance/workers/' + workerId, token, { method: 'DELETE' })
      setWorkers(current => current.map(worker => worker.id === workerId ? { ...worker, active: false } : worker))
      if (selectedWorkerId === workerId) {
        const next = workers.find(worker => worker.active && worker.id !== workerId)
        setSelectedWorkerId(next?.id || '')
      }
      setNotice('Worker deactivated. Existing attendance history is preserved.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to deactivate worker.') }
    finally { setBusy(false) }
  }

  function logout() {
    localStorage.removeItem('daymark-token'); localStorage.removeItem('daymark-user')
    setToken(''); setUser(null); setRows([]); setActive(null); setTodayRecord(null); setShift(null); setWorkers([]); setSelectedWorkerId(''); setProperty(null); setTickets([]); setModuleItems([]); setPage('attendance')
  }

  function dismissAlerts() { setError(''); setNotice('') }

  if (!token || !user) return <LoginView mode={mode} setMode={setMode} busy={busy} error={error} showPassword={showPassword} setShowPassword={setShowPassword} onSubmit={auth} />

  return <Dashboard user={user} workers={workers} selectedWorkerId={selectedWorkerId} page={page} property={property} tickets={tickets} moduleItems={moduleItems} rows={rows} active={active} todayRecord={todayRecord} shift={shift} from={from} to={to} loading={loading} busy={busy} error={error} notice={notice} onLogout={logout} onPageChange={setPage} onSelectWorker={setSelectedWorkerId} onCreateWorker={(name, employeeCode) => void createWorker(name, employeeCode)} onDeactivateWorker={(workerId) => void deactivateWorker(workerId)} onPunch={(action) => void punch(action)} onDismiss={dismissAlerts} onFromChange={setFrom} onToChange={setTo} onCreateTower={(name, floors) => void createTower(name, floors)} onUpdateProperty={details => void updateProperty(details)} onCreateUnit={unit => void createUnit(unit)} onCreateTicket={ticket => void createTicket(ticket)} onModuleCreate={(module,item)=>void createModuleItem(module,item)} onModuleAction={(module,action,item)=>void moduleAction(module,action,item)} />
}
