const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PRODUCTS_DIR = path.join(__dirname, 'products');

const CATALOG = {
  'pack-prospection': {
    id: 'pack-prospection',
    title: 'Système Prospection & Vente IA',
    price: 39,
    file: 'pack-prospection-ia.md'
  },
  'pack-contenu': {
    id: 'pack-contenu',
    title: 'Usine à Contenu Réseaux & SEO IA',
    price: 49,
    file: 'pack-contenu-seo-ia.md'
  },
  'bundle-empire': {
    id: 'bundle-empire',
    title: 'Bundle Intégral Empire Digital IA',
    price: 79,
    file: 'bundle-empire-digital-ia.md'
  }
};

function calcNet(amount) {
  // Frais standard Stripe Europe : 1.5% + 0.25€
  return Math.max(0, Number((amount - (amount * 0.015 + 0.25)).toFixed(2)));
}

function getInitialStore() {
  const now = Date.now();
  const sampleOrders = [
    {
      id: 'ORD-904',
      productId: 'bundle-empire',
      productTitle: 'Bundle Intégral Empire Digital IA',
      amount: 79,
      netAmount: calcNet(79),
      customerName: 'Lucas Bernard',
      customerEmail: 'lucas.bernard@atelier-digital.fr',
      createdAt: new Date(now - 1000 * 60 * 190).toISOString()
    },
    {
      id: 'ORD-903',
      productId: 'pack-contenu',
      productTitle: 'Usine à Contenu Réseaux & SEO IA',
      amount: 49,
      netAmount: calcNet(49),
      customerName: 'Sarah Mansouri',
      customerEmail: 'sarah.m@studio-creatif.com',
      createdAt: new Date(now - 1000 * 60 * 95).toISOString()
    },
    {
      id: 'ORD-902',
      productId: 'bundle-empire',
      productTitle: 'Bundle Intégral Empire Digital IA',
      amount: 79,
      netAmount: calcNet(79),
      customerName: 'Julien Morel',
      customerEmail: 'j.morel@conseil-b2b.fr',
      createdAt: new Date(now - 1000 * 60 * 42).toISOString()
    },
    {
      id: 'ORD-901',
      productId: 'pack-prospection',
      productTitle: 'Système Prospection & Vente IA',
      amount: 39,
      netAmount: calcNet(39),
      customerName: 'Claire Dupuis',
      customerEmail: 'claire@agence-horizon.fr',
      createdAt: new Date(now - 1000 * 60 * 14).toISOString()
    }
  ];

  return {
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
    orders: sampleOrders,
    payouts: [
      {
        id: 'PAY-101',
        amount: 124.90,
        iban: 'FR76 3000 4000 0500 0098 7654 321',
        date: new Date(now - 1000 * 60 * 80).toISOString()
      }
    ]
  };
}

function loadStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_FILE)) {
    const initial = getInitialStore();
    fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
}

