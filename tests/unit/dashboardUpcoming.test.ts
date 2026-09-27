import test from 'node:test';
import assert from 'node:assert/strict';

interface DashboardShow {
  id: number;
  name: string;
  status?: string;
  seasons?: Array<{ season_number: number; episode_count: number; air_date?: string; name?: string }>;
  next_episode_to_air?: {
    id: number;
    season_number: number;
    episode_number: number;
    air_date: string;
    name?: string;
  } | null;
}

interface WatchedRecord {
  show_id: number;
  episode_id: number;
}

export function computeUpNextEpisode(
  show: DashboardShow,
  watchedRecords: WatchedRecord[],
  seasonEpisodesMap: Record<string, any[]>,
  currentDate: Date = new Date('2026-09-27T00:00:00Z')
) {
  const showWatched = watchedRecords.filter(w => Number(w.show_id) === Number(show.id));
  const validSeasons = (show.seasons || [])
    .filter((s: any) => s && s.season_number > 0)
    .sort((a: any, b: any) => a.season_number - b.season_number);

  let totalEpisodesCount = 0;
  validSeasons.forEach((s: any) => {
    totalEpisodesCount += (s.episode_count || 0);
  });

  const isEnded = show.status === 'Ended' || show.status === 'Canceled';
  const isAllWatched = totalEpisodesCount > 0 && showWatched.length >= totalEpisodesCount;

  if (isEnded && isAllWatched) {
    return null;
  }

  let targetSeason = 1;
  let targetEpisodeNum = 1;

  if (isAllWatched) {
    if (show.next_episode_to_air) {
      targetSeason = show.next_episode_to_air.season_number;
      targetEpisodeNum = show.next_episode_to_air.episode_number;
    } else {
      const lastSeason = validSeasons[validSeasons.length - 1]?.season_number || 1;
      targetSeason = lastSeason + 1;
      targetEpisodeNum = 1;
    }
  } else {
    let cumulative = 0;
    for (const s of validSeasons) {
      const count = s.episode_count || 0;
      if (showWatched.length < cumulative + count) {
        targetSeason = s.season_number;
        targetEpisodeNum = showWatched.length - cumulative + 1;
        break;
      }
      cumulative += count;
    }
  }

  const seasonEps = seasonEpisodesMap[`${show.id}_${targetSeason}`] || [];
  const epData = seasonEps.find((e: any) => e.episode_number === targetEpisodeNum);

  let finalEpId = epData?.id;
  let epTitle = epData?.name || `قسمت ${targetEpisodeNum}`;
  let epAirDate = epData?.air_date;

  if (!finalEpId && show.next_episode_to_air && show.next_episode_to_air.season_number === targetSeason && show.next_episode_to_air.episode_number === targetEpisodeNum) {
    finalEpId = show.next_episode_to_air.id;
    epTitle = show.next_episode_to_air.name || epTitle;
    epAirDate = show.next_episode_to_air.air_date;
  }

  let isReleased = false;
  let countdownBadge = 'پخش‌نشده';
  let diffDays: number | null = null;

  if (epAirDate) {
    const airDateObj = new Date(epAirDate);
    airDateObj.setHours(0, 0, 0, 0);
    diffDays = Math.round((airDateObj.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      isReleased = true;
    } else if (diffDays === 1) {
      countdownBadge = 'پخش: فردا';
    } else if (diffDays <= 7) {
      countdownBadge = `پخش: ${diffDays} روز دیگر`;
    } else {
      countdownBadge = `پخش: ${diffDays} روز دیگر`;
    }
  } else if (isAllWatched) {
    countdownBadge = 'در انتظار فصل بعدی';
  }

  // ۱. مواردی که در انتظار فصل بعدی هستند کلاً نمایش داده نشوند
  if (countdownBadge === 'در انتظار فصل بعدی') {
    return null;
  }

  // ۲. مواردی که همه قسمت‌های فعلی را دیده‌اند، فقط اگر اپیزود بعدی تا ۱ هفته آینده پخش می‌شود نمایش داده شوند
  if (isAllWatched) {
    if (!epAirDate || diffDays === null || diffDays <= 0 || diffDays > 7) {
      return null;
    }
  }

  // ۳. اگر اپیزود هنوز پخش نشده است، فقط مواردی که تا ۱ هفته آینده پخش می‌شوند نمایش داده شوند
  if (!isReleased) {
    if (diffDays === null || diffDays <= 0 || diffDays > 7) {
      return null;
    }
  }

  return {
    showId: show.id,
    seasonNumber: targetSeason,
    episodeNumber: targetEpisodeNum,
    episodeTitle: epTitle,
    isReleased,
    countdownBadge,
    diffDays,
  };
}

export function computeCalendarEpisodes(
  shows: DashboardShow[],
  watchedRecords: WatchedRecord[],
  seasonEpisodesMap: Record<string, any[]>,
  currentDate: Date = new Date('2026-09-27T00:00:00Z')
) {
  const watchedEpisodeIds = new Set(watchedRecords.map(w => Number(w.episode_id)));
  const episodesList: any[] = [];
  const addedKeys = new Set<string>();

  shows.forEach(show => {
    const validSeasons = (show.seasons || []).filter((s: any) => s && s.season_number > 0);
    validSeasons.forEach(season => {
      const seasonEps = seasonEpisodesMap[`${show.id}_${season.season_number}`] || [];
      seasonEps.forEach(ep => {
        if (!ep) return;
        const key = `${show.id}_${ep.id}`;
        if (addedKeys.has(key)) return;

        const isWatched = watchedEpisodeIds.has(Number(ep.id));
        let diffDays: number | null = null;
        let airDateObj: Date | null = null;

        if (ep.air_date) {
          airDateObj = new Date(ep.air_date);
          airDateObj.setHours(0, 0, 0, 0);
          diffDays = Math.round((airDateObj.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        if (diffDays !== null && diffDays >= 0 && diffDays <= 365) {
          addedKeys.add(key);
          episodesList.push({
            showId: show.id,
            showName: show.name,
            episodeId: ep.id,
            seasonNumber: ep.season_number,
            episodeNumber: ep.episode_number,
            airDate: ep.air_date,
            diffDays,
            isWatched,
          });
        }
      });
    });

    if (show.next_episode_to_air && show.next_episode_to_air.air_date) {
      const ep = show.next_episode_to_air;
      const key = `${show.id}_${ep.id}`;
      if (!addedKeys.has(key)) {
        const airDateObj = new Date(ep.air_date);
        airDateObj.setHours(0, 0, 0, 0);
        const diffDays = Math.round((airDateObj.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 365) {
          addedKeys.add(key);
          episodesList.push({
            showId: show.id,
            showName: show.name,
            episodeId: ep.id,
            seasonNumber: ep.season_number,
            episodeNumber: ep.episode_number,
            airDate: ep.air_date,
            diffDays,
            isWatched: watchedEpisodeIds.has(Number(ep.id)),
          });
        }
      }
    }
  });

  return {
    today: episodesList.filter(e => e.diffDays === 0),
    thisWeek: episodesList.filter(e => e.diffDays >= 1 && e.diffDays <= 7),
    upcoming: episodesList.filter(e => e.diffDays > 7 && e.diffDays <= 365),
  };
}

test('Dashboard Logic - Up Next shows S01E01 for watchlist show with 0 watched episodes', () => {
  const show: DashboardShow = {
    id: 100,
    name: 'Severance',
    status: 'Returning Series',
    seasons: [{ season_number: 1, episode_count: 9, air_date: '2022-02-18' }]
  };

  const seasonEpsMap = {
    '100_1': [
      { id: 1001, season_number: 1, episode_number: 1, name: 'Good News About Hell', air_date: '2022-02-18' },
    ]
  };

  const nextEp = computeUpNextEpisode(show, [], seasonEpsMap);
  assert.ok(nextEp);
  assert.equal(nextEp.seasonNumber, 1);
  assert.equal(nextEp.episodeNumber, 1);
  assert.equal(nextEp.isReleased, true);
});

test('Dashboard Logic - Up Next keeps returning show with unreleased next episode', () => {
  const show: DashboardShow = {
    id: 97546,
    name: 'Ted Lasso',
    status: 'Returning Series',
    seasons: [
      { season_number: 1, episode_count: 10 },
      { season_number: 2, episode_count: 12 },
      { season_number: 3, episode_count: 12 },
      { season_number: 4, episode_count: 10, air_date: '2026-08-04' }
    ],
    next_episode_to_air: {
      id: 7203314,
      season_number: 4,
      episode_number: 9,
      air_date: '2026-09-29',
      name: 'Mae Rides the Bus'
    }
  };

  // User has watched 42 episodes (S1-S3 = 34 + S4E1..8)
  const watchedRecords: WatchedRecord[] = Array.from({ length: 42 }, (_, i) => ({
    show_id: 97546,
    episode_id: i + 1
  }));

  const seasonEpsMap = {
    '97546_4': [
      { id: 7203314, season_number: 4, episode_number: 9, name: 'Mae Rides the Bus', air_date: '2026-09-29' },
      { id: 7203315, season_number: 4, episode_number: 10, name: 'Episode 10', air_date: '2026-10-06' }
    ]
  };

  const nextEp = computeUpNextEpisode(show, watchedRecords, seasonEpsMap, new Date('2026-09-27T00:00:00Z'));
  assert.ok(nextEp);
  assert.equal(nextEp.seasonNumber, 4);
  assert.equal(nextEp.episodeNumber, 9);
  assert.equal(nextEp.isReleased, false);
  assert.equal(nextEp.countdownBadge, 'پخش: 2 روز دیگر');
});

test('Dashboard Logic - Upcoming calendar contains episodes airing between 8 and 365 days (Ted Lasso S4E10 in 9 days)', () => {
  const show: DashboardShow = {
    id: 97546,
    name: 'Ted Lasso',
    status: 'Returning Series',
    seasons: [
      { season_number: 4, episode_count: 10, air_date: '2026-08-04' }
    ]
  };

  const seasonEpsMap = {
    '97546_4': [
      { id: 7203314, season_number: 4, episode_number: 9, name: 'Mae Rides the Bus', air_date: '2026-09-29' },
      { id: 7203315, season_number: 4, episode_number: 10, name: 'Episode 10', air_date: '2026-10-06' }
    ]
  };

  const res = computeCalendarEpisodes([show], [], seasonEpsMap, new Date('2026-09-27T00:00:00Z'));

  // S4E9 airs in 2 days -> thisWeek
  assert.equal(res.thisWeek.length, 1);
  assert.equal(res.thisWeek[0].episodeNumber, 9);
  assert.equal(res.thisWeek[0].diffDays, 2);

  // S4E10 airs in 9 days -> upcoming
  assert.equal(res.upcoming.length, 1);
  assert.equal(res.upcoming[0].episodeNumber, 10);
  assert.equal(res.upcoming[0].diffDays, 9);
});

test('Dashboard Logic - Ended show with 100% watched episodes is excluded from Up Next', () => {
  const show: DashboardShow = {
    id: 1396,
    name: 'Breaking Bad',
    status: 'Ended',
    seasons: [
      { season_number: 1, episode_count: 7 },
      { season_number: 2, episode_count: 13 }
    ]
  };

  const watchedRecords: WatchedRecord[] = Array.from({ length: 20 }, (_, i) => ({
    show_id: 1396,
    episode_id: i + 1
  }));

  const nextEp = computeUpNextEpisode(show, watchedRecords, {});
  assert.equal(nextEp, null);
});

test('Dashboard Logic - Show waiting for next season (100% watched, no immediate air date) is excluded from Up Next', () => {
  const show: DashboardShow = {
    id: 82856,
    name: 'The Mandalorian',
    status: 'Returning Series',
    seasons: [
      { season_number: 1, episode_count: 8 },
      { season_number: 2, episode_count: 8 },
      { season_number: 3, episode_count: 8 }
    ],
    next_episode_to_air: null
  };

  // User watched all 24 episodes
  const watchedRecords: WatchedRecord[] = Array.from({ length: 24 }, (_, i) => ({
    show_id: 82856,
    episode_id: i + 1
  }));

  const nextEp = computeUpNextEpisode(show, watchedRecords, {});
  assert.equal(nextEp, null, 'Shows waiting for next season must be excluded from Up Next');
});

test('Dashboard Logic - Show with unreleased episode more than 7 days away is excluded from Up Next, but appears in Upcoming calendar', () => {
  const show: DashboardShow = {
    id: 97546,
    name: 'Ted Lasso',
    status: 'Returning Series',
    seasons: [
      { season_number: 4, episode_count: 10, air_date: '2026-08-04' }
    ],
    next_episode_to_air: {
      id: 7203315,
      season_number: 4,
      episode_number: 10,
      air_date: '2026-10-06', // 9 days from 2026-09-27
      name: 'Episode 10'
    }
  };

  // User watched S4E1..9 (9 episodes watched)
  const watchedRecords: WatchedRecord[] = Array.from({ length: 9 }, (_, i) => ({
    show_id: 97546,
    episode_id: i + 1
  }));

  const seasonEpsMap = {
    '97546_4': [
      { id: 7203315, season_number: 4, episode_number: 10, name: 'Episode 10', air_date: '2026-10-06' }
    ]
  };

  // Up Next: excluded because 9 days > 7 days
  const nextEp = computeUpNextEpisode(show, watchedRecords, seasonEpsMap, new Date('2026-09-27T00:00:00Z'));
  assert.equal(nextEp, null, 'Episodes airing in > 7 days must not appear in Up Next');

  // Calendar: included in upcoming
  const cal = computeCalendarEpisodes([show], watchedRecords, seasonEpsMap, new Date('2026-09-27T00:00:00Z'));
  assert.equal(cal.upcoming.length, 1);
  assert.equal(cal.upcoming[0].episodeNumber, 10);
  assert.equal((cal as any).unwatched, undefined, 'Calendar must not contain unwatched tab or list');
});

