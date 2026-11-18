<?php
declare(strict_types=1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dbFile = __DIR__ . '/eneba.sqlite';
$isNewDb = !file_exists($dbFile);
$pdo = new PDO('sqlite:' . $dbFile);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

if ($isNewDb) {
    initDatabase($pdo);
}

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = preg_replace('#^/api#', '', $uri);

try {
    if ($method === 'GET' && $uri === '/home/banner') {
        echo json_encode([
            'title' => 'SAVAITGALIO ŽAIDIMŲ IŠPARDAVIMAS',
            'subtitle' => 'Geriausi Steam, PSN ir Xbox raktai su nuolaida iki 85%. Momentinis pristatymas!',
            'ctaText' => 'Naršyti pasiūlymus',
            'badge' => 'RIBOTAS LAIKAS',
            'productId' => 1,
            'image' => 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1400&q=80'
        ]);
        exit;
    }

    if ($method === 'GET' && $uri === '/home/bestsellers') {
        $stmt = $pdo->query("
            SELECT p.*, MIN(o.price) as lowest_price, MAX(o.original_price) as original_price
            FROM products p
            JOIN offers o ON p.id = o.product_id
            WHERE p.is_bestseller = 1
            GROUP BY p.id
            LIMIT 4
        ");
        echo json_encode($stmt->fetchAll());
        exit;
    }

    if ($method === 'GET' && $uri === '/home/deals') {
        $stmt = $pdo->query("
            SELECT p.*, MIN(o.price) as lowest_price, MAX(o.original_price) as original_price
            FROM products p
            JOIN offers o ON p.id = o.product_id
            WHERE p.is_deal = 1
            GROUP BY p.id
            LIMIT 4
        ");
        echo json_encode($stmt->fetchAll());
        exit;
    }

    if ($method === 'GET' && $uri === '/products') {
        $search = trim($_GET['search'] ?? '');
        $platform = trim($_GET['platform'] ?? '');
        $region = trim($_GET['region'] ?? '');
        $maxPrice = isset($_GET['maxPrice']) && $_GET['maxPrice'] !== '' ? (float)$_GET['maxPrice'] : null;
        $sort = $_GET['sort'] ?? 'popular';

        $sql = "
            SELECT p.*, MIN(o.price) as lowest_price, MAX(o.original_price) as original_price, COUNT(o.id) as offer_count
            FROM products p
            JOIN offers o ON p.id = o.product_id
            WHERE 1=1
        ";
        $params = [];

        if ($platform !== '' && $platform !== 'ALL') {
            $sql .= " AND p.platform = :platform";
            $params[':platform'] = $platform;
        }
        if ($region !== '' && $region !== 'ALL') {
            $sql .= " AND p.region = :region";
            $params[':region'] = $region;
        }

        $sql .= " GROUP BY p.id";

        if ($maxPrice !== null) {
            $sql .= " HAVING lowest_price <= :maxPrice";
            $params[':maxPrice'] = $maxPrice;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll();

        if ($search !== '') {
            $searchLower = mb_strtolower($search);
            $products = array_values(array_filter($products, function ($p) use ($searchLower) {
                $titleLower = mb_strtolower($p['title']);
                if (str_contains($titleLower, $searchLower)) {
                    return true;
                }
                $words = preg_split('/\s+/', $titleLower);
                foreach ($words as $word) {
                    if (strlen($searchLower) >= 3 && levenshtein($searchLower, $word) <= 2) {
                        return true;
                    }
                }
                return false;
            }));
        }

        usort($products, function ($a, $b) use ($sort) {
            return match ($sort) {
                'price_asc' => $a['lowest_price'] <=> $b['lowest_price'],
                'price_desc' => $b['lowest_price'] <=> $a['lowest_price'],
                'name_asc' => strcmp($a['title'], $b['title']),
                default => $b['is_bestseller'] <=> $a['is_bestseller'],
            };
        });

        echo json_encode($products);
        exit;
    }

    if ($method === 'GET' && preg_match('#^/products/(\d+)$#', $uri, $matches)) {
        $id = (int)$matches[1];
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $product = $stmt->fetch();

        if (!$product) {
            http_response_code(404);
            echo json_encode(['error' => 'Produktas nerastas']);
            exit;
        }

        $offersStmt = $pdo->prepare("SELECT * FROM offers WHERE product_id = ? ORDER BY price ASC");
        $offersStmt->execute([$id]);
        $product['offers'] = $offersStmt->fetchAll();

        echo json_encode($product);
        exit;
    }

    if ($method === 'POST' && $uri === '/auth/register') {
        $data = json_decode(file_get_contents('php://input'), true);
        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';
        $name = trim($data['name'] ?? 'Žaidėjas');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 4) {
            http_response_code(400);
            echo json_encode(['error' => 'Neteisingas el. paštas arba per trumpas slaptažodis (min. 4 simb.)']);
            exit;
        }

        $token = bin2hex(random_bytes(24));
        $hash = password_hash($password, PASSWORD_DEFAULT);

        try {
            $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash, token) VALUES (?, ?, ?, ?)");
            $stmt->execute([$name, $email, $hash, $token]);
            echo json_encode([
                'token' => $token,
                'user' => ['id' => $pdo->lastInsertId(), 'name' => $name, 'email' => $email]
            ]);
        } catch (PDOException $e) {
            http_response_code(409);
            echo json_encode(['error' => 'Šis el. paštas jau užregistruotas']);
        }
        exit;
    }

    if ($method === 'POST' && $uri === '/auth/login') {
        $data = json_decode(file_get_contents('php://input'), true);
        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Neteisingas el. paštas arba slaptažodis']);
            exit;
        }

        $token = bin2hex(random_bytes(24));
        $pdo->prepare("UPDATE users SET token = ? WHERE id = ?")->execute([$token, $user['id']]);

        echo json_encode([
            'token' => $token,
            'user' => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email']]
        ]);
        exit;
    }

    if ($method === 'POST' && $uri === '/checkout') {
        $user = getAuthUser($pdo);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Norint pirkti, būtina prisijungti']);
            exit;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $items = $data['items'] ?? [];
        if (empty($items)) {
            http_response_code(400);
            echo json_encode(['error' => 'Krepšelis tuščias']);
            exit;
        }

        $total = 0;
        $orderItems = [];

        foreach ($items as $item) {
            $stmt = $pdo->prepare("
                SELECT o.*, p.title, p.platform, p.image 
                FROM offers o 
                JOIN products p ON o.product_id = p.id 
                WHERE o.id = ?
            ");
            $stmt->execute([$item['offerId']]);
            $offer = $stmt->fetch();

            if ($offer) {
                $qty = max(1, (int)($item['quantity'] ?? 1));
                $total += $offer['price'] * $qty;
                for ($i = 0; $i < $qty; $i++) {
                    $orderItems[] = [
                        'title' => $offer['title'],
                        'platform' => $offer['platform'],
                        'seller' => $offer['seller_name'],
                        'price' => $offer['price'],
                        'digital_key' => generateGameKey()
                    ];
                }
            }
        }

        $stmt = $pdo->prepare("INSERT INTO orders (user_id, total_price, items_json, created_at) VALUES (?, ?, ?, ?)");
        $stmt->execute([$user['id'], round($total, 2), json_encode($orderItems), date('Y-m-d H:i:s')]);
        $orderId = $pdo->lastInsertId();

        echo json_encode([
            'orderId' => $orderId,
            'total' => round($total, 2),
            'items' => $orderItems,
            'createdAt' => date('Y-m-d H:i:s')
        ]);
        exit;
    }

    if ($method === 'GET' && $uri === '/orders') {
        $user = getAuthUser($pdo);
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Neautorizuota']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC");
        $stmt->execute([$user['id']]);
        $orders = $stmt->fetchAll();

        foreach ($orders as &$o) {
            $o['items'] = json_decode($o['items_json'], true);
            unset($o['items_json']);
        }

        echo json_encode($orders);
        exit;
    }

    http_response_code(404);
    echo json_encode(['error' => 'Endpoint nerastas']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function getAuthUser(PDO $pdo): ?array {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (preg_match('/Bearer\s+(\S+)/', $auth, $matches)) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE token = ?");
        $stmt->execute([$matches[1]]);
        $user = $stmt->fetch();
        return $user ?: null;
    }
    return null;
}

function generateGameKey(): string {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $parts = [];
    for ($p = 0; $p < 3; $p++) {
        $part = '';
        for ($i = 0; $i < 5; $i++) {
            $part .= $chars[random_int(0, strlen($chars) - 1)];
        }
        $parts[] = $part;
    }
    return implode('-', $parts);
}

function initDatabase(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            token TEXT
        );
        CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            platform TEXT NOT NULL,
            region TEXT NOT NULL,
            genre TEXT NOT NULL,
            description TEXT NOT NULL,
            image TEXT NOT NULL,
            is_bestseller INTEGER DEFAULT 0,
            is_deal INTEGER DEFAULT 0
        );
        CREATE TABLE offers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            seller_name TEXT NOT NULL,
            seller_rating REAL NOT NULL,
            sales_count INTEGER NOT NULL,
            price REAL NOT NULL,
            original_price REAL NOT NULL
        );
        CREATE TABLE orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_price REAL NOT NULL,
            items_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
    ");

    $pdo->prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
        ->execute(['Demo Žaidėjas', 'demo@eneba.com', password_hash('demo123', PASSWORD_DEFAULT)]);

    $products = [
        ['Cyberpunk 2077: Phantom Liberty', 'Steam', 'GLOBAL', 'RPG', 'Atviro pasaulio veiksmo RPG nuotykis Night City mieste.', 'https://images.unsplash.com/photo-1605899435973-ca2d1a8861cf?auto=format&fit=crop&w=600&q=80', 1, 1],
        ['Elden Ring', 'Steam', 'EUROPE', 'Action RPG', 'FromSoftware sukurtas tamsiosios fantastikos veiksmo RPG šedevras.', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80', 1, 0],
        ['EA SPORTS FC 26', 'PSN', 'EUROPE', 'Sportas', 'Naujausias futbolo simuliatorius su HyperMotionV technologija.', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80', 1, 1],
        ['Red Dead Redemption 2', 'Rockstar', 'GLOBAL', 'Nuotykiai', 'Epinė laukinių vakarų istorija apie Arthur Morgan ir Van der Linde gaują.', 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=600&q=80', 1, 0],
        ['The Witcher 3: Wild Hunt GOTY', 'GOG', 'GLOBAL', 'RPG', 'Tapkite profesionaliu pabaisų medžiotoju Geraltu iš Rivijos.', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80', 0, 1],
        ['Xbox Game Pass Ultimate 1 Month', 'Xbox', 'GLOBAL', 'Prenumerata', 'Šimtai aukščiausios kokybės žaidimų konsolėje ir PC.', 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=600&q=80', 0, 1],
        ['Baldur\'s Gate 3', 'Steam', 'GLOBAL', 'RPG', 'Naujos kartos vaidmenų žaidimas Dungeons & Dragons visatoje.', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80', 1, 0],
        ['Grand Theft Auto V: Premium Edition', 'Rockstar', 'EUROPE', 'Veiksmas', 'Los Santos kriminalinis pasaulis ir GTA Online.', 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=600&q=80', 0, 1]
    ];

    $prodStmt = $pdo->prepare("INSERT INTO products (title, platform, region, genre, description, image, is_bestseller, is_deal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $offerStmt = $pdo->prepare("INSERT INTO offers (product_id, seller_name, seller_rating, sales_count, price, original_price) VALUES (?, ?, ?, ?, ?, ?)");

    $sellers = [
        ['BalticKeys', 99.8, 15420],
        ['GameVault_EU', 98.5, 8930],
        ['PixelStore', 97.2, 4120],
        ['InstantLoot', 99.1, 22100]
    ];

    foreach ($products as $idx => $p) {
        $prodStmt->execute($p);
        $productId = $pdo->lastInsertId();
        $basePrice = 14.99 + ($idx * 5.5);

        for ($s = 0; $s < 3; $s++) {
            $seller = $sellers[($idx + $s) % count($sellers)];
            $price = round($basePrice + ($s * 2.40), 2);
            $origPrice = round($price * 1.65, 2);
            $offerStmt->execute([$productId, $seller[0], $seller[1], $seller[2], $price, $origPrice]);
        }
    }
}
