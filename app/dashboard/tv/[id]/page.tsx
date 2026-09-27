import type { Metadata } from 'next';
import { getShowDetails } from '@/lib/tmdbClient';
import ShowDetailsClient from './ShowDetailsClient';

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * Builds canonical TMDB poster image URL for OpenGraph and Schema markup
 */
function getPosterUrl(posterPath: string | null | undefined): string | undefined {
  if (!posterPath) return undefined;
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
    return posterPath;
  }
  const cleanPath = posterPath.startsWith('/') ? posterPath : `/${posterPath}`;
  return `https://image.tmdb.org/t/p/w500${cleanPath}`;
}

/**
 * Dynamic SEO Metadata for TV Show details page
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const showId = resolvedParams.id;

  try {
    const show = await getShowDetails(showId);

    if (!show) {
      return {
        title: 'سریال مورد نظر یافت نشد | بینجر (Binger)',
        description: 'اطلاعات این سریال در سامانه بینجر یافت نشد.',
      };
    }

    const titleFa = show.name_fa || show.name;
    const titleEn = show.name_en || (show.name !== show.name_fa ? show.name : show.original_name);
    const displayTitle = titleEn && titleEn !== titleFa
      ? `${titleFa} (${titleEn}) | بینجر`
      : `${titleFa} | بینجر`;

    const description = (
      show.overview_fa ||
      show.overview ||
      (show as any).overview_en ||
      `مشاهده اطلاعات، فصل‌ها و وضعیت تماشای سریال ${titleFa} در بینجر`
    ).trim();

    const posterUrl = getPosterUrl(show.poster_path);

    return {
      title: displayTitle,
      description: description.slice(0, 180),
      openGraph: {
        title: displayTitle,
        description: description.slice(0, 180),
        type: 'video.tv_show',
        images: posterUrl ? [{ url: posterUrl, width: 500, height: 750, alt: titleFa }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: displayTitle,
        description: description.slice(0, 180),
        images: posterUrl ? [posterUrl] : [],
      },
    };
  } catch (error) {
    console.error(`[generateMetadata] Error loading metadata for show ${showId}:`, error);
    return {
      title: 'مشاهده سریال | بینجر (Binger)',
      description: 'پلتفرم هوشمند ردیابی و مدیریت تماشای سریال‌ها',
    };
  }
}

/**
 * Server Component: Injects JSON-LD TVSeries Structured Data and renders ShowDetailsClient
 */
export default async function ShowDetailsPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const showId = resolvedParams.id;

  let show = null;
  try {
    show = await getShowDetails(showId);
  } catch (err) {
    console.error(`[ShowDetailsPage] Error fetching details for show ${showId}:`, err);
  }

  // Construct Google-compliant Schema.org TVSeries JSON-LD markup
  const titleFa = show?.name_fa || show?.name;
  const titleEn = show?.name_en || (show?.name !== show?.name_fa ? show?.name : show?.original_name);
  const description = show?.overview_fa || show?.overview || (show as any)?.overview_en || '';
  const posterUrl = getPosterUrl(show?.poster_path);

  const jsonLd = show && titleFa ? {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: titleFa,
    ...(titleEn && titleEn !== titleFa ? { alternateName: titleEn } : {}),
    ...(description ? { description } : {}),
    ...(posterUrl ? { image: posterUrl } : {}),
    ...(show.vote_count && show.vote_count > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: show.vote_average ? Number(show.vote_average.toFixed(1)) : 0,
        bestRating: 10,
        worstRating: 1,
        ratingCount: show.vote_count,
      },
    } : {}),
    ...(show.first_air_date ? { startDate: show.first_air_date } : {}),
    ...(show.number_of_seasons ? { numberOfSeasons: show.number_of_seasons } : {}),
    ...(show.number_of_episodes ? { numberOfEpisodes: show.number_of_episodes } : {}),
    ...(show.genres && show.genres.length > 0 ? { genre: show.genres.map((g: any) => g.name) } : {}),
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ShowDetailsClient initialShow={show} showId={showId} />
    </>
  );
}