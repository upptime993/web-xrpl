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
    
    const titles = {
        overview: 'Overview',
        students: 'Kelola Murid',
        accounts: 'Akun Murid',
        struktur: 'Struktur Kelas',
        projects: 'Kelola Projek',
        gallery: 'Kelola Gallery',
        guestbook: 'Pesan Singkat',
        settings: 'Pengaturan',
        'my-profile': 'Profil Saya',
        'my-snapshots': 'My Snapshots'
    };
    document.getElementById('page-title').textContent = titles[tabId] || tabId;
    
    const loaders = { 
        students: loadStudents,
        accounts: loadAccounts,
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
    // Fetch semua data dari MongoDB API (real-time)
    Promise.all([
        fetch('api/students').then(r=>r.json()).catch(()=>({success:false,data:[]})),
        fetch('api/gallery').then(r=>r.json()).catch(()=>({success:false,data:[]})),
        fetch('api/guestbook').then(r=>r.json()).catch(()=>({success:false,data:[]})),
        fetch('api/projects').then(r=>r.json()).catch(()=>({success:false,data:[]})),
    ]).then(([students, gallery, guestbook, projects]) => {
        const sc = students.success ? students.data.length : getData('students_db', DEFAULT_STUDENTS).length;
        const gc = gallery.success ? gallery.data.length : getData('gallery_db', DEFAULT_GALLERY).length;
        const pc = projects.success ? projects.data.length : getData('projects_db', DEFAULT_PROJECTS).length;
        const msgList = guestbook.success ? guestbook.data : [];
        const msgCount = msgList.length;

        document.getElementById('ov-students').textContent = sc;
        document.getElementById('ov-projects').textContent = pc;
        document.getElementById('ov-gallery').textContent = gc;
        document.getElementById('ov-guestbook').textContent = msgCount;
        document.getElementById('student-count-badge').textContent = sc;
        document.getElementById('gb-count-badge').textContent = msgCount;
        document.getElementById('info-students').textContent = sc;
        document.getElementById('info-projects').textContent = pc;

        const recentEl = document.getElementById('ov-recent-messages');
        const recent = msgList.slice(0, 4);
        if (recent.length === 0) {
            recentEl.innerHTML = '<p class="text-gray-500 text-sm italic text-center py-6">Belum ada pesan</p>';
        } else {
            recentEl.innerHTML = recent.map(m => `
                <div class="flex gap-3 items-start border border-white/5 rounded-xl p-3">
                    <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-cyber-blue/30 to-electric-purple/30 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">${(m.name||'?')[0].toUpperCase()}</div>
                    <div class="min-w-0">
                        <div class="flex items-baseline gap-2"><span class="text-white text-sm font-semibold">${escHtml(m.name)}</span><span class="text-gray-500 text-xs">${m.date}</span></div>
                        <p class="text-gray-400 text-xs mt-0.5 truncate">${escHtml(m.text)}</p>
                    </div>
                </div>
            `).join('');
        }
    });
}

// ── STUDENTS (pakai MongoDB API, bukan localStorage) ───────────
let _studentsCache = []; // Cache data murid dari API

function loadStudents() {
    showToast('Memuat data murid...', 'info');
    fetch('api/students')
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                _studentsCache = data.data;
                renderStudents(_studentsCache);
                // Update localStorage juga agar halaman depan bisa pakai sebagai fallback
                const mapped = _studentsCache.map(s => ({
                    id: s.sort_order || 1,
                    _mongoId: s._id,
                    name: s.name,
                    quote: s.quote || '',
                    motto: s.motto || '',
                    dream: s.dream || '',
                    color: s.color || '00d4ff',
                    photo: s.photo || null
                }));
                localStorage.setItem('xrpl_students_db', JSON.stringify(mapped));
                updateOverview();
            } else {
                showToast('Gagal memuat murid: ' + data.message, 'error');
            }
        })
        .catch(err => {
            showToast('Koneksi database gagal. Menggunakan data lokal...', 'error');
            // Fallback ke localStorage jika API gagal
            const students = getData('students_db', DEFAULT_STUDENTS);
            _studentsCache = students;
            renderStudents(students);
        });

    document.getElementById('search-students').oninput = function() {
        const term = this.value.toLowerCase();
        renderStudents(_studentsCache.filter(s => (s.name || '').toLowerCase().includes(term)));
    };
}

