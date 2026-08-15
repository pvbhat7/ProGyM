<?php
    class AppControl {

        private $conn;
        private $db_table = "app_control";

        public function __construct($db){
            $this->conn = $db;
        }

        // Returns the single config row (id = 1)
        public function getStatus(){
            $sqlQuery = "SELECT id, passcode, app_locked, admin_secret, locked_at
                         FROM " . $this->db_table . "
                         WHERE id = 1";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }

        // Compares submitted passcode with stored one. Returns true/false.
        public function verifyPasscode($code){
            $row = $this->getStatus();
            if (!$row) return false;
            return strval($row['passcode']) === strval($code);
        }

        // Sets lock to 'true' / 'false'. Requires correct admin_secret. Returns true on success.
        public function setLocked($newState, $providedSecret){
            $row = $this->getStatus();
            if (!$row) return false;
            if (strval($row['admin_secret']) !== strval($providedSecret)) return false;

            $state = ($newState === true || $newState === 'true' || $newState === 1 || $newState === '1') ? 'true' : 'false';
            $ts = ($state === 'true') ? date('d-m-Y h:i:s') : null;

            $sqlQuery = "UPDATE " . $this->db_table . "
                         SET app_locked = :state, locked_at = :ts
                         WHERE id = 1";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->bindParam(':state', $state);
            $stmt->bindParam(':ts', $ts);
            return $stmt->execute();
        }
    }
?>
