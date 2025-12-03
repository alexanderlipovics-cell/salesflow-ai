import React, { useState } from 'react';
import { supabaseClient } from '../lib/supabaseClient';
import { NetworkGraphData } from '../../types/v2';
import { Network, Search, Users, Link2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const NetworkGraphPage: React.FC = () => {
  const [graphData, setGraphData] = useState<NetworkGraphData | null>(null);
  const [, setSelectedLeadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const loadGraph = async (leadId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient.rpc('get_network_graph', {
        p_lead_id: leadId,
      });

      if (error) throw error;
      setGraphData(data);
      setSelectedLeadId(leadId);
    } catch (err) {
      console.error('Error loading network graph:', err);
      // Fallback: Mock data for demo
      setGraphData({
        center_lead: {
          id: leadId,
          name: 'Demo Lead',
          status: 'warm',
        },
        connections: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hot': return 'bg-red-500';
      case 'warm': return 'bg-orange-500';
      case 'cold': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'family': return 'text-pink-400';
      case 'colleague': return 'text-blue-400';
      case 'friend': return 'text-green-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Network className="h-10 w-10 text-blue-400" />
            Network Graph
          </h1>
          <p className="text-slate-400">Visualisiere Beziehungen zwischen Leads</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Lead-ID oder Name suchen..."
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => searchQuery && loadGraph(searchQuery)}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition-all"
          >
            Graph laden
          </button>
        </div>

        {loading && (
          <div className="text-center py-12 text-slate-400">Lade Graph...</div>
        )}

        {graphData && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Graph Canvas */}
            <div className="lg:col-span-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 min-h-[600px] relative overflow-hidden">
                {/* Center Node */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
                >
                  <div className={`${getStatusColor(graphData.center_lead.status)} rounded-full w-24 h-24 flex items-center justify-center text-white font-bold shadow-lg border-4 border-white`}>
                    {graphData.center_lead.name.charAt(0)}
                  </div>
                  <div className="text-center mt-2 text-sm font-semibold">
                    {graphData.center_lead.name}
                  </div>
                </motion.div>

                {/* Connection Nodes */}
                {graphData.connections.map((connection, index) => {
                  const angle = (index * 360) / graphData.connections.length;
                  const radius = 200;
                  const x = Math.cos((angle * Math.PI) / 180) * radius;
                  const y = Math.sin((angle * Math.PI) / 180) * radius;

                  return (
                    <motion.div
                      key={connection.lead.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="absolute"
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {/* Connection Line */}
                      <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ width: '100vw', height: '100vh', left: `-${window.innerWidth / 2}px`, top: `-${window.innerHeight / 2}px` }}
                      >
                        <line
                          x1="50%"
                          y1="50%"
                          x2={`${50 + (x / window.innerWidth) * 100}%`}
                          y2={`${50 + (y / window.innerHeight) * 100}%`}
                          stroke={connection.connection_strength > 70 ? '#10b981' : connection.connection_strength > 40 ? '#f59e0b' : '#6b7280'}
                          strokeWidth={connection.connection_strength / 20}
                          opacity={0.5}
                        />
                      </svg>

                      <div
                        onClick={() => loadGraph(connection.lead.id)}
                        className={`${getStatusColor(connection.lead.status)} rounded-full w-16 h-16 flex items-center justify-center text-white font-bold shadow-lg border-2 border-white cursor-pointer hover:scale-110 transition-transform`}
                      >
                        {connection.lead.name.charAt(0)}
                      </div>
                      <div className="text-center mt-1 text-xs">
                        {connection.lead.name}
                      </div>
                    </motion.div>
                  );
                })}

                {graphData.connections.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Keine Verbindungen gefunden</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sticky top-4">
                <h3 className="text-xl font-bold mb-4">Zentrale Lead</h3>
                <div className="mb-6">
                  <div className={`${getStatusColor(graphData.center_lead.status)} rounded-lg p-4 mb-2`}>
                    <div className="font-bold text-white">{graphData.center_lead.name}</div>
                    <div className="text-sm text-white/80 capitalize">{graphData.center_lead.status}</div>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-4">Verbindungen ({graphData.connections.length})</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {graphData.connections.map((connection) => (
                    <div
                      key={connection.lead.id}
                      onClick={() => loadGraph(connection.lead.id)}
                      className="bg-slate-800 rounded-lg p-3 cursor-pointer hover:bg-slate-700 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">{connection.lead.name}</div>
                        <div className={`text-xs px-2 py-1 rounded ${getStatusColor(connection.lead.status)} text-white`}>
                          {connection.lead.status}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Link2 className="h-4 w-4" />
                        <span className={getRelationshipColor(connection.relationship_type)}>
                          {connection.relationship_type}
                        </span>
                        <span className="ml-auto">{connection.connection_strength}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <h4 className="text-sm font-semibold mb-3">Legende</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span>Hot Lead</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full" />
                      <span>Warm Lead</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span>Cold Lead</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!graphData && !loading && (
          <div className="text-center py-12 text-slate-400">
            <Network className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Gib eine Lead-ID ein, um den Network Graph zu laden</p>
          </div>
        )}
      </div>
    </div>
  );
};

