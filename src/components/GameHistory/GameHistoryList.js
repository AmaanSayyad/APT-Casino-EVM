import React, { useState, useEffect } from 'react';
import { RefreshCw, Filter, Download, TrendingUp, TrendingDown, Eye, EyeOff } from 'lucide-react';
import GameHistoryCard from './GameHistoryCard';

/**
 * Game History List Component
 * Displays user's game history with VRF transaction details
 */
const GameHistoryList = ({ userAddress }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    gameType: 'all',
    includeVrfDetails: true
  });
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    hasMore: false
  });

  // Fetch game history
  const fetchHistory = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        userAddress,
        limit: pagination.limit.toString(),
        offset: reset ? '0' : pagination.offset.toString(),
        includeVrfDetails: filters.includeVrfDetails.toString()
      });

      if (filters.gameType !== 'all') {
        params.append('gameType', filters.gameType);
      }

      const response = await fetch(`/api/games/history?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch game history');
      }

      if (reset) {
        setGames(data.data.games);
        setPagination(prev => ({ ...prev, offset: 0 }));
      } else {
        setGames(prev => [...prev, ...data.data.games]);
      }

      setStats(data.data.stats);
      setPagination(prev => ({
        ...prev,
        hasMore: data.data.pagination.hasMore,
        offset: reset ? data.data.games.length : prev.offset + data.data.games.length
      }));

    } catch (err) {
      console.error('Failed to fetch game history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load more games
  const loadMore = () => {
    if (!loading && pagination.hasMore) {
      fetchHistory(false);
    }
  };

  // Refresh history
  const refresh = () => {
    fetchHistory(true);
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Reset pagination and fetch new data
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  // Export history as CSV
  const exportHistory = () => {
    if (games.length === 0) return;

    const csvData = games.map(game => ({
      Date: new Date(game.createdAt).toISOString(),
      Game: game.gameType,
      'Bet Amount (ETH)': (parseFloat(game.betAmount || 0) / 1e18).toFixed(6),
      'Payout (ETH)': (parseFloat(game.payoutAmount || 0) / 1e18).toFixed(6),
      'Profit/Loss (ETH)': (parseFloat(game.profitLoss || 0) / 1e18).toFixed(6),
      Multiplier: game.multiplier.toFixed(2),
      Result: game.isWin ? 'WIN' : 'LOSS',
      'VRF Transaction': game.vrfDetails?.transactionHash || 'N/A',
      'Block Number': game.vrfDetails?.blockNumber || 'N/A'
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-history-${userAddress.slice(0, 8)}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Initial load and filter changes
  useEffect(() => {
    if (userAddress) {
      fetchHistory(true);
    }
  }, [userAddress, filters]);

  if (!userAddress) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Connect your wallet to view game history</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Game History</h2>
          <p className="text-gray-600">
            Your provably fair gaming history with VRF verification
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          
          {games.length > 0 && (
            <button
              onClick={exportHistory}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={16} />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🎮</span>
              <span className="text-sm text-gray-600">Total Games</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalGames}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">💰</span>
              <span className="text-sm text-gray-600">Total Wagered</span>
            </div>
            <p className="text-2xl font-bold">
              {(parseFloat(stats.totalWagered) / 1e18).toFixed(4)} ETH
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              {parseFloat(stats.totalProfit) >= 0 ? (
                <TrendingUp className="text-green-600" size={20} />
              ) : (
                <TrendingDown className="text-red-600" size={20} />
              )}
              <span className="text-sm text-gray-600">Total P&L</span>
            </div>
            <p className={`text-2xl font-bold ${
              parseFloat(stats.totalProfit) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {parseFloat(stats.totalProfit) >= 0 ? '+' : ''}
              {(parseFloat(stats.totalProfit) / 1e18).toFixed(4)} ETH
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📊</span>
              <span className="text-sm text-gray-600">Win Rate</span>
            </div>
            <p className="text-2xl font-bold">{stats.winRate}%</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={16} />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <select
            value={filters.gameType}
            onChange={(e) => handleFilterChange('gameType', e.target.value)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="all">All Games</option>
            <option value="ROULETTE">Roulette</option>
            <option value="MINES">Mines</option>
            <option value="PLINKO">Plinko</option>
            <option value="WHEEL">Wheel</option>
          </select>
          
          <button
            onClick={() => handleFilterChange('includeVrfDetails', !filters.includeVrfDetails)}
            className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${
              filters.includeVrfDetails 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {filters.includeVrfDetails ? <Eye size={14} /> : <EyeOff size={14} />}
            VRF Details
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">❌ {error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Games List */}
      <div className="space-y-4">
        {games.map((game) => (
          <GameHistoryCard
            key={game.id}
            game={game}
            showVrfDetails={filters.includeVrfDetails}
          />
        ))}
      </div>

      {/* Loading State */}
      {loading && games.length === 0 && (
        <div className="text-center py-8">
          <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-gray-500">Loading game history...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && games.length === 0 && !error && (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">🎮</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No games played yet
          </h3>
          <p className="text-gray-500 mb-4">
            Start playing to see your provably fair game history here
          </p>
        </div>
      )}

      {/* Load More */}
      {!loading && pagination.hasMore && (
        <div className="text-center mt-6">
          <button
            onClick={loadMore}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Load More Games
          </button>
        </div>
      )}

      {/* VRF Info */}
      {filters.includeVrfDetails && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">
            🔒 About VRF Verification
          </h4>
          <p className="text-blue-800 text-sm">
            All game results are generated using Chainlink VRF (Verifiable Random Function), 
            ensuring provably fair outcomes. Each transaction hash can be verified on the 
            Ethereum blockchain to confirm the randomness was generated fairly.
          </p>
        </div>
      )}
    </div>
  );
};

export default GameHistoryList;