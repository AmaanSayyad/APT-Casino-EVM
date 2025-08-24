import React from 'react';
import { ExternalLink, CheckCircle, XCircle, Hash, Clock, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Game History Card Component
 * Displays individual game result with VRF transaction hash
 */
const GameHistoryCard = ({ game, showVrfDetails = true }) => {
  const formatAmount = (amount) => {
    if (!amount) return '0';
    const eth = parseFloat(amount) / 1e18;
    return eth.toFixed(6);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getGameIcon = (gameType) => {
    const icons = {
      ROULETTE: '🎰',
      MINES: '💣',
      PLINKO: '🏀',
      WHEEL: '🎡'
    };
    return icons[gameType] || '🎮';
  };

  const getGameResultDisplay = (gameType, resultData) => {
    switch (gameType) {
      case 'ROULETTE':
        return (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{resultData.number}</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              resultData.color === 'red' ? 'bg-red-100 text-red-800' :
              resultData.color === 'black' ? 'bg-gray-100 text-gray-800' :
              'bg-green-100 text-green-800'
            }`}>
              {resultData.color?.toUpperCase()}
            </span>
          </div>
        );
      
      case 'MINES':
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {resultData.hitMine ? '💥 Hit Mine' : '✅ Safe'}
            </span>
            <span className="text-xs text-gray-500">
              {resultData.totalMines} mines
            </span>
          </div>
        );
      
      case 'PLINKO':
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">Slot {resultData.finalSlot}</span>
            <span className="text-xs text-gray-500">
              {resultData.rows} rows
            </span>
          </div>
        );
      
      case 'WHEEL':
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">Segment {resultData.segment}</span>
            <span className="text-xs text-gray-500">
              {resultData.multiplier}x
            </span>
          </div>
        );
      
      default:
        return <span className="text-sm text-gray-500">Game result</span>;
    }
  };

  const isWin = game.isWin;
  const profitLoss = parseFloat(game.profitLoss || 0);

  return (
    <div className={`bg-white rounded-lg border-2 p-4 transition-all hover:shadow-md ${
      isWin ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getGameIcon(game.gameType)}</span>
          <div>
            <h3 className="font-semibold text-gray-900">
              {game.gameType.charAt(0) + game.gameType.slice(1).toLowerCase()}
            </h3>
            <p className="text-xs text-gray-500">
              {formatDate(game.createdAt)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isWin ? (
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp size={16} />
              <CheckCircle size={16} />
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600">
              <TrendingDown size={16} />
              <XCircle size={16} />
            </div>
          )}
        </div>
      </div>

      {/* Game Result */}
      <div className="mb-3 p-3 bg-white rounded border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Result</p>
            {getGameResultDisplay(game.gameType, game.resultData)}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Multiplier</p>
            <span className={`font-bold ${
              game.multiplier > 1 ? 'text-green-600' : 'text-red-600'
            }`}>
              {game.multiplier.toFixed(2)}x
            </span>
          </div>
        </div>
      </div>

      {/* Bet Details */}
      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
        <div>
          <p className="text-gray-600">Bet Amount</p>
          <p className="font-semibold">{formatAmount(game.betAmount)} ETH</p>
        </div>
        <div>
          <p className="text-gray-600">Payout</p>
          <p className="font-semibold">{formatAmount(game.payoutAmount)} ETH</p>
        </div>
        <div>
          <p className="text-gray-600">Profit/Loss</p>
          <p className={`font-semibold ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {profitLoss >= 0 ? '+' : ''}{formatAmount(game.profitLoss)} ETH
          </p>
        </div>
      </div>

      {/* VRF Details */}
      {showVrfDetails && game.vrfDetails && (
        <div className="border-t pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Hash size={16} className="text-blue-600" />
            <span className="text-sm font-medium text-gray-700">
              Chainlink VRF Verification
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Verifiable
            </span>
          </div>
          
          <div className="space-y-2 text-sm">
            {/* Transaction Hash */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Transaction:</span>
              <div className="flex items-center gap-2">
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {game.vrfDetails.transactionHash?.slice(0, 10)}...{game.vrfDetails.transactionHash?.slice(-8)}
                </code>
                <a
                  href={game.vrfDetails.etherscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  title="View on Etherscan"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Block Number */}
            {game.vrfDetails.blockNumber && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Block:</span>
                <span className="font-mono text-xs">
                  #{game.vrfDetails.blockNumber}
                </span>
              </div>
            )}

            {/* VRF Value */}
            {game.vrfDetails.vrfValue && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">VRF Value:</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {game.vrfDetails.vrfValue.toString().slice(0, 12)}...
                </code>
              </div>
            )}

            {/* Fulfillment Time */}
            {game.vrfDetails.fulfilledAt && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Fulfilled:</span>
                <div className="flex items-center gap-1 text-xs">
                  <Clock size={12} />
                  {formatDate(game.vrfDetails.fulfilledAt)}
                </div>
              </div>
            )}
          </div>

          {/* Verification Note */}
          <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
            <p className="font-medium mb-1">🔒 Provably Fair</p>
            <p>
              This result was generated using Chainlink VRF (Verifiable Random Function). 
              Click the transaction hash to verify the randomness on-chain.
            </p>
          </div>
        </div>
      )}

      {/* Game ID for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 pt-2 border-t text-xs text-gray-400">
          Game ID: {game.id}
        </div>
      )}
    </div>
  );
};

export default GameHistoryCard;