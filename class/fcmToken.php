<?php
    class fcmToken{

        // Connection
        private $conn;

        // Table
        private $db_table = "fcmToken";

        // Columns
        	public $id;
        	public $mobile;
        	public $discontinue;
        	public $token;
        	

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

        // GET ALL 
        public function getAll(){
            $sqlQuery = "select id , mobile , token , discontinue from fcmToken where discontinue = 'false' ";    
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        // CREATE
        public function create(){
            
            
            $lastInsertedId = '';
            $s1 = "select * from fcmToken where mobile = '".$this -> mobile."' and token = '".$this -> token."'";
            $st1 = $this->conn->prepare($s1);
            $st1->execute();
            $itemCount = $st1->rowCount();

            if($itemCount == 0)
            {
             $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        mobile = '".$this->mobile."',
						discontinue = '".$this->discontinue."',
						token = '".$this->token."'";
						
					
						
	        $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            $lastInsertedId = $this->conn->lastInsertId();
           
            
            }
            
            return  $lastInsertedId;   
			
        }
        
        // GET BY ID
        	function getByMobile(){
		    $sqlQuery = "select id , mobile , token , discontinue from fcmToken where discontinue = 'false' and mobile = '".$this -> mobile."' ";    
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}
		
		// GET BY ID
        	function getByMobileList(){
		    $sqlQuery = "select id , mobile , token , discontinue from fcmToken where discontinue = 'false' and mobile in ( ".$this -> mobile." ) ";    
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}
       

        // UPDATE BY ID
        public function update(){
            $sqlQuery = "delete from 
                        ". $this->db_table ."
                    WHERE 
                        id =".$this->id."";
                        
            $stmt = $this->conn->prepare($sqlQuery);
        
            if($stmt->execute()){
            
               return true;
            }
            return false;
        }
       
    }
?>

