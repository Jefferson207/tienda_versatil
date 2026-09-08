<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

$manualToken = getenv('62d01d8fef630cf6b4e86a21e965d39252d516022617306fb64ee2f98602c9aa') ?: '';
$expectedToken = $manualToken;
$providedToken = isset($_POST['token']) && is_string($_POST['token']) ? $_POST['token'] : '';
if ($expectedToken === '' || $expectedToken === '62d01d8fef630cf6b4e86a21e965d39252d516022617306fb64ee2f98602c9aa') {
    http_response_code(503);
    echo json_encode(['error' => 'Configura el token dentro de upload.php.']);
    exit;
}
if (!hash_equals($expectedToken, $providedToken)) {
    http_response_code(401);
    echo json_encode(['error' => 'Acceso no autorizado.']);
    exit;
}
$action = isset($_POST['action']) && is_string($_POST['action']) ? $_POST['action'] : 'upload';
if ($action === 'delete') {
    $url = isset($_POST['url']) && is_string($_POST['url']) ? $_POST['url'] : '';
    $path = parse_url($url, PHP_URL_PATH);
    if (!is_string($path) || !str_starts_with($path, '/uploads/tienda/')) {
        http_response_code(400);
        echo json_encode(['error' => 'Ruta de imagen no válida.']);
        exit;
    }
    $target = dirname(__DIR__) . '/uploads/tienda/' . basename($path);
    if (is_file($target) && !unlink($target)) {
        http_response_code(500);
        echo json_encode(['error' => 'No se pudo eliminar la imagen.']);
        exit;
    }
    echo json_encode(['ok' => true]);
    exit;
}
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibió una imagen válida.']);
    exit;
}

$file = $_FILES['file'];
if ($file['size'] <= 0 || $file['size'] > 5 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['error' => 'La imagen debe pesar como máximo 5 MB.']);
    exit;
}
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
$loaders = ['image/jpeg' => 'imagecreatefromjpeg', 'image/png' => 'imagecreatefrompng', 'image/webp' => 'imagecreatefromwebp'];
if (!isset($loaders[$mime]) || !function_exists($loaders[$mime]) || !function_exists('imagewebp')) {
    http_response_code(400);
    echo json_encode(['error' => 'Solo se permiten imágenes JPG, PNG o WebP.']);
    exit;
}

$uploadDirectory = dirname(__DIR__) . '/uploads/tienda';
if (!is_dir($uploadDirectory) && !mkdir($uploadDirectory, 0755, true)) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo crear la carpeta de imágenes.']);
    exit;
}
$image = $loaders[$mime]($file['tmp_name']);
if ($image === false) {
    http_response_code(400);
    echo json_encode(['error' => 'No se pudo procesar la imagen.']);
    exit;
}
imagealphablending($image, false);
imagesavealpha($image, true);
$filename = date('Ymd') . '-' . bin2hex(random_bytes(12)) . '.webp';
if (!imagewebp($image, $uploadDirectory . '/' . $filename, 82)) {
    imagedestroy($image);
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo convertir la imagen a WebP.']);
    exit;
}
imagedestroy($image);

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$url = $scheme . '://' . $_SERVER['HTTP_HOST'] . '/uploads/tienda/' . $filename;
echo json_encode(['url' => $url], JSON_UNESCAPED_SLASHES);
