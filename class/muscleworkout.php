<?php
    class muscleworkout{

        // Connection
        private $conn;

        // Table
        private $db_table = "muscleworkout";

        // Columns
        	public $id;
			public $day;
			public $mainWorkoutName;			
			public $subWorkoutName;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

        // GET ALL
        public function getAll(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . "";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }

        // CREATE
        public function create(){
            $sqlQuery = "INSERT INTO " . $this->db_table . "
                SET
                    day = '" . $this->day . "',
                    mainWorkoutName = '" . $this->mainWorkoutName . "',
                    subWorkoutName = '" . $this->subWorkoutName . "'";
            $stmt = $this->conn->prepare($sqlQuery);
            if($stmt->execute()){
                return true;
            }
            return false;
        }

        // UPDATE
        public function update(){
            $sqlQuery = "UPDATE " . $this->db_table . "
                SET
                    day = '" . $this->day . "',
                    mainWorkoutName = '" . $this->mainWorkoutName . "',
                    subWorkoutName = '" . $this->subWorkoutName . "'
                WHERE id = " . $this->id;
            $stmt = $this->conn->prepare($sqlQuery);
            if($stmt->execute()){
                return true;
            }
            return false;
        }

        // DELETE
        public function deleteById(){
            $sqlQuery = "DELETE FROM " . $this->db_table . " WHERE id = ?";
            $stmt = $this->conn->prepare($sqlQuery);
            $this->id = htmlspecialchars(strip_tags($this->id));
            $stmt->bindParam(1, $this->id);
            if($stmt->execute()){
                return true;
            }
            return false;
        }

    }
?>