function renderStudents(students) {
    const tbody = document.getElementById('students-tbody');
    if (!students || students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500">Tidak ada murid ditemukan 😢</td></tr>`;
        return;
    }
    tbody.innerHTML = students.map(s => {
        // Support format MongoDB (_id) dan format lama (id numerik)
        const mongoId = s._id ? s._id.toString() : null;
        const displayId = s.sort_order || s.id || '-';
        const editParam = mongoId ? `'${mongoId}'` : s.id;
        return `
        <tr class="table-row">
            <td class="p-4">
                <div class="flex items-center gap-3">
                    ${getAvatarHtml(s, 38)}
                    <div>
                        <p class="text-white font-semibold text-sm">${escHtml(s.name)}</p>
                        <p class="text-gray-500 text-xs font-mono">No. ${displayId} ${s.username ? `| @${escHtml(s.username)}` : ''}</p>
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
                    <button class="btn-edit" onclick="editStudent(${editParam})">✏️ Edit</button>
                    <button class="btn-danger" onclick="deleteStudent(${editParam})">🗑️</button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
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
        // Cari dari cache MongoDB (support ObjectId string atau id numerik)
        const s = _studentsCache.find(x =>
            (x._id && x._id.toString() === String(studentId)) ||
            (x.id === studentId)
        ) || getData('students_db', DEFAULT_STUDENTS).find(x => x.id === studentId);
        if (!s) return;

        // Simpan ObjectId MongoDB (atau id numerik) di hidden field
        document.getElementById('student-id').value = s._id ? s._id.toString() : (s.id || '');
        document.getElementById('student-name').value = s.name || '';
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
    const mongoId = document.getElementById('student-id').value.trim(); // bisa '' (baru) atau ObjectId string
    const data = {
        name: document.getElementById('student-name').value.trim(),
        dream: document.getElementById('student-dream').value.trim(),
        motto: document.getElementById('student-motto').value.trim(),
        quote: document.getElementById('student-quote').value.trim(),
        color: currentStudentColor,
        photo: currentStudentPhotoData || null
    };
    if (!data.name) return showToast('Nama murid wajib diisi!', 'error');

    const btn = this.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    if (mongoId) {
        // UPDATE murid yang sudah ada
        fetch(`api/students?id=${mongoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(r => r.json())
        .then(res => {
            if (btn) btn.disabled = false;
            if (res.success) {
                showToast(`Data ${data.name} berhasil diperbarui!`);
                closeModal('student-modal');
                loadStudents();
            } else {
                showToast(res.message || 'Gagal update murid.', 'error');
            }
        })
        .catch(() => { if (btn) btn.disabled = false; showToast('Koneksi gagal.', 'error'); });
    } else {
        // TAMBAH murid baru
        fetch('api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(r => r.json())
        .then(res => {
            if (btn) btn.disabled = false;
            if (res.success) {
                showToast(`✅ ${res.message}`);
                closeModal('student-modal');
                loadStudents();
            } else {
                showToast(res.message || 'Gagal menambah murid.', 'error');
            }
        })
        .catch(() => { if (btn) btn.disabled = false; showToast('Koneksi gagal.', 'error'); });
    }
});

function deleteStudent(id) {
    // id bisa ObjectId string atau number
    const student = _studentsCache.find(x => (x._id && x._id.toString() === String(id)) || x.id === id);
    const name = student ? student.name : 'Murid ini';
    confirmDelete(`Hapus murid "${name}"? Aksi ini tidak bisa dibatalkan.`, () => {
        fetch(`api/students?id=${id}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                showToast('Murid berhasil dihapus.');
                loadStudents();
            } else {
                showToast(res.message || 'Gagal menghapus murid.', 'error');
            }
        })
        .catch(() => showToast('Koneksi gagal.', 'error'));
    });
}

// ── STRUKTUR KELAS (MongoDB API) ────────────────────────────────
let currentStrukturColor = '00d4ff';
let _strukturCache = [];

function loadStruktur() {
    const grid = document.getElementById('struktur-grid');
    grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">Memuat data...</p>';

    fetch('api/struktur')
        .then(r => r.json())
        .then(res => {
            if (!res.success) throw new Error(res.message);
            _strukturCache = res.data;
            renderStrukturGrid(_strukturCache);
        })
        .catch(() => {
            // Fallback localStorage
            _strukturCache = getData('struktur_db', DEFAULT_STRUKTUR);
            renderStrukturGrid(_strukturCache);
        });
}

function renderStrukturGrid(data) {
    const grid = document.getElementById('struktur-grid');
    const levelLabels = { 0: 'Wali Kelas', 0.5: 'Guru Produktif', 1: 'Ketua / Wakil', 2: 'Staff' };
    const levelGrad = {
        0: 'from-cyber-blue/20 to-cyber-blue/5 border-cyber-blue/20',
        0.5: 'from-yellow-400/20 to-yellow-400/5 border-yellow-400/20',
        1: 'from-electric-purple/20 to-electric-purple/5 border-electric-purple/20',
        2: 'from-neon-green/20 to-neon-green/5 border-neon-green/20',
        3: 'from-white/10 to-white/5 border-white/10'
    };
    if (!data || data.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">Belum ada jabatan. Klik "Tambah Jabatan".</p>';
        return;
    }
    grid.innerHTML = data.map(s => {
        const gradClass = levelGrad[parseFloat(s.level)] || levelGrad[2];
        const idParam = s._id ? `'${s._id.toString()}'` : s.id;
        return `
        <div class="glass rounded-2xl p-5 bg-gradient-to-br ${gradClass} relative group">
            <div class="flex items-center gap-3 mb-3">
                ${getAvatarHtml(s, 48)}
                <div>
                    <p class="text-white font-semibold">${escHtml(s.name)}</p>
                    <p class="text-xs font-medium" style="color:#${s.color}">${escHtml(s.jabatan)}</p>
                    <span class="text-[10px] text-gray-500">${levelLabels[parseFloat(s.level)] || 'Staff'}</span>
                </div>
            </div>
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="btn-edit flex-1 text-xs py-1.5" onclick="editStruktur(${idParam})">✏️ Edit</button>
                <button class="btn-danger text-xs py-1.5 px-3" onclick="deleteStruktur(${idParam})">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function openStrukturModal(id = null) {
    document.getElementById('struktur-modal-title').textContent = id ? 'Edit Jabatan' : 'Tambah Jabatan';
    document.getElementById('struktur-form').reset();
    document.getElementById('struktur-id').value = '';
    currentStrukturColor = '00d4ff';
    setStrukturColor('00d4ff', document.querySelector('.str-color-pick[data-color="00d4ff"]'));
    if (id) {
        const s = _strukturCache.find(x => (x._id && x._id.toString() === String(id)) || x.id === id);
        if (!s) return;
        document.getElementById('struktur-id').value = s._id ? s._id.toString() : (s.id || '');
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
    const mongoId = document.getElementById('struktur-id').value.trim();
    const data = {
        name: document.getElementById('struktur-name').value.trim(),
        jabatan: document.getElementById('struktur-jabatan').value.trim(),
        level: parseFloat(document.getElementById('struktur-level').value),
        color: currentStrukturColor,
        photo: null
    };
    if (!data.name || !data.jabatan) return showToast('Nama dan jabatan wajib diisi!', 'error');

    // Validasi Guru Produktif maks 5
    if (data.level === 0.5 && !mongoId) {
        const gpCount = _strukturCache.filter(s => parseFloat(s.level) === 0.5).length;
        if (gpCount >= 5) return showToast('Guru Produktif sudah mencapai maksimum (5)!', 'error');
    }

    const btn = this.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    if (mongoId) {
        fetch(`api/struktur?id=${mongoId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        })
        .then(r => r.json())
        .then(res => {
            if (btn) btn.disabled = false;
            if (res.success) { showToast('Jabatan berhasil diperbarui!'); closeModal('struktur-modal'); loadStruktur(); }
            else showToast(res.message || 'Gagal update.', 'error');
        })
        .catch(() => { if (btn) btn.disabled = false; showToast('Koneksi gagal.', 'error'); });
    } else {
        fetch('api/struktur', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        })
        .then(r => r.json())
        .then(res => {
            if (btn) btn.disabled = false;
            if (res.success) { showToast('Jabatan berhasil ditambahkan!'); closeModal('struktur-modal'); loadStruktur(); }
            else showToast(res.message || 'Gagal tambah.', 'error');
        })
        .catch(() => { if (btn) btn.disabled = false; showToast('Koneksi gagal.', 'error'); });
    }
});

function deleteStruktur(id) {
    const s = _strukturCache.find(x => (x._id && x._id.toString() === String(id)) || x.id === id);
    confirmDelete(`Hapus "${s?.jabatan}" dari struktur?`, () => {
        fetch(`api/struktur?id=${id}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(res => {
            if (res.success) { showToast('Jabatan berhasil dihapus.'); loadStruktur(); }
            else showToast(res.message || 'Gagal hapus.', 'error');
        })
        .catch(() => showToast('Koneksi gagal.', 'error'));
    });
}

// ── PROJECTS (MongoDB API) ──────────────────────────────────────
let currentProjectImageData = null;
let _projectsCache = [];

function loadProjects() {
    const grid = document.getElementById('projects-grid');
    grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">Memuat projek...</p>';

    fetch('api/projects')
        .then(r => r.json())
        .then(res => {
            if (!res.success) throw new Error(res.message);
            _projectsCache = res.data;
            renderProjectsGrid(_projectsCache);
        })
        .catch(() => {
            // Fallback ke localStorage
            _projectsCache = getData('projects_db', DEFAULT_PROJECTS);
            renderProjectsGrid(_projectsCache);
        });
}

function renderProjectsGrid(data) {
    const grid = document.getElementById('projects-grid');
    if (!data || data.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">Belum ada projek. Tambahkan sekarang!</p>';
        return;
    }
    grid.innerHTML = data.map(p => {
        const mongoId = p._id ? p._id.toString() : null;
        const idParam = mongoId ? `'${mongoId}'` : p.id;
        return `
        <div class="glass rounded-2xl overflow-hidden group flex flex-col" style="border-color: #${p.color || '00d4ff'}30">
            <div class="aspect-video overflow-hidden relative bg-white/5">
                <img src="${p.image || `https://placehold.co/600x338/${p.color || '00d4ff'}/fff?text=${encodeURIComponent(p.title)}`}"
                    alt="${escHtml(p.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 lazy-img">
            </div>
            <div class="p-5 flex-1 flex flex-col">
                <h3 class="text-white font-semibold mb-1">${escHtml(p.title)}</h3>
                <p class="text-gray-400 text-xs mb-3 flex-1 line-clamp-2">${escHtml(p.description || '')}</p>
                <div class="flex flex-wrap gap-1 mb-4">
                    ${(p.tags||[]).map(t => `<span class="text-[10px] px-2 py-0.5 rounded-full border" style="color:#${p.color};border-color:#${p.color}40;background:#${p.color}10">${escHtml(t)}</span>`).join('')}
                </div>
                <div class="flex gap-2">
                    <button class="btn-edit flex-1 text-xs py-1.5" onclick="editProject(${idParam})">✏️ Edit</button>
                    <button class="btn-danger text-xs py-1.5 px-3" onclick="deleteProject(${idParam})">🗑️</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function openProjectModal(id = null) {
    document.getElementById('project-modal-title').textContent = id ? 'Edit Projek' : 'Tambah Projek';
    document.getElementById('project-form').reset();
    document.getElementById('project-id').value = '';
    currentProjectImageData = null;
    document.getElementById('project-img-preview-wrap').innerHTML = '<p class="text-2xl mb-1">🖼️</p><p class="text-xs text-gray-500">Klik untuk upload gambar</p>';
    if (id) {
        const p = _projectsCache.find(x => (x._id && x._id.toString() === String(id)) || x.id === id);
        if (!p) return;
        document.getElementById('project-id').value = p._id ? p._id.toString() : (p.id || '');
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
    const mongoId = document.getElementById('project-id').value.trim();
    const tags = document.getElementById('project-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    const colors = ['00d4ff','7b2ff7','00ff88','ff00aa','ffae00'];
    const data = {
        title: document.getElementById('project-title').value.trim(),
        description: document.getElementById('project-desc').value.trim(),
        tags,
        link: document.getElementById('project-link').value.trim(),
        image: currentProjectImageData,
        color: colors[_projectsCache.length % colors.length]
    };
    if (!data.title) return showToast('Judul projek wajib diisi!', 'error');

    const btn = this.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    if (mongoId) {
        // UPDATE
        fetch(`api/projects?id=${mongoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(r => r.json())
        .then(res => {
            if (btn) btn.disabled = false;
            if (res.success) {
                showToast('Projek berhasil diperbarui!');
                closeModal('project-modal');
                loadProjects();
                updateOverview();
            } else {
                showToast(res.message || 'Gagal update projek.', 'error');
            }
        })
        .catch(() => { if (btn) btn.disabled = false; showToast('Koneksi gagal.', 'error'); });
    } else {
        // TAMBAH BARU
        fetch('api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(r => r.json())
        .then(res => {
            if (btn) btn.disabled = false;
            if (res.success) {
                showToast('Projek berhasil ditambahkan!');
                closeModal('project-modal');
                loadProjects();
                updateOverview();
            } else {
                showToast(res.message || 'Gagal tambah projek.', 'error');
            }
        })
        .catch(() => { if (btn) btn.disabled = false; showToast('Koneksi gagal.', 'error'); });
    }
});

function deleteProject(id) {
    const p = _projectsCache.find(x => (x._id && x._id.toString() === String(id)) || x.id === id);
    confirmDelete(`Hapus projek "${p?.title}"?`, () => {
        fetch(`api/projects?id=${id}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                showToast('Projek berhasil dihapus.');
                loadProjects();
                updateOverview();
            } else {
                showToast(res.message || 'Gagal hapus projek.', 'error');
            }
        })
        .catch(() => showToast('Koneksi gagal.', 'error'));
    });
}

// ── GALLERY (MongoDB API) ──────────────────────────────────────
let currentGalleryImageData = null;
let _galleryCache = [];

function loadGallery() {
    const grid = document.getElementById('gallery-grid-admin');
    grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">Memuat gallery...</p>';

    fetch('api/gallery')
        .then(r => r.json())
        .then(res => {
            if (!res.success) throw new Error(res.message);
            _galleryCache = res.data;
            renderGalleryAdmin(_galleryCache);
        })
        .catch(() => {
            _galleryCache = getData('gallery_db', DEFAULT_GALLERY);
            renderGalleryAdmin(_galleryCache);
        });
}

function renderGalleryAdmin(data) {
    const grid = document.getElementById('gallery-grid-admin');
    const catColors = { belajar: '00d4ff', keseruan: '00ff88', event: '7b2ff7', candid: 'ffae00' };
    if (!data || data.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">Belum ada foto. Upload sekarang!</p>';
        return;
    }
    grid.innerHTML = data.map(g => {
        const mongoId = g._id ? g._id.toString() : null;
        const idParam = mongoId ? `'${mongoId}'` : g.id;
        const cat = g.category || 'event';
        return `
        <div class="group relative aspect-square rounded-xl overflow-hidden border border-white/5">
            <img src="${g.image || `https://placehold.co/400x400/${g.color || '7b2ff7'}/fff?text=${cat.toUpperCase()}`}"
                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="${escHtml(g.title)}" loading="lazy">
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <span class="text-[10px] font-bold uppercase mb-1" style="color:#${catColors[cat]||'fff'}">${cat}</span>
                <p class="text-white text-xs font-medium leading-tight mb-2 line-clamp-2">${escHtml(g.title)}</p>
                <div class="flex gap-1">
                    <button class="flex-1 btn-edit text-[10px] py-1" onclick="editGallery(${idParam})">✏️ Edit</button>
                    <button class="btn-danger text-[10px] py-1 px-2" onclick="deleteGallery(${idParam})">🗑️</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function openGalleryModal(id = null) {
    document.getElementById('gallery-form').reset();
    document.getElementById('gallery-id').value = '';
    currentGalleryImageData = null;
    document.getElementById('gallery-img-preview-wrap').innerHTML = '<p class="text-3xl mb-1">📷</p><p class="text-xs text-gray-500">Klik atau drag foto ke sini</p>';
    if (id) {
        const g = _galleryCache.find(x => (x._id && x._id.toString() === String(id)) || x.id === id);
        if (g) {
            document.getElementById('gallery-id').value = g._id ? g._id.toString() : (g.id || '');
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
    const mongoId = document.getElementById('gallery-id').value.trim();
    const cat = document.getElementById('gallery-category').value;
    const catColors = { belajar: '00d4ff', keseruan: '00ff88', event: '7b2ff7', candid: 'ffae00' };
    const data = {
        title: document.getElementById('gallery-title').value.trim(),
        category: cat,
        color: catColors[cat] || '7b2ff7',
        image: currentGalleryImageData,
    };
    if (!data.title) return showToast('Judul foto wajib diisi!', 'error');

    const btn = this.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    if (mongoId) {
        fetch(`api/gallery?id=${mongoId}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
        })
        .then(r => r.json())
        .then(res => {
            if (btn) btn.disabled = false;
            if (res.success) { showToast('Foto berhasil diperbarui!'); closeModal('gallery-modal'); loadGallery(); }
            else showToast(res.message || 'Gagal update.', 'error');
        })
        .catch(() => { if (btn) btn.disabled = false; showToast('Koneksi gagal.', 'error'); });
    } else {
        fetch('api/gallery', {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
        })
        .then(r => r.json())
        .then(res => {
            if (btn) btn.disabled = false;
            if (res.success) { showToast('Foto berhasil ditambahkan!'); closeModal('gallery-modal'); loadGallery(); }
            else showToast(res.message || 'Gagal tambah.', 'error');
        })
        .catch(() => { if (btn) btn.disabled = false; showToast('Koneksi gagal.', 'error'); });
    }
});

function deleteGallery(id) {
    confirmDelete('Hapus foto ini dari gallery?', () => {
        fetch(`api/gallery?id=${id}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(res => {
            if (res.success) { loadGallery(); showToast('Foto berhasil dihapus.'); }
            else showToast(res.message || 'Gagal hapus.', 'error');
        })
        .catch(() => showToast('Koneksi gagal.', 'error'));
    });
}

// ── PESAN SINGKAT / GUESTBOOK (MongoDB API) ───────────────────
function loadGuestbook() {
    const el = document.getElementById('guestbook-admin');
    el.innerHTML = '<p class="text-gray-500 text-sm italic text-center py-12">Memuat pesan...</p>';

    fetch('api/guestbook')
        .then(r => r.json())
        .then(res => {
            if (!res.success) throw new Error(res.message);
            const messages = res.data;

            // Update statistik
            const today = new Date();
            const todayStr = today.toDateString();
            const weekAgo = new Date(today - 7 * 86400000);
            const todayCount = messages.filter(m => m.created_at && new Date(m.created_at).toDateString() === todayStr).length;
            const weekCount = messages.filter(m => m.created_at && new Date(m.created_at) >= weekAgo).length;

            document.getElementById('gb-stat-total').textContent = messages.length;
            document.getElementById('gb-stat-today').textContent = todayCount;
            document.getElementById('gb-stat-week').textContent = weekCount;
            document.getElementById('gb-count-badge').textContent = messages.length;

            if (messages.length === 0) {
                el.innerHTML = '<p class="text-gray-500 text-sm italic text-center py-12">Belum ada pesan singkat.</p>';
                return;
            }
            el.innerHTML = messages.map(m => `
                <div class="msg-card">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyber-blue/30 to-electric-purple/30 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">${(m.name||'?')[0].toUpperCase()}</div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-baseline gap-2 flex-wrap mb-1">
                                <span class="text-white text-sm font-semibold">${escHtml(m.name)}</span>
                                <span class="text-gray-500 text-xs">📅 ${m.date || '-'}</span>
                            </div>
                            <p class="text-gray-300 text-sm break-words leading-relaxed">${escHtml(m.text)}</p>
                        </div>
                        <button onclick="deleteGuestbookMsg('${m.id}')" class="btn-danger text-xs py-1 px-2 flex-shrink-0">🗑️</button>
                    </div>
                </div>
            `).join('');
        })
        .catch(err => {
            el.innerHTML = '<p class="text-red-400 text-sm text-center py-12">Gagal memuat pesan. Cek koneksi database.</p>';
        });
}

function deleteGuestbookMsg(id) {
    fetch(`api/guestbook?id=${id}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(res => {
        if (res.success) { loadGuestbook(); showToast('Pesan berhasil dihapus.'); }
        else showToast(res.message || 'Gagal hapus.', 'error');
    })
    .catch(() => showToast('Koneksi gagal.', 'error'));
}

function clearAllGuestbook() {
    confirmDelete('Hapus SEMUA pesan singkat? Tidak bisa dibatalkan!', () => {
        fetch('api/guestbook?all=true', { method: 'DELETE' })
        .then(r => r.json())
        .then(res => {
            if (res.success) { loadGuestbook(); showToast('Semua pesan berhasil dihapus.'); }
            else showToast(res.message || 'Gagal hapus.', 'error');
        })
        .catch(() => showToast('Koneksi gagal.', 'error'));
    });
}

// ── AKUN MURID (Accounts Tab) ─────────────────────────────────
function loadAccounts() {
    const el = document.getElementById('accounts-list');
    el.innerHTML = '<p class="text-gray-500 text-sm italic text-center py-8">Memuat akun murid...</p>';

    fetch('api/students')
    .then(r => r.json())
    .then(res => {
        if (!res.success) throw new Error(res.message);
        const students = res.data;
        document.getElementById('accounts-count').textContent = `${students.length} akun`;

        if (students.length === 0) {
            el.innerHTML = '<p class="text-gray-500 text-sm italic text-center py-8">Belum ada murid yang terdaftar.</p>';
            return;
        }
        el.innerHTML = students.map(s => {
            const username = s.username || (s.name || '').toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
            return `
            <div class="account-row">
                <div class="flex items-center gap-3">
                    ${getAvatarHtml(s, 38)}
                    <div>
                        <p class="text-white text-sm font-semibold">${escHtml(s.name || '-')}</p>
                        <p class="text-gray-500 text-xs font-mono">@${escHtml(username)}</p>
                    </div>
                </div>
                <span class="acc-badge border-neon-green/40 text-neon-green bg-neon-green/10 text-[10px]">Aktif</span>
                <div class="flex gap-2">
                    <button class="btn-edit text-xs py-1 px-3" onclick="quickResetPassword('${escHtml(username)}')">🔑 Reset</button>
                </div>
            </div>`;
        }).join('');
    })
    .catch(() => {
        el.innerHTML = '<p class="text-red-400 text-sm text-center py-8">Gagal memuat akun. Cek koneksi database.</p>';
    });
}

function quickResetPassword(username) {
    document.getElementById('reset-username').value = username;
    document.getElementById('reset-new-password').focus();
    showToast(`Username @${username} siap di-reset. Masukkan password baru!`, 'info');
}

function resetStudentPassword() {
    const username = document.getElementById('reset-username').value.trim();
    const newPw = document.getElementById('reset-new-password').value;
    if (!username) return showToast('Masukkan username murid!', 'error');
    if (!newPw || newPw.length < 6) return showToast('Password minimal 6 karakter!', 'error');

    fetch('api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, newPassword: newPw })
    })
    .then(r => r.json())
    .then(res => {
        if (res.success) {
            document.getElementById('reset-username').value = '';
            document.getElementById('reset-new-password').value = '';
            showToast(`✅ Password @${username} berhasil direset!`);
        } else {
            showToast(res.message || 'Gagal reset password.', 'error');
        }
    })
    .catch(() => showToast('Koneksi gagal.', 'error'));
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

    fetch('api/students')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // BUGFIX: Cari berdasarkan _id MongoDB (ObjectId string), bukan id numerik
                const currentUserId = String(window.CURRENT_USER_ID);
                const me = data.data.find(s =>
                    (s._id && s._id.toString() === currentUserId) ||
                    (s.id && String(s.id) === currentUserId) ||
                    (s.username && localStorage.getItem('xrpl_admin_user') &&
                        JSON.parse(localStorage.getItem('xrpl_admin_user')).username === s.username)
                );

                if (me) {
                    // BUGFIX: photo sudah berupa URL/base64 lengkap dari MongoDB, tidak perlu prefix 'uploads/students/'
                    const photoSrc = me.photo
                        ? me.photo  // sudah berupa data URL atau URL lengkap
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(me.name || 'Murid')}&background=${me.color || '00d4ff'}&color=fff&size=160`;
                    document.getElementById('my-photo-preview').src = photoSrc;
                    document.getElementById('my-motto').value = me.motto || '';
                    document.getElementById('my-dream').value = me.dream || '';
                    document.getElementById('my-quote').value = me.quote || '';

                    // Simpan _id MongoDB ke variabel global untuk keperluan update
                    window.CURRENT_MONGO_ID = me._id ? me._id.toString() : null;
                } else {
                    // Jika tidak ditemukan, tampilkan form kosong dengan avatar default
                    const user = JSON.parse(localStorage.getItem('xrpl_admin_user') || '{}');
                    document.getElementById('my-photo-preview').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'Murid')}&background=00d4ff&color=fff&size=160`;
                }
            }
        })
        .catch(() => {
            // Fallback localStorage
            const me = getData('students_db', DEFAULT_STUDENTS).find(s => s.id == window.CURRENT_USER_ID);
            if (me) {
                document.getElementById('my-photo-preview').src = me.photo || `https://placehold.co/160x160/${me.color || '00d4ff'}/fff?text=${(me.name || 'M')[0]}`;
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

    fetch('api/upload', {
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

    // BUGFIX: Gunakan CURRENT_MONGO_ID (ObjectId) jika tersedia, fallback ke CURRENT_USER_ID
    const targetId = window.CURRENT_MONGO_ID || window.CURRENT_USER_ID;

    fetch(`api/students?id=${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast('Profil berhasil disimpan!');
        } else {
            showToast(res.message || 'Gagal menyimpan', 'error');
        }
    })
    .catch(() => showToast('Gagal koneksi!', 'error'));
}

// ── MY SNAPSHOTS (STUDENT) ────────────────────────────────────
function loadMySnapshots() {
    fetch(`api/snapshots?student_id=${window.CURRENT_USER_ID}`)
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
    const imageFile = document.getElementById('snapshot-input').files[0];
    const caption = document.getElementById('snapshot-caption').value;

    if (!imageFile) return showToast('Pilih foto terlebih dahulu!', 'error');

    btn.disabled = true;
    btn.textContent = 'Uploading...';

    // BUGFIX: Sertakan student_id agar snapshot terkait dengan murid yang login
    const studentId = window.CURRENT_MONGO_ID || window.CURRENT_USER_ID;

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('caption', caption);
    formData.append('student_id', studentId);

    fetch('api/snapshots', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(res => {
        btn.disabled = false;
        btn.textContent = '📤 Upload';
        if (res.success) {
            showToast('Snapshot berhasil diunggah!');
            closeModal('snapshot-modal');
            loadMySnapshots();
        } else {
            showToast(res.message || 'Gagal upload snapshot.', 'error');
        }
    })
    .catch(() => {
        btn.disabled = false;
        btn.textContent = '📤 Upload';
        showToast('Gagal koneksi ke server!', 'error');
    });
}

function deleteMySnapshot(id) {
    confirmDelete('Yakin hapus snapshot ini?', () => {
        fetch(`api/snapshots?id=${id}`, { method: 'DELETE' })
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
