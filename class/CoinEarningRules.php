<?php
    class CoinEarningRules{

        // Connection
        private $conn;

        // Table
        private $db_table = "coin_earning_rules";

        // Columns
        public $id;
        public $eventType;
        public $coinAmount;
        public $description;
        public $isActive;
        public $updatedAt;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

        // GET ALL
        public function getAll(){
            $sqlQuery = "SELECT id, eventType, coinAmount, description, isActive, updatedAt FROM " . $this->db_table . " ORDER BY id ASC";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }

        // GET BY EVENT TYPE
        public function getByEventType(){
            $sqlQuery = "SELECT id, eventType, coinAmount, description, isActive, updatedAt FROM " . $this->db_table . " WHERE eventType = '" . $this->eventType . "' AND isActive = 'yes' LIMIT 1";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }

        // UPDATE
        public function update(){
            $sqlQuery = "UPDATE
                        " . $this->db_table . "
                    SET
                        coinAmount = '" . $this->coinAmount . "',
                        isActive = '" . $this->isActive . "',
                        updatedAt = '" . $this->updatedAt . "'
                    WHERE
                        id = " . $this->id . "";
            $stmt = $this->conn->prepare($sqlQuery);
            if($stmt->execute()){
                return true;
            }
            return false;
        }

    }
?>
