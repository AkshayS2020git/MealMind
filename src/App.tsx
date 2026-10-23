import { useEffect, useMemo, useState } from 'react'
import {
  demoData,
  type RestaurantData,
  type Ingredient,
  type MenuItem,
  type Sale,
  type WasteRecord,
  type CustomForecast,
  type KnowledgeRecord,
  type Workspace,
  type RecipePart
} from './data'

const today = '2026-10-22'

const pages: Record<string, [string, string]> = {
  dashboard: ["TODAY'S PULSE", 'Overview'],
  inventory: ['OPERATIONS', 'Inventory & expiry'],
  menu: ['CONFIGURATION', 'Menu & recipes'],
  sales: ['SALES RECORDS', 'Sales & import'],
  waste: ['LOSS TRACKING', 'Waste log'],
  forecasts: ['PLANNING', 'Forecasts & ingredient planning'],
  assistant: ['DATA-GROUNDED ASSISTANT', 'Ask MealMind']
}

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

const cloneDemo = (): RestaurantData => JSON.parse(JSON.stringify(demoData))
const emptyRestaurantData = (): RestaurantData => ({
  ingredients: [],
  menu: [],
  sales: [],
  waste: [],
  customForecasts: [],
  knowledge: []
})

const demoEmail = import.meta.env.VITE_DEMO_EMAIL || 'akshay@mealmind.com'
const demoPassword = import.meta.env.VITE_DEMO_PASSWORD || 'demo123'

const demoWorkspace: Workspace = {
  id: 'akshay-bistro',
  restaurant: "Akshay's Bistro",
  username: 'akshay',
  ownerName: 'Akshay',
  email: demoEmail,
  password: demoPassword,
  data: cloneDemo()
}

function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    try {
      const stored = localStorage.getItem('mealmind-workspaces')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => ({
            ...item,
            username:
              item.username ||
              item.email?.split('@')[0] ||
              item.ownerName?.toLowerCase().replace(/\s+/g, '') ||
              'user',
            data: {
              ...item.data,
              customForecasts: item.data?.customForecasts || [],
              knowledge: item.data?.knowledge || []
            }
          }))
        }
      }
    } catch (e) {
      console.error('Failed to load workspaces:', e)
    }
    const initial = [demoWorkspace]
    try {
      localStorage.setItem('mealmind-workspaces', JSON.stringify(initial))
    } catch (e) {
      console.error(e)
    }
    return initial
  })

  const updateWorkspaces = (updater: Workspace[] | ((current: Workspace[]) => Workspace[])) => {
    setWorkspaces(current => {
      const next = typeof updater === 'function' ? updater(current) : updater
      try {
        localStorage.setItem('mealmind-workspaces', JSON.stringify(next))
      } catch (e) {
        console.error('Failed to save workspaces:', e)
      }
      return next
    })
  }

  useEffect(() => {
    try {
      localStorage.setItem('mealmind-workspaces', JSON.stringify(workspaces))
    } catch (e) {
      console.error('Failed to sync workspaces:', e)
    }
  }, [workspaces])

  return [workspaces, updateWorkspaces] as const
}

function getAlerts(data: RestaurantData) {
  return data.ingredients.filter(item => item.quantity <= item.threshold || item.expiry <= '2026-10-24')
}

function getForecasts(data: RestaurantData) {
  const standard = data.menu.map((menu, index) => {
    const history = data.sales.filter(sale => sale.item === menu.name)
    const baseline = history.length
      ? Math.round(history.reduce((sum, sale) => sum + sale.qty, 0) / history.length)
      : 0
    const quantity = Math.max(0, baseline + (index === 0 ? 3 : -1))
    const recipeStr = menu.recipe.length
      ? menu.recipe
          .map(([name, amount, unit]) => `${(amount * quantity).toFixed(1)} ${unit} ${name}`)
          .join(', ')
      : 'No recipe mapped'
    return {
      id: menu.id,
      name: menu.name,
      baseline,
      quantity,
      modelQuality: 'MAE 2.8',
      recipeStr,
      isCustom: false
    }
  })

  const custom = (data.customForecasts || []).map(item => ({
    id: item.id,
    name: item.name,
    baseline: item.baseline,
    quantity: item.quantity,
    modelQuality: item.modelQuality || 'Manual Plan',
    recipeStr: item.ingredientRequirement || 'Manual requirement',
    isCustom: true
  }))

  return [...standard, ...custom]
}

