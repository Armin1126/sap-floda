import { useState, useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, Search } from 'lucide-react';
import { Card, Button } from '../../components/ui';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import { score, pct } from '../../utils/formatters';

export default function RankingsTable({ query, manifests }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'auto' | 'pending'

  const rawRows = query.data;
  const rows = useMemo(() => (Array.isArray(rawRows) ? rawRows : []), [rawRows]);

  const manifestMap = useMemo(
    () => new Map((manifests || []).map(manifest => [manifest.manifest_id, manifest])),
    [manifests]
  );

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const manifest = manifestMap.get(row.manifest_id);
      const commodity = (manifest?.commodity_type || '').toLowerCase();
      const manifestId = (row.manifest_id || '').toLowerCase();
      const matchesSearch = !searchTerm || commodity.includes(searchTerm.toLowerCase()) || manifestId.includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (filterType === 'auto') return row.allocated === 'Y';
      if (filterType === 'pending') return row.approval_status === 'pending' || row.allocated !== 'Y';
      return true;
    });
  }, [rows, manifestMap, searchTerm, filterType]);

  const auto = rows.filter(ranking => ranking.allocated === 'Y').length;
  const pending = rows.filter(r => r.approval_status === 'pending').length;

  if (query.status === 'pending' && query.data === undefined) {
    return (
      <Card className="card--rankings">
        <div className="card-title">
          <span className="card-title-label">
            <span className="title-icon-badge"><TrendingUp size={15} /></span>
            Fairness Rankings
          </span>
          <small className="badge-subtle">Live queue</small>
        </div>
        <LoadingState />
      </Card>
    );
  }

  if (query.status === 'error') {
    return (
      <Card className="card--rankings">
        <div className="card-title">
          <span className="card-title-label">
            <span className="title-icon-badge"><TrendingUp size={15} /></span>
            Fairness Rankings
          </span>
          <small className="badge-subtle">Error</small>
        </div>
        <div className="error-container">
          <p>Could not load rankings from OData service.</p>
          <Button onClick={query.refetch}>Retry Connection</Button>
        </div>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="card--rankings">
        <div className="card-title">
          <span className="card-title-label">
            <span className="title-icon-badge"><TrendingUp size={15} /></span>
            Fairness Rankings
          </span>
          <small className="badge-subtle">Live queue</small>
        </div>
        <EmptyState title="No active rankings" detail="Trigger a disruption scenario to evaluate allocations." />
      </Card>
    );
  }

  return (
    <Card className="card--rankings">
      <div className="card-title">
        <span className="card-title-label">
          <span className="title-icon-badge"><TrendingUp size={15} /></span>
          Fairness Rankings
        </span>
        <small className="badge-subtle">Live OData</small>
      </div>

      <div className="big-metric">
        <span className="metric-number">{rows.length}</span>
        <small className="metric-meta">manifests evaluated · {pct(auto / rows.length)} auto-executed</small>
      </div>

      <div className="spark">
        <ResponsiveContainer width="100%" height={64}>
          <LineChart data={rows} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <Line
              type="monotone"
              dataKey="composite_score"
              stroke="#059669"
              strokeWidth={2.2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mini-stats">
        <div className="stat-item">
          <b>{pending}</b>
          <span>Pending Review</span>
        </div>
        <div className="stat-item">
          <b>{rows.filter(r => r.requires_approval).length}</b>
          <span>Escalations Total</span>
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="table-controls-bar">
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filter by ID or cargo..."
          />
        </div>

        <div className="filter-chips">
          <button
            type="button"
            className={`filter-chip ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All ({rows.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${filterType === 'auto' ? 'active' : ''}`}
            onClick={() => setFilterType('auto')}
          >
            Auto ({auto})
          </button>
          <button
            type="button"
            className={`filter-chip ${filterType === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterType('pending')}
          >
            Pending ({pending})
          </button>
        </div>
      </div>

      <div className="table table-scroll">
        <div className="ranking-header">
          <span>Rank</span>
          <span>Manifest & Commodity</span>
          <span className="text-right">Score</span>
          <span className="text-right">Allocation</span>
        </div>
        {filteredRows.length ? (
          filteredRows.map(ranking => (
            <div className="ranking" key={ranking.ranking_id}>
              <b className="rank-num">#{ranking.priority_rank}</b>
              <span className="ranking-info">
                <strong>{manifestMap.get(ranking.manifest_id)?.commodity_type || 'Shipment'}</strong>
                <small>{ranking.manifest_id}</small>
              </span>
              <span className="score-val">{score(ranking.composite_score)}</span>
              <StatusBadge status={ranking.allocated === 'Y' ? 'Auto-Executed' : 'Pending Approval'} />
            </div>
          ))
        ) : (
          <div className="no-filter-match">No shipments match current filter criteria.</div>
        )}
      </div>
    </Card>
  );
}


