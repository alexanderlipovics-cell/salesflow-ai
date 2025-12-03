/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - PERSONALITY SYSTEM TESTS                                 ║
 * ║  Tests für DISG-Analyse, Contact Plans und No-Lead-Left-Behind            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * Ausführen mit:
 * node src/tests/personality-system.test.js
 */

// ═══════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════

import {
  quickDiscEstimate,
  DISC_ANALYZER_SYSTEM_PROMPT,
} from '../prompts/disc-analyzer.js';

import {
  getQuickFollowUpTemplate,
  suggestNextContactTiming,
} from '../prompts/followup-generator.js';

import {
  DISC_DESCRIPTIONS,
  DECISION_STATE_CONFIG,
  getDominantStyle,
  getPlanUrgency,
  formatNextContactDate,
} from '../types/personality.js';

// ═══════════════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }
}

function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} Expected: ${expected}, Got: ${actual}`);
  }
}

function assertInRange(value, min, max, message = '') {
  if (value < min || value > max) {
    throw new Error(`${message} Value ${value} not in range [${min}, ${max}]`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DISG ANALYZER TESTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 DISG Analyzer Tests\n');

test('quickDiscEstimate returns valid scores for empty messages', () => {
  const result = quickDiscEstimate([]);
  
  assertEqual(result.disc_d, 0.25, 'D score');
  assertEqual(result.disc_i, 0.25, 'I score');
  assertEqual(result.disc_s, 0.25, 'S score');
  assertEqual(result.disc_g, 0.25, 'G score');
  assertEqual(result.dominant_style, 'S', 'Dominant style default');
  assertEqual(result.confidence, 0.1, 'Confidence');
});

test('quickDiscEstimate detects D-type from short direct messages', () => {
  const messages = [
    { from: 'lead', text: 'Ja, machen wir.' },
    { from: 'lead', text: 'Was bringt mir das?' },
    { from: 'lead', text: 'Ok.' },
  ];
  
  const result = quickDiscEstimate(messages);
  
  assert(result.disc_d > result.disc_i, 'D should be higher than I');
  assert(result.disc_d > result.disc_s, 'D should be higher than S');
  assertEqual(result.dominant_style, 'D', 'Should detect D-type');
});

test('quickDiscEstimate detects I-type from enthusiastic messages', () => {
  const messages = [
    { from: 'lead', text: 'Das klingt super! 😊' },
    { from: 'lead', text: 'Wow, das ist ja spannend! Erzähl mir mehr!! 🎉' },
    { from: 'lead', text: 'Ich bin total begeistert!' },
  ];
  
  const result = quickDiscEstimate(messages);
  
  assert(result.disc_i > 0.3, 'I score should be significant');
  assertEqual(result.dominant_style, 'I', 'Should detect I-type');
});

test('quickDiscEstimate detects S-type from cautious messages', () => {
  const messages = [
    { from: 'lead', text: 'Danke für die Info, bitte lass mir etwas Zeit.' },
    { from: 'lead', text: 'Ich weiß noch nicht genau... vielleicht.' },
    { from: 'lead', text: 'Liebe Grüße und danke!' },
  ];
  
  const result = quickDiscEstimate(messages);
  
  assert(result.disc_s > 0.2, 'S score should be significant');
});

test('quickDiscEstimate detects G-type from analytical messages', () => {
  const messages = [
    { from: 'lead', text: 'Wie genau funktioniert das technisch? Gibt es Daten dazu?' },
    { from: 'lead', text: 'Welche Studien belegen das? Ich brauche mehr Details.' },
  ];
  
  const result = quickDiscEstimate(messages);
  
  assert(result.disc_g > 0.3, 'G score should be significant');
});

test('quickDiscEstimate confidence increases with more messages', () => {
  const fewMessages = [{ from: 'lead', text: 'Ja ok' }];
  const moreMessages = [
    { from: 'lead', text: 'Ja ok' },
    { from: 'lead', text: 'Verstehe' },
    { from: 'lead', text: 'Machen wir' },
    { from: 'lead', text: 'Gut' },
  ];
  
  const resultFew = quickDiscEstimate(fewMessages);
  const resultMore = quickDiscEstimate(moreMessages);
  
  assert(resultMore.confidence > resultFew.confidence, 'More messages = higher confidence');
});

// ═══════════════════════════════════════════════════════════════════════════
// FOLLOW-UP GENERATOR TESTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n💬 Follow-up Generator Tests\n');

test('getQuickFollowUpTemplate returns message for D-type', () => {
  const result = getQuickFollowUpTemplate({
    leadName: 'Max',
    discStyle: 'D',
    decisionState: 'thinking',
    daysSinceContact: 3,
  });
  
  assert(result.message_text.length > 10, 'Should return message');
  assert(result.message_text.includes('Max'), 'Should include lead name');
  assert(result.tone_hint.includes('direkt'), 'Tone should mention direct');
});

test('getQuickFollowUpTemplate returns different message for I-type', () => {
  const dResult = getQuickFollowUpTemplate({
    leadName: 'Anna',
    discStyle: 'D',
    decisionState: 'thinking',
  });
  
  const iResult = getQuickFollowUpTemplate({
    leadName: 'Anna',
    discStyle: 'I',
    decisionState: 'thinking',
  });
  
  assert(dResult.message_text !== iResult.message_text, 'Messages should differ by style');
});

test('getQuickFollowUpTemplate handles all decision states', () => {
  const states = ['no_decision', 'thinking', 'committed', 'not_now'];
  
  for (const state of states) {
    const result = getQuickFollowUpTemplate({
      leadName: 'Test',
      discStyle: 'S',
      decisionState: state,
    });
    
    assert(result.message_text.length > 0, `Should return message for ${state}`);
  }
});

test('suggestNextContactTiming returns different days by decision state', () => {
  const thinking = suggestNextContactTiming('thinking', 'S');
  const notNow = suggestNextContactTiming('not_now', 'S');
  
  assert(notNow.days > thinking.days, 'not_now should have more days than thinking');
});

test('suggestNextContactTiming adjusts by DISG style', () => {
  const dResult = suggestNextContactTiming('thinking', 'D');
  const sResult = suggestNextContactTiming('thinking', 'S');
  
  assert(sResult.days >= dResult.days, 'S-type should have same or more days');
});

// ═══════════════════════════════════════════════════════════════════════════
// TYPE UTILITIES TESTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n🔧 Type Utilities Tests\n');

test('DISC_DESCRIPTIONS contains all types', () => {
  assert(DISC_DESCRIPTIONS.D, 'D description');
  assert(DISC_DESCRIPTIONS.I, 'I description');
  assert(DISC_DESCRIPTIONS.S, 'S description');
  assert(DISC_DESCRIPTIONS.G, 'G description');
});

test('DISC_DESCRIPTIONS has required fields', () => {
  for (const [key, desc] of Object.entries(DISC_DESCRIPTIONS)) {
    assert(desc.name, `${key} should have name`);
    assert(desc.emoji, `${key} should have emoji`);
    assert(desc.communication_style, `${key} should have communication_style`);
  }
});

test('DECISION_STATE_CONFIG contains all states', () => {
  const states = ['no_decision', 'thinking', 'committed', 'not_now', 'rejected'];
  
  for (const state of states) {
    assert(DECISION_STATE_CONFIG[state], `Config for ${state}`);
    assert(DECISION_STATE_CONFIG[state].label, `Label for ${state}`);
    assert(DECISION_STATE_CONFIG[state].emoji, `Emoji for ${state}`);
  }
});

test('getDominantStyle returns correct style', () => {
  assertEqual(getDominantStyle(0.8, 0.1, 0.1, 0.0), 'D');
  assertEqual(getDominantStyle(0.1, 0.8, 0.1, 0.0), 'I');
  assertEqual(getDominantStyle(0.1, 0.1, 0.8, 0.0), 'S');
  assertEqual(getDominantStyle(0.0, 0.1, 0.1, 0.8), 'G');
});

test('getPlanUrgency returns correct urgency', () => {
  assertEqual(getPlanUrgency(null), 'no_plan');
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  assertEqual(getPlanUrgency(yesterday.toISOString()), 'overdue');
  
  const today = new Date();
  today.setHours(23, 59, 59);
  assertEqual(getPlanUrgency(today.toISOString()), 'today');
  
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 5);
  assertEqual(getPlanUrgency(nextWeek.toISOString()), 'this_week');
  
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 14);
  assertEqual(getPlanUrgency(nextMonth.toISOString()), 'later');
});

test('formatNextContactDate returns readable format', () => {
  assertEqual(formatNextContactDate(null), 'Kein Termin');
  
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  assert(formatNextContactDate(today.toISOString()).includes('Heute'), 'Should say Heute');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  assert(formatNextContactDate(tomorrow.toISOString()).includes('Morgen'), 'Should say Morgen');
});

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n🔗 Integration Tests\n');

test('Full DISG to Follow-up flow works', () => {
  // 1. Analyze DISG
  const messages = [
    { from: 'lead', text: 'Ja, klingt interessant. Was kostet das?' },
    { from: 'lead', text: 'Ok, schick mir die Details.' },
  ];
  
  const discResult = quickDiscEstimate(messages);
  
  // 2. Generate Follow-up based on DISG
  const followUp = getQuickFollowUpTemplate({
    leadName: 'Klaus',
    discStyle: discResult.dominant_style,
    decisionState: 'thinking',
    daysSinceContact: 3,
  });
  
  // 3. Get timing
  const timing = suggestNextContactTiming('thinking', discResult.dominant_style);
  
  // Verify flow works
  assert(followUp.message_text.length > 0, 'Should have follow-up message');
  assert(timing.days > 0, 'Should have timing');
});

test('Decision state affects follow-up appropriately', () => {
  const thinkingFollowUp = getQuickFollowUpTemplate({
    leadName: 'Test',
    discStyle: 'S',
    decisionState: 'thinking',
  });
  
  const rejectedFollowUp = getQuickFollowUpTemplate({
    leadName: 'Test',
    discStyle: 'S',
    decisionState: 'not_now',
  });
  
  // not_now should have longer wait time
  assert(
    thinkingFollowUp.suggested_days < rejectedFollowUp.suggested_days,
    'not_now should wait longer'
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(60));
console.log(`\n📊 Test Results: ${testsPassed} passed, ${testsFailed} failed\n`);

if (testsFailed === 0) {
  console.log('✅ All tests passed! 🎉\n');
} else {
  console.log('❌ Some tests failed. Please review the errors above.\n');
  process.exit(1);
}

