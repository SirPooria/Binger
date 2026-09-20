"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Calendar, Loader2, MapPin, Tv, UserRound } from 'lucide-react';
import { getImageUrl, getPersonDetails } from '@/lib/tmdbClient';

export default function ActorPage() {
  const params = useParams();
  const router = useRouter();
  const actorId = params?.id as string;
  const [actor, setActor] = useState<any>(null);
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActor = async () => {
      if (!actorId) return;

      setLoading(true);
      const data = await getPersonDetails(actorId);
      if (data) {
        setActor(data);
        const uniqueShows = new Map<number, any>();
        (data.tv_credits?.cast || []).forEach((show: any) => {
          if (show.id && show.name && show.poster_path && !uniqueShows.has(show.id)) {
            uniqueShows.set(show.id, show);
          }
        });
        setShows(Array.from(uniqueShows.values()).sort((first, second) => {
          const popularityDifference = (second.popularity || 0) - (first.popularity || 0);
          if (popularityDifference !== 0) return popularityDifference;
          return (second.vote_count || 0) - (first.vote_count || 0);
        }));
      }
      setLoading(false);
    };

    loadActor();
  }, [actorId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#ccff00]">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  if (!actor) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-4 font-['Vazirmatn']">
        <UserRound size={48} className="text-gray-500" />
        <p className="text-gray-400">اطلاعات بازیگر پیدا نشد.</p>
        <button onClick={() => router.back()} className="bg-[#ccff00] text-black px-5 py-2 rounded-xl font-bold cursor-pointer">
          بازگشت
        </button>
      </div>
    );
  }

  const birthDate = actor.birthday ? new Date(actor.birthday).toLocaleDateString('fa-IR') : null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#050505] text-white font-['Vazirmatn'] pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowRight size={18} />
          بازگشت
        </button>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-l from-[#ccff00]/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative flex flex-col md:flex-row gap-7 items-center md:items-start">
            <div className="w-44 h-56 md:w-52 md:h-72 shrink-0 rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-2xl">
              {actor.profile_path ? (
                <img src={getImageUrl(actor.profile_path)} alt={actor.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500"><UserRound size={56} /></div>
              )}
            </div>

            <div className="flex-1 text-center md:text-right">
              <p className="text-xs font-bold text-[#ccff00] mb-2">صفحه بازیگر</p>
              <h1 className="text-3xl md:text-5xl font-black mb-2">{actor.name}</h1>
              {actor.also_known_as?.length > 0 && (
                <p className="text-sm text-gray-500 mb-5">{actor.also_known_as.slice(0, 3).join('، ')}</p>
              )}

              <div className="flex flex-wrap justify-center md:justify-start gap-3 text-xs text-gray-300 mb-6">
                {birthDate && <span className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2"><Calendar size={14} className="text-[#ccff00]" /> {birthDate}</span>}
                {actor.place_of_birth && <span className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2"><MapPin size={14} className="text-[#ccff00]" /> {actor.place_of_birth}</span>}
              </div>

              <div className="max-w-3xl">
                <h2 className="text-lg font-black mb-2">بیوگرافی</h2>
                <p className="text-sm leading-8 text-gray-300 whitespace-pre-line">
                  {actor.biography || 'بیوگرافی‌ای برای این بازیگر ثبت نشده است.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-black flex items-center gap-2"><Tv className="text-[#ccff00]" size={22} /> سریال‌ها</h2>
            <span className="text-xs text-gray-500">{shows.length} عنوان</span>
          </div>

          {shows.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {shows.map((show) => (
                <button
                  key={show.id}
                  onClick={() => router.push(`/dashboard/tv/${show.id}`)}
                  className="group text-right cursor-pointer"
                >
                  <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 bg-white/5 group-hover:border-[#ccff00]/60 group-hover:-translate-y-1 transition-all">
                    <img src={getImageUrl(show.poster_path)} alt={show.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-200 mt-2 line-clamp-1 group-hover:text-[#ccff00]">{show.name}</h3>
                  <p className="text-[10px] text-gray-500 line-clamp-1 mt-1">{show.character || 'بازیگر'}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-16 rounded-2xl border border-dashed border-white/10 text-center text-gray-500">سریالی از این بازیگر پیدا نشد.</div>
          )}
        </section>
      </div>
    </main>
  );
}