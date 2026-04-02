document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. STATE MANAGEMENT & DATA FETCHING
    // ==========================================
    let studentsData = [];
    let galleryData = [];
    let projectsData = [];

    /**
     * Helper: fetch dengan error handling yang benar
     * Cek res.ok sebelum parsing JSON
     */
    async function safeFetch(url, options = {}) {
        const res = await fetch(url, options);
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || `HTTP ${res.status}`);
        }
        return data;
    }

    /**
     * Toast notification — menggantikan alert()
     */
    function showToast(message, type = 'success') {
        const existing = document.querySelectorAll('.xrpl-toast');
        existing.forEach(t => t.remove());

        const colors = {
            success: { bg: 'rgba(0,255,136,0.15)', border: '#00ff88', text: '#00ff88', icon: '✅' },
            error: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#fca5a5', icon: '❌' },
            info: { bg: 'rgba(0,212,255,0.15)', border: '#00d4ff', text: '#00d4ff', icon: 'ℹ️' }
        };
        const c = colors[type] || colors.info;

        const toast = document.createElement('div');
        toast.className = 'xrpl-toast fixed bottom-4 right-4 px-5 py-3 rounded-xl text-sm z-[9999] animate-fade-in-up shadow-2xl';
        toast.style.cssText = `background:${c.bg};border:1px solid ${c.border};color:${c.text};backdrop-filter:blur(12px);max-width:360px;`;
        toast.innerHTML = `${c.icon} ${escHtml(message)}`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s, transform 0.3s';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    /**
     * Ambil data dari MongoDB API (tanpa fallback ke data.json)
     */
    async function loadData() {
        try {
            // Fetch semua data sekaligus
            const [studentRes, galleryRes, projRes] = await Promise.allSettled([
                safeFetch('api/students?limit=100'),
                safeFetch('api/gallery?limit=100'),
                safeFetch('api/projects?limit=100')
            ]);

            // Students
            if (studentRes.status === 'fulfilled' && studentRes.value.data) {
                studentsData = studentRes.value.data.map(s => ({
                    id: s.sort_order || parseInt(String(s._id).slice(-4), 16) % 100 || 1,
                    _id: s._id,
                    name: s.name || s.full_name,
                    quote: s.quote || '',
                    motto: s.motto || '',
                    dream: s.dream || '',
                    color: s.color || '00d4ff',
                    photo: s.photo || null,
                    username: s.username || null
                }));
            }

            // Gallery
            if (galleryRes.status === 'fulfilled' && galleryRes.value.data) {
                galleryData = galleryRes.value.data;
            }

            // Projects
            if (projRes.status === 'fulfilled' && projRes.value.data) {
                projectsData = projRes.value.data;
            }

            // Render semua
            renderStudents();
            renderGallery();
            renderProjects();
            updateCounterStats();
            loadStrukturKelas();
            hilangkanLoadingScreen();

        } catch (error) {
            console.error("Error memuat data:", error);
            document.getElementById('loading-screen').innerHTML = `
                <div class="text-center px-4">
                    <h1 class="text-white text-2xl mb-4">Oops! Gagal memuat data.</h1>
                    <p class="text-text-secondary mb-4">${escHtml(error.message)}</p>
                    <button onclick="location.reload()" class="px-6 py-2 rounded-full bg-gradient-to-r from-cyber-blue to-electric-purple text-white font-bold">Coba Lagi</button>
                </div>`;
        }
    }


    // ==========================================
    // 2. RENDER FUNGSI (UI GENERATION)
    // ==========================================
    function renderStudents() {
        const grid = document.getElementById('students-grid');
        let html = '';
        
        studentsData.forEach((s, index) => {
            const delay = (index % 5) * 100;
            const hasPhoto = s.photo && s.photo.length > 0;
            const avatarUrl = hasPhoto
                ? s.photo
                : `https://ui-avatars.com/api/?name=${s.name.replace(/ /g, '+')}&background=${s.color}&color=fff&size=150`;
            
            html += `
                <div class="student-card glass rounded-2xl p-4 text-center cursor-pointer transition-all duration-300 hover:border-cyber-blue/50 hover:shadow-[0_10px_20px_rgba(0,212,255,0.1)] hover:-translate-y-1 reveal" style="transition-delay: ${delay}ms" data-id="${s.id}" tabindex="0">
                    <div class="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3">
                        <div class="absolute inset-0 bg-gray-700 animate-pulse rounded-full z-0"></div>
                        <img src="${avatarUrl}" alt="${escHtml(s.name)}" onload="this.previousElementSibling.style.display='none'" onerror="this.previousElementSibling.style.display='none'" class="relative z-10 w-full h-full rounded-full object-cover border-2 transition-colors" style="border-color:#${s.color || '00d4ff'}55">
                        ${hasPhoto ? `<div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-neon-green border-2 border-dark-section z-20 flex items-center justify-center text-[8px]">📷</div>` : ''}
                    </div>
                    <h3 class="text-sm font-semibold text-white truncate px-1">${escHtml(s.name)}</h3>
                    <p class="text-xs text-text-secondary mt-1 font-mono">No. ${s.id}</p>
                </div>
            `;
        });
        grid.innerHTML = html;
        initStudentSearch();
        initScrollAnimations();
    }

    function renderGallery() {
        const grid = document.getElementById('gallery-grid');
        let html = '';
        
        galleryData.forEach((item, index) => {
            const delay = (index % 4) * 100;
            const cat = item.category || 'event';
            const imgUrl = (item.image && item.image.length > 0)
                ? item.image
                : `https://placehold.co/600x600/${item.color || '7b2ff7'}/fff?text=${cat.toUpperCase()}`;
            const spanCls = item.span || 'col-span-1';

            html += `
                <div class="gallery-item rounded-xl overflow-hidden cursor-pointer relative group reveal ${spanCls}" data-category="${cat}" data-index="${index}" style="transition-delay: ${delay}ms">
                    <div class="absolute inset-0 bg-gray-800 animate-pulse z-0"></div>
                    <img src="${imgUrl}" alt="${escHtml(item.title)}" onload="this.previousElementSibling.style.display='none'" onerror="this.previousElementSibling.style.display='none'" class="relative z-10 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy">
                    <div class="absolute inset-0 z-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                        <div class="p-3 w-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <span class="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm mb-1 inline-block text-white">${cat}</span>
                            <p class="text-sm font-medium text-white leading-tight">${escHtml(item.title)}</p>
                        </div>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
        initScrollAnimations();
    }

    function renderProjects() {
        if (!projectsData || projectsData.length === 0) return;
        const container = document.querySelector('#projek .grid');
        if (!container) return;

        const colorMap = {
            '00d4ff': { text: 'text-cyber-blue', bg: 'bg-cyber-blue/10', border: 'border-cyber-blue/20', hover: 'group-hover:text-cyber-blue' },
            '7b2ff7': { text: 'text-electric-purple', bg: 'bg-electric-purple/10', border: 'border-electric-purple/20', hover: 'group-hover:text-electric-purple' },
            '00ff88': { text: 'text-neon-green', bg: 'bg-neon-green/10', border: 'border-neon-green/20', hover: 'group-hover:text-neon-green' },
        };

        let html = '';
        projectsData.forEach((p, i) => {
            const c = colorMap[p.color] || colorMap['00d4ff'];
            const imgSrc = (p.image && p.image.length > 0)
                ? p.image
                : `https://placehold.co/600x400/${p.color || '2d3436'}/${p.color ? 'fff' : '00d4ff'}?text=${encodeURIComponent(p.title || 'Projek')}`;
            const tags = (p.tags || []).map(t => `<span class="px-3 py-1 rounded-full text-xs font-mono ${c.bg} ${c.text} border ${c.border}">${escHtml(t)}</span>`).join('');
            const delayClass = i === 0 ? '' : i === 1 ? 'delay-100' : 'delay-200';
            const linkHtml = p.link ? `<a href="${p.link}" target="_blank" rel="noopener" class="mt-2 inline-flex items-center gap-1 text-xs ${c.text} hover:underline">🔗 Lihat Projek</a>` : '';

            html += `
                <article class="glass rounded-2xl overflow-hidden group reveal ${delayClass} hover:-translate-y-2 transition-transform duration-300">
                    <div class="aspect-video w-full overflow-hidden relative">
                        <img src="${imgSrc}" alt="${escHtml(p.title)}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy">
                    </div>
                    <div class="p-6">
                        <h3 class="text-xl font-heading font-bold text-white mb-2 ${c.hover} transition-colors">${escHtml(p.title)}</h3>
                        <p class="text-sm text-text-secondary mb-4 line-clamp-2">${escHtml(p.description || '')}</p>
                        <div class="flex flex-wrap gap-2 mb-2">${tags}</div>
                        ${linkHtml}
                    </div>
                </article>
            `;
        });
        container.innerHTML = html;
        initScrollAnimations();
    }

    function hilangkanLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const loadingBar = document.getElementById('loading-bar');
        
        requestAnimationFrame(() => { loadingBar.style.width = '100%'; });
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                document.body.classList.remove('overflow-hidden');
            }, 500);
        }, 800);
    }

    // ==========================================
    // 3. PESAN SINGKAT / GUESTBOOK (MONGODB API)
    // ==========================================
    function initGuestbook() {
        const form = document.getElementById('guestbook-form');
        const list = document.getElementById('guestbook-list');
        const emptyMsg = document.getElementById('gb-empty');

        const loadMessages = async () => {
            try {
                const res = await safeFetch('api/guestbook?limit=50');
                const messages = res.data || [];
                if (messages.length === 0) {
                    emptyMsg.style.display = 'block';
                    return;
                }
                emptyMsg.style.display = 'none';
                Array.from(list.children).forEach(child => { if (child.id !== 'gb-empty') child.remove(); });
                messages.forEach(msg => {
                    const div = document.createElement('div');
                    div.className = 'ps-msg-card mb-3 animate-fade-in-up';
                    div.innerHTML = `
                        <div class="flex items-start gap-3 pl-2">
                            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-cyber-blue/30 to-electric-purple/30 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">${(msg.name||'?')[0].toUpperCase()}</div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-baseline gap-2 flex-wrap mb-1">
                                    <span class="text-white text-sm font-semibold">${escHtml(msg.name)}</span>
                                    <span class="text-white/30 text-[10px]">${msg.date}</span>
                                </div>
                                <p class="text-text-secondary text-sm break-words leading-relaxed">${escHtml(msg.text)}</p>
                            </div>
                        </div>
                    `;
                    list.appendChild(div);
                });
            } catch (error) {
                console.error('Load guestbook error:', error);
            }
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('gb-name');
            const msgInput = document.getElementById('gb-message');
            const btn = form.querySelector('button[type="submit"]');
            
            if (!nameInput.value.trim() || !msgInput.value.trim()) return;

            // Loading state
            if (btn) { btn.disabled = true; btn.innerHTML = '<span class="animate-pulse">⏳ Mengirim...</span>'; }

            try {
                const res = await safeFetch('api/guestbook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: nameInput.value.trim(), text: msgInput.value.trim() })
                });

                nameInput.value = '';
                msgInput.value = '';
                loadMessages();
                showToast('Pesan berhasil dikirim!', 'success');
            } catch (error) {
                showToast(error.message || 'Gagal kirim pesan.', 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<span>Kirim Pesan</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>';
                }
            }
        });

        loadMessages();
    }

    // ==========================================
    // 4. OPTIMASI PARTIKEL (INTERSECTION OBSERVER)
    // ==========================================
    function initOptimizedParticles() {
        const canvas = document.getElementById('particles-bg');
        const ctx = canvas.getContext('2d');
        let particles = [];
        let animationId;
        let isVisible = true;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.radius = Math.random() * 1.5 + 0.5;
                this.color = Math.random() > 0.5 ? '#00d4ff' : '#7b2ff7';
                this.opacity = Math.random() * 0.5 + 0.1;
            }
            update() {
                this.x += this.vx; this.y += this.vy;
                if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
                if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.globalAlpha = this.opacity;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        const particleCount = Math.min(window.innerWidth / 15, 100);
        for (let i = 0; i < particleCount; i++) particles.push(new Particle());

        function animate() {
            if (!isVisible) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { p.update(); p.draw(); });
            
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 - dist/1000})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            animationId = requestAnimationFrame(animate);
        }

        const heroSection = document.getElementById('home');
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                isVisible = true; animate();
            } else {
                isVisible = false; cancelAnimationFrame(animationId);
            }
        });
        observer.observe(heroSection);
    }

    // ==========================================
    // 5. FITUR PENCARIAN & ANIMASI SCROLL
    // ==========================================
    function initStudentSearch() {
        document.getElementById('search-student').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.student-card');
            let matchCount = 0;

            cards.forEach(card => {
                const name = card.querySelector('h3').innerText.toLowerCase();
                if (name.includes(term)) {
                    card.style.display = 'block';
                    card.style.animation = 'scaleIn 0.3s ease-out forwards';
                    matchCount++;
                } else {
                    card.style.display = 'none';
                }
            });
            document.getElementById('no-results').classList.toggle('hidden', matchCount !== 0);
        });
    }

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
                
                if(entry.target.id === 'stats-container' || entry.target.querySelector('.counter')) {
                    const counters = entry.target.querySelectorAll('.counter') || [entry.target];
                    counters.forEach(counter => {
                        const updateCount = () => {
                            const target = +counter.getAttribute('data-target');
                            const count = +counter.innerText;
                            const inc = target / 40;
                            if (count < target) {
                                counter.innerText = Math.ceil(count + inc);
                                setTimeout(updateCount, 40);
                            } else {
                                counter.innerText = target + (target === 36 || target === 15 ? '+' : '');
                            }
                        };
                        updateCount();
                    });
                }
            }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });

    function initScrollAnimations() {
        document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    }

    // ==========================================
    // 6. NAVBAR, SCROLL, & MOBILE MENU
    // ==========================================
    const navbar = document.getElementById('navbar');
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    const backToTop = document.getElementById('back-to-top');

    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', () => {
        let current = '';
        const scrollY = window.scrollY;
        
        if (scrollY > 50) {
            navbar.classList.replace('bg-white/5', 'bg-dark-bg/90');
            navbar.classList.replace('border-white/5', 'border-white/10');
            navbar.classList.add('shadow-lg');
        } else {
            navbar.classList.replace('bg-dark-bg/90', 'bg-white/5');
            navbar.classList.replace('border-white/10', 'border-white/5');
            navbar.classList.remove('shadow-lg');
        }

        if (scrollY > 500) backToTop.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-10');
        else backToTop.classList.add('opacity-0', 'pointer-events-none', 'translate-y-10');

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= (sectionTop - sectionHeight / 3)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('text-cyber-blue', 'after:w-full');
            link.classList.add('text-text-secondary');
            if (link.getAttribute('href').includes(current) && current !== '') {
                link.classList.remove('text-text-secondary');
                link.classList.add('text-cyber-blue', 'after:w-full');
            }
        });
    });

    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');
    const menuIconPath = document.getElementById('menu-icon-path');
    let isMenuOpen = false;

    const toggleMenu = () => {
        isMenuOpen = !isMenuOpen;
        if (isMenuOpen) {
            mobileMenu.classList.remove('translate-x-full');
            menuIconPath.setAttribute('d', 'M6 18L18 6M6 6l12 12');
            document.body.classList.add('overflow-hidden');
        } else {
            mobileMenu.classList.add('translate-x-full');
            menuIconPath.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
            document.body.classList.remove('overflow-hidden');
        }
    };

    mobileBtn.addEventListener('click', toggleMenu);
    mobileLinks.forEach(link => link.addEventListener('click', toggleMenu));

    // ==========================================
    // 7. MODAL MURID
    // ==========================================
    const modal = document.getElementById('student-modal');
    const modalOverlay = modal.querySelector('.modal-overlay');
    const modalContent = modal.querySelector('.modal-content');
    const modalCloseBtn = modal.querySelector('.modal-close');
    let lastFocusedElement;

    const openModal = (studentId) => {
        const s = studentsData.find(x => x.id === parseInt(studentId));
        if (!s) return;

        document.getElementById('modal-name').innerText = s.name;
        document.getElementById('modal-absen').innerText = `No. Absen ${s.id}`;
        document.getElementById('modal-quote').innerText = `"${s.quote}"`;
        document.getElementById('modal-motto').innerText = s.motto;
        document.getElementById('modal-dream').innerText = s.dream;
        
        const avatarUrl = (s.photo && s.photo.length > 0)
            ? s.photo
            : `https://ui-avatars.com/api/?name=${s.name.replace(/ /g, '+')}&background=${s.color}&color=fff&size=200`;
        document.getElementById('modal-img').src = avatarUrl;
        document.getElementById('modal-img').style.borderColor = `#${s.color}`;

        document.getElementById('modal-gallery').innerHTML = '<div class="col-span-3 text-center py-4"><span class="text-white text-sm animate-pulse">Memuat gallery...</span></div>';

        safeFetch(`api/snapshots?student_id=${s._id}`)
            .then(data => {
                let miniGalleryHTML = '';
                if (data.data && data.data.length > 0) {
                    window._currentSnaps = window._currentSnaps || {};
                    window._currentSnaps[s._id] = data.data;

                    data.data.slice(0, 9).forEach(snap => {
                        miniGalleryHTML += `<div class="aspect-square rounded-lg overflow-hidden bg-white/5 cursor-pointer group relative snap-thumb" data-snap-id="${snap.id}" data-student-id="${s._id}">
                            <img src="${snap.image_url}" alt="${escHtml(snap.caption || 'Snapshot')}" class="w-full h-full object-cover group-hover:scale-110 transition-all duration-300">
                            <div class="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                <span class="text-white text-xs">\u2764\ufe0f ${snap.likesCount}</span>
                                <span class="text-white text-xs">\ud83d\udcac ${snap.comments ? snap.comments.length : 0}</span>
                            </div></div>`;
                    });
                } else {
                    const pColors = ['7b2ff7','00d4ff','00ff88','ff00aa','ffae00','6c5ce7'];
                    for(let i=0; i<6; i++) {
                        const pc = pColors[(s.id + i) % 6];
                        miniGalleryHTML += `<div class="aspect-square rounded-lg overflow-hidden bg-white/5"><img src="https://placehold.co/200x200/${pc}/fff?text=\ud83d\udcf7" alt="Kenangan ${i+1}" class="w-full h-full object-cover opacity-70 hover:opacity-100 hover:scale-110 transition-all duration-300"></div>`;
                    }
                }
                document.getElementById('modal-gallery').innerHTML = miniGalleryHTML;
                document.querySelectorAll('.snap-thumb').forEach(el => {
                    el.addEventListener('click', () => window.openSnapLightbox(el.dataset.snapId, el.dataset.studentId));
                });
            })
            .catch(() => {
                document.getElementById('modal-gallery').innerHTML = '<div class="col-span-3 text-center py-4 text-red-400 text-xs">Gagal mengambil foto.</div>';
            });

        lastFocusedElement = document.activeElement;
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        
        setTimeout(() => {
            modalOverlay.classList.remove('opacity-0');
            modalContent.classList.remove('opacity-0', 'scale-90');
            modalCloseBtn.focus();
        }, 10);
    };

    const closeModal = () => {
        modalOverlay.classList.add('opacity-0');
        modalContent.classList.add('opacity-0', 'scale-90');
        setTimeout(() => {
            modal.classList.add('hidden');
            if(document.getElementById('lightbox').classList.contains('hidden')) {
                document.body.classList.remove('overflow-hidden');
            }
            if (lastFocusedElement) lastFocusedElement.focus();
        }, 300);
    };

    document.getElementById('students-grid').addEventListener('click', (e) => {
        const card = e.target.closest('.student-card');
        if (card) openModal(card.getAttribute('data-id'));
    });

    modalCloseBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    // ==========================================
    // 8. GALLERY FILTER & LIGHTBOX
    // ==========================================
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('bg-gradient-to-r', 'from-cyber-blue', 'to-electric-purple', 'text-white');
                b.classList.add('bg-white/5', 'text-text-secondary');
            });
            btn.classList.remove('bg-white/5', 'text-text-secondary');
            btn.classList.add('bg-gradient-to-r', 'from-cyber-blue', 'to-electric-purple', 'text-white');

            const filterValue = btn.getAttribute('data-filter');
            const galleryItems = document.querySelectorAll('.gallery-item');

            galleryItems.forEach(item => {
                item.style.transition = 'all 0.4s ease';
                if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
                    item.style.display = 'block';
                    setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'scale(1)'; }, 50);
                } else {
                    item.style.opacity = '0';
                    item.style.transform = 'scale(0.8)';
                    setTimeout(() => { item.style.display = 'none'; }, 400);
                }
            });
        });
    });

    const lightbox = document.getElementById('lightbox');
    const lbOverlay = lightbox.querySelector('.lightbox-overlay');
    const lbImg = document.getElementById('lightbox-img');
    const lbCaption = document.getElementById('lightbox-caption');
    const lbCounter = document.getElementById('lightbox-counter');
    const lbPrev = document.getElementById('lightbox-prev');
    const lbNext = document.getElementById('lightbox-next');
    const lbClose = lightbox.querySelector('.lightbox-close');
    
    let currentLbIndex = 0;
    let currentVisibleGallery = [];

    const updateLightboxContent = () => {
        if(currentVisibleGallery.length === 0) return;
        
        lbImg.style.opacity = '0.5';
        lbCaption.style.opacity = '0';
        
        setTimeout(() => {
            const dataIndex = currentVisibleGallery[currentLbIndex];
            const data = galleryData[dataIndex];
            
            const imgUrl = (data.image && data.image.length > 0)
                ? data.image
                : `https://placehold.co/1200x800/${data.color}/fff?text=${(data.title || 'Photo').replace(/ /g, '+')}`;
            lbImg.src = imgUrl;
            lbCaption.innerText = data.title;
            lbCounter.innerText = `${currentLbIndex + 1} / ${currentVisibleGallery.length}`;
            
            lbImg.style.opacity = '1';
            lbCaption.style.opacity = '1';
        }, 150);
    };

    const openLightbox = (index) => {
        const activeFilter = document.querySelector('.filter-btn.bg-gradient-to-r').getAttribute('data-filter');
        currentVisibleGallery = [];
        
        document.querySelectorAll('.gallery-item').forEach(item => {
            if (activeFilter === 'all' || item.getAttribute('data-category') === activeFilter) {
                currentVisibleGallery.push(parseInt(item.getAttribute('data-index')));
            }
        });

        currentLbIndex = currentVisibleGallery.indexOf(index);
        if(currentLbIndex === -1) currentLbIndex = 0;

        updateLightboxContent();

        lightbox.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        
        setTimeout(() => {
            lbOverlay.classList.remove('opacity-0');
            lbImg.classList.remove('opacity-0', 'scale-95');
        }, 10);
    };

    const closeLightbox = () => {
        lbOverlay.classList.add('opacity-0');
        lbImg.classList.add('opacity-0', 'scale-95');
        lbCaption.style.opacity = '0';
        
        setTimeout(() => {
            lightbox.classList.add('hidden');
            if(modal.classList.contains('hidden')) {
                document.body.classList.remove('overflow-hidden');
            }
        }, 300);
    };

    document.getElementById('gallery-grid').addEventListener('click', (e) => {
        const item = e.target.closest('.gallery-item');
        if (item) openLightbox(parseInt(item.getAttribute('data-index')));
    });

    lbClose.addEventListener('click', closeLightbox);
    lbOverlay.addEventListener('click', closeLightbox);

    lbPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        currentLbIndex = (currentLbIndex - 1 + currentVisibleGallery.length) % currentVisibleGallery.length;
        updateLightboxContent();
    });

    lbNext.addEventListener('click', (e) => {
        e.stopPropagation();
        currentLbIndex = (currentLbIndex + 1) % currentVisibleGallery.length;
        updateLightboxContent();
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const snapLb = document.getElementById('snap-lightbox');
            if (!snapLb.classList.contains('hidden')) { closeSnapLightbox(); return; }
            if (!lightbox.classList.contains('hidden')) closeLightbox();
            else if (!modal.classList.contains('hidden')) closeModal();
        }
        if (!lightbox.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') lbPrev.click();
            if (e.key === 'ArrowRight') lbNext.click();
        }
    });

    // ==========================================
    // 9. SNAPSHOT LIGHTBOX
    // ==========================================
    let currentSnapId = null;

    window.openSnapLightbox = function(snapId, studentId) {
        const snap = (window._currentSnaps && window._currentSnaps[studentId]) 
            ? window._currentSnaps[studentId].find(s => s.id === snapId) 
            : null;
            
        if (!snap) return;
        currentSnapId = snapId;
        document.getElementById('snap-lb-img').src = snap.image_url;
        document.getElementById('snap-lb-caption').textContent = snap.caption || 'Snapshot';
        document.getElementById('snap-lb-meta').textContent = snap.created_at || '';
        
        window._currentSnapData = snap;
        renderSnapInteractions();

        const lb = document.getElementById('snap-lightbox');
        lb.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        setTimeout(() => {
            document.getElementById('snap-lb-overlay').classList.remove('opacity-0');
            document.getElementById('snap-lb-inner').classList.remove('opacity-0');
        }, 10);
    };

    function closeSnapLightbox() {
        document.getElementById('snap-lb-overlay').classList.add('opacity-0');
        document.getElementById('snap-lb-inner').classList.add('opacity-0');
        setTimeout(() => {
            document.getElementById('snap-lightbox').classList.add('hidden');
            if (modal.classList.contains('hidden') && document.getElementById('lightbox').classList.contains('hidden'))
                document.body.classList.remove('overflow-hidden');
        }, 300);
        currentSnapId = null;
        window._currentSnapData = null;
    }

    function renderSnapInteractions() {
        if (!window._currentSnapData) return;
        const snap = window._currentSnapData;
        
        document.getElementById('snap-lb-like-count').textContent = snap.likesCount || 0;
        document.getElementById('snap-lb-heart').textContent = snap.userLiked ? '\u2764\ufe0f' : '\ud83e\udd0d';
        
        const commentsEl = document.getElementById('snap-lb-comments');
        if (!snap.comments || snap.comments.length === 0) {
            commentsEl.innerHTML = '<p class="text-gray-500 text-xs italic text-center mt-4">Belum ada komentar. Jadilah pertama!</p>';
        } else {
            commentsEl.innerHTML = snap.comments.map(c => `
                <div class="flex gap-2 items-start">
                    <div class="w-7 h-7 rounded-full bg-gradient-to-br from-cyber-blue/40 to-electric-purple/40 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        ${(c.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                        <p class="text-white text-xs font-semibold">${escHtml(c.name || 'Anonim')} <span class="text-gray-600 font-normal text-[10px]">${c.date || ''}</span></p>
                        <p class="text-gray-300 text-xs mt-0.5 break-words">${escHtml(c.text)}</p>
                    </div>
                </div>
            `).join('');
        }
    }

    function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    document.getElementById('snap-lb-close').addEventListener('click', closeSnapLightbox);
    document.getElementById('snap-lb-overlay').addEventListener('click', closeSnapLightbox);

    document.getElementById('snap-lb-like-btn').addEventListener('click', async () => {
        if (!currentSnapId) return;
        
        try {
            const data = await safeFetch('api/snapshots?action=like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ snapshot_id: currentSnapId })
            });

            if (data.action === 'liked') {
                window._currentSnapData.likesCount++;
                window._currentSnapData.userLiked = true;
            } else {
                window._currentSnapData.likesCount = Math.max(0, window._currentSnapData.likesCount - 1);
                window._currentSnapData.userLiked = false;
            }
            renderSnapInteractions();
        } catch (error) {
            showToast(error.message || 'Gagal memproses like', 'error');
        }
    });

    document.getElementById('snap-lb-download-btn').addEventListener('click', () => {
        const img = document.getElementById('snap-lb-img');
        if (!img.src) return;
        
        fetch(img.src)
            .then(res => {
                if (!res.ok) throw new Error('Gagal download');
                return res.blob();
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `xrpl-snapshot-${currentSnapId || Date.now()}.jpg`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            })
            .catch(() => showToast('Gagal mendownload foto', 'error'));
    });

    document.getElementById('snap-lb-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentSnapId) return;
        const name = document.getElementById('snap-lb-name').value.trim();
        const text = document.getElementById('snap-lb-txt').value.trim();
        if (!name || !text) return;
        
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            const data = await safeFetch('api/snapshots?action=comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ snapshot_id: currentSnapId, name, text })
            });

            if (!window._currentSnapData.comments) window._currentSnapData.comments = [];
            window._currentSnapData.comments.push({ name, text, date: 'Baru saja' });
            document.getElementById('snap-lb-txt').value = '';
            renderSnapInteractions();
        } catch (error) {
            showToast(error.message || 'Gagal mengirim komentar', 'error');
        } finally {
            btn.disabled = false;
        }
    });

    // ==========================================
    // 10. TYPING LOOP ANIMATION
    // ==========================================
    function initTypingLoop() {
        const el = document.getElementById('hero-typing');
        if (!el) return;
        
        el.style.borderRight = '3px solid #00ff88';
        el.style.paddingRight = '3px';
        el.style.whiteSpace = 'nowrap';
        el.style.display = 'inline-block';
        el.style.animation = 'blinkCursor 0.8s infinite';
        
        if (!document.getElementById('cursor-style')) {
            const style = document.createElement('style');
            style.id = 'cursor-style';
            style.innerHTML = `@keyframes blinkCursor { 0%, 100% { border-color: transparent; } 50% { border-color: #00ff88; } }`;
            document.head.appendChild(style);
        }

        const phrases = ['We Code.', 'We Create.', 'We Innovate.', 'We Collaborate.', 'We Build the Future.'];
        let pi = 0;
        let ci = 0;
        let isDeleting = false;

        function type() {
            const currentPhrase = phrases[pi];
            
            if (isDeleting) {
                el.textContent = currentPhrase.substring(0, ci - 1);
                ci--;
            } else {
                el.textContent = currentPhrase.substring(0, ci + 1);
                ci++;
            }

            let typeSpeed = isDeleting ? 40 : 100;

            if (!isDeleting && ci === currentPhrase.length) {
                typeSpeed = 2000;
                isDeleting = true;
            } else if (isDeleting && ci === 0) {
                isDeleting = false;
                pi = (pi + 1) % phrases.length;
                typeSpeed = 400;
            }

            setTimeout(type, typeSpeed);
        }

        setTimeout(type, 1000);
    }

    // ==========================================
    // 11. COUNTER STATS DARI DATABASE
    // ==========================================
    function updateCounterStats() {
        const counters = document.querySelectorAll('.counter');
        counters.forEach(counter => {
            const label = counter.closest('div')?.nextElementSibling?.textContent?.trim()?.toLowerCase() || '';
            if (label.includes('murid')) {
                counter.setAttribute('data-target', studentsData.length || 0);
            } else if (label.includes('projek')) {
                counter.setAttribute('data-target', projectsData.length || 0);
            } else if (label.includes('kenangan') || label.includes('memori')) {
                counter.setAttribute('data-target', galleryData.length || 0);
            }
        });
    }

    // ==========================================
    // 12. STRUKTUR KELAS DINAMIS (MONGODB)
    // ==========================================
    function loadStrukturKelas() {
        const container = document.getElementById('struktur-tree');
        if (!container) return;

        safeFetch('api/struktur')
            .then(res => {
                if (!res.data || res.data.length === 0) return;
                renderStrukturTree(container, res.data);
            })
            .catch(() => {
                // Biarkan konten default jika API gagal
            });
    }

    function renderStrukturTree(container, data) {
        const waliKelas = data.filter(d => parseFloat(d.level) === 0);
        const guruProduktif = data.filter(d => parseFloat(d.level) === 0.5).slice(0, 5);
        const ketuaWakil = data.filter(d => parseFloat(d.level) === 1);
        const staff = data.filter(d => parseFloat(d.level) === 2);
        const anggota = data.filter(d => parseFloat(d.level) === 3);

        const avatarUrl = (name, color) => {
            return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color || '00d4ff'}&color=fff&size=150`;
        };

        const makeCard = (person, imgSize, titleSize, subSize) => {
            const photo = person.photo || avatarUrl(person.name, person.color);
            return `
            <div class="relative flex flex-col items-center group w-[130px] md:w-[170px] p-3 md:p-4 glass rounded-2xl hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 border-t-2" style="border-top-color:#${person.color || '00d4ff'}; box-shadow: 0 4px 20px -2px #${person.color || '00d4ff'}22;">
                <div class="absolute inset-0 bg-gradient-to-b from-[#${person.color || '00d4ff'}]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none"></div>
                <img src="${photo}" alt="${escHtml(person.jabatan)}" class="${imgSize} rounded-full object-cover border-2 shadow-lg mb-3" style="border-color:#${person.color || '00d4ff'}" loading="lazy">
                <h3 class="font-bold text-white ${titleSize} text-center leading-tight truncate w-full group-hover:text-[#${person.color || '00d4ff'}] transition-colors">${escHtml(person.name)}</h3>
                <p class="${subSize} text-center font-medium mt-1 truncate w-full" style="color:#${person.color || '00d4ff'}">${escHtml(person.jabatan)}</p>
            </div>`;
        };

        const renderRow = (items, delay, imgSize, titleSize, subSize) => {
            if (items.length === 0) return '';
            const dropLine = `<div class="struktur-line-v w-[2px] h-8 md:h-12 my-2 z-0"></div>`;
            return `
            <div class="flex flex-col items-center w-full reveal ${delay}">
                ${dropLine}
                <div class="flex justify-center items-start gap-4 md:gap-6 flex-wrap relative z-10 w-full max-w-5xl px-2">
                    ${items.map(p => makeCard(p, imgSize, titleSize, subSize)).join('')}
                </div>
            </div>`;
        };

        let html = '<div class="flex flex-col items-center w-full relative pb-10">';

        if (waliKelas.length > 0) {
            html += `
            <div class="flex flex-col items-center w-full reveal">
                <div class="flex justify-center w-full relative z-10">
                    ${makeCard(waliKelas[0], 'w-20 h-20 md:w-24 md:h-24', 'text-lg md:text-xl', 'text-sm')}
                </div>
            </div>`;
        }

        html += renderRow(guruProduktif, 'delay-50', 'w-16 h-16 md:w-20 md:h-20', 'text-base md:text-lg', 'text-xs md:text-sm');
        html += renderRow(ketuaWakil, 'delay-100', 'w-14 h-14 md:w-16 md:h-16', 'text-sm md:text-base', 'text-[10px] md:text-xs');
        html += renderRow(staff, 'delay-200', 'w-12 h-12 md:w-14 md:h-14', 'text-xs md:text-sm', 'text-[9px] md:text-[10px]');
        
        if (anggota.length > 0) {
            html += `
            <div class="flex flex-col items-center w-full reveal delay-300">
                <div class="struktur-line-v w-[2px] h-8 md:h-12 my-2 z-0"></div>
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 w-full px-2 max-w-6xl mt-0 relative z-10">
                    ${anggota.map(a => `
                    <div class="glass p-2 md:p-3 rounded-xl flex items-center gap-2 md:gap-3 hover:-translate-y-1 transition-transform border-l-2" style="border-left-color:#${a.color || '00d4ff'}">
                        <img src="${a.photo || avatarUrl(a.name, a.color)}" alt="${escHtml(a.jabatan)}" class="w-8 h-8 md:w-10 md:h-10 rounded-full border object-cover" style="border-color:#${a.color || '00d4ff'}" loading="lazy">
                        <div class="min-w-0 flex-1">
                            <h4 class="text-[10px] md:text-xs font-bold text-white truncate max-w-[80px] md:max-w-full">${escHtml(a.name)}</h4>
                            <p class="text-[9px] truncate max-w-[80px] md:max-w-full" style="color:#${a.color || '00d4ff'}">${escHtml(a.jabatan)}</p>
                        </div>
                    </div>
                    `).join('')}
                </div>
            </div>`;
        }

        html += '</div>';

        container.innerHTML = html;
        initScrollAnimations();
    }

    // INIT
    document.body.classList.add('overflow-hidden');
    initOptimizedParticles();
    initGuestbook();
    initScrollAnimations();
    initTypingLoop();
    loadData();
});