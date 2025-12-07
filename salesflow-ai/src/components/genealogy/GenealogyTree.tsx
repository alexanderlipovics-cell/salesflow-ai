import { useState, useEffect, useCallback } from 'react';
import { Network, Users, TrendingUp, Filter, Search, Loader2, AlertCircle } from 'lucide-react';
import { getDownlineTree, getDownlineStats, type DownlineTreeResponse, type DownlineMember } from '../../services/genealogyApi';
import { supabase } from '../../lib/supabase';

interface GenealogyTreeProps {
  userId?: string;
  companyName?: string;
  maxLevels?: number;
}

export default function GenealogyTree({ userId, companyName, maxLevels = 5 }: GenealogyTreeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<DownlineTreeResponse | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<DownlineMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRank, setFilterRank] = useState<string>('all');
  const [currentUserId, setCurrentUserId] = useState<string>(userId || '');

  useEffect(() => {
    if (!currentUserId) {
      loadCurrentUser();
    } else {
      loadTree();
      loadStats();
    }
  }, [currentUserId, companyName, maxLevels]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (err) {
      console.error('Error loading user:', err);
    }
  };

  const loadTree = async () => {
    if (!currentUserId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getDownlineTree(currentUserId, companyName, maxLevels);
      setTreeData(data);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Genealogy-Struktur');
      console.error('Error loading tree:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!currentUserId) return;
    
    try {
      const data = await getDownlineStats(currentUserId, companyName);
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const filterTree = useCallback((node: DownlineMember, query: string, rank: string): DownlineMember | null => {
    const matchesQuery = !query || 
      node.name?.toLowerCase().includes(query.toLowerCase()) ||
      node.rank?.toLowerCase().includes(query.toLowerCase());
    
    const matchesRank = rank === 'all' || node.rank === rank;
    
    if (!matchesQuery || !matchesRank) {
      return null;
    }
    
    const filteredChildren = node.children
      .map(child => filterTree(child, query, rank))
      .filter((child): child is DownlineMember => child !== null);
    
    return {
      ...node,
      children: filteredChildren,
    };
  }, []);

  const renderNode = (node: DownlineMember, level: number = 0): JSX.Element => {
    const filteredNode = filterTree(node, searchQuery, filterRank);
    if (!filteredNode) return <></>;
    
    const volume = filteredNode.monthly_pv + filteredNode.monthly_gv;
    const nodeSize = Math.max(60, Math.min(120, volume / 10));
    
    return (
      <div key={filteredNode.id} className="flex flex-col items-center">
        <div
          onClick={() => setSelectedNode(filteredNode)}
          className={`
            relative rounded-full border-2 transition-all cursor-pointer
            ${selectedNode?.id === filteredNode.id 
              ? 'border-salesflow-accent scale-110' 
              : 'border-white/20 hover:border-salesflow-accent/50'
            }
            ${filteredNode.is_active ? 'bg-salesflow-accent/20' : 'bg-gray-800/50'}
          `}
          style={{
            width: `${nodeSize}px`,
            height: `${nodeSize}px`,
          }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
            <div className="text-xs font-semibold text-white truncate w-full">
              {filteredNode.name || filteredNode.user_id.slice(0, 8)}
            </div>
            {filteredNode.rank && (
              <div className="text-[10px] text-gray-400 truncate w-full">
                {filteredNode.rank}
              </div>
            )}
            <div className="text-[10px] text-salesflow-accent font-semibold">
              {volume} PV
            </div>
          </div>
        </div>
        
        {filteredNode.children.length > 0 && (
          <div className="mt-4 flex gap-4">
            {filteredNode.children.map((child, idx) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Connection Line */}
                <div className="w-px h-4 bg-white/20 mb-2" />
                {renderNode(child, level + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getUniqueRanks = (node: DownlineMember): string[] => {
    const ranks = new Set<string>();
    if (node.rank) ranks.add(node.rank);
    
    const traverse = (n: DownlineMember) => {
      n.children.forEach(child => {
        if (child.rank) ranks.add(child.rank);
        traverse(child);
      });
    };
    
    traverse(node);
    return Array.from(ranks).sort();
  };

  if (loading) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-salesflow-accent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="h-6 w-6" />
          <div>
            <h3 className="font-semibold">Fehler beim Laden</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!treeData) {
    return (
      <div className="glass-panel p-6">
        <div className="text-center py-12 text-gray-500">
          <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Keine Genealogy-Daten gefunden</p>
          <p className="text-sm mt-2">Stelle sicher, dass Daten in mlm_downline_structure vorhanden sind</p>
        </div>
      </div>
    );
  }

  const uniqueRanks = getUniqueRanks(treeData.root);

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Network className="h-6 w-6 text-salesflow-accent" />
            <div>
              <h2 className="text-2xl font-semibold">Genealogy Tree</h2>
              <p className="text-sm text-gray-400">
                Downline-Struktur für {treeData.company_name}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="p-4 bg-black/20 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Total Members</div>
              <div className="text-2xl font-bold text-white">{treeData.total_members}</div>
            </div>
            <div className="p-4 bg-black/20 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Active</div>
              <div className="text-2xl font-bold text-green-400">{stats.stats.active_downline_count}</div>
            </div>
            <div className="p-4 bg-black/20 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Total Volume</div>
              <div className="text-2xl font-bold text-salesflow-accent">{treeData.total_volume} PV</div>
            </div>
            <div className="p-4 bg-black/20 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Levels</div>
              <div className="text-2xl font-bold text-white">{treeData.total_levels}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suche nach Name oder Rang..."
              className="w-full pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-salesflow-accent focus:outline-none"
            />
          </div>
          <select
            value={filterRank}
            onChange={(e) => setFilterRank(e.target.value)}
            className="px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-salesflow-accent focus:outline-none"
          >
            <option value="all">Alle Ränge</option>
            {uniqueRanks.map(rank => (
              <option key={rank} value={rank}>{rank}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tree Visualization */}
      <div className="glass-panel p-6">
        <div className="overflow-x-auto">
          <div className="flex justify-center min-w-full py-8">
            {renderNode(treeData.root)}
          </div>
        </div>
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="glass-panel p-6">
          <h3 className="text-xl font-semibold mb-4">Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Name</div>
              <div className="font-semibold text-white">{selectedNode.name || selectedNode.user_id}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Rang</div>
              <div className="font-semibold text-white">{selectedNode.rank || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Personal Volume</div>
              <div className="font-semibold text-salesflow-accent">{selectedNode.monthly_pv} PV</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Group Volume</div>
              <div className="font-semibold text-salesflow-accent">{selectedNode.monthly_gv} PV</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Downline Count</div>
              <div className="font-semibold text-white">{selectedNode.total_downline_count}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Active Downline</div>
              <div className="font-semibold text-green-400">{selectedNode.active_downline_count}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Level</div>
              <div className="font-semibold text-white">{selectedNode.level}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Status</div>
              <div className={`font-semibold ${selectedNode.is_active ? 'text-green-400' : 'text-red-400'}`}>
                {selectedNode.is_active ? 'Aktiv' : 'Inaktiv'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

