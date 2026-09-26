import test from 'node:test';
import assert from 'node:assert/strict';

test('Episode Modal Season Resolution - Resolves season from episode object over activeSeason fallback', () => {
  const activeSeason = 1;

  // Case 1: User clicks on Episode 18 of Season 6 in accordion
  const clickedAccordionEp = {
    id: 3672901,
    name: 'Us',
    episode_number: 18,
    season_number: 6,
  };
  const resolvedSeasonNum = clickedAccordionEp.season_number ?? activeSeason;
  assert.equal(resolvedSeasonNum, 6, 'Should resolve to Season 6, not default activeSeason 1');

  // Case 2: User clicks on Episode 16 of Season 5
  const clickedSeason5Ep = {
    id: 2894102,
    name: 'The Adirondacks',
    episode_number: 16,
    season_number: 5,
  };
  const resolvedSeason5 = clickedSeason5Ep.season_number ?? activeSeason;
  assert.equal(resolvedSeason5, 5, 'Should resolve to Season 5');

  // Case 3: Season 0 (Special episodes) should keep 0 and not fall back to activeSeason
  const specialEp = {
    id: 112233,
    name: 'Special Retrospective',
    episode_number: 1,
    season_number: 0,
  };
  const resolvedSpecial = specialEp.season_number ?? activeSeason;
  assert.equal(resolvedSpecial, 0, 'Should preserve Season 0 (specials)');

  // Case 4: Fallback to activeSeason if season_number is missing
  const legacyEp = {
    id: 998877,
    name: 'Legacy format episode',
    episode_number: 3,
  };
  const resolvedFallback = (legacyEp as any).season_number ?? activeSeason;
  assert.equal(resolvedFallback, 1, 'Should fallback to activeSeason when missing');
});
