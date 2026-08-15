<?php
    class WeightTracker{

        // Connection
        private $conn;

        // Table
        private $db_table = "WeightTracker";

        // Columns
        	public $id;
			public $cid;
			public $date;			
			public $weight;
			
        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

       
        public function add(){
           
        
            $sqlQuery = "INSERT INTO ". $this->db_table ." SET
                        cid = '".$this->cid."',
						date = '".$this->date."',
						weight ='".$this->weight."' ";

	         $stmt = $this->conn->prepare($sqlQuery);
        
           
           $stmt->execute();
        }
        
        public function getByCid(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where cid = ".$this -> cid." order by id desc limit 15";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 
        
        public function deleteById(){
            $sqlQuery = "delete FROM " . $this->db_table . " where id = ".$this -> id."" ;
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 
        
        
		
    }
?>

