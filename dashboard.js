// ============================================================
// dashboard.js — Logika Admin Dashboard X RPL
// Data disimpan di localStorage, siap di-upgrade ke PHP API
// ============================================================

// ── AUTH CHECK ──────────────────────────────────────────────
(function checkAuth() {
    if (localStorage.getItem('xrpl_admin_logged_in') !== 'true') {
        window.location.href = 'login.html';
    }
    const user = JSON.parse(localStorage.getItem('xrpl_admin_user') || '{}');
    document.getElementById('user-name').textContent = user.full_name || 'Administrator';
    document.getElementById('user-role').textContent = user.role === 'student' ? 'Murid X RPL' : 'Admin';
    document.getElementById('user-avatar').textContent = (user.full_name || 'A')[0].toUpperCase();

    // Sembunyikan/tampilkan menu berdasarkan role
    if (user.role === 'student') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.student-only').forEach(el => el.classList.remove('hidden'));
        window.CURRENT_ROLE = 'student';
        window.CURRENT_USER_ID = user.id;
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.student-only').forEach(el => el.classList.add('hidden'));
        window.CURRENT_ROLE = 'admin';
        window.CURRENT_USER_ID = user.id;
    }
})();

function logout() {
    if (confirm('Yakin mau logout?')) {
        localStorage.removeItem('xrpl_admin_logged_in');
        localStorage.removeItem('xrpl_admin_user');
        window.location.href = 'login.html';
    }
}

// ── DATA STORE ───────────────────────────────────────────────
// Inisialisasi dari data.json seed jika localStorage masih kosong
const DEFAULT_STUDENTS = [
    { id: 1, name: "Ahmad Rizky", quote: "Coding adalah seni merangkai logika menjadi solusi.", motto: "Stay Hungry, Stay Foolish", dream: "Fullstack Developer", color: "00d4ff", photo: null },
    { id: 2, name: "Bella Safira", quote: "Error bukan akhir, tapi awal dari pemahaman baru.", motto: "Belajar tiada henti", dream: "UI/UX Designer", color: "7b2ff7", photo: null },
    { id: 3, name: "Candra Wijaya", quote: "Kopi, Musik, dan Baris Kode.", motto: "Talk is cheap. Show me the code.", dream: "Backend Engineer", color: "00ff88", photo: null },
    { id: 4, name: "Dina Puspita", quote: "Desain yang baik tidak hanya terlihat indah, tapi juga berfungsi.", motto: "Less is more", dream: "Product Manager", color: "ff00aa", photo: null },
    { id: 5, name: "Eka Prasetyo", quote: "Semua masalah bisa diselesaikan dengan algoritma yang tepat.", motto: "Think logically", dream: "Data Scientist", color: "ffae00", photo: null },
    { id: 6, name: "Fajar Nugraha", quote: "Bugs adalah fitur yang belum didokumentasikan.", motto: "Keep it simple", dream: "Game Developer", color: "00d4ff", photo: null },
    { id: 7, name: "Gita Larasati", quote: "Koding bareng teman lebih asik dari koding sendirian.", motto: "Together we grow", dream: "Frontend Dev", color: "7b2ff7", photo: null },
    { id: 8, name: "Hadi Syahputra", quote: "Sekali commit, selamanya tercatat di Git.", motto: "Commit early & often", dream: "DevOps Engineer", color: "00ff88", photo: null },
    { id: 9, name: "Intan Permata", quote: "Masa SMA paling indah apalagi kalau errornya cepat ketemu.", motto: "Patience is key", dream: "Mobile Dev", color: "ff00aa", photo: null },
    { id: 10, name: "Joko Anwar", quote: "Jangan lupa titik koma (;).", motto: "Detail matters", dream: "Security Analyst", color: "ffae00", photo: null },
    { id: 11, name: "Kartika Sari", quote: "Logika jalan, program aman.", motto: "Code with passion", dream: "Tech Lead", color: "00d4ff", photo: null },
    { id: 12, name: "Lukman Hakim", quote: "Database yang rapi adalah kunci ketenangan batin.", motto: "Structure is everything", dream: "Database Admin", color: "7b2ff7", photo: null },
    { id: 13, name: "Maya Indah", quote: "Warna pastel dan animasi smooth adalah kesukaanku.", motto: "Make it beautiful", dream: "Web Designer", color: "00ff88", photo: null },
    { id: 14, name: "Nova Ardiansyah", quote: "Malam hari adalah waktu terbaik untuk produktif.", motto: "Night owl coder", dream: "Software Architect", color: "ff00aa", photo: null },
    { id: 15, name: "Oki Saputra", quote: "StackOverflow adalah sahabat sejati programmer.", motto: "Search before ask", dream: "Fullstack Dev", color: "ffae00", photo: null },
    { id: 16, name: "Putri Rahmawati", quote: "Kode yang bersih seperti puisi yang indah.", motto: "Clean code always", dream: "Quality Assurance", color: "00d4ff", photo: null },
    { id: 17, name: "Qori Ramadhan", quote: "Sabar menghadapi klien, sabar menghadapi bugs.", motto: "Stay calm", dream: "IT Consultant", color: "7b2ff7", photo: null },
    { id: 18, name: "Rian Hidayat", quote: "Keyboard mekanik + kopi = Mahakarya.", motto: "Type fast, think faster", dream: "System Analyst", color: "00ff88", photo: null },
    { id: 19, name: "Siti Aisyah", quote: "Tugas RPL emang banyak, tapi disitu serunya.", motto: "Never complain", dream: "Scrum Master", color: "ff00aa", photo: null },
    { id: 20, name: "Tari Lestari", quote: "Suka error? Wajar, yang penting mau belajar.", motto: "Keep trying", dream: "Cloud Engineer", color: "ffae00", photo: null },
    { id: 21, name: "Umar Faruq", quote: "Framework ganti terus, basic JS tetap selamanya.", motto: "Master the basics", dream: "Senior Developer", color: "00d4ff", photo: null },
    { id: 22, name: "Vina Amelia", quote: "Merancang UI itu kayak merias wajah, harus pas.", motto: "Pixel perfect", dream: "UI Engineer", color: "7b2ff7", photo: null },
    { id: 23, name: "Wira Pratama", quote: "Error 404: Sleep not found.", motto: "Code sleep repeat", dream: "AI Researcher", color: "00ff88", photo: null },
    { id: 24, name: "Xena Olivia", quote: "Lebih suka ngoding pakai dark mode biar mata aman.", motto: "Dark mode FTW", dream: "Security Engineer", color: "ff00aa", photo: null },
    { id: 25, name: "Yuda Baskoro", quote: "Nggak ada sistem yang 100% aman.", motto: "Hack the planet", dream: "Ethical Hacker", color: "ffae00", photo: null },
    { id: 26, name: "Zara Zulaikha", quote: "Menulis kode sama dengan menulis masa depan.", motto: "Create the future", dream: "Startup Founder", color: "00d4ff", photo: null },
    { id: 27, name: "Arya Bima", quote: "Open source adalah jalan ninjaku.", motto: "Share to care", dream: "Open Source Contributor", color: "7b2ff7", photo: null },
    { id: 28, name: "Bayu Anggara", quote: "C++ berat, tapi bikin kita kuat.", motto: "Hardcore coder", dream: "Game Engine Dev", color: "00ff88", photo: null },
    { id: 29, name: "Cinta Laura", quote: "Dari RPL aku belajar arti kerja sama tim.", motto: "Teamwork makes dream work", dream: "Project Manager", color: "ff00aa", photo: null },
    { id: 30, name: "Dika Mahendra", quote: "Bismillah, push ke production hari Jumat.", motto: "Live dangerously", dream: "Release Manager", color: "ffae00", photo: null }
];

