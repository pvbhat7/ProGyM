<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

include_once '../../config/database.php';
include_once '../../class/ApprovedDevice.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->fingerprint) || empty(trim($data->fingerprint))) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Fingerprint required."]);
    exit;
}

// Collect server-side IP
$ip = '';
if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $ip = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
} elseif (!empty($_SERVER['HTTP_CLIENT_IP'])) {
    $ip = $_SERVER['HTTP_CLIENT_IP'];
} else {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
}

$item = new ApprovedDevice($db);
$item->fingerprint  = trim($data->fingerprint);
$item->email        = isset($data->email)       ? trim($data->email)       : '';
$item->device_info  = isset($data->device_info) ? trim($data->device_info) : '';
$item->ip_address   = $ip;

$result = $item->requestAccess();

// Send email only for brand-new requests (existing fingerprints don't get a ticket_id in result)
if (isset($result['ticket_id'])) {
    $to      = 'progymkop@gmail.com';
    $subject = 'ProGym – New Device Access Request #' . $result['ticket_id'];

    $device_info = htmlspecialchars($item->device_info ?: 'Unknown');
    $ip_addr     = htmlspecialchars($ip ?: 'Unknown');
    $ticket      = htmlspecialchars($result['ticket_id']);
    $requested   = date('d/m/Y H:i:s');

    $body = "
<html><body style='font-family:Arial,sans-serif;color:#333;max-width:480px;margin:0 auto'>
  <div style='background:#f97316;padding:20px 24px;border-radius:12px 12px 0 0'>
    <h2 style='color:#fff;margin:0;font-size:18px'>📱 New Device Access Request</h2>
    <p style='color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px'>ProGym Public Dashboard</p>
  </div>
  <div style='background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px'>
    <table style='width:100%;border-collapse:collapse;font-size:14px'>
      <tr><td style='padding:8px 0;color:#6b7280;width:120px'>Ticket ID</td>
          <td style='padding:8px 0;font-weight:bold;color:#4f46e5;font-family:monospace;font-size:18px'>#$ticket</td></tr>
      <tr style='border-top:1px solid #f3f4f6'>
          <td style='padding:8px 0;color:#6b7280'>Device</td>
          <td style='padding:8px 0;font-weight:600'>$device_info</td></tr>
      <tr style='border-top:1px solid #f3f4f6'>
          <td style='padding:8px 0;color:#6b7280'>IP Address</td>
          <td style='padding:8px 0'>$ip_addr</td></tr>
      <tr style='border-top:1px solid #f3f4f6'>
          <td style='padding:8px 0;color:#6b7280'>Requested At</td>
          <td style='padding:8px 0'>$requested</td></tr>
    </table>
    <div style='margin-top:20px;padding:12px 16px;background:#fef3c7;border-radius:8px;font-size:13px;color:#92400e'>
      Log in to the ProGym admin dashboard and go to <strong>Approved Devices</strong> to approve or reject this request.
    </div>
  </div>
</body></html>";

    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: ProGym Alerts <noreply@tavrostechinfo.com>\r\n";

    mail($to, $subject, $body, $headers);
}

echo json_encode([
    "success"   => true,
    "status"    => $result['status'],
    "id"        => $result['id'],
    "ticket_id" => $result['ticket_id'] ?? null,
]);
?>
