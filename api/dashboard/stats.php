<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';

    $database = new Database();
    $db = $database->getConnection();

    date_default_timezone_set('Asia/Calcutta');
    $today     = date('d/m/Y');       // e.g. 24/04/2026
    $monthYear = date('m/Y');         // e.g. 04/2026  — used as LIKE filter on paymentDate

    // 1. Active gym members
    $q = $db->query("SELECT COUNT(*) as cnt FROM client
                     WHERE discontinue != 'true'
                       AND isGymClient = 'yes'
                       AND profileActiveFlag = 'enable'");
    $activeMembers = (int) $q->fetch(PDO::FETCH_ASSOC)['cnt'];

    // 2. Today's attendance
    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM attendance WHERE date = ?");
    $stmt->execute([$today]);
    $todayAttendance = (int) $stmt->fetch(PDO::FETCH_ASSOC)['cnt'];

    // 3. Monthly revenue — sum approved transactions for current month
    $stmt2 = $db->prepare("SELECT COALESCE(SUM(feesPaid), 0) as total
                           FROM paymenttransaction
                           WHERE discontinue != 'true'
                             AND isApproved = 'YES'
                             AND paymentDate LIKE ?");
    $stmt2->execute(['%' . $monthYear . '%']);
    $monthlyRevenue = (float) $stmt2->fetch(PDO::FETCH_ASSOC)['total'];

    // 4. Pending payments — active enrollments where client hasn't fully paid
    $q2 = $db->query("SELECT COUNT(*) as cnt FROM packagedetails
                      WHERE discontinue != 'true'
                        AND status = 'active'
                        AND amountPaid < fees");
    $pendingPayments = (int) $q2->fetch(PDO::FETCH_ASSOC)['cnt'];

    echo json_encode(array(
        "activeMembers"   => $activeMembers,
        "todayAttendance" => $todayAttendance,
        "monthlyRevenue"  => $monthlyRevenue,
        "pendingPayments" => $pendingPayments
    ));
?>