const DEFAULT_STRUKTUR = [
    { id: 1, name: "Bpk. Budi Santoso", jabatan: "Wali Kelas", level: 0, color: "00d4ff", photo: null },
    { id: 2, name: "Ahmad Rizky", jabatan: "Ketua Kelas", level: 1, color: "7b2ff7", photo: null },
    { id: 3, name: "Dina Puspita", jabatan: "Wakil Ketua", level: 1, color: "7b2ff7", photo: null },
    { id: 4, name: "Siti Aisyah", jabatan: "Sekretaris 1", level: 2, color: "00ff88", photo: null },
    { id: 5, name: "Bagas Putra", jabatan: "Sekretaris 2", level: 2, color: "00ff88", photo: null },
    { id: 6, name: "Maya Sari", jabatan: "Bendahara 1", level: 2, color: "ff00aa", photo: null },
    { id: 7, name: "Kevin Julian", jabatan: "Bendahara 2", level: 2, color: "ff00aa", photo: null }
];

const DEFAULT_PROJECTS = [
    { id: 1, title: "Website Sekolah", description: "Website informatif untuk sekolah dengan sistem berita dan informasi akademik berbasis CMS.", tags: ["HTML", "CSS", "JS"], color: "00d4ff", link: "", image: null },
    { id: 2, title: "Aplikasi Perpustakaan", description: "Sistem manajemen perpustakaan digital dengan fitur peminjaman, denda, dan katalog buku.", tags: ["PHP", "MySQL", "Bootstrap"], color: "7b2ff7", link: "", image: null },
    { id: 3, title: "Game Edukasi", description: "Game interaktif 2D berbasis canvas untuk belajar matematika.", tags: ["Canvas API", "JS OOP"], color: "00ff88", link: "", image: null }
];

const DEFAULT_GALLERY = [
    { id: 1, title: "Hari Pertama Sekolah", category: "event", color: "7b2ff7", image: null },
    { id: 2, title: "Praktik Lab Komputer", category: "belajar", color: "00d4ff", image: null },
    { id: 3, title: "Istirahat di Kantin", category: "keseruan", color: "00ff88", image: null },
    { id: 4, title: "Lomba Web Design", category: "event", color: "ff6b6b", image: null },
    { id: 5, title: "Ulang Tahun Wali Kelas", category: "keseruan", color: "ffd93d", image: null },
    { id: 6, title: "Fokus Koding (Candid)", category: "candid", color: "6c5ce7", image: null },
    { id: 7, title: "Presentasi Kelompok", category: "belajar", color: "a29bfe", image: null },
    { id: 8, title: "Study Tour Bandung", category: "event", color: "fd79a8", image: null },
    { id: 9, title: "Piket Kelas Mandiri", category: "candid", color: "00cec9", image: null },
    { id: 10, title: "Ujian Praktik Kejuruan", category: "belajar", color: "e17055", image: null },
    { id: 11, title: "Mabar MLBB Bareng", category: "keseruan", color: "0984e3", image: null },
    { id: 12, title: "Foto Bersama Formasi Lengkap", category: "event", color: "d63031", image: null }
];

