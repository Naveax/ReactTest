# Sertifika Oluşturucu + Herkese Açık Doğrulama (Monorepo)

Bu repo aşağıdaki bileşenleri içerir:
- `apps/api`: FastAPI + Pydantic + Motor (PDM ile yönetilir)
- `apps/web`: Bun + Vite + React (JSX) + TailwindCSS + Axios
- `docker-compose.yml`: MongoDB + opsiyonel mongo-express

## 1) MongoDB'yi başlat (`localhost:27017` üzerinde kalıcı)

```bash
docker compose up -d
```

Opsiyonel Mongo Express arayüzü:

```bash
docker compose --profile tools up -d
```

Mongo verisi `mongo_data` adlı Docker volume içinde kalıcı tutulur.

## 2) İlk kurulum

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
bun run setup
```

`setup:api`, paketleri kurmadan önce `8000` portundaki eski API/watch süreçlerini otomatik durdurur.

Opsiyonel ortam ön kontrolü:

```bash
bun run doctor
```

## 3) Backend + frontend'i tek komutla çalıştırma (önerilen)

```bash
bun install
bun run dev
```

Bu komutlar şunları başlatır:
- API: `http://localhost:8000`
- Web: `http://localhost:5173`

`bun run dev`, Windows kararlılığı için API'yi yerel `.venv` Python başlatıcısı (`scripts/dev-api.cjs`) ile çalıştırır.
`.venv` eksikse bir kez otomatik `pdm install` çalıştırır.

Her çalıştırmada `apps/api/.venv` klasörünü silme. Hızlı ve kararlı açılış için sakla.

## Alternatif: servisleri ayrı ayrı çalıştırma

Backend:

```bash
cd apps/api
pdm install
pdm run dev
```

Frontend:

```bash
cd apps/web
bun install
bun run dev
```

## Rotalar

- Sertifika oluşturma: `http://localhost:5173/`
- Doğrulama kodu kontrolü: `http://localhost:5173/verify`
- Loglar: `http://localhost:5173/logs`
- Doğrulama verileri: `http://localhost:5173/data`
- Herkese açık sertifika görünümü: `http://localhost:5173/c/:certificate_id`

## API Uç Noktaları

- `POST /api/certificates`
- `GET /api/certificates/{certificate_id}`
- `GET /api/certificates/verify?code=...`

## Hızlı test (Smoke Test)

`bun run dev` çalışırken:

```bash
bun run test:smoke
```

## Kararlılık notları

- Frontend dev sunucusu, `/api` isteklerini varsayılan olarak `http://127.0.0.1:8000` adresine proxy'ler.
- `VITE_API_BASE` opsiyoneldir. Boşsa frontend same-origin + Vite proxy kullanır (lokalde önerilir).
- CORS varsayılanları hem `localhost:5173` hem `127.0.0.1:5173` içerir.
- Backend varsayılan olarak gerçek MongoDB kullanır (`MONGODB_URL=mongodb://localhost:27017`, `MONGODB_DB=GPV`).
- Projenin resmi veritabanı adı `GPV`'dir (Generator Public Verification).
- `ENABLE_MEMORY_FALLBACK=false` varsayılandır; yanlışlıkla kalıcı olmayan veri kullanımını engeller.
- Arayüzde sağ üstte tema düğmesi vardır (`Dark Mode` / `Light Mode`) ve seçim `localStorage` içinde saklanır.
- Kayıtlı seçim yoksa arayüz yerel saate göre 19:00-07:00 arasında karanlık temayı varsayılan alır.
- Windows kararlılığı için API hot reload varsayılan olarak kapalıdır.  
  Gerekirse: `API_RELOAD=1 bun run dev`
- `API_RELOAD=1` kullanıldığında Windows'ta wildcard sorunlarını engellemek için dışlama desenleri uygulanır (`.venv`, `__pycache__`).
- `setup:api` ve `dev:api`, `.venv` farklı bir OS ortamında (Windows vs WSL/Linux) oluşturulmuşsa otomatik yeniden üretir.

## MongoDB Compass (WSL)

Projeyi WSL içinde çalıştırıp Compass'ı Windows'tan açıyorsan, `localhost:27017` farklı bir MongoDB instance'ına gidebilir.

1. WSL IP adresini al:

```bash
hostname -I | awk '{print $1}'
```

2. Compass'ta şu bağlantı stringi ile bağlan:

```text
mongodb://<WSL_IP>:27017/?directConnection=true
```

3. Proje veritabanının göründüğünü doğrula:
- Veritabanı: `GPV`
- Koleksiyon: `certificates`

## Sorun giderme

- Arayüzde `Network Error` görüyorsan:
  1. MongoDB'nin çalıştığını kontrol et: `docker compose up -d`
  2. API sağlığını kontrol et: `http://localhost:8000/health` aç ve `"database":"mongo"` değerini doğrula
  3. Kök klasörden tekrar başlat: `bun run dev`
- Compass'ta `GPV` görünmüyorsa:
  1. Container verisini kontrol et: `docker exec certificate-mongodb mongosh --quiet --eval 'printjson(db.adminCommand({listDatabases:1}).databases.map(d=>d.name))'`
  2. Komut çıktısında `GPV` var ama Compass'ta yoksa, yukarıdaki WSL IP yöntemiyle yeniden bağlan.
- `docker compose up -d` komutu `dockerDesktopLinuxEngine` pipe hatası veriyorsa:
  1. Docker Desktop'ı manuel başlat
  2. Tam açılmasını bekle
  3. `docker compose up -d` komutunu tekrar çalıştır

## Not

Bu proje, ChatGPT tarafından destek alınarak yapılmıştır.
