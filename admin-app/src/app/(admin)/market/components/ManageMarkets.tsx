import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Button, Card, CardBody, CardHeader, CardTitle, Col, FormCheck, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Row } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useNotificationContext } from '@/context/useNotificationContext'
import { supabase } from '@/investo/services'
import { usePermission } from '../../../../../../src/hooks/usePermission'

type MarketRow = {
  id: string
  symbol: string
  display_name: string
  enabled: boolean
  sort_order: number
  price_source: 'live' | 'simulated'
  coingecko_id: string | null
  market_provider_state: { effective_price: number } | { effective_price: number }[] | null
}
type Coin = { id: string; name: string; symbol: string; thumb: string }

const COINGECKO = 'https://api.coingecko.com/api/v3'
const priceOf = (m: MarketRow) => Number((Array.isArray(m.market_provider_state) ? m.market_provider_state[0] : m.market_provider_state)?.effective_price ?? 0)
const fmtPrice = (n: number) => (n >= 1 ? n.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : `$${n.toPrecision(4)}`)

const rpcError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message)
}

// Add a coin, which then follows its live CoinGecko price, or a simulated pair
// with a starting price; switch markets on and off, reorder and remove them.
// Customers see only switched-on markets, in this order.
const AddMarketModal = ({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) => {
  const { showNotification } = useNotificationContext()
  const [source, setSource] = useState<'live' | 'simulated'>('live')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Coin[] | null>(null)
  const [coin, setCoin] = useState<Coin | null>(null)
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)

  const search = async (e: FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`${COINGECKO}/search?query=${encodeURIComponent(query.trim())}`)
      if (!res.ok) throw new Error(`CoinGecko search failed (${res.status})`)
      const data = (await res.json()) as { coins: Coin[] }
      setResults(data.coins.slice(0, 8))
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Search failed.', variant: 'danger' })
    } finally {
      setBusy(false)
    }
  }

  const pick = async (c: Coin) => {
    setCoin(c)
    setSymbol(`${c.symbol.toUpperCase()}/USD`)
    setName(c.name)
    setPrice('')
    try {
      const res = await fetch(`${COINGECKO}/simple/price?ids=${c.id}&vs_currencies=usd`)
      const data = (await res.json()) as Record<string, { usd?: number }>
      if (data[c.id]?.usd) setPrice(String(data[c.id].usd))
    } catch {
      // Leave the price for the admin to type; the 5-minute sync corrects it.
    }
  }

  const add = async () => {
    setBusy(true)
    try {
      const { error } = await supabase.rpc('admin_add_market_asset', {
        p_symbol: symbol,
        p_display_name: name,
        p_price_source: source,
        p_coingecko_id: source === 'live' ? (coin?.id ?? null) : null,
        p_start_price: Number(price),
      })
      rpcError(error)
      showNotification({ message: `${symbol.toUpperCase()} added. Customers can pick it now.`, variant: 'success' })
      onAdded()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'Could not add the market.', variant: 'danger' })
      setBusy(false)
    }
  }

  const ready = symbol.trim() && name.trim() && Number(price) > 0 && (source === 'simulated' || coin)

  return (
    <Modal show onHide={onClose} centered>
      <ModalHeader closeButton>
        <ModalTitle as="h5">Add a market</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="btn-group w-100 mb-3" role="group" aria-label="Price source">
          <button type="button" className={`btn btn-sm ${source === 'live' ? 'btn-primary' : 'btn-light'}`} onClick={() => setSource('live')}>
            Live coin price
          </button>
          <button type="button" className={`btn btn-sm ${source === 'simulated' ? 'btn-primary' : 'btn-light'}`} onClick={() => setSource('simulated')}>
            Simulated pair
          </button>
        </div>
        {source === 'live' ? (
          <>
            <p className="text-muted fs-13">Any coin on CoinGecko: its real price updates every 5 minutes. Gold and silver are available as tokens (e.g. PAX Gold, Kinesis Silver).</p>
            <form onSubmit={(e) => void search(e)} className="d-flex gap-2 mb-2">
              <input className="form-control" placeholder="Search, e.g. Solana" aria-label="Search coins" value={query} onChange={(e) => setQuery(e.target.value)} />
              <button type="submit" className="btn btn-light" disabled={busy}>
                Search
              </button>
            </form>
            {results && (
              <div className="list-group mb-3" style={{ maxHeight: 220, overflowY: 'auto' }}>
                {results.length === 0 && <div className="list-group-item text-muted">No coins found.</div>}
                {results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${coin?.id === c.id ? 'active' : ''}`}
                    onClick={() => void pick(c)}
                  >
                    <img src={c.thumb} alt="" width={18} height={18} />
                    {c.name} <span className="text-muted text-uppercase">{c.symbol}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-muted fs-13">
            For pairs with no free live feed (e.g. EUR/USD) or your own asset. The price moves automatically from the starting price, and you can steer it with the
            price controls.
          </p>
        )}
        {(source === 'simulated' || coin) && (
          <Row className="g-2">
            <Col sm={4}>
              <label htmlFor="mk-symbol" className="form-label">
                Symbol
              </label>
              <input id="mk-symbol" className="form-control" placeholder="SOL/USD" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
            </Col>
            <Col sm={4}>
              <label htmlFor="mk-name" className="form-label">
                Name
              </label>
              <input id="mk-name" className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
            </Col>
            <Col sm={4}>
              <label htmlFor="mk-price" className="form-label">
                {source === 'live' ? 'Current price' : 'Starting price'}
              </label>
              <input id="mk-price" type="number" min="0" step="any" className="form-control" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Col>
          </Row>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="light" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!ready || busy} onClick={() => void add()}>
          Add market
        </Button>
      </ModalFooter>
    </Modal>
  )
}

const ManageMarkets = ({ onChanged }: { onChanged: () => void }) => {
  const { can } = usePermission()
  const canManage = can('market.manage')
  const { showNotification } = useNotificationContext()
  const [markets, setMarkets] = useState<MarketRow[] | null>(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('market_assets')
      .select('id, symbol, display_name, enabled, sort_order, price_source, coingecko_id, market_provider_state(effective_price)')
      .order('sort_order', { ascending: true })
    setMarkets((data ?? []) as MarketRow[])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const act = async (action: () => Promise<void>, success?: string) => {
    try {
      await action()
      if (success) showNotification({ message: success, variant: 'success' })
      await load()
      onChanged()
    } catch (err) {
      showNotification({ message: err instanceof Error ? err.message : 'That did not work.', variant: 'danger' })
    }
  }

  const update = async (m: MarketRow, changes: { enabled?: boolean; sort?: number }) => {
    const { error } = await supabase.rpc('admin_update_market_asset', {
      p_asset_id: m.id,
      p_enabled: changes.enabled ?? null,
      p_display_name: null,
      p_sort_order: changes.sort ?? null,
    })
    rpcError(error)
  }

  const move = (index: number, dir: -1 | 1) => {
    if (!markets) return
    const a = markets[index]
    const b = markets[index + dir]
    if (!b) return
    // Swap positions; fall back to index-based order if two share a number.
    const aSort = a.sort_order === b.sort_order ? index : a.sort_order
    const bSort = a.sort_order === b.sort_order ? index + dir : b.sort_order
    void act(async () => {
      await update(a, { sort: bSort })
      await update(b, { sort: aSort })
    })
  }

  const remove = (m: MarketRow) => {
    if (!window.confirm(`Remove ${m.symbol}? Its price history and overrides are deleted, and customers can no longer pick it.`)) return
    void act(async () => {
      const { error } = await supabase.rpc('admin_remove_market_asset', { p_asset_id: m.id })
      rpcError(error)
    }, `${m.symbol} removed.`)
  }

  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as="h4">Markets</CardTitle>
            <p className="text-muted mb-0 fs-12">The markets customers can pick on their dashboard, wallet and account pages, in this order. Switched-off markets are hidden.</p>
          </Col>
          {canManage && (
            <Col xs="auto">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding(true)}>
                Add market
              </button>
            </Col>
          )}
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Market</th>
                <th>Price source</th>
                <th className="text-end">Price</th>
                <th>Shown</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(markets ?? []).map((m, i) => (
                <tr key={m.id}>
                  <td>
                    <span className="fw-semibold">{m.symbol}</span> <span className="text-muted">{m.display_name}</span>
                  </td>
                  <td>
                    {m.price_source === 'live' ? (
                      <span className="badge bg-success-subtle text-success">Live · {m.coingecko_id}</span>
                    ) : (
                      <span className="badge bg-secondary-subtle text-secondary">Simulated</span>
                    )}
                  </td>
                  <td className="text-end">{fmtPrice(priceOf(m))}</td>
                  <td>
                    <FormCheck
                      type="switch"
                      aria-label={`Show ${m.symbol}`}
                      checked={m.enabled}
                      disabled={!canManage}
                      onChange={(e) => void act(() => update(m, { enabled: e.target.checked }))}
                    />
                  </td>
                  <td className="text-end text-nowrap">
                    {canManage && (
                      <>
                        <button type="button" className="btn btn-sm btn-light" aria-label={`Move ${m.symbol} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                          <IconifyIcon icon="iconoir:arrow-up" />
                        </button>{' '}
                        <button
                          type="button"
                          className="btn btn-sm btn-light"
                          aria-label={`Move ${m.symbol} down`}
                          disabled={i === (markets?.length ?? 0) - 1}
                          onClick={() => move(i, 1)}
                        >
                          <IconifyIcon icon="iconoir:arrow-down" />
                        </button>{' '}
                        <button type="button" className="btn btn-sm btn-outline-danger" aria-label={`Remove ${m.symbol}`} onClick={() => remove(m)}>
                          Remove
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
      {adding && (
        <AddMarketModal
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false)
            void load()
            onChanged()
          }}
        />
      )}
    </Card>
  )
}

export default ManageMarkets
