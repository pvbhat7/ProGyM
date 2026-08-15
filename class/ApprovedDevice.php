<?php
class ApprovedDevice {

    private $conn;
    private $db_table = "approved_devices";

    public $id;
    public $fingerprint;
    public $email;
    public $label;
    public $ticket_id;
    public $device_info;
    public $ip_address;
    public $status;
    public $requested_at;
    public $updated_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    private function generateUniqueTicketId() {
        do {
            $ticket = str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
            $check = $this->conn->prepare("SELECT id FROM " . $this->db_table . " WHERE ticket_id = ?");
            $check->execute([$ticket]);
        } while ($check->rowCount() > 0);
        return $ticket;
    }

    public function checkStatus() {
        $query = "SELECT id, fingerprint, email, label, ticket_id, device_info, ip_address, status, requested_at, updated_at
                  FROM " . $this->db_table . "
                  WHERE fingerprint = ?
                  LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$this->fingerprint]);
        return $stmt;
    }

    public function requestAccess() {
        // If fingerprint already exists, return existing record (prevents spam)
        $check = $this->conn->prepare("SELECT id, status FROM " . $this->db_table . " WHERE fingerprint = ? LIMIT 1");
        $check->execute([$this->fingerprint]);
        if ($check->rowCount() > 0) {
            return $check->fetch(PDO::FETCH_ASSOC);
        }

        $now = date('d/m/Y H:i:s');
        $ticket = $this->generateUniqueTicketId();
        $query = "INSERT INTO " . $this->db_table . "
                  (fingerprint, email, ticket_id, device_info, ip_address, status, requested_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([
            $this->fingerprint,
            $this->email,
            $ticket,
            $this->device_info,
            $this->ip_address,
            $now,
            $now,
        ]);
        return ['id' => $this->conn->lastInsertId(), 'status' => 'pending', 'ticket_id' => $ticket];
    }

    public function updateLabel() {
        $query = "UPDATE " . $this->db_table . " SET label = ? WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        return $stmt->execute([$this->label, $this->id]);
    }

    public function getAll() {
        $query = "SELECT id, fingerprint, email, label, ticket_id, device_info, ip_address, status, requested_at, updated_at
                  FROM " . $this->db_table . "
                  ORDER BY
                    CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
                    id DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    public function approve() {
        $now = date('d/m/Y H:i:s');
        $query = "UPDATE " . $this->db_table . " SET status = 'approved', updated_at = ? WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        return $stmt->execute([$now, $this->id]);
    }

    public function reject() {
        $now = date('d/m/Y H:i:s');
        $query = "UPDATE " . $this->db_table . " SET status = 'rejected', updated_at = ? WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        return $stmt->execute([$now, $this->id]);
    }

    public function deleteDevice() {
        $query = "DELETE FROM " . $this->db_table . " WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        return $stmt->execute([$this->id]);
    }
}
?>