// ── STORAGE HELPERS ──────────────────────────────────────────
function getData(key, defaults) {
    const raw = localStorage.getItem('xrpl_' + key);
    if (!raw) { localStorage.setItem('xrpl_' + key, JSON.stringify(defaults)); return JSON.parse(JSON.stringify(defaults)); }
    return JSON.parse(raw);
}
function saveData(key, data) {
    localStorage.setItem('xrpl_' + key, JSON.stringify(data));
    updateOverview();
}
function nextId(arr) {
    return arr.length > 0 ? Math.max(...arr.map(x => x.id)) + 1 : 1;
}

// ── TOAST ────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    document.getElementById('toast-icon').textContent = icon;
    document.getElementById('toast-msg').textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── TAB NAVIGATION ────────────────────────────────────────────
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    
    const activeLink = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeLink) activeLink.classList.add('active');
    
    const titles = { overview: 'Overview', students: 'Kelola Murid', struktur: 'Struktur Organisasi', projects: 'Kelola Projek', gallery: 'Kelola Gallery', guestbook: 'Guestbook', settings: 'Pengaturan', 'my-profile': 'Profil Saya', 'my-snapshots': 'My Snapshots' };
    document.getElementById('page-title').textContent = titles[tabId] || tabId;
    
    const loaders = { 
        students: loadStudents, 
        struktur: loadStruktur, 
        projects: loadProjects, 
        gallery: loadGallery, 
        guestbook: loadGuestbook,
        'my-profile': loadMyProfile,
        'my-snapshots': loadMySnapshots 
    };
    if (loaders[tabId]) loaders[tabId]();
    if (window.innerWidth < 768) closeSidebar();
}

// ── SIDEBAR ──────────────────────────────────────────────────
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('open');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
}
document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

// INIT TAB SAAT HALAMAN DIMUAT
document.addEventListener('DOMContentLoaded', () => {
    if (window.CURRENT_ROLE === 'student') {
        switchTab('my-profile');
    } else {
        switchTab('overview');
    }
});

// ── MODAL HELPERS ─────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-bg').forEach(m => m.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('open'); }));

function confirmDelete(msg, callback) {
    document.getElementById('confirm-msg').textContent = msg;
    const btn = document.getElementById('confirm-action-btn');
    btn.onclick = () => { callback(); closeModal('confirm-modal'); };
    openModal('confirm-modal');
}

// ── AVATAR HELPER ─────────────────────────────────────────────
function getAvatarHtml(s, size = 40) {
    if (s.photo) {
        return `<img src="${s.photo}" alt="${s.name}" class="rounded-full object-cover" style="width:${size}px;height:${size}px;border:2px solid #${s.color}50">`;
    }
    const initials = s.name.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase();
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#${s.color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.floor(size/3)}px;color:#fff;flex-shrink:0;">${initials}</div>`;
}
function getImgSrc(s, type = 'student') {
    if (s.photo) return s.photo;
    const c = s.color || '7b2ff7';
    const txt = type === 'gallery' ? s.category?.toUpperCase() : (s.title?.replace(/ /g, '+') || s.name?.replace(/ /g, '+'));
    return `https://placehold.co/600x400/${c}/fff?text=${txt||'IMG'}`;
}

// ── OVERVIEW ──────────────────────────────────────────────────
function updateOverview() {
    const students = getData('students_db', DEFAULT_STUDENTS);
    const projects = getData('projects_db', DEFAULT_PROJECTS);
    const gallery  = getData('gallery_db', DEFAULT_GALLERY);
    const guestbook = JSON.parse(localStorage.getItem('xrpl_guestbook') || '[]');

    document.getElementById('ov-students').textContent = students.length;
    document.getElementById('ov-projects').textContent = projects.length;
    document.getElementById('ov-gallery').textContent = gallery.length;
    document.getElementById('ov-guestbook').textContent = guestbook.length;
    document.getElementById('student-count-badge').textContent = students.length;
    document.getElementById('gb-count-badge').textContent = guestbook.length;
    document.getElementById('info-students').textContent = students.length;
    document.getElementById('info-projects').textContent = projects.length;

    const recentEl = document.getElementById('ov-recent-messages');
    const recent = guestbook.slice().reverse().slice(0, 4);
    if (recent.length === 0) {
        recentEl.innerHTML = '<p class="text-gray-500 text-sm italic text-center py-6">Belum ada pesan</p>';
    } else {
        recentEl.innerHTML = recent.map(m => `
            <div class="flex gap-3 items-start border border-white/5 rounded-xl p-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-cyber-blue/30 to-electric-purple/30 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">${m.name[0].toUpperCase()}</div>
                <div class="min-w-0">
                    <div class="flex items-baseline gap-2"><span class="text-white text-sm font-semibold">${escHtml(m.name)}</span><span class="text-gray-500 text-xs">${m.date}</span></div>
                    <p class="text-gray-400 text-xs mt-0.5 truncate">${escHtml(m.text)}</p>
                </div>
            </div>
        `).join('');
    }
}

// ── STUDENTS ──────────────────────────────────────────────────
function loadStudents() {
    const students = getData('students_db', DEFAULT_STUDENTS);
    renderStudents(students);
    document.getElementById('search-students').oninput = function() {
        const term = this.value.toLowerCase();
        renderStudents(students.filter(s => s.name.toLowerCase().includes(term)));
    };
}