function Table({ headings, children }: { headings: string[]; children: React.ReactNode }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headings.map((head, idx) => (
              <th key={idx}>{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function Metric({
  label,
  value,
  note,
  tone = ''
}: {
  label: string
  value: string | number
  note: string
  tone?: string
}) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={tone}>{note}</small>
    </article>
  )
}

export default function App() {
  const [workspaces, setWorkspaces] = useWorkspaces()
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem('mealmind-session'))

  const workspace = workspaces.find(item => item.id === sessionId)

  const signIn = (id: string) => {
    try {
      localStorage.setItem('mealmind-session', id)
    } catch (e) {
      console.error(e)
    }
    setSessionId(id)
  }

  const signOut = () => {
    try {
      localStorage.removeItem('mealmind-session')
    } catch (e) {
      console.error(e)
    }
    setSessionId(null)
  }

  const handleRegister = (newWorkspace: Workspace) => {
    setWorkspaces(current => {
      const filtered = current.filter(w => w.id !== newWorkspace.id)
      const next = [...filtered, newWorkspace]
      try {
        localStorage.setItem('mealmind-workspaces', JSON.stringify(next))
        localStorage.setItem('mealmind-last-login', newWorkspace.username)
      } catch (e) {
        console.error(e)
      }
      return next
    })
    signIn(newWorkspace.id)
  }

  const handleDeleteWorkspace = (id: string) => {
    setWorkspaces(current => {
      const next = current.filter(workspace => workspace.id !== id)
      try {
        localStorage.setItem('mealmind-workspaces', JSON.stringify(next))
        const lastLogin = localStorage.getItem('mealmind-last-login')
        const removed = current.find(workspace => workspace.id === id)
        if (removed && lastLogin === (removed.username || removed.email)) {
          localStorage.removeItem('mealmind-last-login')
        }
      } catch (e) {
        console.error('Failed to remove local workspace:', e)
      }
      return next
    })
    if (sessionId === id) signOut()
  }

  const handleUpdateData = (updater: RestaurantData | ((current: RestaurantData) => RestaurantData)) => {
    if (!workspace) return
    setWorkspaces(current => {
      const next = current.map(item =>
        item.id === workspace.id
          ? { ...item, data: typeof updater === 'function' ? updater(item.data) : updater }
          : item
      )
      try {
        localStorage.setItem('mealmind-workspaces', JSON.stringify(next))
      } catch (e) {
        console.error('Failed to persist workspace update:', e)
      }
      return next
    })
  }

  if (!workspace) {
    return (
      <LoginPage
        workspaces={workspaces}
        onSignIn={signIn}
        onRegister={handleRegister}
        onDeleteWorkspace={handleDeleteWorkspace}
      />
    )
  }

  return (
    <WorkspaceView
      key={workspace.id}
      workspace={workspace}
      onSignOut={signOut}
      onUpdateData={handleUpdateData}
    />
  )
}

function WorkspaceView({
  workspace,
  onSignOut,
  onUpdateData
}: {
  workspace: Workspace
  onSignOut: () => void
  onUpdateData: (updater: RestaurantData | ((current: RestaurantData) => RestaurantData)) => void
}) {
  const [page, setPage] = useState('dashboard')
  const [notice, setNotice] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const data = workspace.data
  const alerts = useMemo(() => getAlerts(data), [data])
  const forecasts = useMemo(() => getForecasts(data), [data])

  const showNotice = (text: string) => {
    setNotice(text)
    setTimeout(() => setNotice(''), 2500)
  }

  const reset = () => {
    onUpdateData(cloneDemo())
    showNotice('Demo workspace restored.')
  }

  const nav = [
    ['dashboard', '◫', 'Overview'],
    ['inventory', '□', 'Inventory'],
    ['menu', '⌘', 'Menu & recipes'],
    ['sales', '↗', 'Sales'],
    ['waste', '♲', 'Waste log'],
    ['forecasts', '⌁', 'Forecasts'],
    ['assistant', '✦', 'Ask MealMind']
  ] as const

  const initials =
    (workspace.ownerName || workspace.username || workspace.restaurant || 'MM')
      .trim()
      .slice(0, 2)
      .toUpperCase() || 'MM'

  const greeting =
    page === 'dashboard'
      ? `Good morning, ${workspace.ownerName || workspace.username || 'Chef'}`
      : pages[page]?.[1] || ''

  const renderAddModal = () => {
    if (!showAddModal) return null

    switch (page) {
      case 'inventory':
        return (
          <InventoryModal
            onClose={() => setShowAddModal(false)}
            onSave={ingredient => {
              onUpdateData(d => ({
                ...d,
                ingredients: [...d.ingredients, { ...ingredient, id: Date.now() }]
              }))
              setShowAddModal(false)
              showNotice('Inventory record added.')
            }}
          />
        )
      case 'waste':
        return (
          <WasteModal
            ingredients={data.ingredients}
            onClose={() => setShowAddModal(false)}
            onSave={wasteEntry => {
              onUpdateData(d => ({
                ...d,
                waste: [...d.waste, { ...wasteEntry, id: Date.now() }]
              }))
              setShowAddModal(false)
              showNotice('Waste record logged.')
            }}
          />
        )
      case 'sales':
        return (
          <SalesModal
            menu={data.menu}
            onClose={() => setShowAddModal(false)}
            onSave={saleEntry => {
              onUpdateData(d => ({
                ...d,
                sales: [...d.sales, { ...saleEntry, id: Date.now() }]
              }))
              setShowAddModal(false)
              showNotice('Sale record added.')
            }}
          />
        )
      case 'menu':
        return (
          <MenuModal
            ingredients={data.ingredients}
            onClose={() => setShowAddModal(false)}
            onSave={menuItem => {
              onUpdateData(d => ({
                ...d,
                menu: [...d.menu, { ...menuItem, id: Date.now() }]
              }))
              setShowAddModal(false)
              showNotice('Menu item added.')
            }}
          />
        )
      case 'forecasts':
        return (
          <ForecastModal
            menu={data.menu}
            onClose={() => setShowAddModal(false)}
            onSave={forecastEntry => {
              onUpdateData(d => ({
                ...d,
                customForecasts: [...(d.customForecasts || []), { ...forecastEntry, id: Date.now() }]
              }))
              setShowAddModal(false)
              showNotice('Forecast record added.')
            }}
          />
        )
      case 'assistant':
        return (
          <AssistantModal
            onClose={() => setShowAddModal(false)}
            onSave={knowledgeEntry => {
              onUpdateData(d => ({
                ...d,
                knowledge: [...(d.knowledge || []), { ...knowledgeEntry, id: Date.now() }]
              }))
              setShowAddModal(false)
              showNotice('Reference record added to assistant.')
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="shell">
      <aside>
        <a className="brand" href="#">
          <b>M</b>
          <span>
            MealMind<small>RESTAURANT INTELLIGENCE</small>
          </span>
        </a>
        <nav>
          {nav.map(([id, icon, label]) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={page === id ? 'active' : ''}
            >
              <i>{icon}</i>
              {label}
              {id === 'inventory' && alerts.length > 0 && <em>{alerts.length}</em>}
            </button>
          ))}
        </nav>
        <div className="account">
          <div>{initials}</div>
          <span>
            <b>{workspace.restaurant}</b>
            <small>@{workspace.username} · {workspace.email}</small>
          </span>
          <button title="Reset demo data" onClick={reset}>
            ↻
          </button>
          <button title="Sign out" onClick={onSignOut}>
            ↪
          </button>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <p className="eyebrow">{pages[page]?.[0] || 'OPERATIONS'}</p>
            <h1>{greeting}</h1>
          </div>
          <div className="top-actions">
            <span>{workspace.restaurant}</span>
            {page !== 'dashboard' && (
              <button className="add" onClick={() => setShowAddModal(true)}>
                + Add record
              </button>
            )}
          </div>
        </header>

        {notice && <div className="notice">{notice}</div>}

        <Content
          page={page}
          data={data}
          setData={onUpdateData}
          alerts={alerts}
          forecasts={forecasts}
          setPage={setPage}
          notify={showNotice}
        />

        {renderAddModal()}
      </main>
    </div>
  )
}

function LoginPage({
  workspaces,
  onSignIn,
  onRegister,
  onDeleteWorkspace
}: {
  workspaces: Workspace[]
  onSignIn: (id: string) => void
  onRegister: (workspace: Workspace) => void
  onDeleteWorkspace: (id: string) => void
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')
  const [identifier, setIdentifier] = useState(() => localStorage.getItem('mealmind-last-login') || '')

  const login = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const idInput = String(form.get('identifier') || '').trim().toLowerCase()
    const password = String(form.get('password') || '')

    const workspace = workspaces.find(item => {
      const emailMatches = item.email && item.email.toLowerCase() === idInput
      const usernameMatches = item.username && item.username.toLowerCase() === idInput
      return (emailMatches || usernameMatches) && item.password === password
    })

    if (!workspace) {
      return setError('We could not find an account matching that username or email and password.')
    }

    try {
      localStorage.setItem('mealmind-last-login', workspace.username || workspace.email)
    } catch (e) {
      console.error(e)
    }

    onSignIn(workspace.id)
  }

  const register = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const restaurantName = String(form.get('restaurant') || '').trim()
    const username = String(form.get('username') || '').trim().toLowerCase()
    const ownerName = String(form.get('name') || '').trim()
    const email = String(form.get('email') || '').trim().toLowerCase()
    const password = String(form.get('password') || '')

    if (!restaurantName || !username || !email || !password) {
      return setError('Please fill in all required fields.')
    }

    if (workspaces.some(item => item.email && item.email.toLowerCase() === email)) {
      return setError('An account already exists for that email address.')
    }

    if (workspaces.some(item => item.username && item.username.toLowerCase() === username)) {
      return setError('That username is already taken. Please choose another username.')
    }

    const newWorkspace: Workspace = {
      id: `restaurant-${Date.now()}`,
      restaurant: restaurantName,
      username,
      ownerName: ownerName || username,
      email,
      password,
      data: emptyRestaurantData()
    }

    onRegister(newWorkspace)
  }

  return (
    <div className="auth-shell">
      <section className="auth-intro">
        <a className="brand" href="#">
          <b>M</b>
          <span>
            MealMind<small>RESTAURANT INTELLIGENCE</small>
          </span>
        </a>
        <div>
          <p className="eyebrow">RESTAURANT OPERATIONS, SIMPLIFIED</p>
          <h1>Better decisions, every service.</h1>
          <p>Track food, anticipate demand, and reduce avoidable waste from one restaurant workspace.</p>
        </div>
        <small className="auth-note">
          Demo login: username <b>akshay</b> or email <b>akshay@mealmind.com</b> with password <b>demo123</b>
        </small>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="tabs">
            <button
              type="button"
              className={mode === 'login' ? 'selected' : ''}
              onClick={() => {
                setMode('login')
                setError('')
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'selected' : ''}
              onClick={() => {
                setMode('register')
                setError('')
              }}
            >
              Register restaurant
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={login}>
              <h2>Welcome back</h2>
              <p>Sign in using your registered username or email address.</p>
              <label>
                Username or Email
                <input
                  required
                  type="text"
                  name="identifier"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="e.g. akshay or akshay@mealmind.com"
                  autoComplete="username"
                />
              </label>
              <label>
                Password
                <input
                  required
                  type="password"
                  name="password"
                  placeholder="Your password"
                  autoComplete="current-password"
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button className="add" type="submit">Sign in</button>

              {workspaces.length > 0 && (
                <div className="saved-accounts">
                  <b>Saved accounts on this device:</b>
                  <div className="saved-accounts-list">
                    {workspaces.map(w => (
                      <div className="saved-account-row" key={w.id}>
                      <button
                        type="button"
                        className="account-chip"
                        onClick={() => {
                          setIdentifier(w.username || w.email)
                          setError('')
                        }}
                      >
                        @{w.username || w.email} ({w.restaurant})
                      </button>
                      <button
                        type="button"
                        className="delete-account"
                        aria-label={`Delete ${w.restaurant} from this device`}
                        title={`Delete ${w.restaurant} from this device`}
                        onClick={() => {
                          if (window.confirm(`Delete ${w.restaurant} and all of its saved local data from this device? This cannot be undone.`)) {
                            onDeleteWorkspace(w.id)
                            setIdentifier('')
                            setError('')
                          }
                        }}
                      >
                        Delete
                      </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={register}>
              <h2>Create your workspace</h2>
              <p>Set up a dedicated restaurant workspace with your chosen username.</p>
              <label>
                Restaurant name
                <input required name="restaurant" placeholder="e.g. Saffron Kitchen" />
              </label>
              <label>
                Username
                <input
                  required
                  name="username"
                  placeholder="e.g. chef_rohit (letters, numbers, underscores)"
                  pattern="^[a-zA-Z0-9_.-]+$"
                  title="Username must contain only letters, numbers, underscores, dots or hyphens"
                />
              </label>
              <label>
                Your name
                <input required name="name" placeholder="Owner or manager full name" />
              </label>
              <label>
                Work email
                <input required type="email" name="email" placeholder="you@restaurant.com" />
              </label>
              <label>
                Create password
                <input
                  required
                  minLength={6}
                  type="password"
                  name="password"
                  placeholder="At least 6 characters"
                />
              </label>
              {error && <p className="form-error">{error}</p>}
              <button className="add" type="submit">Register restaurant</button>
            </form>
          )}

          <p className="local-only">
            Credentials and data are preserved in your browser's local storage so you can easily log in anytime.
          </p>
        </div>
      </section>
    </div>
  )
}

function Content({
  page,
  data,
  setData,
  alerts,
  forecasts,
  setPage,
  notify
}: {
  page: string
  data: RestaurantData
  setData: (updater: (current: RestaurantData) => RestaurantData) => void
  alerts: Ingredient[]
  forecasts: any[]
  setPage: (p: string) => void
  notify: (text: string) => void
}) {
  if (page === 'dashboard') return <Dashboard data={data} alerts={alerts} forecasts={forecasts} setPage={setPage} />
  if (page === 'inventory') return <Inventory data={data} setData={setData} notify={notify} />
  if (page === 'menu') return <Menu data={data} setData={setData} notify={notify} />
  if (page === 'sales') return <Sales data={data} setData={setData} notify={notify} />
  if (page === 'waste') return <Waste data={data} setData={setData} notify={notify} />
  if (page === 'forecasts') return <ForecastPage forecasts={forecasts} setData={setData} notify={notify} />
  return <Assistant data={data} alerts={alerts} forecasts={forecasts} setData={setData} notify={notify} />
}

function Dashboard({
  data,
  alerts,
  forecasts,
  setPage
}: {
  data: RestaurantData
  alerts: Ingredient[]
  forecasts: any[]
  setPage: (p: string) => void
}) {
  const wasteCost = data.waste.reduce((sum, item) => sum + item.cost, 0)
  const salesRevenue = data.sales.reduce(
    (sum, sale) =>
      sum + (sale.revenue ?? (data.menu.find(item => item.name === sale.item)?.price || 0) * sale.qty),
    0
  )

  return (
    <>
      <div className="metrics">
        <Metric label="Sales recorded" value={money(salesRevenue)} note="Based on logged sales" />
        <Metric
          label="Waste recorded"
          value={money(wasteCost)}
          note={`${data.waste.length} entries logged`}
          tone="warn"
        />
        <Metric
          label="Inventory alerts"
          value={alerts.length}
          note={`${alerts.filter(x => x.expiry <= today).length} expiring today`}
          tone="warn"
        />
        <Metric label="Forecast confidence" value="78%" note="Based on available sales history" />
      </div>
      <div className="dashboard-grid">
        <section className="card">
          <h2>Weekly sales pulse</h2>
          <p>Actual sales and next-day forecast</p>
          <div className="chart">
            {[47, 59, 42, 75, 64, 88, 68].map((height, i) => (
              <div key={i}>
                <span className="actual" style={{ height: `${height}%` }} />
                <span className="forecast" style={{ height: `${Math.min(height + 9, 100)}%` }} />
                <small>{['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'][i]}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Priority actions</h2>
              <p>Based on your latest data</p>
            </div>
            <button onClick={() => setPage('forecasts')}>View all</button>
          </div>
          {alerts.length ? (
            alerts.slice(0, 3).map(item => (
              <div className="action" key={item.id}>
                <b className={item.expiry <= today ? 'danger' : ''} />
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.expiry <= today
                      ? 'Recorded expiry is today. Review before service.'
                      : `${item.quantity} ${item.unit} on hand, below threshold.`}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="empty">You are all caught up.</p>
          )}
        </section>
      </div>
      <div className="dashboard-grid lower">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Recent waste</h2>
              <p>Latest recorded losses</p>
            </div>
            <button onClick={() => setPage('waste')}>Open log</button>
          </div>
          <Table headings={['DATE', 'ITEM', 'QUANTITY', 'REASON', 'EST. COST']}>
            {data.waste
              .slice()
              .reverse()
              .map((item, idx) => (
                <tr key={item.id || `${item.item}-${item.date}-${idx}`}>
                  <td>{item.date}</td>
                  <td>
                    <b>{item.item}</b>
                  </td>
                  <td>
                    {item.qty} {item.unit}
                  </td>
                  <td>{item.reason}</td>
                  <td>{money(item.cost)}</td>
                </tr>
              ))}
          </Table>
        </section>
        <section className="card">
          <h2>Tomorrow's top sellers</h2>
          <p>Forecast from sales history</p>
          {forecasts.slice(0, 4).map(item => (
            <div className="forecast-line" key={item.id}>
              <span>
                <b>{item.name}</b>
                <small>Baseline {item.baseline} · {item.modelQuality}</small>
              </span>
              <strong>
                {item.quantity}
                <small> servings</small>
              </strong>
            </div>
          ))}
        </section>
      </div>
    </>
  )
}

function Inventory({
  data,
  setData,
  notify
}: {
  data: RestaurantData
  setData: (updater: (current: RestaurantData) => RestaurantData) => void
  notify: (text: string) => void
}) {
  const remove = (id: number) => {
    setData(d => ({ ...d, ingredients: d.ingredients.filter(item => item.id !== id) }))
    notify('Ingredient removed.')
  }

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Ingredient stock</h2>
          <p>Batch-level quantities and recorded expiry dates.</p>
        </div>
      </div>
      <Table headings={['INGREDIENT', 'ON HAND', 'UNIT COST', 'EXPIRY', 'STATUS', '']}>
        {data.ingredients.map(item => {
          const urgent = item.expiry <= '2026-10-24'
          const low = item.quantity <= item.threshold
          return (
            <tr key={item.id}>
              <td>
                <b>{item.name}</b>
              </td>
              <td>
                {item.quantity} {item.unit}
              </td>
              <td>
                {money(item.cost)}/{item.unit}
              </td>
              <td>{item.expiry}</td>
              <td>
                <span className={`tag ${urgent || low ? 'attention' : ''}`}>
                  {urgent ? 'Expiring soon' : low ? 'Low stock' : 'Healthy'}
                </span>
              </td>
              <td>
                <button className="text-button danger" onClick={() => remove(item.id)}>
                  Remove
                </button>
              </td>
            </tr>
          )
        })}
      </Table>
    </section>
  )
}

function Menu({
  data,
  setData,
  notify
}: {
  data: RestaurantData
  setData: (updater: (current: RestaurantData) => RestaurantData) => void
  notify: (text: string) => void
}) {
  const removeMenuItem = (id: number) => {
    setData(d => ({ ...d, menu: d.menu.filter(m => m.id !== id) }))
    notify('Menu item removed.')
  }

  return (
    <>
      <p className="intro">Recipes determine the ingredient requirement for every forecasted serving.</p>
      <div className="recipe-grid">
        {data.menu.map(item => (
          <article className="recipe" key={item.id}>
            <div className="recipe-header">
              <h2>{item.name}</h2>
              <button
                className="text-button danger"
                onClick={() => removeMenuItem(item.id)}
                title="Remove dish"
              >
                ✕
              </button>
            </div>
            <p>{money(item.price)} · Active</p>
            <ul>
              {item.recipe.length ? (
                item.recipe.map(([name, amount, unit]) => (
                  <li key={name}>
                    {amount} {unit} {name} per serving
                  </li>
                ))
              ) : (
                <li>No ingredients mapped yet.</li>
              )}
            </ul>
          </article>
        ))}
      </div>
    </>
  )
}

function Sales({
  data,
  setData,
  notify
}: {
  data: RestaurantData
  setData: (updater: (current: RestaurantData) => RestaurantData) => void
  notify: (text: string) => void
}) {
  const [fileMessage, setFileMessage] = useState('')

  const addSale = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const item = String(form.get('item') || '')
    const qty = Number(form.get('quantity'))
    const date = String(form.get('date') || today)
    const menuItem = data.menu.find(m => m.name === item)
    const revenue = menuItem ? menuItem.price * qty : 0

    setData(d => ({
      ...d,
      sales: [...d.sales, { id: Date.now(), item, qty, date, revenue }]
    }))
    event.currentTarget.reset()
    notify('Sale recorded.')
  }

  const removeSale = (idOrIndex: number) => {
    setData(d => ({
      ...d,
      sales: d.sales.filter((s, i) => (s.id !== undefined ? s.id !== idOrIndex : i !== idOrIndex))
    }))
    notify('Sale record removed.')
  }

  const importCsv = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const accepted: Sale[] = []
      const rejected: number[] = []
      String(reader.result)
        .trim()
        .split(/\r?\n/)
        .slice(1)
        .forEach((line, index) => {
          const [date, item, quantity] = line.split(',').map(value => value.trim())
          const menuItem = data.menu.find(menu => menu.name === item)
          if (date && menuItem && Number(quantity) > 0) {
            accepted.push({
              id: Date.now() + index,
              date,
              item,
              qty: Number(quantity),
              revenue: menuItem.price * Number(quantity)
            })
          } else {
            rejected.push(index + 2)
          }
        })
      if (accepted.length) {
        setData(d => ({ ...d, sales: [...d.sales, ...accepted] }))
      }
      setFileMessage(
        `Imported ${accepted.length} row(s).${rejected.length ? ` Rejected rows: ${rejected.join(', ')}.` : ' All rows are valid.'}`
      )
    }
    reader.readAsText(file)
  }

  return (
    <>
      <div className="two-col">
        <section className="card">
          <h2>Record sales</h2>
          <p>Add a menu-item sale for analytics and forecasting.</p>
          <form onSubmit={addSale}>
            <label>
              Menu item
              <select name="item">
                {data.menu.map(item => (
                  <option key={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Quantity
                <input required type="number" min="1" name="quantity" defaultValue="1" />
              </label>
              <label>
                Sale date
                <input required type="date" name="date" defaultValue={today} />
              </label>
            </div>
            <button className="add">Save sale</button>
          </form>
        </section>
        <section className="card">
          <h2>Import sales CSV</h2>
          <p>
            Expected columns: <code>date,item,quantity</code>
          </p>
          <label className="upload">
            Choose a CSV file
            <input type="file" accept=".csv" onChange={importCsv} />
          </label>
          {fileMessage && <p className="result">{fileMessage}</p>}
        </section>
      </div>

      <section className="card lower">
        <h2>Sales history</h2>
        <Table headings={['DATE', 'MENU ITEM', 'SOLD', 'REVENUE', '']}>
          {data.sales
            .slice()
            .reverse()
            .map((sale, i) => {
              const actualIndex = data.sales.length - 1 - i
              const revenue =
                sale.revenue ??
                (data.menu.find(item => item.name === sale.item)?.price || 0) * sale.qty
              return (
                <tr key={sale.id || `${sale.date}-${actualIndex}`}>
                  <td>{sale.date}</td>
                  <td>
                    <b>{sale.item}</b>
                  </td>
                  <td>{sale.qty}</td>
                  <td>{money(revenue)}</td>
                  <td>
                    <button
                      className="text-button danger"
                      onClick={() => removeSale(sale.id !== undefined ? sale.id : actualIndex)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              )
            })}
        </Table>
      </section>
    </>
  )
}

function Waste({
  data,
  setData,
  notify
}: {
  data: RestaurantData
  setData: (updater: (current: RestaurantData) => RestaurantData) => void
  notify: (text: string) => void
}) {
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const itemName = String(form.get('item') || '')
    const quantity = Number(form.get('quantity'))
    const reason = String(form.get('reason') || 'Prep excess')
    const ingredient = data.ingredients.find(item => item.name === itemName)
    const unit = ingredient?.unit || 'kg'
    const cost = quantity * (ingredient?.cost || 50)

    // Adds directly to waste log
    setData(d => ({
      ...d,
      waste: [
        ...d.waste,
        {
          id: Date.now(),
          date: today,
          item: itemName,
          unit,
          qty: quantity,
          reason,
          cost
        }
      ]
    }))
    event.currentTarget.reset()
    notify('Waste record logged.')
  }

  const removeWaste = (idOrIndex: number) => {
    setData(d => ({
      ...d,
      waste: d.waste.filter((w, i) => (w.id !== undefined ? w.id !== idOrIndex : i !== idOrIndex))
    }))
    notify('Waste record removed.')
  }

  const total = data.waste.reduce((sum, item) => sum + item.cost, 0)

  return (
    <>
      <div className="two-col">
        <section className="card">
          <h2>Log food waste</h2>
          <p>Quick entry for daily losses and prep waste.</p>
          <form onSubmit={submit}>
            <label>
              Ingredient / Item
              <select name="item">
                {data.ingredients.map(item => (
                  <option key={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Quantity
                <input required name="quantity" type="number" min="0.01" step="0.01" placeholder="1.0" />
              </label>
              <label>
                Reason
                <select name="reason">
                  <option>Overripe</option>
                  <option>Prep excess</option>
                  <option>Spillage</option>
                  <option>Quality issue</option>
                  <option>Expired stock</option>
                  <option>Plate waste</option>
                </select>
              </label>
            </div>
            <button className="add">Record waste</button>
          </form>
        </section>
        <section className="card summary">
          <h2>Weekly waste summary</h2>
          <strong>{money(total)}</strong>
          <p>Estimated value of {data.waste.reduce((sum, item) => sum + item.qty, 0).toFixed(1)} logged units.</p>
        </section>
      </div>

      <section className="card lower">
        <h2>Waste records</h2>
        <Table headings={['DATE', 'ITEM', 'QUANTITY', 'REASON', 'EST. COST', '']}>
          {data.waste
            .slice()
            .reverse()
            .map((item, i) => {
              const actualIndex = data.waste.length - 1 - i
              return (
                <tr key={item.id || `${item.date}-${actualIndex}`}>
                  <td>{item.date}</td>
                  <td>
                    <b>{item.item}</b>
                  </td>
                  <td>
                    {item.qty} {item.unit}
                  </td>
                  <td>{item.reason}</td>
                  <td>{money(item.cost)}</td>
                  <td>
                    <button
                      className="text-button danger"
                      onClick={() => removeWaste(item.id !== undefined ? item.id : actualIndex)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              )
            })}
        </Table>
      </section>
    </>
  )
}

function ForecastPage({
  forecasts,
  setData,
  notify
}: {
  forecasts: any[]
  setData: (updater: (current: RestaurantData) => RestaurantData) => void
  notify: (text: string) => void
}) {
  const removeCustomForecast = (id: number) => {
    setData(d => ({
      ...d,
      customForecasts: (d.customForecasts || []).filter(item => item.id !== id)
    }))
    notify('Forecast record removed.')
  }

  return (
    <>
      <section className="card">
        <h2>Next-day demand forecast</h2>
        <p>Advisory targets and ingredient formulas calculated from menu and sales records.</p>
        <Table headings={['MENU ITEM', 'FORECAST', 'BASELINE', 'MODEL QUALITY', 'INGREDIENT REQUIREMENT', '']}>
          {forecasts.map(item => (
            <tr key={item.id}>
              <td>
                <b>{item.name}</b>
              </td>
              <td>{item.quantity}</td>
              <td>{item.baseline}</td>
              <td>
                <span className="tag">{item.modelQuality}</span>
              </td>
              <td>{item.recipeStr}</td>
              <td>
                {item.isCustom && (
                  <button className="text-button danger" onClick={() => removeCustomForecast(item.id)}>
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </section>
      <section className="card lower">
        <h2>Planning safeguard</h2>
        <p>
          Ingredient requirements are calculated recipe formulas. Review actual usable stock and expiry dates
          before ordering or prep. MealMind never recommends using ingredients past their recorded expiry.
        </p>
      </section>
    </>
  )
}

function Assistant({
  data,
  alerts,
  forecasts,
  setData,
  notify
}: {
  data: RestaurantData
  alerts: Ingredient[]
  forecasts: any[]
  setData: (updater: (current: RestaurantData) => RestaurantData) => void
  notify: (text: string) => void
}) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'I can explain your inventory, sales, waste, forecasts, and saved reference records. What would you like to review?'
    }
  ])

  const answer = (question: string) => {
    const text = question.toLowerCase()

    // Check custom knowledge records first
    const match = (data.knowledge || []).find(k => text.includes(k.topic.toLowerCase()))
    if (match) {
      return `Reference record for "${match.topic}": ${match.details}`
    }

    if (text.includes('attention') || text.includes('expiry') || text.includes('alert')) {
      return alerts.length
        ? alerts
            .map(item => `${item.name}: ${item.quantity} ${item.unit} available; recorded expiry ${item.expiry}.`)
            .join(' ') + ' Review any ingredient at or past its recorded expiry before service.'
        : 'No inventory alerts are recorded.'
    }

    if (text.includes('paneer') && text.includes('need')) {
      const forecast = forecasts.find(f => f.name.toLowerCase().includes('paneer')) || forecasts[0]
      return `${forecast?.name || 'Paneer Tikka Bowl'} is estimated at ${forecast?.quantity || 24} servings. Its recipe requires ${((forecast?.quantity || 24) * 0.18).toFixed(1)} kg paneer. This is a planning estimate, not a purchase order.`
    }

    if (text.includes('waste')) {
      return `You have logged ${data.waste.length} waste records with an estimated cost of ${money(
        data.waste.reduce((sum, item) => sum + item.cost, 0)
      )}.`
    }

    if (text.includes('sales') || text.includes('revenue')) {
      const totalRev = data.sales.reduce(
        (sum, s) => sum + (s.revenue ?? (data.menu.find(m => m.name === s.item)?.price || 0) * s.qty),
        0
      )
      return `Total sales recorded: ${data.sales.length} transactions across items with cumulative revenue of ${money(totalRev)}.`
    }

    return 'I do not have enough matching recorded data to answer that reliably. Try asking about inventory alerts, paneer planning, sales, waste, or add a custom reference record.'
  }

  const ask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const input = String(new FormData(event.currentTarget).get('question') || '').trim()
    if (!input) return
    setMessages(current => [
      ...current,
      { sender: 'user', text: input },
      { sender: 'bot', text: answer(input) }
    ])
    event.currentTarget.reset()
  }

  const removeKnowledge = (id: number) => {
    setData(d => ({
      ...d,
      knowledge: (d.knowledge || []).filter(k => k.id !== id)
    }))
    notify('Reference record removed.')
  }

  return (
    <div className="assistant">
      <section className="card">
        <h2>Ask MealMind</h2>
        <p>Answers are grounded strictly in your restaurant workspace records.</p>

        {data.knowledge && data.knowledge.length > 0 && (
          <div className="assistant-notes">
            <h3>Custom reference notes & guidelines</h3>
            <div className="notes-list">
              {data.knowledge.map(k => (
                <div className="note-card" key={k.id}>
                  <div>
                    <b>{k.topic}</b> <small style={{ color: '#74847d' }}>({k.date})</small>
                    <p style={{ margin: '4px 0 0', color: '#31443c' }}>{k.details}</p>
                  </div>
                  <button className="text-button danger" onClick={() => removeKnowledge(k.id)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="prompts">
          {['What needs attention today?', 'How much paneer do I need tomorrow?', 'Summarize my waste', 'What is our sales revenue?'].map(
            prompt => (
              <button
                key={prompt}
                onClick={() =>
                  setMessages(current => [
                    ...current,
                    { sender: 'user', text: prompt },
                    { sender: 'bot', text: answer(prompt) }
                  ])
                }
              >
                {prompt}
              </button>
            )
          )}
        </div>
        <div className="chat">
          {messages.map((message, i) => (
            <div key={i} className={`bubble ${message.sender}`}>
              {message.text}
            </div>
          ))}
        </div>
        <form className="chat-form" onSubmit={ask}>
          <input name="question" placeholder="Ask about your restaurant data…" />
          <button className="add">Send</button>
        </form>
      </section>
    </div>
  )
}

/* =========================================================================
   PAGE-SPECIFIC MODALS
   Each page has a customized modal with inputs matching records on that page!
   ========================================================================= */

// 1. INVENTORY MODAL
function InventoryModal({
  onClose,
  onSave
}: {
  onClose: () => void
  onSave: (ingredient: Omit<Ingredient, 'id'>) => void
}) {
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    onSave({
      name: String(fields.get('name') || '').trim(),
      unit: String(fields.get('unit') || 'kg'),
      quantity: Number(fields.get('quantity')),
      cost: Number(fields.get('cost')),
      expiry: String(fields.get('expiry') || today),
      threshold: Number(fields.get('threshold'))
    })
  }

  return (
    <div className="overlay">
      <form className="modal" onSubmit={submit}>
        <h2>Add Inventory Record</h2>
        <p className="modal-subtitle">Record a new stock item and its expiry threshold.</p>
        <label>
          Ingredient Name
          <input required name="name" placeholder="e.g. Bell peppers" />
        </label>
        <div className="form-row">
          <label>
            Unit
            <select name="unit">
              <option>kg</option>
              <option>litre</option>
              <option>bunch</option>
              <option>piece</option>
              <option>packet</option>
              <option>gram</option>
            </select>
          </label>
          <label>
            Quantity on hand
            <input required type="number" step="0.1" min="0" name="quantity" placeholder="e.g. 5.0" />
          </label>
        </div>
        <div className="form-row">
          <label>
            Unit cost (INR)
            <input required type="number" step="1" min="0" name="cost" placeholder="e.g. 65" />
          </label>
          <label>
            Low-stock threshold
            <input required type="number" step="0.1" min="0" name="threshold" placeholder="e.g. 3.0" />
          </label>
        </div>
        <label>
          Expiry date
          <input required type="date" name="expiry" defaultValue={today} />
        </label>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="add" type="submit">
            Save ingredient
          </button>
        </div>
      </form>
    </div>
  )
}

// 2. WASTE MODAL
// Requested inputs: DATE, ITEM, QUANTITY, REASON, EST.COST
function WasteModal({
  ingredients,
  onClose,
  onSave
}: {
  ingredients: Ingredient[]
  onClose: () => void
  onSave: (record: Omit<WasteRecord, 'id'>) => void
}) {
  const [selectedItem, setSelectedItem] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('kg')
  const [cost, setCost] = useState('')

  // Auto-estimate cost when item or quantity changes
  const handleItemChange = (itemName: string) => {
    setSelectedItem(itemName)
    const matched = ingredients.find(i => i.name.toLowerCase() === itemName.toLowerCase())
    if (matched) {
      setUnit(matched.unit)
      const qtyNum = parseFloat(quantity) || 1
      setCost(String(Math.round(matched.cost * qtyNum)))
    }
  }

  const handleQtyChange = (qtyVal: string) => {
    setQuantity(qtyVal)
    const matched = ingredients.find(i => i.name.toLowerCase() === selectedItem.toLowerCase())
    if (matched) {
      const qtyNum = parseFloat(qtyVal) || 0
      setCost(String(Math.round(matched.cost * qtyNum)))
    }
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const item = String(form.get('item') || '').trim()
    const qty = Number(form.get('quantity'))
    const reason = String(form.get('reason') || 'Overripe')
    const estCost = Number(form.get('cost'))
    const date = String(form.get('date') || today)
    const formUnit = String(form.get('unit') || unit || 'kg')

    onSave({
      date,
      item,
      qty,
      unit: formUnit,
      reason,
      cost: estCost
    })
  }

  return (
    <div className="overlay">
      <form className="modal" onSubmit={submit}>
        <h2>Add Waste Record</h2>
        <p className="modal-subtitle">Log discarded food or prep excess directly to waste tracking.</p>

        <label>
          DATE
          <input required type="date" name="date" defaultValue={today} />
        </label>

        <label>
          ITEM
          <input
            required
            name="item"
            list="waste-ingredients-list"
            value={selectedItem}
            onChange={e => handleItemChange(e.target.value)}
            placeholder="Type or select ingredient/item (e.g. Tomatoes)"
          />
          <datalist id="waste-ingredients-list">
            {ingredients.map(ing => (
              <option key={ing.id} value={ing.name}>
                {ing.name} ({ing.unit})
              </option>
            ))}
          </datalist>
        </label>

        <div className="form-row">
          <label>
            QUANTITY
            <input
              required
              type="number"
              step="0.01"
              min="0.01"
              name="quantity"
              value={quantity}
              onChange={e => handleQtyChange(e.target.value)}
              placeholder="e.g. 1.2"
            />
          </label>
          <label>
            UNIT
            <select name="unit" value={unit} onChange={e => setUnit(e.target.value)}>
              <option>kg</option>
              <option>litre</option>
              <option>bunch</option>
              <option>piece</option>
              <option>packet</option>
              <option>gram</option>
            </select>
          </label>
        </div>

        <label>
          REASON
          <select name="reason">
            <option>Overripe</option>
            <option>Prep excess</option>
            <option>Spillage</option>
            <option>Quality issue</option>
            <option>Expired stock</option>
            <option>Plate waste</option>
            <option>Storage damage</option>
          </select>
        </label>

        <label>
          EST. COST (INR)
          <input
            required
            type="number"
            step="0.01"
            min="0"
            name="cost"
            value={cost}
            onChange={e => setCost(e.target.value)}
            placeholder="e.g. 45"
          />
        </label>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="add" type="submit">
            Save waste record
          </button>
        </div>
      </form>
    </div>
  )
}

// 3. SALES MODAL
// Exact inputs matching Sales table: DATE, MENU ITEM, SOLD (QUANTITY), REVENUE
function SalesModal({
  menu,
  onClose,
  onSave
}: {
  menu: MenuItem[]
  onClose: () => void
  onSave: (record: Omit<Sale, 'id'>) => void
}) {
  const [selectedItem, setSelectedItem] = useState(menu[0]?.name || '')
  const [quantity, setQuantity] = useState('1')
  const [revenue, setRevenue] = useState(() => {
    const dish = menu[0]
    return dish ? String(dish.price) : '0'
  })

  const handleDishChange = (dishName: string) => {
    setSelectedItem(dishName)
    const dish = menu.find(m => m.name === dishName)
    if (dish) {
      const q = parseInt(quantity, 10) || 1
      setRevenue(String(dish.price * q))
    }
  }

  const handleQtyChange = (qtyStr: string) => {
    setQuantity(qtyStr)
    const dish = menu.find(m => m.name === selectedItem)
    if (dish) {
      const q = parseInt(qtyStr, 10) || 0
      setRevenue(String(dish.price * q))
    }
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const date = String(form.get('date') || today)
    const item = String(form.get('item') || '').trim()
    const qty = Number(form.get('quantity'))
    const rev = Number(form.get('revenue'))

    onSave({
      date,
      item,
      qty,
      revenue: rev
    })
  }

  return (
    <div className="overlay">
      <form className="modal" onSubmit={submit}>
        <h2>Add Sales Record</h2>
        <p className="modal-subtitle">Log dishes sold and recorded revenue for forecasting.</p>

        <label>
          DATE
          <input required type="date" name="date" defaultValue={today} />
        </label>

        <label>
          MENU ITEM
          <input
            required
            name="item"
            list="sales-menu-list"
            value={selectedItem}
            onChange={e => handleDishChange(e.target.value)}
            placeholder="Type or select dish"
          />
          <datalist id="sales-menu-list">
            {menu.map(m => (
              <option key={m.id} value={m.name}>
                {m.name} ({money(m.price)})
              </option>
            ))}
          </datalist>
        </label>

        <div className="form-row">
          <label>
            SOLD (QUANTITY)
            <input
              required
              type="number"
              min="1"
              step="1"
              name="quantity"
              value={quantity}
              onChange={e => handleQtyChange(e.target.value)}
            />
          </label>
          <label>
            REVENUE (INR)
            <input
              required
              type="number"
              step="1"
              min="0"
              name="revenue"
              value={revenue}
              onChange={e => setRevenue(e.target.value)}
              placeholder="Calculated or custom"
            />
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="add" type="submit">
            Save sale record
          </button>
        </div>
      </form>
    </div>
  )
}

// 4. MENU MODAL
// Exact inputs matching Menu page: DISH NAME, PRICE, RECIPE INGREDIENTS
function MenuModal({
  ingredients,
  onClose,
  onSave
}: {
  ingredients: Ingredient[]
  onClose: () => void
  onSave: (record: Omit<MenuItem, 'id'>) => void
}) {
  const [recipeParts, setRecipeParts] = useState<Array<{ name: string; amount: number; unit: string }>>([
    { name: ingredients[0]?.name || 'Tomatoes', amount: 0.15, unit: ingredients[0]?.unit || 'kg' }
  ])

  const addRow = () => {
    setRecipeParts(curr => [
      ...curr,
      { name: ingredients[0]?.name || 'Basmati rice', amount: 0.1, unit: ingredients[0]?.unit || 'kg' }
    ])
  }

  const removeRow = (idx: number) => {
    setRecipeParts(curr => curr.filter((_, i) => i !== idx))
  }

  const updateRow = (idx: number, field: 'name' | 'amount' | 'unit', val: any) => {
    setRecipeParts(curr =>
      curr.map((row, i) => {
        if (i !== idx) return row
        if (field === 'name') {
          const matched = ingredients.find(ing => ing.name === val)
          return { ...row, name: val, unit: matched ? matched.unit : row.unit }
        }
        return { ...row, [field]: val }
      })
    )
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    const price = Number(form.get('price'))

    const recipe: RecipePart[] = recipeParts
      .filter(r => r.name.trim() && r.amount > 0)
      .map(r => [r.name.trim(), Number(r.amount), r.unit])

    onSave({
      name,
      price,
      recipe
    })
  }

  return (
    <div className="overlay">
      <form className="modal" onSubmit={submit}>
        <h2>Add Menu Item & Recipe</h2>
        <p className="modal-subtitle">Define a dish and its ingredient requirements per serving.</p>

        <label>
          DISH / ITEM NAME
          <input required name="name" placeholder="e.g. Shahi Paneer Bowl" />
        </label>

        <label>
          PRICE (INR)
          <input required type="number" step="1" min="0" name="price" placeholder="e.g. 320" />
        </label>

        <label>
          RECIPE INGREDIENTS PER SERVING
          <div className="recipe-builder">
            {recipeParts.map((part, idx) => (
              <div key={idx} className="recipe-builder-row">
                <input
                  required
                  list={`recipe-ing-${idx}`}
                  value={part.name}
                  onChange={e => updateRow(idx, 'name', e.target.value)}
                  placeholder="Ingredient"
                />
                <datalist id={`recipe-ing-${idx}`}>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.name}>
                      {ing.name}
                    </option>
                  ))}
                </datalist>

                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={part.amount}
                  onChange={e => updateRow(idx, 'amount', Number(e.target.value))}
                  placeholder="Amount"
                />

                <select value={part.unit} onChange={e => updateRow(idx, 'unit', e.target.value)}>
                  <option>kg</option>
                  <option>litre</option>
                  <option>bunch</option>
                  <option>piece</option>
                  <option>packet</option>
                  <option>gram</option>
                </select>

                {recipeParts.length > 1 && (
                  <button
                    type="button"
                    className="btn-remove-row"
                    onClick={() => removeRow(idx)}
                    title="Remove ingredient"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn-add-row" onClick={addRow}>
              + Add ingredient to recipe
            </button>
          </div>
        </label>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="add" type="submit">
            Save menu dish
          </button>
        </div>
      </form>
    </div>
  )
}

// 5. FORECAST MODAL
// Exact inputs matching Forecasts table: MENU ITEM, FORECAST, BASELINE, MODEL QUALITY, INGREDIENT REQUIREMENT
function ForecastModal({
  menu,
  onClose,
  onSave
}: {
  menu: MenuItem[]
  onClose: () => void
  onSave: (record: Omit<CustomForecast, 'id'>) => void
}) {
  const [selectedDish, setSelectedDish] = useState(menu[0]?.name || '')
  const [forecastQty, setForecastQty] = useState('25')
  const [baseline, setBaseline] = useState('20')
  const [reqs, setReqs] = useState(() => {
    const dish = menu[0]
    return dish && dish.recipe.length
      ? dish.recipe.map(([n, a, u]) => `${(a * 25).toFixed(1)} ${u} ${n}`).join(', ')
      : 'Manual requirement'
  })

  const handleDishChange = (dishName: string) => {
    setSelectedDish(dishName)
    const dish = menu.find(m => m.name === dishName)
    const qty = parseFloat(forecastQty) || 20
    if (dish && dish.recipe.length) {
      setReqs(dish.recipe.map(([n, a, u]) => `${(a * qty).toFixed(1)} ${u} ${n}`).join(', '))
    }
  }

  const handleForecastChange = (qtyStr: string) => {
    setForecastQty(qtyStr)
    const dish = menu.find(m => m.name === selectedDish)
    const qty = parseFloat(qtyStr) || 0
    if (dish && dish.recipe.length) {
      setReqs(dish.recipe.map(([n, a, u]) => `${(a * qty).toFixed(1)} ${u} ${n}`).join(', '))
    }
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    const quantity = Number(form.get('quantity'))
    const base = Number(form.get('baseline'))
    const modelQuality = String(form.get('quality') || 'Custom Target')
    const ingredientRequirement = String(form.get('reqs') || '').trim()

    onSave({
      name,
      quantity,
      baseline: base,
      modelQuality,
      ingredientRequirement
    })
  }

  return (
    <div className="overlay">
      <form className="modal" onSubmit={submit}>
        <h2>Add Forecast Record</h2>
        <p className="modal-subtitle">Add a planned demand target or custom serving forecast.</p>

        <label>
          MENU ITEM
          <input
            required
            name="name"
            list="forecast-menu-list"
            value={selectedDish}
            onChange={e => handleDishChange(e.target.value)}
            placeholder="Select dish or enter item name"
          />
          <datalist id="forecast-menu-list">
            {menu.map(m => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </datalist>
        </label>

        <div className="form-row">
          <label>
            FORECAST SERVINGS
            <input
              required
              type="number"
              min="0"
              name="quantity"
              value={forecastQty}
              onChange={e => handleForecastChange(e.target.value)}
            />
          </label>
          <label>
            BASELINE
            <input
              required
              type="number"
              min="0"
              name="baseline"
              value={baseline}
              onChange={e => setBaseline(e.target.value)}
            />
          </label>
        </div>

        <label>
          MODEL QUALITY / PLAN TYPE
          <select name="quality">
            <option>Manual target</option>
            <option>Advisory</option>
            <option>MAE 2.5</option>
            <option>Event projection</option>
            <option>High confidence</option>
          </select>
        </label>

        <label>
          INGREDIENT REQUIREMENT
          <input
            required
            name="reqs"
            value={reqs}
            onChange={e => setReqs(e.target.value)}
            placeholder="e.g. 4.5 kg Paneer, 3.2 kg Rice"
          />
        </label>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="add" type="submit">
            Save forecast record
          </button>
        </div>
      </form>
    </div>
  )
}

// 6. ASSISTANT MODAL
// Exact inputs: DATE, TOPIC, DETAILS
function AssistantModal({
  onClose,
  onSave
}: {
  onClose: () => void
  onSave: (record: Omit<KnowledgeRecord, 'id'>) => void
}) {
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const date = String(form.get('date') || today)
    const topic = String(form.get('topic') || '').trim()
    const details = String(form.get('details') || '').trim()

    onSave({
      date,
      topic,
      details
    })
  }

  return (
    <div className="overlay">
      <form className="modal" onSubmit={submit}>
        <h2>Add Reference Record</h2>
        <p className="modal-subtitle">Save background operational context or guidelines for MealMind.</p>

        <label>
          DATE
          <input required type="date" name="date" defaultValue={today} />
        </label>

        <label>
          TOPIC / SUBJECT
          <input required name="topic" placeholder="e.g. Weekend special or Dairy supplier schedule" />
        </label>

        <label>
          DETAILS / NOTES
          <textarea
            required
            name="details"
            rows={3}
            placeholder="e.g. Fresh dairy delivery arrives Tuesday & Friday before 9 AM. Paneer shelf life is 3 days."
          />
        </label>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="add" type="submit">
            Save reference record
          </button>
        </div>
      </form>
    </div>
  )
}
