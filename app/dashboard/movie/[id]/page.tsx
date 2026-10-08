import type { Metadata } from 'next';
import { getMovieDetails, getImageUrl, type TMDBMovie } from '@/lib/tmdbClient';
import MovieDetailsClient from './MovieDetailsClient';

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
 * Dynamic SEO Metadata for Movie details page
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const movieId = resolvedParams.id;

  try {
    const movie = await getMovieDetails(movieId);

    if (!movie) {
      return {
        title: 'فیلم مورد نظر یافت نشد | بینجر (Binger)',
        description: 'اطلاعات این فیلم سینمایی در سامانه بینجر یافت نشد.',
      };
    }

    const titleFa = movie.title_fa || movie.title;
    const titleEn = movie.title_en || (movie.title !== movie.title_fa ? movie.title : movie.original_title);
    const displayTitle = titleEn && titleEn !== titleFa
      ? `${titleFa} (${titleEn}) | بینجر`
      : `${titleFa} | بینجر`;

    const description = (
      movie.overview_fa ||
      movie.overview ||
      movie.overview_en ||
      `مشاهده اطلاعات، بازیگران و وضعیت تماشای فیلم سینمایی ${titleFa} در بینجر`
    ).trim();

    const posterUrl = getPosterUrl(movie.poster_path);

    return {
      title: displayTitle,
      description: description.slice(0, 180),
      openGraph: {
        title: displayTitle,
        description: description.slice(0, 180),
        type: 'video.movie',
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
    console.error(`[generateMetadata] Error loading metadata for movie ${movieId}:`, error);
    return {
      title: 'مشاهده فیلم سینمایی | بینجر (Binger)',
      description: 'پلتفرم هوشمند مدیریت و کشف فیلم و سریال‌ها',
    };
  }
}

/**
 * Server Component: Injects JSON-LD Movie Structured Data and renders MovieDetailsClient
 */
export default async function MovieDetailsPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const movieId = resolvedParams.id;

  let movie: TMDBMovie | null = null;
  try {
    movie = await getMovieDetails(movieId);
  } catch (err) {
    console.error(`[MovieDetailsPage] Error fetching details for movie ${movieId}:`, err);
  }

  // Construct Google-compliant Schema.org Movie JSON-LD markup
  const titleFa = movie?.title_fa || movie?.title;
  const titleEn = movie?.title_en || (movie?.title !== movie?.title_fa ? movie?.title : movie?.original_title);
  const description = movie?.overview_fa || movie?.overview || movie?.overview_en || '';
  const posterUrl = getPosterUrl(movie?.poster_path);

  const jsonLd = movie && titleFa ? {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: titleFa,
    alternateName: titleEn && titleEn !== titleFa ? titleEn : undefined,
    description: description,
    image: posterUrl,
    datePublished: movie.release_date,
    duration: movie.runtime ? `PT${movie.runtime}M` : undefined,
    aggregateRating: movie.vote_average ? {
      '@type': 'AggregateRating',
      ratingValue: movie.vote_average,
      bestRating: 10,
      ratingCount: movie.vote_count || 1,
    } : undefined,
    genre: movie.genres?.map(g => g.name),
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <MovieDetailsClient initialMovie={movie} movieId={movieId} />
    </>
  );
}