function renderStudents(students) {
    const tbody = document.getElementById('students-tbody');
    if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500">Tidak ada murid ditemukan 😢</td></tr>`;
        return;
    }
    tbody.innerHTML = students.map(s => `
        <tr class="table-row">
            <td class="p-4">
                <div class="flex items-center gap-3">
                    ${getAvatarHtml(s, 38)}
                    <div>
                        <p class="text-white font-semibold text-sm">${escHtml(s.name)}</p>
                        <p class="text-gray-500 text-xs font-mono">No. ${s.id}</p>
                    </div>
                </div>
            </td>
            <td class="p-4 hidden md:table-cell">
                <span class="text-gray-300 text-sm">${escHtml(s.dream || '-')}</span>
            </td>
            <td class="p-4 hidden lg:table-cell">
                <span class="text-gray-400 text-xs italic">${escHtml(s.motto || '-')}</span>
            </td>
            <td class="p-4">
                ${s.photo
                    ? `<span class="badge bg-neon-green/15 text-neon-green">✅ Punya</span>`
                    : `<span class="badge bg-white/5 text-gray-500">— Belum</span>`}
            </td>
            <td class="p-4 text-right">
                <div class="flex gap-2 justify-end">
                    <button class="btn-edit" onclick="editStudent(${s.id})">✏️ Edit</button>
                    <button class="btn-danger" onclick="deleteStudent(${s.id})">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

let currentStudentColor = '00d4ff';
let currentStudentPhotoData = null;

function openStudentModal(studentId = null) {
    document.getElementById('student-modal-title').textContent = studentId ? 'Edit Murid' : 'Tambah Murid';
    document.getElementById('student-form').reset();
    document.getElementById('student-id').value = '';
    currentStudentPhotoData = null;
    document.getElementById('student-photo-preview').classList.add('hidden');
    document.getElementById('student-photo-placeholder').classList.remove('hidden');
    setStudentColor('00d4ff', document.querySelector('.color-pick[data-color="00d4ff"]'));

    if (studentId) {
        const s = getData('students_db', DEFAULT_STUDENTS).find(x => x.id === studentId);
        if (!s) return;
        document.getElementById('student-id').value = s.id;
        document.getElementById('student-name').value = s.name;
        document.getElementById('student-dream').value = s.dream || '';
        document.getElementById('student-motto').value = s.motto || '';
        document.getElementById('student-quote').value = s.quote || '';
        setStudentColor(s.color || '00d4ff', document.querySelector(`.color-pick[data-color="${s.color}"]`));
        if (s.photo) {
            document.getElementById('student-photo-preview').src = s.photo;
            document.getElementById('student-photo-preview').classList.remove('hidden');
            document.getElementById('student-photo-placeholder').classList.add('hidden');
            currentStudentPhotoData = s.photo;
        }
    }
    openModal('student-modal');

    // Drag & drop on upload zone
    const zone = document.getElementById('student-upload-zone');
    zone.onclick = () => document.getElementById('student-photo-input').click();
    zone.ondragover = e => { e.preventDefault(); zone.classList.add('drag-over'); };
    zone.ondragleave = () => zone.classList.remove('drag-over');
    zone.ondrop = e => { e.preventDefault(); zone.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if(f) previewStudentPhoto({ files: [f] }); };
}

function editStudent(id) { openStudentModal(id); }

function previewStudentPhoto(input) {
    const file = input.files ? input.files[0] : input;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        currentStudentPhotoData = e.target.result;
        document.getElementById('student-photo-preview').src = e.target.result;
        document.getElementById('student-photo-preview').classList.remove('hidden');
        document.getElementById('student-photo-placeholder').classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

function setStudentColor(color, el) {
    currentStudentColor = color;
    document.getElementById('student-color').value = color;
    document.querySelectorAll('.color-pick').forEach(b => b.style.borderColor = 'transparent');
    if (el) el.style.borderColor = '#fff';
}

document.getElementById('student-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const students = getData('students_db', DEFAULT_STUDENTS);
    const id = parseInt(document.getElementById('student-id').value);
    const data = {
        name: document.getElementById('student-name').value.trim(),
        dream: document.getElementById('student-dream').value.trim(),
        motto: document.getElementById('student-motto').value.trim(),
        quote: document.getElementById('student-quote').value.trim(),
        color: currentStudentColor,
        photo: currentStudentPhotoData || null
    };
    if (!data.name) return showToast('Nama murid wajib diisi!', 'error');

    if (id) {
        const idx = students.findIndex(s => s.id === id);
        if (idx > -1) students[idx] = { ...students[idx], ...data };
        showToast(`Data ${data.name} berhasil diperbarui!`);
    } else {
        data.id = nextId(students);
        students.push(data);
        showToast(`${data.name} berhasil ditambahkan!`);
    }
    saveData('students_db', students);
    closeModal('student-modal');
    loadStudents();
});

function deleteStudent(id) {
    const s = getData('students_db', DEFAULT_STUDENTS).find(x => x.id === id);
    confirmDelete(`Hapus murid "${s?.name}"? Data tidak bisa dikembalikan.`, () => {
        const students = getData('students_db', DEFAULT_STUDENTS).filter(x => x.id !== id);
        saveData('students_db', students);
        loadStudents();
        showToast('Murid berhasil dihapus.');
    });
}

// ── STRUKTUR ──────────────────────────────────────────────────
let currentStrukturColor = '00d4ff';

function loadStruktur() {
    const data = getData('struktur_db', DEFAULT_STRUKTUR);
    const levelLabels = ['Wali Kelas', 'Ketua / Wakil', 'Staff'];
    const levelColors = ['from-cyber-blue/20 to-cyber-blue/5 border-cyber-blue/20', 'from-electric-purple/20 to-electric-purple/5 border-electric-purple/20', 'from-neon-green/20 to-neon-green/5 border-neon-green/20'];
    const grid = document.getElementById('struktur-grid');
    grid.innerHTML = data.map(s => `
        <div class="glass rounded-2xl p-5 bg-gradient-to-br ${levelColors[s.level] || levelColors[2]} relative group">
            <div class="flex items-center gap-3 mb-3">
                ${getAvatarHtml(s, 48)}
                <div>
                    <p class="text-white font-semibold">${escHtml(s.name)}</p>
                    <p class="text-xs font-medium" style="color:#${s.color}">${escHtml(s.jabatan)}</p>
                    <span class="text-[10px] text-gray-500">${levelLabels[s.level] || 'Staff'}</span>
                </div>
            </div>
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="btn-edit flex-1 text-xs py-1.5" onclick="editStruktur(${s.id})">✏️ Edit</button>
                <button class="btn-danger text-xs py-1.5 px-3" onclick="deleteStruktur(${s.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openStrukturModal(id = null) {
    document.getElementById('struktur-modal-title').textContent = id ? 'Edit Jabatan' : 'Tambah Jabatan';
    document.getElementById('struktur-form').reset();
    document.getElementById('struktur-id').value = '';
    currentStrukturColor = '00d4ff';
    setStrukturColor('00d4ff', document.querySelector('.str-color-pick[data-color="00d4ff"]'));
    if (id) {
        const s = getData('struktur_db', DEFAULT_STRUKTUR).find(x => x.id === id);
        if (!s) return;
        document.getElementById('struktur-id').value = s.id;
        document.getElementById('struktur-name').value = s.name;
        document.getElementById('struktur-jabatan').value = s.jabatan;
        document.getElementById('struktur-level').value = s.level;
        setStrukturColor(s.color, document.querySelector(`.str-color-pick[data-color="${s.color}"]`));
    }
    openModal('struktur-modal');
}

