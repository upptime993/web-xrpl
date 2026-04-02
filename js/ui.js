// ui.js - UI utilities

function showLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.classList.remove('hidden', 'opacity-0');
        loader.classList.add('flex', 'opacity-100');
    }
}

function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.classList.remove('opacity-100');
        loader.classList.add('opacity-0');
        setTimeout(() => loader.classList.replace('flex', 'hidden'), 300);
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    
    // Konfigurasi style berdasar tipe (success / error)
    const bgClass = type === 'success' ? 'bg-neon-green/20 border-neon-green text-neon-green' 
                                       : 'bg-red-500/20 border-red-500 text-red-500';
    const icon = type === 'success' ? '✅' : '❌';

    toast.className = `fixed bottom-4 right-4 border px-4 py-3 rounded-lg text-sm z-[9999] animate-fade-in-up font-medium shadow-lg backdrop-blur-md ${bgClass}`;
    toast.innerHTML = `<span class="mr-2">${icon}</span>${message}`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4', 'transition-all', 'duration-300');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function initScrollAnimations() {
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

window.showLoader = showLoader;
window.hideLoader = hideLoader;
window.showToast = showToast;
window.initScrollAnimations = initScrollAnimations;
