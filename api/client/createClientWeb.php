<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

    include_once '../../config/database.php';
    include_once '../../class/WelcomeEmail.php';
    $database = new Database();
    $db = $database->getConnection();

    $data       = json_decode(file_get_contents("php://input"), true);
    $name       = isset($data['name'])       ? trim($data['name'])       : '';
    $mobile     = isset($data['mobile'])     ? trim($data['mobile'])     : '';
    $gender     = isset($data['gender'])     ? trim($data['gender'])     : '';
    $email      = isset($data['email'])      ? trim($data['email'])      : '';
    $birthDate  = isset($data['birthDate'])  ? trim($data['birthDate'])  : '';
    $address    = isset($data['address'])    ? trim($data['address'])    : '';
    $bloodGroup = isset($data['bloodGroup']) ? trim($data['bloodGroup']) : '';
    $reference  = isset($data['reference'])  ? trim($data['reference'])  : '';
    $photoData  = isset($data['photo'])      ? $data['photo']            : '';

    if (!$name || !$mobile) {
        http_response_code(400);
        echo json_encode(["message" => "name and mobile are required"]);
        exit;
    }

    $admDate = date("d/m/Y");

    $stmt = $db->prepare(
        "INSERT INTO client
         SET name=?, admissionDate=?, mobile=?, gender=?, birthDate=?,
             email=?, address=?, bloodGroup=?, reference=?,
             photo='', profileActiveFlag='enable', isGymClient='yes',
             creationSource='admin', discontinue='false', referPoints='',
             remarks='', previousGym='', height=0, weight=0,
             adp='', awp='', isPTClient='no', occupation=''"
    );
    $ok = $stmt->execute([$name, $admDate, $mobile, $gender, $birthDate,
                          $email, $address, $bloodGroup, $reference]);

    if (!$ok) {
        http_response_code(500);
        echo json_encode(["message" => "Could not create client"]);
        exit;
    }

    $newId   = $db->lastInsertId();
    $photoUrl = '';

    if ($photoData !== '') {
        $bin = base64_decode($photoData, true);
        if ($bin !== false) {
            $im = @imageCreateFromString($bin);
            if ($im) {
                $fName    = $newId . $name . ".png";
                $img_file = '../../../profilePictures/' . $fName;
                imagepng($im, $img_file, 0);
                imagedestroy($im);
                $rnd      = rand(10, 1000);
                $photoUrl = 'https://tavrostechinfo.com/PROGYM/profilePictures/' . $fName . '?' . $rnd;
                $db->prepare("UPDATE client SET photo=? WHERE id=?")->execute([$photoUrl, $newId]);
            }
        }
    }

    $dt = date("d M Y");
    $db->prepare("INSERT INTO rewards (title, amount, isRedeemed, redeemDate, clientId) VALUES ('You have won procoins','100','true',?,?)")
       ->execute([$dt, $newId]);
    $db->prepare("INSERT INTO procointransaction (txnId, des, amount, creditDebit, txnDate, clientId) VALUES ('4564pt','Signup Welcome Bonus','100','1',?,?)")
       ->execute([$dt, $newId]);

    WelcomeEmail::send($db, $newId);

    echo json_encode(["message" => "Client created successfully", "id" => (int)$newId, "photo" => $photoUrl]);
?>
