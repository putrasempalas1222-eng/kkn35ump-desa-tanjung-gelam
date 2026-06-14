import { TeamMember, Program, GalleryImage, Testimonial } from './types';

export const TEAM_MEMBERS: TeamMember[] = [
  { id: '1', name: 'Daffa', role: 'Ketua', image: 'https://picsum.photos/seed/daffa/200/200' },
  { id: '2', name: 'Lulu', role: 'Sekretaris', image: 'https://picsum.photos/seed/lulu/200/200' },
  { id: '3', name: 'Dhita', role: 'Bendahara', image: 'https://picsum.photos/seed/dhita/200/200' },
  { id: '4', name: 'Imel', role: 'Anggota', division: 'PDD', image: 'https://picsum.photos/seed/imel/200/200' },
  { id: '5', name: 'Anggota PDD 2', role: 'Anggota', division: 'PDD', image: 'https://picsum.photos/seed/pdd2/200/200' },
  { id: '6', name: 'Ilham', role: 'Anggota', division: 'PDD', image: 'https://picsum.photos/seed/ilham/200/200' },
  { id: '7', name: 'Edwin', role: 'Anggota', division: 'Humas', image: 'https://picsum.photos/seed/edwin/200/200' },
  { id: '8', name: 'Sekar', role: 'Anggota', division: 'Humas', image: 'https://picsum.photos/seed/sekar/200/200' },
  { id: '9', name: 'Putra', role: 'Anggota', division: 'Acara', image: 'https://picsum.photos/seed/putra/200/200' },
  { id: '10', name: 'Aisyah', role: 'Anggota', division: 'Acara', image: 'https://picsum.photos/seed/aisyah/200/200' },
  { id: '11', name: 'Egi', role: 'Anggota', division: 'Perlengkapan', image: 'https://picsum.photos/seed/egi/200/200' },
  { id: '12', name: 'Sahlini', role: 'Anggota', division: 'Perlengkapan', image: 'https://picsum.photos/seed/sahlini/200/200' },
  { id: '13', name: 'Diffa', role: 'Anggota', division: 'Perlengkapan', image: 'https://picsum.photos/seed/diffa/200/200' },
];

export const PROGRAMS: Program[] = [
  { id: 'p1', category: 'Pendidikan', title: 'Mengajar di Sekolah', description: 'Membantu proses belajar mengajar di SD/SMP setempat untuk meningkatkan literasi dan numerasi siswa.', iconName: 'BookOpen' },
  { id: 'p2', category: 'Pendidikan', title: 'Bimbingan Belajar', description: 'Mengadakan les tambahan gratis di posko KKN untuk anak-anak desa pada sore hari.', iconName: 'GraduationCap' },
  { id: 'p3', category: 'Sosial', title: 'Gotong Royong', description: 'Berkolaborasi dengan warga membersihkan fasilitas umum dan tempat ibadah.', iconName: 'Users' },
  { id: 'p4', category: 'Sosial', title: 'Bakti Sosial', description: 'Pembagian sembako dan pakaian layak pakai kepada keluarga kurang mampu.', iconName: 'HeartHandshake' },
  { id: 'p5', category: 'Kesehatan', title: 'Penyuluhan Kesehatan', description: 'Edukasi tentang stunting, gizi seimbang, dan pola hidup bersih sehat (PHBS).', iconName: 'Stethoscope' },
  { id: 'p6', category: 'Kesehatan', title: 'Senam Bersama', description: 'Mengadakan senam pagi rutin setiap akhir pekan bersama ibu-ibu PKK dan warga.', iconName: 'Activity' },
  { id: 'p7', category: 'Lingkungan', title: 'Kerja Bakti', description: 'Pembersihan saluran air dan pengelolaan sampah desa.', iconName: 'Leaf' },
  { id: 'p8', category: 'Lingkungan', title: 'Penghijauan', description: 'Penanaman bibit pohon produktif di lahan kosong dan pekarangan warga.', iconName: 'TreePine' },
  { id: 'p9', category: 'UMKM', title: 'Pendampingan Usaha', description: 'Membantu packaging, branding, dan pemasaran digital produk lokal desa.', iconName: 'Store' },
];

export const GALLERY_IMAGES: GalleryImage[] = Array.from({ length: 12 }).map((_, i) => {
  const categories = ['Pendidikan', 'Sosial', 'Lingkungan', 'Dokumentasi Desa'];
  const category = categories[i % categories.length];
  return {
    id: `g${i + 1}`,
    url: `https://picsum.photos/seed/kkn${i}/800/600`,
    category: category,
    title: `Kegiatan ${category} ${i + 1}`
  };
});

export const TESTIMONIALS: Testimonial[] = [
  { id: 't1', name: 'Bpk. Ahmad', role: 'Kepala Desa Tanjung Gelam', quote: 'Kehadiran mahasiswa KKN UMP sangat membantu program desa, terutama dalam bidang pendidikan dan pemberdayaan UMKM. Terima kasih Kelompok 35!', avatar: 'https://picsum.photos/seed/kades/150/150' },
  { id: 't2', name: 'Ibu Siti', role: 'Ketua PKK', quote: 'Anak-anak KKN sangat aktif dan sopan. Program senam sehat dan penyuluhan kesehatannya sangat bermanfaat bagi ibu-ibu di sini.', avatar: 'https://picsum.photos/seed/pkk/150/150' },
  { id: 't3', name: 'Pak Budi', role: 'Tokoh Masyarakat', quote: 'Semangat gotong royong adik-adik mahasiswa patut diacungi jempol. Desa kami menjadi lebih bersih dan hidup dengan berbagai kegiatan positif.', avatar: 'https://picsum.photos/seed/tokoh/150/150' },
];
