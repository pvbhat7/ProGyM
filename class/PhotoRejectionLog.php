<?php
    class PhotoRejectionLog {

        private $conn;
        private $db_table = "photo_rejection_log";

        public $clientId;
        public $clientName;
        public $week_label;
        public $week_start_date;
        public $week_end_date;
        public $before_photo;
        public $after_photo;
        public $upload_date;
        public $rejected_at;

        public function __construct($db){
            $this->conn = $db;
        }

        public function insert(){
            $stmt = $this->conn->prepare(
                "INSERT INTO " . $this->db_table . "
                 SET clientId = ?, clientName = ?, week_label = ?,
                     week_start_date = ?, week_end_date = ?,
                     before_photo = ?, after_photo = ?,
                     upload_date = ?, rejected_at = ?"
            );
            return $stmt->execute([
                $this->clientId,
                $this->clientName,
                $this->week_label,
                $this->week_start_date,
                $this->week_end_date,
                $this->before_photo,
                $this->after_photo,
                $this->upload_date,
                $this->rejected_at,
            ]);
        }

        public function getAll(){
            $stmt = $this->conn->prepare(
                "SELECT * FROM " . $this->db_table . " ORDER BY id DESC"
            );
            $stmt->execute();
            return $stmt;
        }

    }
?>
