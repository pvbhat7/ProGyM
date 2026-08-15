<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

    include_once '../../config/database.php';
    $database = new Database();
    $db = $database->getConnection();

    $data = json_decode(file_get_contents("php://input"), true);

    $id = isset($data['id']) ? (int)$data['id'] : 0;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "id is required"]);
        exit;
    }

    $name       = isset($data['name'])       ? trim($data['name'])       : '';
    $mobile     = isset($data['mobile'])     ? trim($data['mobile'])     : '';
    $email      = isset($data['email'])      ? trim($data['email'])      : '';
    $gender     = isset($data['gender'])     ? trim($data['gender'])     : '';
    $birthDate  = isset($data['birthDate'])  ? trim($data['birthDate'])  : '';
    $bloodGroup = isset($data['bloodGroup']) ? trim($data['bloodGroup']) : '';
    $address    = isset($data['address'])    ? trim($data['address'])    : '';
    $occupation = isset($data['occupation']) ? trim($data['occupation']) : '';
    $height     = isset($data['height'])     ? trim($data['height'])     : '';
    $weight     = isset($data['weight'])     ? trim($data['weight'])     : '';
    $remarks    = isset($data['remarks'])    ? trim($data['remarks'])    : '';
    $previousGym = isset($data['previousGym']) ? trim($data['previousGym']) : '';
    $photoData  = isset($data['photo'])      ? $data['photo']            : '';

    // Fetch current photo to preserve when no new photo sent
    $cur = $db->prepare("SELECT photo FROM client WHERE id = ?");
    $cur->execute([$id]);
    $curRow = $cur->fetch(PDO::FETCH_ASSOC);
    $photoUrl = $curRow ? $curRow['photo'] : '';

    if ($photoData !== '') {
        if (substr($photoData, 0, 4) === 'http') {
            $photoUrl = $photoData;
        } else {
            $bin = base64_decode($photoData, true);
            if ($bin !== false) {
                $im = @imageCreateFromString($bin);
                if ($im) {
                    $fName = $id . $name . ".png";
                    $img_file = '../../../profilePictures/' . $fName;
                    imagepng($im, $img_file, 0);
                    imagedestroy($im);
                    $rnd = rand(10, 1000);
                    $photoUrl = 'https://tavrostechinfo.com/PROGYM/profilePictures/' . $fName . '?' . $rnd;
                }
            }
        }
    }

    $stmt = $db->prepare(
        "UPDATE client SET name=?, mobile=?, email=?, gender=?, birthDate=?, bloodGroup=?, address=?, occupation=?, height=?, weight=?, remarks=?, previousGym=?, photo=? WHERE id=?"
    );
    $ok = $stmt->execute([$name, $mobile, $email, $gender, $birthDate, $bloodGroup, $address, $occupation, $height, $weight, $remarks, $previousGym, $photoUrl, $id]);

    echo json_encode(["message" => $ok ? "Client updated" : "Update failed", "photo" => $photoUrl]);
?>
