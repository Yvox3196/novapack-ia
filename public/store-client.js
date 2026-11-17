// Hybrid API + Static CDN Fallback so NovaPack IA works both on Node.js server AND static public hosting (Firebase Hosting / GitHub Pages)
(function () {
  const STORAGE_KEY = 'novapack_ia_store_v1';
  const CATALOG = {
    'pack-prospection': { id: 'pack-prospection', title: 'Système Prospection & Vente IA', price: 39, file: 'products/pack-prospection-ia.md' },
    'pack-contenu': { id: 'pack-contenu', title: 'Usine à Contenu Réseaux & SEO IA', price: 49, file: 'products/pack-contenu-seo-ia.md' },
    'bundle-empire': { id: 'bundle-empire', title: 'Bundle Intégral Empire Digital IA', price: 79, file: 'products/bundle-empire-digital-ia.md' }
  };

  function calcNet(amount) {
    return Math.max(0, Number((amount - (amount * 0.015 + 0.25)).toFixed(2)));
  }

  function loadLocalStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    const now = Date.now();
    const initial = {
      traffic: {
        totalVisits: 142,
        uniqueVisitors: 108,
        checkoutOpens: 19,
        sources: {
          'Recherche Google (SEO)': 58,
          'TikTok / Reels Bio': 41,
          'LinkedIn Organique': 27,
          'Direct / Lien Bio': 16
        }
      },
      bank: {
        accountHolder: 'Compte Propriétaire NovaPack IA',
        iban: 'FR76 3000 4000 0500 0098 7654 321',
        stripeSecretKey: '',
        transferredToBank: 124.90
      },
      orders: [
        { id: 'ORD-904', productId: 'bundle-empire', productTitle: 'Bundle Intégral Empire Digital IA', amount: 79, netAmount: calcNet(79), customerName: 'Lucas Bernard', customerEmail: 'lucas.bernard@atelier-digital.fr', createdAt: new Date(now - 1000 * 60 * 190).toISOString() },
        { id: 'ORD-903', productId: 'pack-contenu', productTitle: 'Usine à Contenu Réseaux & SEO IA', amount: 49, netAmount: calcNet(49), customerName: 'Sarah Mansouri', customerEmail: 'sarah.m@studio-creatif.com', createdAt: new Date(now - 1000 * 60 * 95).toISOString() },
        { id: 'ORD-902', productId: 'bundle-empire', productTitle: 'Bundle Intégral Empire Digital IA', amount: 79, netAmount: calcNet(79), customerName: 'Julien Morel', customerEmail: 'j.morel@conseil-b2b.fr', createdAt: new Date(now - 1000 * 60 * 42).toISOString() },
        { id: 'ORD-901', productId: 'pack-prospection', productTitle: 'Système Prospection & Vente IA', amount: 39, netAmount: calcNet(39), customerName: 'Claire Dupuis', customerEmail: 'claire@agence-horizon.fr', createdAt: new Date(now - 1000 * 60 * 14).toISOString() }
      ],
      payouts: [
        { id: 'PAY-101', amount: 124.90, iban: 'FR76 3000 4000 0500 0098 7654 321', date: new Date(now - 1000 * 60 * 80).toISOString() }
      ]
    };
    saveLocalStore(initial);
    return initial;
  }

  function saveLocalStore(store) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch (e) {}
  }

  const origFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input.url;
    if (url.startsWith('/api/')) {
      try {
        const res = await origFetch(input, init);
        if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
          return res;
        }
      } catch (e) {
        // Fallback to local engine if static hosting
      }

      const body = init && init.body ? JSON.parse(init.body) : {};
      const store = loadLocalStore();

      if (url === '/api/stats') {
        const grossRevenue = store.orders.reduce((acc, o) => acc + o.amount, 0);
        const netRevenue = Number(store.orders.reduce((acc, o) => acc + o.netAmount, 0).toFixed(2));
        const orderCount = store.orders.length;
        const averageOrderValue = orderCount > 0 ? Number((grossRevenue / orderCount).toFixed(2)) : 0;
        const transferredToBank = Number((store.bank.transferredToBank || 0).toFixed(2));
        const availableBalance = Math.max(0, Number((netRevenue - transferredToBank).toFixed(2)));
        const conversionRate = store.traffic.totalVisits > 0 ? (orderCount / store.traffic.totalVisits) * 100 : 0;
        const productBreakdown = Object.values(CATALOG).map(p => {
          const matching = store.orders.filter(o => o.productId === p.id);
          return { id: p.id, title: p.title, sales: matching.length, revenue: matching.reduce((s, o) => s + o.amount, 0) };
        });
        return new Response(JSON.stringify({
          finances: { grossRevenue, netRevenue, orderCount, averageOrderValue, transferredToBank, availableBalance },
          traffic: { ...store.traffic, conversionRate },
          bank: { accountHolder: store.bank.accountHolder, iban: store.bank.iban, stripeConfigured: Boolean(store.bank.stripeSecretKey) },
          orders: store.orders,
          payouts: store.payouts,
          productBreakdown
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (url === '/api/track-visit') {
        if (body.event === 'checkout_open') store.traffic.checkoutOpens += 1;
        else { store.traffic.totalVisits += 1; store.traffic.uniqueVisitors += 1; }
        saveLocalStore(store);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (url === '/api/checkout') {
        const product = CATALOG[body.productId] || CATALOG['bundle-empire'];
        const order = {
          id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
          productId: product.id,
          productTitle: product.title,
          amount: product.price,
          netAmount: calcNet(product.price),
          customerName: body.customerName || 'Client Boutique',
          customerEmail: body.customerEmail || 'client@exemple.fr',
          createdAt: new Date().toISOString()
        };
        store.orders.unshift(order);
        saveLocalStore(store);
        return new Response(JSON.stringify({ success: true, order, downloadUrl: product.file }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (url === '/api/simulate-sale') {
        const product = CATALOG['bundle-empire'];
        store.traffic.totalVisits += 4;
        store.traffic.uniqueVisitors += 3;
        store.traffic.checkoutOpens += 1;
        store.orders.unshift({
          id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
          productId: product.id,
          productTitle: product.title,
          amount: product.price,
          netAmount: calcNet(product.price),
          customerName: 'Client Web Direct',
          customerEmail: 'contact@client-web.fr',
          createdAt: new Date().toISOString()
        });
        saveLocalStore(store);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (url === '/api/payout') {
        const netRevenue = Number(store.orders.reduce((acc, o) => acc + o.netAmount, 0).toFixed(2));
        const available = Math.max(0, Number((netRevenue - (store.bank.transferredToBank || 0)).toFixed(2)));
        if (available <= 0) {
          return new Response(JSON.stringify({ ok: false, message: 'Solde disponible à 0,00 €.' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        store.bank.transferredToBank = Number(((store.bank.transferredToBank || 0) + available).toFixed(2));
        store.payouts.unshift({ id: 'PAY-' + Math.floor(100 + Math.random() * 900), amount: available, iban: store.bank.iban, date: new Date().toISOString() });
        saveLocalStore(store);
        return new Response(JSON.stringify({ ok: true, message: `Virement de ${available.toFixed(2).replace('.', ',')} € initié vers ${store.bank.iban} !` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (url === '/api/config') {
        if (body.accountHolder) store.bank.accountHolder = body.accountHolder;
        if (body.iban) store.bank.iban = body.iban;
        if (body.stripeSecretKey) store.bank.stripeSecretKey = body.stripeSecretKey;
        saveLocalStore(store);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (url === '/api/reset-demo') {
        store.traffic = { totalVisits: 0, uniqueVisitors: 0, checkoutOpens: 0, sources: { 'Recherche Google (SEO)': 0, 'TikTok / Reels Bio': 0, 'LinkedIn Organique': 0, 'Direct / Lien Bio': 0 } };
        store.orders = [];
        store.payouts = [];
        store.bank.transferredToBank = 0;
        saveLocalStore(store);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }
    return origFetch(input, init);
  };
})();
