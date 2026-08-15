<?php
    class BeforeAfterPhotos{

        // Connection
        private $conn;

        // Table
        private $db_table = "before_after_photos";

        // Columns
        public $id;
        public $clientId;
        public $week_label;
        public $week_start_date;
        public $week_end_date;
        public $after_photo;
        public $upload_date;
        public $coins_credited;
        public $discontinue;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

        // INSERT new weekly after photo
        public function upload(){
            $sqlQuery = "INSERT INTO
                        " . $this->db_table . "
                    SET
                        clientId = '" . $this->clientId . "',
                        week_label = '" . $this->week_label . "',
                        week_start_date = '" . $this->week_start_date . "',
                        week_end_date = '" . $this->week_end_date . "',
                        after_photo = '" . $this->after_photo . "',
                        upload_date = '" . $this->upload_date . "',
                        coins_credited = '" . $this->coins_credited . "',
                        discontinue = 'false'";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $this->conn->lastInsertId();
        }

        // UPDATE after_photo for an existing week slot (re-upload, no coin change)
        public function updatePhoto(){
            $sqlQuery = "UPDATE
                        " . $this->db_table . "
                    SET
                        after_photo = '" . $this->after_photo . "',
                        upload_date = '" . $this->upload_date . "'
                    WHERE
                        clientId = '" . $this->clientId . "'
                        AND week_label = '" . $this->week_label . "'
                        AND discontinue = 'false'";
            $stmt = $this->conn->prepare($sqlQuery);
            return $stmt->execute();
        }

        // CHECK if a row exists for this client + week_label; returns the row or false
        public function existsForWeek(){
            $sqlQuery = "SELECT id, after_photo, coins_credited FROM " . $this->db_table . "
                        WHERE clientId = '" . $this->clientId . "'
                          AND week_label = '" . $this->week_label . "'
                          AND discontinue = 'false'
                        LIMIT 1";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }

        // GET all after photos for a client, newest first
        public function getByClientId(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . "
                        WHERE clientId = '" . $this->clientId . "'
                          AND discontinue = 'false'
                        ORDER BY id DESC";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }

        // REJECT (soft-delete) an entry by id; returns the after_photo path for logging
        public function reject(){
            $sqlQuery = "UPDATE " . $this->db_table . " SET discontinue = 'true' WHERE id = " . $this->id;
            $stmt = $this->conn->prepare($sqlQuery);
            return $stmt->execute();
        }

        // GET the after_photo path for a specific entry (used before rejecting)
        public function getById(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " WHERE id = " . $this->id . " LIMIT 1";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }

        // GET all active entries for admin view, joined with client name and before photo
        public function getAll(){
            $sqlQuery = "SELECT b.*, c.name as clientName, c.photo as clientPhoto, c.before_photo_path as beforePhotoPath
                        FROM " . $this->db_table . " b
                        LEFT JOIN client c ON c.id = b.clientId
                        WHERE b.discontinue = 'false'
                        ORDER BY b.id DESC";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }

    }
?>
