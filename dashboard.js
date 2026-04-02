// ============================================================
// dashboard.js — Logika Admin Dashboard X RPL  [v2.0]
// Full MongoDB API — No localStorage fallback
// ============================================================

// ── HELPER FETCH ────────────────────────────────────────────
async function safeFetch(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
}

// ── AUTH CHECK (via API, not localStorage) ──────────────────
let _authRedirecting = false;

(async function checkAuth() {
    try {
        const res = await fetch('api/auth');

        // Kalau network error / server down, res tidak ada → masuk catch
        // Kalau dapat response, baru parse
        const data = await res.json();

        if (!data.loggedIn) {
            // Memang tidak login (token invalid/expired) → redirect
            if (!_authRedirecting) {
                _authRedirecting = true;
                localStorage.removeItem('xrpl_admin_logged_in');
                localStorage.removeItem('xrpl_admin_user');
                window.location.href = 'login.html';
            }
            return;
        }

        const user = data.user;
        // Save to localStorage for page reference only
        localStorage.setItem('xrpl_admin_logged_in', 'true');
        localStorage.setItem('xrpl_admin_user', JSON.stringify(user));

        document.getElementById('user-name').textContent = user.full_name || 'Administrator';
        document.getElementById('user-role').textContent = user.role === 'student' ? 'Murid X RPL' : 'Admin';
        document.getElementById('user-avatar').textContent = (user.full_name || 'A')[0].toUpperCase();

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
    } catch (error) {
        // Network error / server timeout → JANGAN redirect, cukup log
        // Ini yang bikin loop relog sebelumnya!
        console.warn('Auth check: network error, staying on page.', error.message);
    }
})();

async function logout() {
    if (confirm('Yakin mau logout?')) {
        try { await safeFetch('api/auth', { method: 'DELETE' }); } catch {}
        localStorage.removeItem('xrpl_admin_logged_in');
        localStorage.removeItem('xrpl_admin_user');
        window.location.href = 'login.html';
    }
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

// INIT TAB
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
    if (s.image) return s.image;
    const c = s.color || '7b2ff7';
    const txt = type === 'gallery' ? s.category?.toUpperCase() : (s.title?.replace(/ /g, '+') || s.name?.replace(/ /g, '+'));
    return `https://placehold.co/600x400/${c}/fff?text=${txt||'IMG'}`;
}

