<?php
    class UserNotifications{

        // Connection
        private $conn;

        // Table
        private $db_table = "user_notifications";

        // Columns
        public $id;
        public $clientId;
        public $type;
        public $title;
        public $message;
        public $amount;
        public $isRead;
        public $createdAt;
        public $discontinue;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

        // CREATE
        public function create(){
            $sqlQuery = "INSERT INTO
                        " . $this->db_table . "
                    SET
                        clientId = '" . $this->clientId . "',
                        type = '" . $this->type . "',
                        title = '" . $this->title . "',
                        message = '" . $this->message . "',
                        amount = '" . $this->amount . "',
                        isRead = 'no',
                        createdAt = '" . $this->createdAt . "',
                        discontinue = 'false'";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $this->conn->lastInsertId();
        }

        // GET all unread + recent notifications for a client
        public function getByClientId(){
            $sqlQuery = "SELECT id, clientId, type, title, message, amount, isRead, createdAt FROM " . $this->db_table . " WHERE clientId = '" . $this->clientId . "' AND discontinue = 'false' ORDER BY id DESC LIMIT 50";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }

        // MARK a single notification as read
        public function markRead(){
            $sqlQuery = "UPDATE
                        " . $this->db_table . "
                    SET
                        isRead = 'yes'
                    WHERE
                        id = " . $this->id . "";
            $stmt = $this->conn->prepare($sqlQuery);
            if($stmt->execute()){
                return true;
            }
            return false;
        }

        // MARK all notifications for a client as read
        public function markAllReadByClientId(){
            $sqlQuery = "UPDATE
                        " . $this->db_table . "
                    SET
                        isRead = 'yes'
                    WHERE
                        clientId = '" . $this->clientId . "' AND discontinue = 'false'";
            $stmt = $this->conn->prepare($sqlQuery);
            if($stmt->execute()){
                return true;
            }
            return false;
        }

    }
?>
