// ====================================================================
// TEMPLATE PERFORMANCE DASHBOARD - REACT COMPONENT
// ====================================================================
// Use in Cursor: Kopiere diesen Code als Basis

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TemplatePerformance {
  template_id: string;
  company_name: string;
  open_rate: number;
  response_rate: number;
  conversion_rate: number;
  performance_score: number;
  times_used: number;
  times_converted: number;
}

export function TemplatePerformanceDashboard({ userId }: { userId: string }) {
  const [templates, setTemplates] = useState<TemplatePerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplatePerformance();
  }, [userId]);

  async function fetchTemplatePerformance() {
    const { data, error } = await supabase
      .from('template_performance')
      .select('*')
      .eq('user_id', userId)
      .order('performance_score', { ascending: false })
      .limit(10);

    if (data) setTemplates(data);
    setLoading(false);
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Your Template Performance</h2>
      
      {/* Performance Chart */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
        <BarChart width={600} height={300} data={templates}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="template_id" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="open_rate" fill="#8884d8" name="Open Rate %" />
          <Bar dataKey="response_rate" fill="#82ca9d" name="Response Rate %" />
          <Bar dataKey="conversion_rate" fill="#ffc658" name="Conversion Rate %" />
        </BarChart>
      </div>

      {/* Templates Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uses</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {templates.map((template) => (
              <tr key={template.template_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {template.template_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {template.company_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    template.performance_score >= 70 ? 'bg-green-100 text-green-800' :
                    template.performance_score >= 40 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {template.performance_score}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {template.times_used}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {template.times_converted}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 AI Recommendations</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          {templates.length > 0 && templates[0].performance_score > 70 && (
            <li>✅ Your "{templates[0].template_id}" template is performing great! Use it more often.</li>
          )}
          {templates.some(t => t.conversion_rate < 10) && (
            <li>⚠️ Some templates have low conversion. Try A/B testing different variations.</li>
          )}
          <li>📊 Platform average conversion rate: 15%. You're at {Math.round(templates.reduce((acc, t) => acc + t.conversion_rate, 0) / templates.length)}%</li>
        </ul>
      </div>
    </div>
  );
}

// ====================================================================
// SUCCESS STORIES FEED - REACT COMPONENT
// ====================================================================

interface SuccessStory {
  id: string;
  company_name: string;
  story_title: string;
  story_text: string;
  achievement_type: string;
  timeframe_months: number;
  metrics: any;
  location_country: string;
  likes_count: number;
  views_count: number;
  featured: boolean;
}

export function SuccessStoriesFeed({ companyName }: { companyName?: string }) {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchSuccessStories();
  }, [companyName, filter]);

  async function fetchSuccessStories() {
    let query = supabase
      .from('company_success_stories')
      .select('*')
      .eq('verified', true)
      .order('likes_count', { ascending: false });

    if (companyName) {
      query = query.eq('company_name', companyName);
    }

    if (filter !== 'all') {
      query = query.eq('achievement_type', filter);
    }

    const { data } = await query.limit(20);
    if (data) setStories(data);
  }

  async function handleLike(storyId: string) {
    await supabase.rpc('increment_story_likes', { story_id: storyId });
    fetchSuccessStories(); // Refresh
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Success Stories</h2>
        <select 
          className="border rounded px-3 py-2"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="rank_advancement">Rank Advancement</option>
          <option value="income_milestone">Income Milestone</option>
          <option value="team_growth">Team Growth</option>
          <option value="product_results">Product Results</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map((story) => (
          <div key={story.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
            {story.featured && (
              <div className="bg-yellow-400 text-yellow-900 px-3 py-1 text-xs font-semibold">
                ⭐ FEATURED
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-600">{story.company_name}</span>
                <span className="text-xs text-gray-500">{story.location_country}</span>
              </div>
              
              <h3 className="font-bold text-lg mb-2">{story.story_title}</h3>
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {story.story_text}
              </p>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4 text-gray-500">
                  <span>⏱ {story.timeframe_months} months</span>
                  <span>👁 {story.views_count}</span>
                </div>
                
                <button
                  onClick={() => handleLike(story.id)}
                  className="flex items-center space-x-1 text-red-500 hover:text-red-600"
                >
                  <span>❤️</span>
                  <span>{story.likes_count}</span>
                </button>
              </div>

              {story.metrics && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {story.metrics.rank && (
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        Rank: {story.metrics.rank}
                      </span>
                    )}
                    {story.metrics.monthly_income && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                        €{story.metrics.monthly_income}/mo
                      </span>
                    )}
                    {story.metrics.team_size && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Team: {story.metrics.team_size}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ====================================================================
// COMMUNITY POSTS FEED - REACT COMPONENT
// ====================================================================

interface CommunityPost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  post_type: string;
  category: string;
  tags: string[];
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export function CommunityFeed() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [sortBy, setSortBy] = useState<'latest' | 'hot' | 'top'>('latest');

  useEffect(() => {
    fetchPosts();
  }, [sortBy]);

  async function fetchPosts() {
    let query = supabase
      .from('community_posts')
      .select('*');

    if (sortBy === 'latest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'hot') {
      query = query.order('comments_count', { ascending: false });
    } else {
      query = query.order('likes_count', { ascending: false });
    }

    const { data } = await query.limit(20);
    if (data) setPosts(data);
  }

  const postTypeEmoji = {
    question: '❓',
    tip: '💡',
    success: '🎉',
    challenge: '🎯',
    discussion: '💬',
    resource: '📚'
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Community</h2>
        <div className="flex space-x-2">
          {(['latest', 'hot', 'top'] as const).map((sort) => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={`px-4 py-2 rounded ${
                sortBy === sort
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {sort.charAt(0).toUpperCase() + sort.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">{postTypeEmoji[post.post_type as keyof typeof postTypeEmoji]}</span>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase">{post.category}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className="font-bold text-lg mb-2">{post.title}</h3>
                
                <p className="text-gray-700 mb-3 line-clamp-2">{post.content}</p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>👁 {post.views_count} views</span>
                  <span>❤️ {post.likes_count} likes</span>
                  <span>💬 {post.comments_count} comments</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
