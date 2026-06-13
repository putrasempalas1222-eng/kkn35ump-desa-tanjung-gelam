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
      className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 dark:border-slate-700 group"
    >
      <div className="aspect-square overflow-hidden relative">
        <div className="absolute inset-0 bg-m-blue/20 group-hover:bg-transparent transition-colors z-10 mix-blend-multiply"></div>
        <img 
          src={member.image} 
          alt={member.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
      </div>
      <div className="p-5 text-center">
        <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{member.name}</h4>
        <p className="text-sm font-medium text-m-blue dark:text-m-blue-400">
          {member.role} {member.division ? `- Div. ${member.division}` : ''}
        </p>
      </div>
    </article>
  );

  return (
    <section id="team" className="py-20 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">Struktur Organisasi</h2>
            <div className="w-20 h-1 bg-m-blue mx-auto rounded-full mb-6"></div>
            <p className="text-slate-600 dark:text-slate-300 text-lg">
              Mengenal anggota hebat di balik program kerja KKN Kelompok 35.
            </p>
          </div>
        </div>

        {/* Core Team */}
        {coreTeam.length > 0 && (
          <div className="mb-16">
            <h3 className="text-xl font-semibold text-center mb-8 text-slate-800 dark:text-slate-200">Pengurus Inti</h3>
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
                <h3 className="text-xl font-semibold text-center mb-8 text-slate-800 dark:text-slate-200">Divisi {divName}</h3>
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
