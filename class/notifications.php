<?php
    class notifications{

        // Connection
        private $conn;

        // Table
        private $db_table = "notifications";

        // Columns
        	public $id;
			public $activity;
			public $activityDate;
			public $amount;	
			public $clientGender;
			public $clientId;
			public $discontinue;
			public $memberName;
			public $trainer;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

       
        // CREATE
        public function create(){
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        activity = '".$this->activity."',
						activityDate = '".$this->activityDate."',
						amount = '".$this->amount."',
						clientGender = '".$this->clientGender."',
						clientId = '".$this->clientId."',
						discontinue = '".$this->discontinue."',
						memberName = '".$this->memberName."',
						trainer = '".$this->trainer."'";
	    $stmt = $this->conn->prepare($sqlQuery);
        
           
            $stmt->execute();
        $lastInsertedId = $this->conn->lastInsertId();
        return  $lastInsertedId;		
			
        }
		
        // DELETE
        function delet(){
            $sqlQuery = "DELETE FROM " . $this->db_table . " WHERE id = ?";
            $stmt = $this->conn->prepare($sqlQuery);
        
            $this->id=htmlspecialchars(strip_tags($this->id));
        
            $stmt->bindParam(1, $this->id);
        
            if($stmt->execute()){
                return true;
            }
            return false;
        }
		

        // BY USER
        public function getByUser(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where trainer = '".$this -> trainer."' and discontinue  = 'false'  order by id desc";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        // BY ACTIVITY
        public function getByActivity(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where activity = '".$this -> activity."' and discontinue  = 'false'  order by id desc";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        // ALL
        public function getAll(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where  discontinue  = 'false' order by id desc";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 
        
        
        
        // ALL
        public function byGreaterThanDate(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where activityDate > '".$this -> activityDate."' and discontinue  = 'false' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 
		
    }
?>

