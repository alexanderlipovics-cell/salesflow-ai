import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { HunterTask } from '../types/database';
import { logger } from '../utils/logger';

export const useHunterTasks = () => {
  return useQuery({
    queryKey: ['hunter-tasks'], // Eindeutiger Key für den Cache
    queryFn: async () => {
      logger.debug('Fetching Hunter Tasks...');
      
      const { data, error } = await supabase
        .from('lead_tasks')
        .select(`
          *,
          lead:leads (*)
        `)
        .eq('task_type', 'hunter') // Nur Hunter Tasks
        .eq('status', 'open')      // Nur offene Tasks
        .order('due_at', { ascending: true });

      if (error) {
        logger.error('Error fetching Hunter tasks', error);
        throw error;
      }
      
      return data as HunterTask[];
    },
  });
};

