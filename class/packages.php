<?php
    class packages{

        // Connection
        private $conn;

        // Table
        private $db_table = "packages";

        // Columns
        	public $id;
			public $days;
			public $fees;
			public $gender;			
			public $description;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

       
        // CREATE
        public function create(){
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        days = '".$this->days."',
						fees = '".$this->fees."',
						gender = '".$this->gender."',
						description = '".$this->description."'";

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
                        days = '".$this->days."',
						fees = '".$this->fees."',
						gender = '".$this->gender."',
						description = '".$this->description."'
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
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where id = ".$this -> id." ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }        

        // BY GENDER
        public function getByGender(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where gender = '".$this -> gender."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 		
		
    }
?>

