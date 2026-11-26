/* Bệnh viện không ngủ — image enhancement patch v1.0
 * Non-destructive: augments the existing Threads-like reader and library.
 * Uses existing episode IDs and route fragments; does not modify story data/audio.
 */
(() => {
  'use strict';
  const ROOT = './assets/images/';
  const COVERS = Object.freeze({
    'tieu-chay-cap': 'bia_9_tap/01_tieu_chay_cap.webp',
    'hoi-chung-ly': 'bia_9_tap/02_hoi_chung_ly.webp',
    'non-oi-that-bai-duong-uong': 'bia_9_tap/03_non_oi_nhieu.webp',
    'viem-phoi': 'bia_9_tap/04_viem_phoi.webp',
    'viem-tieu-phe-quan': 'bia_9_tap/05_viem_tieu_phe_quan.webp',
    'con-hen-cap': 'bia_9_tap/06_con_hen_cap.webp',
    'kawasaki': 'bia_9_tap/07_kawasaki.webp',
    'suy-tim-tre-em': 'bia_9_tap/08_suy_tim_tre_em.webp',
    'thong-lien-that': 'bia_9_tap/09_thong_lien_that.webp'
  });
  const DEPARTMENTS = Object.freeze({
    'tieu-hoa': { title: 'Tiêu hóa', src: 'banner_3_khoa/banner_tieu_hoa.webp' },
    'ho-hap': { title: 'Hô hấp', src: 'banner_3_khoa/banner_ho_hap.webp' },
    'tim-mach': { title: 'Tim mạch', src: 'banner_3_khoa/banner_tim_mach.webp' }
  });
  const ILLUSTRATIONS = Object.freeze({
    'tieu-chay-cap': { src: 'minh_hoa_bo_sung/minh_hoa_01_cap_cuu_nhi.webp', caption: 'Đêm trực đầu tiên tại khoa Cấp cứu Nhi', scene: 1 },
    'hoi-chung-ly': { src: 'minh_hoa_bo_sung/minh_hoa_03_benh_nhi_tieu_hoa.webp', caption: 'Cấp cứu Nhi — Đánh giá trẻ có triệu chứng tiêu hóa', scene: 1 },
    'viem-phoi': { src: 'minh_hoa_bo_sung/minh_hoa_02_kham_ho_hap.webp', caption: 'Khám bệnh nhi tại khoa Hô hấp', scene: 1 },
    'con-hen-cap': { src: 'minh_hoa_bo_sung/minh_hoa_05_con_hen.webp', caption: 'Khoảnh khắc khẩn cấp trong cơn hen', scene: 1 },
    'kawasaki': { src: 'minh_hoa_bo_sung/minh_hoa_04_kawasaki.webp', caption: 'Tìm dấu hiệu lâm sàng gợi ý Kawasaki', scene: 1 },
    'thong-lien-that': { src: 'minh_hoa_bo_sung/minh_hoa_06_sieu_am_tim.webp', caption: 'Hội chẩn và phân tích siêu âm tim', scene: 1 }
  });

  // Single local path prefix; images are repository-owned, not third-party hotlinks.
  const picture = (src, alt, eager = false) => {
    const img = document.createElement('img');
    img.src = ROOT + src;
    img.alt = alt;
    img.loading = eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    if (eager) img.fetchPriority = 'high';
    img.addEventListener('error', () => {
      const figure = img.closest('.story-image');
      if (figure) figure.hidden = true;
      else img.hidden = true;
    }, { once: true });
    return img;
  };

  const figure = (src, alt, caption, kind, eager = false) => {
    const el = document.createElement('figure');
    el.className = 'story-image story-image--' + kind;
    // Feed cards are already links: avoid nesting a button inside <a>.
    if (kind === 'card') {
      const frame = document.createElement('span');
      frame.className = 'story-image__open';
      frame.appendChild(picture(src, alt, eager));
      el.appendChild(frame);
    } else {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'story-image__open';
      btn.setAttribute('aria-label', 'Xem ảnh lớn: ' + alt);
      btn.appendChild(picture(src, alt, eager));
      btn.addEventListener('click', () => openLightbox(ROOT + src, alt));
      el.appendChild(btn);
    }
    if (caption) {
      const figcap = document.createElement('figcaption');
      figcap.textContent = caption;
      el.appendChild(figcap);
    }
    return el;
  };

  function episodeFromHash() {
    const m = decodeURIComponent(location.hash).match(/^#\/tap\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  function enhanceCards(root) {
    root.querySelectorAll('a.thread-card[href^="#/tap/"]').forEach(card => {
      const id = (card.getAttribute('href') || '').split('/tap/')[1];
      if (!COVERS[id] || card.querySelector('.story-image--card')) return;
      const content = card.querySelector('.thread-card-content');
      if (!content) return;
      const heading = content.querySelector('h3');
      if (!heading) return;
      const art = figure(COVERS[id], 'Ảnh bìa tập ' + heading.textContent.trim(), '', 'card');
      heading.after(art);
    });
  }

  function enhanceDepartments(root) {
    root.querySelectorAll('a.dept[href*="khoa="]').forEach(card => {
      if (card.querySelector('.story-image--department')) return;
      const id = (card.getAttribute('href') || '').split('khoa=')[1];
      const dept = DEPARTMENTS[id];
      if (!dept) return;
      const image = picture(dept.src, 'Banner khoa ' + dept.title);
      image.className = 'story-dept-banner';
      image.addEventListener('error', () => { image.hidden = true; }, { once: true });
      card.prepend(image);
    });
  }

  function enhanceFilterBanner(root) {
    const filters = root.querySelector('.filters');
    const library = root.querySelector('#cards');
    if (!filters || !library) return;
    const active = filters.querySelector('.filter.on');
    const id = active?.getAttribute('data-filter');
    const old = root.querySelector('.story-filter-banner');
    if (!DEPARTMENTS[id]) {
      if (old) old.remove();
      return;
    }
    if (old?.dataset.dept === id) return;
    if (old) old.remove();
    const dept = DEPARTMENTS[id];
    const banner = document.createElement('div');
    banner.className = 'story-filter-banner';
    banner.dataset.dept = id;
    banner.appendChild(picture(dept.src, 'Không gian khoa ' + dept.title));
    const title = document.createElement('div');
    title.className = 'story-filter-banner__title';
    title.textContent = 'Hành trình tại khoa ' + dept.title;
    banner.appendChild(title);
    filters.after(banner);
  }

  function enhanceReader(root) {
    const id = episodeFromHash();
    if (!id || !COVERS[id]) return;
    const sheet = root.querySelector('.readergrid .sheet');
    const head = sheet?.querySelector('.readhead');
    if (!sheet || !head) return;
    if (!sheet.querySelector('.story-image--reader-cover')) {
      const title = head.querySelector('h1')?.textContent?.trim() || 'Tập truyện';
      head.after(figure(COVERS[id], 'Bìa minh họa: ' + title, '', 'reader-cover', true));
    }
    const sceneArt = ILLUSTRATIONS[id];
    if (sceneArt && !sheet.querySelector('.story-image--scene')) {
      const scenes = [...sheet.querySelectorAll('.prose .thread-scene')];
      const anchor = scenes[sceneArt.scene] || scenes[0];
      if (anchor) anchor.after(figure(sceneArt.src, sceneArt.caption, sceneArt.caption, 'scene'));
    }
  }

  function openLightbox(src, alt) {
    const old = document.getElementById('story-image-viewer');
    if (old) old.remove();
    const box = document.createElement('div');
    box.id = 'story-image-viewer';
    box.className = 'story-image-viewer';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', alt);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'story-image-viewer__close';
    close.textContent = '✕';
    close.setAttribute('aria-label', 'Đóng ảnh');
    const leave = () => { box.remove(); document.removeEventListener('keydown', keyHandler); };
    const keyHandler = event => { if (event.key === 'Escape') leave(); };
    close.addEventListener('click', leave);
    box.addEventListener('click', event => { if (event.target === box) leave(); });
    const image = document.createElement('img');
    image.src = src;
    image.alt = alt;
    box.append(close, image);
    document.body.appendChild(box);
    document.addEventListener('keydown', keyHandler);
    close.focus();
  }

  let applying = false;
  function enhance() {
    if (applying) return;
    const root = document.getElementById('root');
    if (!root) return;
    applying = true;
    try {
      enhanceCards(root);
      enhanceDepartments(root);
      enhanceFilterBanner(root);
      enhanceReader(root);
    } finally { applying = false; }
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; enhance(); });
  }
  function init() {
    const root = document.getElementById('root');
    if (!root) return;
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener('hashchange', schedule);
    root.addEventListener('click', event => {
      if (event.target.closest('.filter')) schedule();
    });
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