function editStruktur(id) { openStrukturModal(id); }

function setStrukturColor(color, el) {
    currentStrukturColor = color;
    document.getElementById('struktur-color').value = color;
    document.querySelectorAll('.str-color-pick').forEach(b => b.style.borderColor = 'transparent');
    if (el) el.style.borderColor = '#fff';
}

document.getElementById('struktur-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const data_arr = getData('struktur_db', DEFAULT_STRUKTUR);
    const id = parseInt(document.getElementById('struktur-id').value);
    const data = {
        name: document.getElementById('struktur-name').value.trim(),
        jabatan: document.getElementById('struktur-jabatan').value.trim(),
        level: parseInt(document.getElementById('struktur-level').value),
        color: currentStrukturColor,
        photo: null
    };
    if (!data.name || !data.jabatan) return showToast('Nama dan jabatan wajib diisi!', 'error');
    if (id) {
        const idx = data_arr.findIndex(s => s.id === id);
        if (idx > -1) data_arr[idx] = { ...data_arr[idx], ...data };
        showToast('Jabatan berhasil diperbarui!');
    } else {
        data.id = nextId(data_arr);
        data_arr.push(data);
        showToast('Jabatan berhasil ditambahkan!');
    }
    saveData('struktur_db', data_arr);
    closeModal('struktur-modal');
    loadStruktur();
});

function deleteStruktur(id) {
    const s = getData('struktur_db', DEFAULT_STRUKTUR).find(x => x.id === id);
    confirmDelete(`Hapus jabatan "${s?.jabatan}" (${s?.name})?`, () => {
        saveData('struktur_db', getData('struktur_db', DEFAULT_STRUKTUR).filter(x => x.id !== id));
        loadStruktur();
        showToast('Jabatan berhasil dihapus.');
    });
}

// ── PROJECTS ──────────────────────────────────────────────────
let currentProjectImageData = null;

