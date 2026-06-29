import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, UsersRound } from 'lucide-react';
import { storage } from '../services/storage';
import { TeamMember } from '../types';
import { TEAM_MEMBERS } from '../constants';

const divisionStyles: Record<string, { accent: string; soft: string; glow: string; label: string }> = {
  inti: {
    accent: 'from-amber-400 via-yellow-500 to-orange-500',
    soft: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-300',
    glow: 'shadow-amber-500/15',
    label: 'Pengurus Inti',
  },
  pdd: {
    accent: 'from-blue-500 via-cyan-500 to-sky-400',
    soft: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/35 dark:text-blue-300',
    glow: 'shadow-blue-500/15',
    label: 'Divisi PDD',
  },
  humas: {
    accent: 'from-violet-500 via-purple-500 to-fuchsia-500',
    soft: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/60 dark:bg-violet-950/35 dark:text-violet-300',
    glow: 'shadow-violet-500/15',
    label: 'Divisi Humas',
  },
  acara: {
    accent: 'from-rose-500 via-pink-500 to-orange-400',
    soft: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/35 dark:text-rose-300',
    glow: 'shadow-rose-500/15',
    label: 'Divisi Acara',
  },
  perlengkapan: {
    accent: 'from-emerald-500 via-green-500 to-lime-400',
    soft: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/35 dark:text-emerald-300',
    glow: 'shadow-emerald-500/15',
    label: 'Divisi Perlengkapan',
  },
};

export const Team: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(TEAM_MEMBERS);

  useEffect(() => storage.subscribeTeam((members) => {
    if (members.length > 0) setTeamMembers(members);
  }), []);

  const getDivision = (member: TeamMember) => (member.division || '').trim().toLowerCase();
  const coreTeam = teamMembers.filter((member) => ['ketua', 'sekretaris', 'bendahara'].includes(member.role.trim().toLowerCase()));
  const divisions = ['PDD', 'Humas', 'Acara', 'Perlengkapan'];

  const MemberCard = ({ member, group = 'inti', index = 0 }: { member: TeamMember; group?: string; index?: number }) => {
    const style = divisionStyles[group] || divisionStyles.pdd;

    return (
      <motion.article
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.45, delay: Math.min(index * 0.07, 0.28) }}
        className={`group relative h-full w-full overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-xl ${style.glow} transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl dark:border-slate-700/70 dark:bg-slate-900`}
      >
        <div className={`h-1.5 w-full bg-gradient-to-r ${style.accent}`} />
        <div className="relative aspect-[4/4.25] overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img
            src={member.image}
            alt={member.name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-white/10 opacity-60 transition-opacity duration-500 group-hover:opacity-80" />
          <div className={`absolute left-3 top-3 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] shadow-sm backdrop-blur-md ${style.soft}`}>
            {group === 'inti' ? member.role : style.label}
          </div>
          <p className="absolute inset-x-0 bottom-4 translate-y-2 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/80 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            KKN Kelompok 35
          </p>
        </div>
        <div className="relative p-5 text-center">
          <div className={`absolute left-1/2 top-0 h-1 w-12 -translate-x-1/2 bg-gradient-to-r ${style.accent}`} />
          <h4 className="text-base font-black leading-tight text-slate-950 dark:text-white sm:text-lg">{member.name}</h4>
          <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {member.role}{member.division ? ` • ${member.division}` : ''}
          </p>
        </div>
      </motion.article>
    );
  };

  return (
    <section id="team" className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/70 to-white py-20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 md:py-28">
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-blue-400/10 blur-[110px]" />
      <div className="pointer-events-none absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-emerald-400/10 blur-[110px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(#2563eb 1px, transparent 1px)', backgroundSize: '26px 26px' }} />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center md:mb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700 shadow-sm dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300">
              KKN Kelompok 35
            </span>
            <h2 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white md:text-6xl">
              Struktur <span className="bg-gradient-to-r from-m-blue to-m-green bg-clip-text text-transparent">Organisasi</span>
            </h2>
            <div className="mx-auto my-6 h-1.5 w-24 rounded-full bg-gradient-to-r from-m-blue to-m-green shadow-lg shadow-blue-500/20" />
            <p className="text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300 md:text-lg">
              Mengenal anggota hebat di balik program kerja KKN Kelompok 35.
            </p>
          </motion.div>
        </div>

        {coreTeam.length > 0 && (
          <div className="relative mx-auto mb-20 max-w-6xl rounded-[2.5rem] border border-amber-200/70 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/60 p-5 shadow-2xl shadow-amber-500/10 dark:border-amber-800/30 dark:from-amber-950/20 dark:via-slate-900 dark:to-orange-950/10 sm:p-8 md:p-10">
            <div className="absolute left-1/2 top-0 h-8 w-px -translate-y-full bg-gradient-to-b from-transparent to-amber-400" />
            <div className="mb-9 flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/25"><Crown size={23} /></span>
              <h3 className="mt-4 text-xl font-black text-slate-950 dark:text-white md:text-2xl">Pengurus Inti</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Penggerak dan koordinator utama kelompok</p>
            </div>
            <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-6 md:gap-8">
              {coreTeam.map((member, index) => (
                <div key={member.id} className="w-full max-w-[280px] sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.35rem)]">
                  <MemberCard member={member} group="inti" index={index} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-20">
          {divisions.map((divName) => {
            const divMembers = teamMembers.filter((member) => getDivision(member) === divName.toLowerCase());
            if (divMembers.length === 0) return null;
            const group = divName.toLowerCase();
            const style = divisionStyles[group] || divisionStyles.pdd;

            return (
              <motion.div key={divName} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                <div className="mb-9 flex items-center justify-center gap-4">
                  <div className={`hidden h-px max-w-40 flex-1 bg-gradient-to-r from-transparent ${style.accent} sm:block`} />
                  <div className={`inline-flex items-center gap-3 rounded-full border px-5 py-3 shadow-sm ${style.soft}`}>
                    <UsersRound size={18} />
                    <h3 className="text-sm font-black uppercase tracking-[0.18em]">Divisi {divName}</h3>
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/80 px-1.5 text-[10px] font-black shadow-sm dark:bg-slate-900/70">{divMembers.length}</span>
                  </div>
                  <div className={`hidden h-px max-w-40 flex-1 bg-gradient-to-l from-transparent ${style.accent} sm:block`} />
                </div>
                <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-6 md:gap-7">
                  {divMembers.map((member, index) => (
                    <div key={member.id} className="w-full max-w-[260px] sm:w-[calc(50%-0.75rem)] md:w-[calc(33.333%-1rem)] lg:w-[calc(25%-1.125rem)]">
                      <MemberCard member={member} group={group} index={index} />
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