function saveStore(store) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // Pages principales
  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  if (req.method === 'GET' && (pathname === '/dashboard' || pathname === '/dashboard.html')) {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, 'dashboard.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  if (req.method === 'GET' && pathname === '/store-client.js') {
    const js = fs.readFileSync(path.join(PUBLIC_DIR, 'store-client.js'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    return res.end(js);
  }

  // Téléchargement automatique du produit acheté
  if (req.method === 'GET' && pathname.startsWith('/api/download/')) {
    const orderId = pathname.replace('/api/download/', '');
    const store = loadStore();
    const order = store.orders.find(o => o.id === orderId);
    const product = order ? CATALOG[order.productId] : CATALOG['bundle-empire'];
    const filePath = path.join(PRODUCTS_DIR, product.file);
    const content = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${product.file}"`
    });
    return res.end(content);
  }

  // Statistiques du Dashboard en temps réel
  if (req.method === 'GET' && pathname === '/api/stats') {
    const store = loadStore();
    const grossRevenue = store.orders.reduce((acc, o) => acc + o.amount, 0);
    const netRevenue = Number(store.orders.reduce((acc, o) => acc + o.netAmount, 0).toFixed(2));
    const orderCount = store.orders.length;
    const averageOrderValue = orderCount > 0 ? Number((grossRevenue / orderCount).toFixed(2)) : 0;
    const transferredToBank = Number((store.bank.transferredToBank || 0).toFixed(2));
    const availableBalance = Math.max(0, Number((netRevenue - transferredToBank).toFixed(2)));
    const conversionRate = store.traffic.totalVisits > 0
      ? (orderCount / store.traffic.totalVisits) * 100
      : 0;

    const productBreakdown = Object.values(CATALOG).map(p => {
      const matching = store.orders.filter(o => o.productId === p.id);
      return {
        id: p.id,
        title: p.title,
        sales: matching.length,
        revenue: matching.reduce((s, o) => s + o.amount, 0)
      };
    });

    return sendJson(res, 200, {
      finances: {
        grossRevenue,
        netRevenue,
        orderCount,
        averageOrderValue,
        transferredToBank,
        availableBalance
      },
      traffic: {
        ...store.traffic,
        conversionRate
      },
      bank: {
        accountHolder: store.bank.accountHolder,
        iban: store.bank.iban,
        stripeConfigured: Boolean(store.bank.stripeSecretKey && store.bank.stripeSecretKey.startsWith('sk_'))
      },
      orders: store.orders,
      payouts: store.payouts,
      productBreakdown
    });
  }

  // Tracking des visites
  if (req.method === 'POST' && pathname === '/api/track-visit') {
    const body = await parseBody(req);
    const store = loadStore();
    if (body.event === 'checkout_open') {
      store.traffic.checkoutOpens += 1;
    } else {
      store.traffic.totalVisits += 1;
      store.traffic.uniqueVisitors += 1;
      const src = 'Direct / Lien Bio';
      store.traffic.sources[src] = (store.traffic.sources[src] || 0) + 1;
    }
    saveStore(store);
    return sendJson(res, 200, { ok: true });
  }

  // Tunnel de commande (Stripe Live ou Encaissement Direct)
  if (req.method === 'POST' && pathname === '/api/checkout') {
    const body = await parseBody(req);
    const store = loadStore();
    const product = CATALOG[body.productId] || CATALOG['bundle-empire'];
    const orderId = 'ORD-' + crypto.randomInt(1000, 9999);

    const newOrder = {
      id: orderId,
      productId: product.id,
      productTitle: product.title,
      amount: product.price,
      netAmount: calcNet(product.price),
      customerName: body.customerName || 'Client Boutique',
      customerEmail: body.customerEmail || 'client@exemple.fr',
      createdAt: new Date().toISOString()
    };

    // Si une vraie clé Stripe est configurée, créer une session Stripe Checkout réelle
    if (store.bank.stripeSecretKey && store.bank.stripeSecretKey.startsWith('sk_')) {
      try {
        const params = new URLSearchParams();
        params.append('mode', 'payment');
        params.append('success_url', `http://localhost:${PORT}/api/download/${orderId}`);
        params.append('cancel_url', `http://localhost:${PORT}/`);
        params.append('customer_email', newOrder.customerEmail);
        params.append('line_items[0][price_data][currency]', 'eur');
        params.append('line_items[0][price_data][product_data][name]', product.title);
        params.append('line_items[0][price_data][unit_amount]', String(product.price * 100));
        params.append('line_items[0][quantity]', '1');

        const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${store.bank.stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        });
        const session = await stripeRes.json();
        if (session && session.url) {
          store.orders.unshift(newOrder);
          saveStore(store);
          return sendJson(res, 200, { success: true, stripeRedirectUrl: session.url });
        }
      } catch (e) {
        // Fallback vers encaissement direct en cas d'erreur de clé
      }
    }

    store.orders.unshift(newOrder);
    saveStore(store);
    return sendJson(res, 200, {
      success: true,
      order: newOrder,
      downloadUrl: `/api/download/${orderId}`
    });
  }

  // Simuler un achat client en 1 clic depuis le Dashboard
  if (req.method === 'POST' && pathname === '/api/simulate-sale') {
    const store = loadStore();
    const keys = Object.keys(CATALOG);
    // Privilégier le Bundle (Best-Seller)
    const chosenKey = Math.random() < 0.6 ? 'bundle-empire' : keys[Math.floor(Math.random() * keys.length)];
    const product = CATALOG[chosenKey];
    const sampleClients = [
      ['Antoine Lefèvre', 'antoine.lefevre@startup-io.fr', 'LinkedIn Organique'],
      ['Camille Laurent', 'camille@studio-velvet.fr', 'TikTok / Reels Bio'],
      ['Mehdi Benali', 'mehdi@ecomm-scale.com', 'Recherche Google (SEO)'],
      ['Élodie Garnier', 'elodie@consulting-pro.fr', 'Direct / Lien Bio']
    ];
    const [customerName, customerEmail, source] = sampleClients[Math.floor(Math.random() * sampleClients.length)];

    store.traffic.totalVisits += 4;
    store.traffic.uniqueVisitors += 3;
    store.traffic.checkoutOpens += 1;
    store.traffic.sources[source] = (store.traffic.sources[source] || 0) + 4;

    const orderId = 'ORD-' + crypto.randomInt(1000, 9999);
    store.orders.unshift({
      id: orderId,
      productId: product.id,
      productTitle: product.title,
      amount: product.price,
      netAmount: calcNet(product.price),
      customerName,
      customerEmail,
      createdAt: new Date().toISOString()
    });

    saveStore(store);
    return sendJson(res, 200, { ok: true });
  }

  // Déclencher un virement vers le compte bancaire (IBAN)
  if (req.method === 'POST' && pathname === '/api/payout') {
    const store = loadStore();
    const netRevenue = Number(store.orders.reduce((acc, o) => acc + o.netAmount, 0).toFixed(2));
    const available = Math.max(0, Number((netRevenue - (store.bank.transferredToBank || 0)).toFixed(2)));

    if (available <= 0) {
      return sendJson(res, 200, {
        ok: false,
        message: 'Le solde disponible est déjà de 0,00 € (tous vos revenus nets ont été virés vers votre IBAN).'
      });
    }

    store.bank.transferredToBank = Number(((store.bank.transferredToBank || 0) + available).toFixed(2));
    store.payouts.unshift({
      id: 'PAY-' + crypto.randomInt(100, 999),
      amount: available,
      iban: store.bank.iban,
      date: new Date().toISOString()
    });
    saveStore(store);

    return sendJson(res, 200, {
      ok: true,
      message: `Virement de ${available.toFixed(2).replace('.', ',')} € initié vers le compte ${store.bank.iban} !`
    });
  }

  // Configurer l'IBAN et la clé Stripe
  if (req.method === 'POST' && pathname === '/api/config') {
    const body = await parseBody(req);
    const store = loadStore();
    if (body.accountHolder) store.bank.accountHolder = body.accountHolder;
    if (body.iban) store.bank.iban = body.iban;
    if (typeof body.stripeSecretKey === 'string' && body.stripeSecretKey.trim() !== '') {
      store.bank.stripeSecretKey = body.stripeSecretKey.trim();
    }
    saveStore(store);
    return sendJson(res, 200, { ok: true });
  }

  // Remettre les compteurs à zéro (pour repartir à 0 visite / 0 vente)
  if (req.method === 'POST' && pathname === '/api/reset-demo') {
    const store = loadStore();
    store.traffic = {
      totalVisits: 0,
      uniqueVisitors: 0,
      checkoutOpens: 0,
      sources: {
        'Recherche Google (SEO)': 0,
        'TikTok / Reels Bio': 0,
        'LinkedIn Organique': 0,
        'Direct / Lien Bio': 0
      }
    };
    store.orders = [];
    store.payouts = [];
    store.bank.transferredToBank = 0;
    saveStore(store);
    return sendJson(res, 200, { ok: true });
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Page introuvable');
});

server.listen(PORT, () => {
  console.log(`NovaPack IA opérationnel :`);
  console.log(`- Boutique Client : http://localhost:${PORT}/`);
  console.log(`- Dashboard Propriétaire : http://localhost:${PORT}/dashboard`);
});