function loadProjects() {
    const data = getData('projects_db', DEFAULT_PROJECTS);
    const grid = document.getElementById('projects-grid');
    grid.innerHTML = data.map(p => `
        <div class="glass rounded-2xl overflow-hidden group flex flex-col" style="border-color: #${p.color}30">
            <div class="aspect-video overflow-hidden relative bg-white/5">
                <img src="${p.image || `https://placehold.co/600x338/${p.color}/fff?text=${encodeURIComponent(p.title)}`}"
                    alt="${escHtml(p.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 lazy-img">
            </div>
            <div class="p-5 flex-1 flex flex-col">
                <h3 class="text-white font-semibold mb-1">${escHtml(p.title)}</h3>
                <p class="text-gray-400 text-xs mb-3 flex-1 line-clamp-2">${escHtml(p.description || '')}</p>
                <div class="flex flex-wrap gap-1 mb-4">
                    ${(p.tags||[]).map(t => `<span class="text-[10px] px-2 py-0.5 rounded-full border" style="color:#${p.color};border-color:#${p.color}40;background:#${p.color}10">${escHtml(t)}</span>`).join('')}
                </div>
                <div class="flex gap-2">
                    <button class="btn-edit flex-1 text-xs py-1.5" onclick="editProject(${p.id})">✏️ Edit</button>
                    <button class="btn-danger text-xs py-1.5 px-3" onclick="deleteProject(${p.id})">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

function openProjectModal(id = null) {
    document.getElementById('project-modal-title').textContent = id ? 'Edit Projek' : 'Tambah Projek';
    document.getElementById('project-form').reset();
    document.getElementById('project-id').value = '';
    currentProjectImageData = null;
    document.getElementById('project-img-preview-wrap').innerHTML = '<p class="text-2xl mb-1">🖼️</p><p class="text-xs text-gray-500">Klik untuk upload gambar</p>';
    if (id) {
        const p = getData('projects_db', DEFAULT_PROJECTS).find(x => x.id === id);
        if (!p) return;
        document.getElementById('project-id').value = p.id;
        document.getElementById('project-title').value = p.title;
        document.getElementById('project-desc').value = p.description || '';
        document.getElementById('project-tags').value = (p.tags || []).join(', ');
        document.getElementById('project-link').value = p.link || '';
        if (p.image) {
            currentProjectImageData = p.image;
            document.getElementById('project-img-preview-wrap').innerHTML = `<img src="${p.image}" class="w-full max-h-32 object-cover rounded-lg">`;
        }
    }
    openModal('project-modal');
}

function editProject(id) { openProjectModal(id); }

function previewProjectImage(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        currentProjectImageData = e.target.result;
        document.getElementById('project-img-preview-wrap').innerHTML = `<img src="${e.target.result}" class="w-full max-h-32 object-cover rounded-lg">`;
    };
    reader.readAsDataURL(file);
}

document.getElementById('project-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const data_arr = getData('projects_db', DEFAULT_PROJECTS);
    const id = parseInt(document.getElementById('project-id').value);
    const tags = document.getElementById('project-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    const colors = ['00d4ff','7b2ff7','00ff88','ff00aa','ffae00'];
    const data = {
        title: document.getElementById('project-title').value.trim(),
        description: document.getElementById('project-desc').value.trim(),
        tags, link: document.getElementById('project-link').value.trim(),
        image: currentProjectImageData,
        color: colors[data_arr.length % colors.length]
    };
    if (!data.title) return showToast('Judul projek wajib diisi!', 'error');
    if (id) {
        const idx = data_arr.findIndex(p => p.id === id);
        if (idx > -1) data_arr[idx] = { ...data_arr[idx], ...data };
        showToast('Projek berhasil diperbarui!');
    } else {
        data.id = nextId(data_arr);
        data_arr.push(data);
        showToast('Projek berhasil ditambahkan!');
    }
    saveData('projects_db', data_arr);
    closeModal('project-modal');
    loadProjects();
});

function deleteProject(id) {
    const p = getData('projects_db', DEFAULT_PROJECTS).find(x => x.id === id);
    confirmDelete(`Hapus projek "${p?.title}"?`, () => {
        saveData('projects_db', getData('projects_db', DEFAULT_PROJECTS).filter(x => x.id !== id));
        loadProjects();
        showToast('Projek berhasil dihapus.');
    });
}

// ── GALLERY ───────────────────────────────────────────────────
let currentGalleryImageData = null;

function loadGallery() {
    const data = getData('gallery_db', DEFAULT_GALLERY);
    const catColors = { belajar: '00d4ff', keseruan: '00ff88', event: '7b2ff7', candid: 'ffae00' };
    const grid = document.getElementById('gallery-grid-admin');
    grid.innerHTML = data.map(g => `
        <div class="group relative aspect-square rounded-xl overflow-hidden border border-white/5">
            <img src="${g.image || `https://placehold.co/400x400/${g.color}/fff?text=${g.category.toUpperCase()}`}"
                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="${escHtml(g.title)}" loading="lazy">
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <span class="text-[10px] font-bold uppercase mb-1" style="color:#${catColors[g.category]||'fff'}">${g.category}</span>
                <p class="text-white text-xs font-medium leading-tight mb-2 line-clamp-2">${escHtml(g.title)}</p>
                <div class="flex gap-1">
                    <button class="flex-1 btn-edit text-[10px] py-1" onclick="editGallery(${g.id})">✏️ Edit</button>
                    <button class="btn-danger text-[10px] py-1 px-2" onclick="deleteGallery(${g.id})">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

function openGalleryModal(id = null) {
    document.getElementById('gallery-form').reset();
    document.getElementById('gallery-id').value = '';
    currentGalleryImageData = null;
    document.getElementById('gallery-img-preview-wrap').innerHTML = '<p class="text-3xl mb-1">📷</p><p class="text-xs text-gray-500">Klik atau drag foto ke sini</p>';
    if (id) {
        const g = getData('gallery_db', DEFAULT_GALLERY).find(x => x.id === id);
        if (g) {
            document.getElementById('gallery-id').value = g.id;
            document.getElementById('gallery-title').value = g.title;
            document.getElementById('gallery-category').value = g.category;
            if (g.image) {
                currentGalleryImageData = g.image;
                document.getElementById('gallery-img-preview-wrap').innerHTML = `<img src="${g.image}" class="max-h-32 rounded-lg mx-auto">`;
            }
        }
    }
    openModal('gallery-modal');
}

function editGallery(id) { openGalleryModal(id); }

function previewGalleryImage(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        currentGalleryImageData = e.target.result;
        document.getElementById('gallery-img-preview-wrap').innerHTML = `<img src="${e.target.result}" class="max-h-32 rounded-lg mx-auto">`;
    };
    reader.readAsDataURL(file);
}

document.getElementById('gallery-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const data_arr = getData('gallery_db', DEFAULT_GALLERY);
    const id = parseInt(document.getElementById('gallery-id').value);
    const cat = document.getElementById('gallery-category').value;
    const catColors = { belajar: '00d4ff', keseruan: '00ff88', event: '7b2ff7', candid: 'ffae00' };
    const data = {
        title: document.getElementById('gallery-title').value.trim(),
        category: cat,
        color: catColors[cat] || '7b2ff7',
        image: currentGalleryImageData,
        span: 'col-span-1'
    };
    if (!data.title) return showToast('Judul foto wajib diisi!', 'error');
    if (id) {
        const idx = data_arr.findIndex(g => g.id === id);
        if (idx > -1) data_arr[idx] = { ...data_arr[idx], ...data };
        showToast('Foto berhasil diperbarui!');
    } else {
        data.id = nextId(data_arr);
        data_arr.push(data);
        showToast('Foto berhasil ditambahkan!');
    }
    saveData('gallery_db', data_arr);
    closeModal('gallery-modal');
    loadGallery();
});

function deleteGallery(id) {
    confirmDelete('Hapus foto ini dari gallery?', () => {
        saveData('gallery_db', getData('gallery_db', DEFAULT_GALLERY).filter(x => x.id !== id));
        loadGallery();
        showToast('Foto berhasil dihapus.');
    });
}

// ── GUESTBOOK ─────────────────────────────────────────────────
function loadGuestbook() {
    const messages = JSON.parse(localStorage.getItem('xrpl_guestbook') || '[]');
    const el = document.getElementById('guestbook-admin');
    if (messages.length === 0) {
        el.innerHTML = '<p class="text-gray-500 text-sm italic text-center py-12">Belum ada pesan di guestbook.</p>';
        return;
    }
    el.innerHTML = messages.slice().reverse().map((m, i) => `
        <div class="p-4 flex items-start gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-cyber-blue/30 to-electric-purple/30 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">${(m.name||'?')[0].toUpperCase()}</div>
            <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2 flex-wrap">
                    <span class="text-white text-sm font-semibold">${escHtml(m.name)}</span>
                    <span class="text-gray-500 text-xs">${m.date}</span>
                </div>
                <p class="text-gray-300 text-sm mt-0.5 break-words">${escHtml(m.text)}</p>
            </div>
            <button onclick="deleteGuestbookMsg(${messages.length - 1 - i})" class="btn-danger text-xs py-1 px-2 flex-shrink-0">🗑️</button>
        </div>
    `).join('');
}

function deleteGuestbookMsg(idx) {
    const msgs = JSON.parse(localStorage.getItem('xrpl_guestbook') || '[]');
    msgs.splice(idx, 1);
    localStorage.setItem('xrpl_guestbook', JSON.stringify(msgs));
    loadGuestbook();
    updateOverview();
    showToast('Pesan berhasil dihapus.');
}

function clearAllGuestbook() {
    confirmDelete('Hapus SEMUA pesan guestbook? Tindakan ini tidak bisa dibatalkan!', () => {
        localStorage.removeItem('xrpl_guestbook');
        loadGuestbook();
        updateOverview();
        showToast('Semua pesan berhasil dihapus.');
    });
}

// ── SETTINGS ──────────────────────────────────────────────────
function changePassword(e) {
    e.preventDefault();
    const oldPw = document.getElementById('old-password').value;
    const newPw = document.getElementById('new-password').value;
    const confirmPw = document.getElementById('confirm-password').value;

    const savedCreds = JSON.parse(localStorage.getItem('xrpl_admin_credentials') || 'null');
    const currentPw = savedCreds ? savedCreds.password : 'admin123';

    if (oldPw !== currentPw) return showToast('Password lama salah!', 'error');
    if (newPw !== confirmPw) return showToast('Konfirmasi password tidak cocok!', 'error');
    if (newPw.length < 6) return showToast('Password baru minimal 6 karakter!', 'error');

    const user = JSON.parse(localStorage.getItem('xrpl_admin_user') || '{}');
    localStorage.setItem('xrpl_admin_credentials', JSON.stringify({ username: user.username || 'admin', password: newPw }));
    document.getElementById('change-password-form').reset();
    showToast('Password berhasil diubah! Silakan login ulang.');
    setTimeout(() => {
        localStorage.removeItem('xrpl_admin_logged_in');
        window.location.href = 'login.html';
    }, 2000);
}

function exportData() {
    const exportObj = {
        exported_at: new Date().toISOString(),
        students: getData('students_db', DEFAULT_STUDENTS),
        struktur: getData('struktur_db', DEFAULT_STRUKTUR),
        projects: getData('projects_db', DEFAULT_PROJECTS),
        gallery: getData('gallery_db', DEFAULT_GALLERY),
        guestbook: JSON.parse(localStorage.getItem('xrpl_guestbook') || '[]')
    };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `xrpl_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Data berhasil diexport!');
}

function importData(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.students) saveData('students_db', data.students);
            if (data.struktur) saveData('struktur_db', data.struktur);
            if (data.projects) saveData('projects_db', data.projects);
            if (data.gallery) saveData('gallery_db', data.gallery);
            if (data.guestbook) localStorage.setItem('xrpl_guestbook', JSON.stringify(data.guestbook));
            showToast('Import berhasil! Halaman akan dimuat ulang...');
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            showToast('File JSON tidak valid!', 'error');
        }
    };
    reader.readAsText(file);
}

// ── UTIL ──────────────────────────────────────────────────────
function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── MY PROFILE (STUDENT) ──────────────────────────────────────
let myCurrentPhotoData = null;

function loadMyProfile() {
    if (window.CURRENT_ROLE !== 'student') return;
    
    // Fallback: Ambil dari localStorage karena GET /api/students.php belum difilter proper 1 per 1 untuk student
    // Atau ambil dari list via GET /api/students.php
    fetch('api/students.php')
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                const me = data.data.find(s => s.id == window.CURRENT_USER_ID);
                if (me) {
                    if (me.photo) {
                        document.getElementById('my-photo-preview').src = 'uploads/students/' + me.photo;
                    } else {
                        document.getElementById('my-photo-preview').src = `https://placehold.co/160x160/${me.color||'00d4ff'}/fff?text=${me.name[0]}`;
                    }
                    document.getElementById('my-motto').value = me.motto || '';
                    document.getElementById('my-dream').value = me.dream || '';
                    document.getElementById('my-quote').value = me.quote || '';
                }
            }
        }).catch(err => {
            // Fallback localStorage mock
            const me = getData('students_db', DEFAULT_STUDENTS).find(s => s.id == window.CURRENT_USER_ID);
            if(me) {
                document.getElementById('my-photo-preview').src = me.photo || `https://placehold.co/160x160/${me.color}/fff?text=${me.name[0]}`;
                document.getElementById('my-motto').value = me.motto || '';
                document.getElementById('my-dream').value = me.dream || '';
                document.getElementById('my-quote').value = me.quote || '';
            }
        });
}

