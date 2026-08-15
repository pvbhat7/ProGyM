<?php
    class ProfilePhotoReview {

        private $conn;
        private $db_table = "profile_photo_review";

        public $id;
        public $clientId;
        public $clientName;
        public $photo_path;
        public $uploaded_at;
        public $status;
        public $reviewed_at;

        public function __construct($db) {
            $this->conn = $db;
        }

        public function insert() {
            $stmt = $this->conn->prepare(
                "INSERT INTO " . $this->db_table . "
                 SET clientId = ?, clientName = ?, photo_path = ?,
                     uploaded_at = ?, status = 'pending', reviewed_at = NULL"
            );
            return $stmt->execute([
                $this->clientId,
                $this->clientName,
                $this->photo_path,
                $this->uploaded_at,
            ]);
        }

        public function getPending() {
            $stmt = $this->conn->prepare(
                "SELECT * FROM " . $this->db_table . "
                 WHERE status = 'pending'
                 ORDER BY id DESC"
            );
            $stmt->execute();
            return $stmt;
        }

        public function getHistory() {
            $stmt = $this->conn->prepare(
                "SELECT * FROM " . $this->db_table . "
                 WHERE status IN ('approved', 'rejected')
                 ORDER BY id DESC"
            );
            $stmt->execute();
            return $stmt;
        }

        public function approve() {
            $stmt = $this->conn->prepare(
                "UPDATE " . $this->db_table . "
                 SET status = 'approved', reviewed_at = ?
                 WHERE id = ?"
            );
            return $stmt->execute([$this->reviewed_at, $this->id]);
        }

        public function reject() {
            $stmt = $this->conn->prepare(
                "UPDATE " . $this->db_table . "
                 SET status = 'rejected', reviewed_at = ?
                 WHERE id = ?"
            );
            return $stmt->execute([$this->reviewed_at, $this->id]);
        }

        public function countPending() {
            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) as cnt FROM " . $this->db_table . " WHERE status = 'pending'"
            );
            $stmt->execute();
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row ? (int)$row['cnt'] : 0;
        }
    }
?>
