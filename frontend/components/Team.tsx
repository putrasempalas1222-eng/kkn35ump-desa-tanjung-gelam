import React, { useEffect, useState } from 'react';
import { storage } from '../services/storage';
import { TeamMember } from '../types';
import { TEAM_MEMBERS } from '../constants';

export const Team: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(TEAM_MEMBERS);

  useEffect(() => {
    return storage.subscribeTeam((members) => {
      if (members.length > 0) {
        setTeamMembers(members);
      }
    });
  }, []);

  const getDivision = (member: TeamMember) => (member.division || '').trim().toLowerCase();
  const coreTeam = teamMembers.filter((member) => ['ketua', 'sekretaris', 'bendahara'].includes(member.role.trim().toLowerCase()));
  const divisions = ['PDD', 'Humas', 'Acara', 'Perlengkapan'];

  const MemberCard = ({ member }: { member: TeamMember }) => (
    <article
      className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-slate-200/50 dark:border-slate-800/80 group"
    >
      <div className="aspect-square overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
        <img 
          src={member.image} 
          alt={member.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>
      <div className="p-5 text-center">
        <h4 className="font-extrabold text-slate-900 dark:text-white text-base mb-1.5 leading-tight">{member.name}</h4>
        <p className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-m-blue to-blue-450 dark:from-blue-400 dark:to-indigo-405 uppercase tracking-wider">
          {member.role} {member.division ? `• Div. ${member.division}` : ''}
        </p>
      </div>
    </article>
  );

  return (
    <section id="team" className="py-20 bg-white dark:bg-slate-900 relative overflow-hidden">
      {/* Background Soft Glow Orbs */}
      <div className="absolute bottom-1/4 left-0 w-[300px] h-[300px] bg-m-blue/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div>
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-900 dark:text-white tracking-tight">Struktur Organisasi</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-m-blue to-m-green mx-auto rounded-full mb-6"></div>
            <p className="text-slate-650 dark:text-slate-350 text-lg font-medium leading-relaxed">
              Mengenal anggota hebat di balik program kerja KKN Kelompok 35.
            </p>
          </div>
        </div>

        {/* Core Team */}
        {coreTeam.length > 0 && (
          <div className="mb-16">
            <h3 className="text-sm font-black text-center uppercase tracking-widest mb-8 text-slate-450 dark:text-slate-500">Pengurus Inti</h3>
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto"
            >
              {coreTeam.map(member => <MemberCard key={member.id} member={member} />)}
            </div>
          </div>
        )}

        {/* Divisions */}
        <div className="space-y-16">
          {divisions.map(divName => {
            const divMembers = teamMembers.filter((member) => getDivision(member) === divName.toLowerCase());
            if (divMembers.length === 0) return null;
            
            return (
              <div key={divName}>
                <h3 className="text-sm font-black text-center uppercase tracking-widest mb-8 text-slate-450 dark:text-slate-500">Divisi {divName}</h3>
                <div
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-center"
                >
                  {divMembers.map(member => <MemberCard key={member.id} member={member} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