function uploadMyPhoto(input) {
    const file = input.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('type', 'students');
    formData.append('id', window.CURRENT_USER_ID);
    formData.append('photo', file);

    fetch('api/upload.php', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            document.getElementById('my-photo-preview').src = data.url;
            showToast('Foto profil berhasil diunggah!');
            loadMyProfile(); 
        } else {
            showToast(data.message || 'Gagal upload foto.', 'error');
        }
    })
    .catch(err => {
        showToast('Kesalahan koneksi saat upload.', 'error');
    });
}

function saveMyProfile(e) {
    e.preventDefault();
    const data = {
        motto: document.getElementById('my-motto').value,
        dream: document.getElementById('my-dream').value,
        quote: document.getElementById('my-quote').value
    };

    fetch(`api/students.php?id=${window.CURRENT_USER_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(res => {
        if(res.success) {
            showToast('Profil berhasil disimpan!');
            
            // Sync local storage for mock sync if local app.js still uses localStorage
            let students = getData('students_db', DEFAULT_STUDENTS);
            let idx = students.findIndex(s => s.id == window.CURRENT_USER_ID);
            if(idx > -1) {
                students[idx] = { ...students[idx], ...data };
                saveData('students_db', students);
            }
        } else {
            showToast(res.message || 'Gagal menyimpan', 'error');
        }
    })
    .catch(err => showToast('Gagal koneksi!', 'error'));
}

// ── MY SNAPSHOTS (STUDENT) ────────────────────────────────────
function loadMySnapshots() {
    fetch(`api/snapshots.php?student_id=${window.CURRENT_USER_ID}`)
    .then(res => res.json())
    .then(res => {
        if(res.success) {
            renderMySnapshots(res.data);
        }
    }).catch(err => {
        document.getElementById('my-snapshots-grid').innerHTML = '<p class="text-gray-500">API belum siap / error saat mengambil snapshot.</p>';
    });
}

function renderMySnapshots(snapshots) {
    const grid = document.getElementById('my-snapshots-grid');
    if (snapshots.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">Belum ada snapshot. Upload sekarang!</div>';
        return;
    }
    grid.innerHTML = snapshots.map(s => `
        <div class="glass rounded-xl overflow-hidden group">
            <div class="aspect-[4/5] bg-white/5 relative">
                <img src="${s.image_url}" class="w-full h-full object-cover group-hover:scale-105 transition-transform">
                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-end p-4 transition-opacity">
                    <p class="text-white text-xs mb-2 line-clamp-2">${escHtml(s.caption)}</p>
                    <div class="flex gap-2">
                        <button class="btn-danger w-full text-[10px] py-1.5" onclick="deleteMySnapshot(${s.id})">🗑️ Hapus</button>
                    </div>
                </div>
            </div>
            <div class="p-3 text-xs text-gray-400 flex justify-between">
                <span>❤️ ${s.likesCount || 0}</span>
                <span>💬 ${s.comments ? s.comments.length : 0}</span>
            </div>
        </div>
    `).join('');
}

function openMySnapshotModal() {
    document.getElementById('snapshot-form').reset();
    document.getElementById('snapshot-preview').classList.add('hidden');
    document.getElementById('snapshot-placeholder').classList.remove('hidden');
    openModal('snapshot-modal');
}

function previewSnapshotImage(input) {
    const file = input.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = e => {
            const preview = document.getElementById('snapshot-preview');
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            document.getElementById('snapshot-placeholder').classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
}

function saveMySnapshot(e) {
    e.preventDefault();
    const btn = document.getElementById('snapshot-save-btn');
    btn.disabled = true;
    btn.textContent = 'Uploading...';

    const formData = new FormData();
    formData.append('image', document.getElementById('snapshot-input').files[0]);
    formData.append('caption', document.getElementById('snapshot-caption').value);
    
    fetch('api/snapshots.php', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(res => {
        btn.disabled = false;
        btn.textContent = '📤 Upload';
        if(res.success) {
            showToast('Snapshot berhasil diunggah!');
            closeModal('snapshot-modal');
            loadMySnapshots();
        } else {
            showToast(res.message || 'Gagal uplaod', 'error');
        }
    })
    .catch(err => {
        btn.disabled = false;
        btn.textContent = '📤 Upload';
        showToast('Gagal koneksi ke server!', 'error');
    });
}

function deleteMySnapshot(id) {
    confirmDelete('Yakin hapus snapshot ini?', () => {
        fetch(`api/snapshots.php?id=${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(res => {
            if(res.success) {
                showToast('Snapshot sukses dihapus!');
                loadMySnapshots();
            } else {
                showToast(res.message || 'Gagal hapus', 'error');
            }
        });
    });
}

// ── INIT ──────────────────────────────────────────────────────
updateOverview();
