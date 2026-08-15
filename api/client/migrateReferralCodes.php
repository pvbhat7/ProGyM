<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");

    include_once '../../config/database.php';

    $database = new Database();
    $db = $database->getConnection();

    // Step 1: Add column if it doesn't exist
    try {
        $db->exec("ALTER TABLE `client` ADD COLUMN `referralCode` VARCHAR(10) DEFAULT NULL");
        $columnAdded = true;
    } catch (PDOException $e) {
        // Column already exists — safe to ignore duplicate column error
        $columnAdded = false;
    }

    // Step 2: Generate unique codes for clients that don't have one
    function generateUniqueCode($db) {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $len   = strlen($chars);
        do {
            $code = '';
            for ($i = 0; $i < 8; $i++) {
                $code .= $chars[random_int(0, $len - 1)];
            }
            $check = $db->prepare("SELECT id FROM client WHERE referralCode = ?");
            $check->execute([$code]);
        } while ($check->rowCount() > 0);
        return $code;
    }

    $rows = $db->query("SELECT id FROM client WHERE referralCode IS NULL OR referralCode = ''")->fetchAll(PDO::FETCH_ASSOC);
    $updated = 0;

    $upd = $db->prepare("UPDATE client SET referralCode = ? WHERE id = ?");
    foreach ($rows as $row) {
        $code = generateUniqueCode($db);
        $upd->execute([$code, $row['id']]);
        $updated++;
    }

    echo json_encode([
        "success"     => true,
        "columnAdded" => $columnAdded,
        "codesGenerated" => $updated,
        "message"     => "Done. $updated referral codes generated."
    ]);
?>
