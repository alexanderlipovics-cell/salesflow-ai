/**
 * TEAM-CHIEF Validation & Quality Metrics
 * Input/output validation and quality scoring for AI coaching
 */
import { TeamChiefInput, TeamChiefOutput } from '../types/teamChief';

// Input Validation
export function validateInput(input: TeamChiefInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check leader
  if (!input.leader?.user_id || !input.leader?.name) {
    errors.push('Leader data incomplete');
  }

  // Check squad
  if (!input.squad?.id || !input.squad?.name) {
    errors.push('Squad data incomplete');
  }

  // Check challenge
  if (!input.challenge?.id || !input.challenge?.title) {
    errors.push('Challenge data incomplete');
  }

  // Check dates
  const start = new Date(input.challenge?.start_date);
  const end = new Date(input.challenge?.end_date);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    errors.push('Invalid challenge dates');
  } else if (end <= start) {
    errors.push('Challenge end_date must be after start_date');
  }

  // Check leaderboard
  if (!Array.isArray(input.leaderboard) || input.leaderboard.length === 0) {
    errors.push('Leaderboard must have at least one entry');
  }

  // Check member_stats
  if (!Array.isArray(input.member_stats) || input.member_stats.length === 0) {
    errors.push('Member stats must have at least one entry');
  }

  // Check summary consistency
  const calculatedPoints = input.member_stats.reduce((sum, m) => sum + m.points, 0);
  if (Math.abs(calculatedPoints - input.summary.total_points) > 10) {
    errors.push(
      `Summary total_points (${input.summary.total_points}) doesn't match calculated (${calculatedPoints})`
    );
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Output Schema Validation
export function validateOutput(output: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  const requiredFields = [
    'summary',
    'highlights',
    'risks',
    'priorities',
    'coaching_actions',
    'celebrations',
    'suggested_messages'
  ];

  for (const field of requiredFields) {
    if (!(field in output)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check arrays
  if (!Array.isArray(output.highlights) || output.highlights.length === 0) {
    errors.push('highlights must be non-empty array');
  }

  if (!Array.isArray(output.risks)) {
    errors.push('risks must be array');
  }

  if (!Array.isArray(output.priorities) || output.priorities.length === 0) {
    errors.push('priorities must be non-empty array');
  }

  if (!Array.isArray(output.coaching_actions)) {
    errors.push('coaching_actions must be array');
  }

  // Check coaching_actions structure
  if (Array.isArray(output.coaching_actions)) {
    output.coaching_actions.forEach((action: any, i: number) => {
      if (!action.target_type || !action.target_name || !action.suggested_action) {
        errors.push(`coaching_actions[${i}] missing required fields`);
      }
    });
  }

  // Check suggested_messages
  if (!output.suggested_messages?.to_squad) {
    errors.push('suggested_messages.to_squad missing');
  }

  if (!output.suggested_messages?.to_underperformer_template) {
    errors.push('suggested_messages.to_underperformer_template missing');
  }

  if (!output.suggested_messages?.to_top_performer_template) {
    errors.push('suggested_messages.to_top_performer_template missing');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Quality Scoring
export function scoreOutput(output: TeamChiefOutput): {
  score: number;
  breakdown: Record<string, number>;
  feedback: string[];
} {
  const feedback: string[] = [];
  const breakdown: Record<string, number> = {};

  // Summary quality (0-20 points)
  let summaryScore = 0;
  if (output.summary.length > 50 && output.summary.length < 300) {
    summaryScore = 20;
  } else if (output.summary.length < 50) {
    summaryScore = 10;
    feedback.push('Summary zu kurz');
  } else {
    summaryScore = 15;
    feedback.push('Summary zu lang');
  }
  breakdown.summary = summaryScore;

  // Highlights (0-15 points)
  let highlightsScore = 0;
  if (output.highlights.length >= 2 && output.highlights.length <= 4) {
    highlightsScore = 15;
  } else {
    highlightsScore = 10;
    feedback.push(`Highlights: ${output.highlights.length} (ideal: 2-4)`);
  }
  breakdown.highlights = highlightsScore;

  // Risks (0-15 points)
  let risksScore = 0;
  if (output.risks.length >= 1 && output.risks.length <= 4) {
    risksScore = 15;
  } else if (output.risks.length === 0) {
    risksScore = 5;
    feedback.push('Keine Risks identifiziert');
  } else {
    risksScore = 10;
  }
  breakdown.risks = risksScore;

  // Priorities (0-15 points)
  let prioritiesScore = 0;
  if (output.priorities.length >= 2 && output.priorities.length <= 4) {
    prioritiesScore = 15;
  } else {
    prioritiesScore = 10;
    feedback.push(`Priorities: ${output.priorities.length} (ideal: 2-4)`);
  }
  breakdown.priorities = prioritiesScore;

  // Coaching Actions (0-20 points)
  let actionsScore = 0;
  if (output.coaching_actions.length >= 2 && output.coaching_actions.length <= 5) {
    actionsScore = 20;
    // Bonus for variety in tone_hint
    const tones = new Set(output.coaching_actions.map(a => a.tone_hint));
    if (tones.size >= 2) {
      actionsScore += 5;
      feedback.push('✅ Gute Tonvielfalt in Coaching Actions');
    }
  } else {
    actionsScore = 12;
  }
  breakdown.coaching_actions = Math.min(actionsScore, 20);

  // Messages (0-15 points)
  let messagesScore = 0;
  const { to_squad, to_underperformer_template, to_top_performer_template } = output.suggested_messages;
  
  if (to_squad && to_squad.length > 50 && to_squad.length < 400) {
    messagesScore += 5;
  } else {
    feedback.push('Squad message length nicht optimal');
  }
  
  if (to_underperformer_template && to_underperformer_template.includes('[Name]')) {
    messagesScore += 5;
  } else {
    feedback.push('Underperformer template fehlt [Name] placeholder');
  }
  
  if (to_top_performer_template && to_top_performer_template.includes('[Name]')) {
    messagesScore += 5;
  } else {
    feedback.push('Top performer template fehlt [Name] placeholder');
  }
  
  breakdown.messages = messagesScore;

  const totalScore = Object.values(breakdown).reduce((sum, s) => sum + s, 0);

  return {
    score: totalScore,
    breakdown,
    feedback
  };
}

