import Voice from '@react-native-voice/voice';
import { apiClient } from '../api/client';
import type {
  SearchQuery,
  SearchResult,
  SearchResponse,
  SavedSearch,
  AdvancedFilters,
  SearchHistoryEntry,
} from '../types/search';

interface SaveSearchPayload {
  name: string;
  query: string;
  filters?: AdvancedFilters;
  sort_by?: SearchQuery['sort_by'];
  sort_order?: SearchQuery['sort_order'];
}

export class SearchService {
  static async search(workspaceId: string, query: SearchQuery): Promise<SearchResponse> {
    const body = {
      workspace_id: workspaceId,
      query: query.query,
      filters: query.filters,
      sort_by: query.sort_by ?? 'relevance',
      sort_order: query.sort_order ?? 'desc',
      page: query.page ?? 1,
      page_size: query.page_size ?? 50,
    };

    const response = await apiClient<SearchResponse>('/api/search', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Fire and forget history logging
    this.logSearch(workspaceId, query.query, response.results.length).catch(() => null);

    return response;
  }

  static async startVoiceSearch(locale: string = 'de-DE'): Promise<string> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        Voice.destroy().then(Voice.removeAllListeners);
      };

      Voice.onSpeechResults = event => {
        cleanup();
        const text = event.value?.[0] ?? '';
        resolve(text);
      };

      Voice.onSpeechError = error => {
        cleanup();
        reject(new Error(error.error?.message ?? 'Transkription fehlgeschlagen'));
      };

      Voice.start(locale).catch(err => {
        cleanup();
        reject(err);
      });
    });
  }

  static stopVoiceSearch() {
    Voice.stop();
  }

  static async logSearch(
    workspaceId: string,
    query: string,
    resultsCount: number,
    clickedResultId?: string
  ): Promise<void> {
    try {
      await apiClient('/api/search/history', {
        method: 'POST',
        body: JSON.stringify({
          workspace_id: workspaceId,
          query,
          results_count: resultsCount,
          clicked_result_id: clickedResultId,
        }),
      });
    } catch (error) {
      console.warn('[SearchService] Failed to log search', error);
    }
  }

  static async getSearchHistory(workspaceId?: string, limit: number = 10): Promise<SearchHistoryEntry[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (workspaceId) params.append('workspace_id', workspaceId);

    const response = await apiClient<SearchHistoryEntry[] | { history: SearchHistoryEntry[] }>(
      `/api/search/history?${params.toString()}`
    );

    if (Array.isArray(response)) {
      return response;
    }

    return response.history ?? [];
  }

  static async saveSearch(workspaceId: string, payload: SaveSearchPayload): Promise<SavedSearch> {
    return apiClient<SavedSearch>('/api/search/saved', {
      method: 'POST',
      body: JSON.stringify({
        workspace_id: workspaceId,
        ...payload,
      }),
    });
  }

  static async getSavedSearches(workspaceId: string): Promise<SavedSearch[]> {
    const response = await apiClient<{ searches: SavedSearch[] }>(
      `/api/search/saved?workspace_id=${workspaceId}`
    );
    return response.searches;
  }

  static async deleteSavedSearch(id: string): Promise<void> {
    await apiClient(`/api/search/saved/${id}`, { method: 'DELETE' });
  }

  static async getSuggestions(workspaceId: string, query: string): Promise<string[]> {
    if (query.trim().length < 2) {
      return [];
    }

    const response = await apiClient<{ suggestions: string[] }>(
      `/api/search/suggestions?workspace_id=${workspaceId}&q=${encodeURIComponent(query)}`
    );

    return response.suggestions;
  }
}

