const cacheName = 'defense-tower-game-v1';
const cacheAssets = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/icons/icon.png',  // Exemplo de ícone
    '/sounds/sirene.mp3',  // Exemplo de som
    '/sounds/radio.mp3',
    '/sounds/disparo.mp3',
    '/sounds/explosao.mp3',
    '/sounds/inimigo_base.mp3',
    '/sounds/destrocos1.mp3',
    '/sounds/destrocos2.mp3',
    '/sounds/destrocos3.mp3',
    '/sounds/destrocos4.mp3',
    '/manifest.json'
];

// Instalando o Service Worker e adicionando os recursos ao cache
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');

    event.waitUntil(
        caches.open(cacheName)
            .then(cache => {
                console.log('Service Worker: Caching Files...');
                return cache.addAll(cacheAssets);
            })
            .then(() => {
                self.skipWaiting();
            })
            .catch(err => console.error('Failed to cache assets:', err))
    );
});

// Ativando o Service Worker e limpando caches antigos
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activated');

    // Remover caches antigos
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(name => {
                    if (name !== cacheName) {
                        console.log('Service Worker: Clearing Old Cache:', name);
                        return caches.delete(name);
                    }
                })
            );
        })
    );
});

// Interceptando as requisições de rede e servindo os recursos cacheados
self.addEventListener('fetch', (event) => {
    console.log('Service Worker: Fetching:', event.request.url);

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Retorna o recurso cacheado se encontrado
                if (response) {
                    return response;
                }

                // Clonar a requisição para uso posterior
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest)
                    .then(networkResponse => {
                        // Verifica se a resposta é válida
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Clonar a resposta para poder cacheá-la
                        const responseToCache = networkResponse.clone();

                        caches.open(cacheName)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    })
                    .catch(err => {
                        console.error('Fetching failed:', err);
                        throw err;
                    });
            })
    );
});
