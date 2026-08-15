<?php
    class enquiry{

        // Connection
        private $conn;

        // Table
        private $db_table = "enquiry";

        // Columns
        	public $id;
			public $name;
			public $mobile;
			public $email;			
			public $updateDate;
			public $status;
			public $discontinue;
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
                        name = '".$this->name."',
						mobile = '".$this->mobile."',
						email = '".$this->email."',
						updateDate = '".$this->updateDate."',
						status = 'new',
						trainer ='".$this->trainer."',
						discontinue = 'false'";

	    $stmt = $this->conn->prepare($sqlQuery);
        
           
           $stmt->execute();
        $lastInsertedId = $this->conn->lastInsertId();
        return  $lastInsertedId;		
			
        }
		
		// UPDATE
        public function update(){
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
                        name = '".$this->name."',
						mobile = '".$this->mobile."',
						email = '".$this->email."',
						updateDate = '".$this->updateDate."',
						status = '".$this->status."',
						trainer = '".$this->trainer."',
						discontinue = '".$this->discontinue."'
                    WHERE 
                        id =".$this->id."";
						
        
            $stmt = $this->conn->prepare($sqlQuery);
        
            if($stmt->execute()){
               return true;
            }
            return false;
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

        // BY ID
        public function getById(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where id = ".$this -> id." and discontinue = 'false' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }        
        
        // ALL
        public function getAll(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where discontinue = 'false' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }   

        // BY TRAINER
        public function getByTrainer(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where trainer = '".$this -> trainer."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 	
        
         // ALL
        public function byGreaterThanDate(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where updateDate > '".$this -> updateDate."' and discontinue  = 'false' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 
		
    }
?>