// ── OVERVIEW ──────────────────────────────────────────────────
function updateOverview() {
    Promise.all([
        safeFetch('api/students?limit=200').catch(() => ({ data: [] })),
        safeFetch('api/gallery?limit=200').catch(() => ({ data: [] })),
        safeFetch('api/guestbook?limit=200').catch(() => ({ data: [] })),
        safeFetch('api/projects?limit=200').catch(() => ({ data: [] })),
    ]).then(([students, gallery, guestbook, projects]) => {
        const sc = (students.data || []).length;
        const gc = (gallery.data || []).length;
        const pc = (projects.data || []).length;
        const msgList = guestbook.data || [];
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

// ── STUDENTS (MongoDB API) ─────────────────────────────────────
let _studentsCache = [];

function loadStudents() {
    const tbody = document.getElementById('students-tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500"><span class="animate-pulse">⏳ Memuat data murid...</span></td></tr>';

    safeFetch('api/students?limit=200')
        .then(data => {
            _studentsCache = data.data || [];
            renderStudents(_studentsCache);
            updateOverview();
        })
        .catch(err => {
            showToast('Gagal memuat murid: ' + err.message, 'error');
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-red-400">❌ Gagal memuat data. Cek koneksi database.</td></tr>';
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
        const s = _studentsCache.find(x =>
            (x._id && x._id.toString() === String(studentId)) || (x.id === studentId)
        );
        if (!s) return;

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
    // Validasi di frontend: max 5MB, image only
    if (file.size > 5 * 1024 * 1024) { showToast('File terlalu besar! Maks 5MB.', 'error'); return; }
    if (!file.type.startsWith('image/')) { showToast('Hanya file gambar yang diperbolehkan!', 'error'); return; }
    
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
    document.querySelectorAll('.color-pick').forEach(c => c.classList.remove('ring-2', 'ring-cyber-blue'));
    if (el) el.classList.add('ring-2', 'ring-cyber-blue');
}

document.getElementById('student-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const mongoId = document.getElementById('student-id').value.trim();
    const data = {
        name: document.getElementById('student-name').value.trim(),
        dream: document.getElementById('student-dream').value.trim(),
        motto: document.getElementById('student-motto').value.trim(),
        quote: document.getElementById('student-quote').value.trim(),
        color: currentStudentColor,
        photo: currentStudentPhotoData
    };

    if (!data.name) return showToast('Nama murid wajib diisi!', 'error');

    const btn = this.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="animate-pulse">⏳ Menyimpan...</span>'; }

    const url = mongoId ? `api/students?id=${mongoId}` : 'api/students';
    const method = mongoId ? 'PUT' : 'POST';

    safeFetch(url, {
        method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    })
    .then(res => {
        showToast(res.message || 'Berhasil!');
        closeModal('student-modal');
        loadStudents();
    })
    .catch(err => showToast(err.message || 'Gagal menyimpan.', 'error'))
    .finally(() => {
        if (btn) { btn.disabled = false; btn.innerHTML = '💾 Simpan'; }
    });
});

function deleteStudent(id) {
    const s = _studentsCache.find(x => (x._id && x._id.toString() === String(id)) || x.id === id);
    confirmDelete(`Hapus murid "${s?.name}"?`, () => {
        safeFetch(`api/students?id=${id}`, { method: 'DELETE' })
        .then(() => { showToast('Murid berhasil dihapus.'); loadStudents(); })
        .catch(err => showToast(err.message || 'Gagal hapus.', 'error'));
    });
}

// ── STRUKTUR KELAS (MongoDB API) ──────────────────────────────
let _strukturCache = [];

function loadStruktur() {
    const el = document.getElementById('struktur-admin');
    el.innerHTML = '<p class="text-gray-500 text-sm italic text-center py-8"><span class="animate-pulse">⏳ Memuat struktur...</span></p>';

    safeFetch('api/struktur')
        .then(data => {
            _strukturCache = data.data || [];
            renderStrukturAdmin(_strukturCache);
        })
        .catch(err => {
            el.innerHTML = '<p class="text-red-400 text-sm text-center py-8">❌ Gagal memuat. Cek koneksi database.</p>';
        });
}

function renderStrukturAdmin(data) {
    const el = document.getElementById('struktur-admin');
    if (!data || data.length === 0) {
        el.innerHTML = '<p class="text-gray-500 text-sm italic text-center py-8">Belum ada data struktur.</p>';
        return;
    }
    const levelLabels = { 0: 'Wali Kelas', 0.5: 'Guru Produktif', 1: 'Ketua/Wakil', 2: 'Staff', 3: 'Anggota' };
    el.innerHTML = data.map(s => {
        const mongoId = s._id ? `'${s._id.toString()}'` : s.id;
        const levelLabel = levelLabels[s.level] || `Level ${s.level}`;
        return `
        <div class="flex items-center gap-4 border border-white/5 rounded-xl p-3 hover:bg-white/5 transition-colors">
            ${getAvatarHtml(s, 40)}
            <div class="flex-1 min-w-0">
                <p class="text-white font-semibold text-sm truncate">${escHtml(s.name)}</p>
                <p class="text-xs"><span style="color:#${s.color||'00d4ff'}">${escHtml(s.jabatan)}</span> · <span class="text-gray-500">${levelLabel}</span></p>
            </div>
            <div class="flex gap-2 flex-shrink-0">
                <button class="btn-edit text-xs" onclick="editStruktur(${mongoId})">✏️ Edit</button>
                <button class="btn-danger text-xs" onclick="deleteStruktur(${mongoId})">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

let currentStrukturPhotoData = null;

function openStrukturModal(id = null) {
    document.getElementById('struktur-form').reset();
    document.getElementById('struktur-id').value = '';
    currentStrukturPhotoData = null;
    document.getElementById('struktur-foto-preview-wrap').innerHTML = '<p class="text-3xl mb-1">📷</p><p class="text-xs text-gray-500">Klik atau drag foto</p>';

    if (id) {
        const s = _strukturCache.find(x => (x._id && x._id.toString() === String(id)) || x.id === id);
        if (s) {
            document.getElementById('struktur-id').value = s._id ? s._id.toString() : (s.id || '');
            document.getElementById('struktur-nama').value = s.name;
            document.getElementById('struktur-jabatan').value = s.jabatan;
            document.getElementById('struktur-level').value = s.level;
            document.getElementById('struktur-color').value = s.color || '00d4ff';
            if (s.photo) {
                currentStrukturPhotoData = s.photo;
                document.getElementById('struktur-foto-preview-wrap').innerHTML = `<img src="${s.photo}" class="max-h-32 rounded-lg mx-auto">`;
            }
        }
    }
    openModal('struktur-modal');
}

function editStruktur(id) { openStrukturModal(id); }

function previewStrukturFoto(input) {
    const file = input.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('File terlalu besar! Maks 5MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
        currentStrukturPhotoData = e.target.result;
        document.getElementById('struktur-foto-preview-wrap').innerHTML = `<img src="${e.target.result}" class="max-h-32 rounded-lg mx-auto">`;
    };
    reader.readAsDataURL(file);
}

document.getElementById('struktur-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const mongoId = document.getElementById('struktur-id').value.trim();
    const data = {
        name: document.getElementById('struktur-nama').value.trim(),
        jabatan: document.getElementById('struktur-jabatan').value.trim(),
        level: parseFloat(document.getElementById('struktur-level').value),
        color: document.getElementById('struktur-color').value.trim() || '00d4ff',
        photo: currentStrukturPhotoData
    };
    if (!data.name || !data.jabatan) return showToast('Nama & jabatan wajib diisi!', 'error');

    const btn = this.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="animate-pulse">⏳ Menyimpan...</span>'; }

    const url = mongoId ? `api/struktur?id=${mongoId}` : 'api/struktur';
    const method = mongoId ? 'PUT' : 'POST';

    safeFetch(url, {
        method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    })
    .then(res => {
        showToast(res.message || 'Berhasil!');
        closeModal('struktur-modal');
        loadStruktur();
        updateOverview();
    })
    .catch(err => showToast(err.message || 'Gagal menyimpan.', 'error'))
    .finally(() => { if (btn) { btn.disabled = false; btn.innerHTML = '💾 Simpan'; } });
});

function deleteStruktur(id) {
    const s = _strukturCache.find(x => (x._id && x._id.toString() === String(id)) || x.id === id);
    confirmDelete(`Hapus jabatan "${s?.jabatan}" (${s?.name})?`, () => {
        safeFetch(`api/struktur?id=${id}`, { method: 'DELETE' })
        .then(() => { showToast('Jabatan berhasil dihapus.'); loadStruktur(); updateOverview(); })
        .catch(err => showToast(err.message || 'Gagal hapus.', 'error'));
    });
}

// ── PROJECTS (MongoDB API) ────────────────────────────────────
let _projectsCache = [];
let currentProjectImageData = null;

function loadProjects() {
    const el = document.getElementById('projects-admin');
    el.innerHTML = '<p class="text-gray-500 text-sm italic text-center py-8"><span class="animate-pulse">⏳ Memuat projek...</span></p>';

    safeFetch('api/projects?limit=200')
        .then(data => {
            _projectsCache = data.data || [];
            renderProjectsAdmin(_projectsCache);
        })
        .catch(err => {
            el.innerHTML = '<p class="text-red-400 text-sm text-center py-8">❌ Gagal memuat projek.</p>';
        });
}

function renderProjectsAdmin(data) {
    const el = document.getElementById('projects-admin');
    if (!data || data.length === 0) {
        el.innerHTML = '<p class="text-gray-500 text-sm italic text-center py-8">Belum ada projek. Tambahkan sekarang!</p>';
        return;
    }
    el.innerHTML = data.map(p => {
        const mongoId = p._id ? `'${p._id.toString()}'` : p.id;
        const imgSrc = (p.image && p.image.length > 0) ? p.image : `https://placehold.co/300x180/${p.color || '00d4ff'}/fff?text=${encodeURIComponent(p.title)}`;
        const tags = (p.tags || []).map(t => `<span class="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300">${escHtml(t)}</span>`).join('');
        return `
        <div class="flex items-center gap-4 border border-white/5 rounded-xl p-3 hover:bg-white/5 transition-colors">
            <img src="${imgSrc}" alt="${escHtml(p.title)}" class="w-20 h-14 rounded-lg object-cover flex-shrink-0" loading="lazy">
            <div class="flex-1 min-w-0">
                <p class="text-white font-semibold text-sm truncate">${escHtml(p.title)}</p>
                <p class="text-gray-400 text-xs truncate mb-1">${escHtml(p.description || '')}</p>
                <div class="flex gap-1 flex-wrap">${tags}</div>
            </div>
            <div class="flex gap-2 flex-shrink-0">
                <button class="btn-edit text-xs" onclick="editProject(${mongoId})">✏️ Edit</button>
                <button class="btn-danger text-xs" onclick="deleteProject(${mongoId})">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function openProjectModal(id = null) {
    document.getElementById('project-form').reset();
    document.getElementById('project-id').value = '';
    currentProjectImageData = null;
    document.getElementById('project-img-preview-wrap').innerHTML = '<p class="text-3xl mb-1">🖼️</p><p class="text-xs text-gray-500">Klik atau drag gambar</p>';

    if (id) {
        const p = _projectsCache.find(x => (x._id && x._id.toString() === String(id)) || x.id === id);
        if (p) {
            document.getElementById('project-id').value = p._id ? p._id.toString() : (p.id || '');
            document.getElementById('project-title').value = p.title;
            document.getElementById('project-desc').value = p.description || '';
            document.getElementById('project-tags').value = (p.tags || []).join(', ');
            document.getElementById('project-link').value = p.link || '';
            if (p.image) {
                currentProjectImageData = p.image;
                document.getElementById('project-img-preview-wrap').innerHTML = `<img src="${p.image}" class="max-h-32 rounded-lg mx-auto">`;
            }
        }
    }
    openModal('project-modal');
}

function editProject(id) { openProjectModal(id); }

function previewProjectImage(input) {
    const file = input.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('File terlalu besar! Maks 5MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
        currentProjectImageData = e.target.result;
        document.getElementById('project-img-preview-wrap').innerHTML = `<img src="${e.target.result}" class="max-h-32 rounded-lg mx-auto">`;
    };
    reader.readAsDataURL(file);
}

document.getElementById('project-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const mongoId = document.getElementById('project-id').value.trim();
    const data = {
        title: document.getElementById('project-title').value.trim(),
        description: document.getElementById('project-desc').value.trim(),
        tags: document.getElementById('project-tags').value,
        link: document.getElementById('project-link').value.trim(),
        image: currentProjectImageData
    };
    if (!data.title) return showToast('Judul projek wajib diisi!', 'error');

    const btn = this.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="animate-pulse">⏳ Menyimpan...</span>'; }

    const url = mongoId ? `api/projects?id=${mongoId}` : 'api/projects';
    const method = mongoId ? 'PUT' : 'POST';

    safeFetch(url, {
        method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    })
    .then(res => {
        showToast(res.message || 'Berhasil!');
        closeModal('project-modal');
        loadProjects();
        updateOverview();
    })
    .catch(err => showToast(err.message || 'Gagal simpan.', 'error'))
    .finally(() => { if (btn) { btn.disabled = false; btn.innerHTML = '💾 Simpan'; } });
});

function deleteProject(id) {
    const p = _projectsCache.find(x => (x._id && x._id.toString() === String(id)) || x.id === id);
    confirmDelete(`Hapus projek "${p?.title}"?`, () => {
        safeFetch(`api/projects?id=${id}`, { method: 'DELETE' })
        .then(() => { showToast('Projek berhasil dihapus.'); loadProjects(); updateOverview(); })
        .catch(err => showToast(err.message || 'Gagal hapus.', 'error'));
    });
}

// ── GALLERY (MongoDB API) ──────────────────────────────────────
let currentGalleryImageData = null;
let _galleryCache = [];

function loadGallery() {
    const grid = document.getElementById('gallery-grid-admin');
    grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8"><span class="animate-pulse">⏳ Memuat gallery...</span></p>';

    safeFetch('api/gallery?limit=200')
        .then(res => {
            _galleryCache = res.data || [];
            renderGalleryAdmin(_galleryCache);
        })
        .catch(err => {
            grid.innerHTML = '<p class="col-span-full text-center text-red-400 py-8">❌ Gagal memuat gallery.</p>';
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
    if (file.size > 5 * 1024 * 1024) { showToast('File terlalu besar! Maks 5MB.', 'error'); return; }
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
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="animate-pulse">⏳ Menyimpan...</span>'; }

    const url = mongoId ? `api/gallery?id=${mongoId}` : 'api/gallery';
    const method = mongoId ? 'PUT' : 'POST';

    safeFetch(url, {
        method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    })
    .then(res => {
        showToast(res.message || 'Berhasil!');
        closeModal('gallery-modal');
        loadGallery();
    })
    .catch(err => showToast(err.message || 'Gagal simpan.', 'error'))
    .finally(() => { if (btn) { btn.disabled = false; btn.innerHTML = '💾 Simpan'; } });
});

function deleteGallery(id) {
    confirmDelete('Hapus foto ini dari gallery?', () => {
        safeFetch(`api/gallery?id=${id}`, { method: 'DELETE' })
        .then(() => { loadGallery(); showToast('Foto berhasil dihapus.'); })
        .catch(err => showToast(err.message || 'Gagal hapus.', 'error'));
    });
}

// ── PESAN SINGKAT / GUESTBOOK (MongoDB API) ───────────────────
function loadGuestbook() {
    const el = document.getElementById('guestbook-admin');
    el.innerHTML = '<p class="text-gray-500 text-sm italic text-center py-12"><span class="animate-pulse">⏳ Memuat pesan...</span></p>';

    safeFetch('api/guestbook?limit=200')
        .then(res => {
            const messages = res.data || [];

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
            el.innerHTML = '<p class="text-red-400 text-sm text-center py-12">❌ Gagal memuat pesan. Cek koneksi database.</p>';
        });
}

function deleteGuestbookMsg(id) {
    safeFetch(`api/guestbook?id=${id}`, { method: 'DELETE' })
    .then(() => { loadGuestbook(); showToast('Pesan berhasil dihapus.'); })
    .catch(err => showToast(err.message || 'Gagal hapus.', 'error'));
}

function clearAllGuestbook() {
    confirmDelete('Hapus SEMUA pesan singkat? Tidak bisa dibatalkan!', () => {
        safeFetch('api/guestbook?all=true', { method: 'DELETE' })
        .then(() => { loadGuestbook(); showToast('Semua pesan berhasil dihapus.'); })
        .catch(err => showToast(err.message || 'Gagal hapus.', 'error'));
    });
}

// ── AKUN MURID (Accounts Tab) ─────────────────────────────────
function loadAccounts() {
    const el = document.getElementById('accounts-list');
    el.innerHTML = '<p class="text-gray-500 text-sm italic text-center py-8"><span class="animate-pulse">⏳ Memuat akun murid...</span></p>';

    safeFetch('api/students?limit=200')
    .then(res => {
        const students = res.data || [];
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
        el.innerHTML = '<p class="text-red-400 text-sm text-center py-8">❌ Gagal memuat akun.</p>';
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

    safeFetch('api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, newPassword: newPw })
    })
    .then(res => {
        document.getElementById('reset-username').value = '';
        document.getElementById('reset-new-password').value = '';
        showToast(`✅ Password @${username} berhasil direset!`);
    })
    .catch(err => showToast(err.message || 'Gagal reset password.', 'error'));
}

// ── SETTINGS ──────────────────────────────────────────────────
function changePassword(e) {
    e.preventDefault();
    const oldPw = document.getElementById('old-password').value;
    const newPw = document.getElementById('new-password').value;
    const confirmPw = document.getElementById('confirm-password').value;

    if (newPw !== confirmPw) return showToast('Konfirmasi password tidak cocok!', 'error');
    if (newPw.length < 6) return showToast('Password baru minimal 6 karakter!', 'error');

    // Verify old password via API login check
    const user = JSON.parse(localStorage.getItem('xrpl_admin_user') || '{}');
    showToast('Fitur ganti password admin akan segera tersedia.', 'info');
    document.getElementById('change-password-form').reset();
}

function exportData() {
    showToast('⏳ Mengexport data dari database...', 'info');
    
    Promise.all([
        safeFetch('api/students?limit=1000').catch(() => ({ data: [] })),
        safeFetch('api/struktur').catch(() => ({ data: [] })),
        safeFetch('api/projects?limit=1000').catch(() => ({ data: [] })),
        safeFetch('api/gallery?limit=1000').catch(() => ({ data: [] })),
        safeFetch('api/guestbook?limit=1000').catch(() => ({ data: [] }))
    ]).then(([students, struktur, projects, gallery, guestbook]) => {
        const exportObj = {
            exported_at: new Date().toISOString(),
            source: 'MongoDB via API',
            students: students.data || [],
            struktur: struktur.data || [],
            projects: projects.data || [],
            gallery: gallery.data || [],
            guestbook: guestbook.data || []
        };
        const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `xrpl_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        showToast('✅ Data berhasil diexport!');
    });
}

function importData(input) {
    const file = input.files[0]; if (!file) return;
    showToast('⚠️ Import dari file belum didukung di versi ini. Gunakan MongoDB langsung.', 'info');
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

    safeFetch('api/students')
        .then(data => {
            const currentUserId = String(window.CURRENT_USER_ID);
            const me = data.data.find(s =>
                (s._id && s._id.toString() === currentUserId) ||
                (s.id && String(s.id) === currentUserId) ||
                (s.username && localStorage.getItem('xrpl_admin_user') &&
                    JSON.parse(localStorage.getItem('xrpl_admin_user')).username === s.username)
            );

            if (me) {
                const photoSrc = me.photo
                    ? me.photo
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(me.name || 'Murid')}&background=${me.color || '00d4ff'}&color=fff&size=160`;
                document.getElementById('my-photo-preview').src = photoSrc;
                document.getElementById('my-motto').value = me.motto || '';
                document.getElementById('my-dream').value = me.dream || '';
                document.getElementById('my-quote').value = me.quote || '';
                window.CURRENT_MONGO_ID = me._id ? me._id.toString() : null;
            } else {
                const user = JSON.parse(localStorage.getItem('xrpl_admin_user') || '{}');
                document.getElementById('my-photo-preview').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'Murid')}&background=00d4ff&color=fff&size=160`;
            }
        })
        .catch(() => {
            document.getElementById('my-photo-preview').src = 'https://ui-avatars.com/api/?name=Murid&background=00d4ff&color=fff&size=160';
        });
}

function uploadMyPhoto(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('File terlalu besar! Maks 5MB.', 'error'); return; }
    
    const formData = new FormData();
    formData.append('type', 'students');
    formData.append('id', window.CURRENT_MONGO_ID || window.CURRENT_USER_ID);
    formData.append('photo', file);

    showToast('⏳ Mengupload foto...', 'info');

    fetch('api/upload', { method: 'POST', body: formData })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            document.getElementById('my-photo-preview').src = data.photo_url;
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

    const targetId = window.CURRENT_MONGO_ID || window.CURRENT_USER_ID;

    safeFetch(`api/students?id=${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(() => showToast('Profil berhasil disimpan!'))
    .catch(err => showToast(err.message || 'Gagal menyimpan', 'error'));
}

// ── MY SNAPSHOTS (STUDENT) ────────────────────────────────────
function loadMySnapshots() {
    safeFetch(`api/snapshots?student_id=${window.CURRENT_USER_ID}`)
    .then(res => renderMySnapshots(res.data || []))
    .catch(err => {
        document.getElementById('my-snapshots-grid').innerHTML = '<p class="text-red-400 text-sm">❌ Gagal mengambil snapshot.</p>';
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
                        <button class="btn-danger w-full text-[10px] py-1.5" onclick="deleteMySnapshot('${s.id}')">🗑️ Hapus</button>
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
        if (file.size > 5 * 1024 * 1024) { showToast('File terlalu besar! Maks 5MB.', 'error'); return; }
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
    btn.textContent = '⏳ Uploading...';

    const studentId = window.CURRENT_MONGO_ID || window.CURRENT_USER_ID;

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('caption', caption);
    formData.append('student_id', studentId);

    fetch('api/snapshots', { method: 'POST', body: formData })
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
        safeFetch(`api/snapshots?id=${id}`, { method: 'DELETE' })
        .then(() => { showToast('Snapshot sukses dihapus!'); loadMySnapshots(); })
        .catch(err => showToast(err.message || 'Gagal hapus', 'error'));
    });
}

// ── INIT ──────────────────────────────────────────────────────
updateOverview();
