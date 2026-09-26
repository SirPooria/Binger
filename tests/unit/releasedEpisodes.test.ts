import test from 'node:test';
import assert from 'node:assert/strict';
import { getReleasedEpisodeCount } from '../../lib/tmdbClient.ts';

test('Released Episodes - Future season with air_date is excluded (e.g. Stick)', () => {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);

  const show = {
    id: 248830,
    name: 'Stick',
    status: 'Returning Series',
    number_of_episodes: 20,
    next_episode_to_air: {
      id: 1,
      name: 'Episode 1',
      air_date: futureDate.toISOString().split('T')[0],
      episode_number: 1,
      season_number: 2,
    },
    seasons: [
      {
        id: 101,
        name: 'Season 1',
        season_number: 1,
        episode_count: 10,
        air_date: pastDate.toISOString().split('T')[0],
      },
      {
        id: 102,
        name: 'Season 2',
        season_number: 2,
        episode_count: 10,
        air_date: futureDate.toISOString().split('T')[0],
      },
    ],
  };

  const count = getReleasedEpisodeCount(show as any);
  assert.equal(count, 10);
});

test('Released Episodes - In-progress season only counts aired episodes', () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);

  const pastDate = new Date();
  pastDate.setMonth(pastDate.getMonth() - 2);

  const season2StartDate = new Date();
  season2StartDate.setDate(season2StartDate.getDate() - 14);

  const show = {
    id: 999,
    name: 'Airing Show',
    status: 'Returning Series',
    number_of_episodes: 20,
    next_episode_to_air: {
      id: 15,
      name: 'Episode 4',
      air_date: futureDate.toISOString().split('T')[0],
      episode_number: 4,
      season_number: 2,
    },
    seasons: [
      {
        id: 1,
        name: 'Season 1',
        season_number: 1,
        episode_count: 10,
        air_date: pastDate.toISOString().split('T')[0],
      },
      {
        id: 2,
        name: 'Season 2',
        season_number: 2,
        episode_count: 10,
        air_date: season2StartDate.toISOString().split('T')[0],
      },
    ],
  };

  // Season 1 (10 eps) + Season 2 episodes 1, 2, 3 (3 eps) = 13 eps
  const count = getReleasedEpisodeCount(show as any);
  assert.equal(count, 13);
});

test('Released Episodes - Specials (season 0) are excluded', () => {
  const pastDate = new Date('2020-01-01');

  const show = {
    id: 123,
    name: 'Show with specials',
    status: 'Ended',
    number_of_episodes: 25,
    seasons: [
      {
        id: 0,
        name: 'Specials',
        season_number: 0,
        episode_count: 5,
        air_date: pastDate.toISOString().split('T')[0],
      },
      {
        id: 1,
        name: 'Season 1',
        season_number: 1,
        episode_count: 10,
        air_date: pastDate.toISOString().split('T')[0],
      },
      {
        id: 2,
        name: 'Season 2',
        season_number: 2,
        episode_count: 10,
        air_date: pastDate.toISOString().split('T')[0],
      },
    ],
  };

  const count = getReleasedEpisodeCount(show as any);
  assert.equal(count, 20);
});

test('Released Episodes - Unannounced season without air_date on active show is excluded', () => {
  const pastDate = new Date('2023-01-01');

  const show = {
    id: 555,
    name: 'Continuing Show',
    status: 'Returning Series',
    number_of_episodes: 16,
    seasons: [
      {
        id: 1,
        name: 'Season 1',
        season_number: 1,
        episode_count: 8,
        air_date: pastDate.toISOString().split('T')[0],
      },
      {
        id: 2,
        name: 'Season 2',
        season_number: 2,
        episode_count: 8,
        air_date: null, // announced with no date yet
      },
    ],
  };

  const count = getReleasedEpisodeCount(show as any);
  assert.equal(count, 8);
});
