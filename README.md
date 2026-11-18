# Eneba 

 Veikianti žaidimų parduotuvė, sukurta pagal Eneba stilių ir reikalavimus.

## Technologijos
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend:** PHP 8.2+ REST API
- **Duomenų bazė:** SQLite (automatiškai sukuriama ir užpildoma duomenimis pirmo paleidimo metu)

## Kaip paleisti lokaliai

### 1. Backend paleidimas
```bash
cd backend
php -S localhost:8000 index.php
```
Backend pasiekiamas adresu `http://localhost:8000`. Pirmo užklausimo metu automatiškai sukuriamas `eneba.sqlite` failas su žaidimais, pardavėjais ir demo vartotoju:
- **El. paštas:** `demo@eneba.com`
- **Slaptažodis:** `demo123`

### 2. Frontend paleidimas
```bash
cd frontend
npm install
npm run dev
```
Pastaba dėl paleidimo aplinkos: Nors backend yra sukurtas PHP/SQLite pagrindu, projektas buvo konteinerizuotas,paleistas naudojant Docker.

Frontend pasiekiamas adresu `http://localhost:5173`.
