<?php
    class CoinCreditEvents{

        // Connection
        private $conn;

        // Table
        private $db_table = "coin_credit_events";

        // Columns
        public $id;
        public $clientId;
        public $eventType;
        public $eventDate;
        public $eventMonth;
        public $referenceId;
        public $coinAmount;
        public $createdAt;

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
                        eventType = '" . $this->eventType . "',
                        eventDate = '" . $this->eventDate . "',
                        eventMonth = '" . $this->eventMonth . "',
                        referenceId = '" . $this->referenceId . "',
                        coinAmount = '" . $this->coinAmount . "',
                        createdAt = '" . $this->createdAt . "'";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $this->conn->lastInsertId();
        }

        // CHECK: exists for a specific day — set $this->eventDate before calling
        public function existsForDay(){
            $sqlQuery = "SELECT id FROM " . $this->db_table . "
                        WHERE clientId = '" . $this->clientId . "'
                          AND eventType = '" . $this->eventType . "'
                          AND eventDate = '" . $this->eventDate . "'
                        LIMIT 1";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt->rowCount() > 0;
        }

        // CHECK: exists for a specific week — set $this->eventDate = week_start_date before calling
        public function existsForWeek(){
            return $this->existsForDay();
        }

        // CHECK: exists for a specific month — set $this->eventMonth = 'MM/YYYY' before calling
        public function existsForMonth(){
            $sqlQuery = "SELECT id FROM " . $this->db_table . "
                        WHERE clientId = '" . $this->clientId . "'
                          AND eventType = '" . $this->eventType . "'
                          AND eventMonth = '" . $this->eventMonth . "'
                        LIMIT 1";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt->rowCount() > 0;
        }

        // CHECK: exists ever for clientId + eventType — used for one-time-lifetime events (profile_pic)
        public function existsEver(){
            $sqlQuery = "SELECT id FROM " . $this->db_table . "
                        WHERE clientId = '" . $this->clientId . "'
                          AND eventType = '" . $this->eventType . "'
                        LIMIT 1";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt->rowCount() > 0;
        }

        // CHECK: exists for a specific reference — set $this->referenceId before calling
        public function existsForReference(){
            $sqlQuery = "SELECT id FROM " . $this->db_table . "
                        WHERE clientId = '" . $this->clientId . "'
                          AND eventType = '" . $this->eventType . "'
                          AND referenceId = '" . $this->referenceId . "'
                        LIMIT 1";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt->rowCount() > 0;
        }

    }
?>
