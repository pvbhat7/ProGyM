<?php
    class Merchandise{

        // Connection
        private $conn;

        // Table
        private $db_table = "merchandise";

        // Columns
        	public $id;
        	public $productName;
        	public $oldPrice;
        	public $newPrice;
        	public $productPhoto;
			public $discontinue;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

        // GET ALL
        public function getAllMerchandise(){
            $sqlQuery = "SELECT id, productName , oldPrice , newPrice , productPhoto , discontinue FROM " . $this->db_table . "";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        
        

        public function updateMerchandise(){
            
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
						productName = '".$this->productName."',
						oldPrice = '".$this->oldPrice."',
						newPrice = '".$this->newPrice."',
						productPhoto = '".$this->productPhoto."',
						discontinue = '".$this->discontinue."'
                    WHERE 
                        id =".$this->id."";
                        
            echo $sqlQuery;
            $stmt = $this->conn->prepare($sqlQuery);
        
            if($stmt->execute()){
               return true;
            }
            return false;
        }
        
        public function updateMerchandisePhoto(){
            
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
						productPhoto = '".$this->productPhoto."'
                    WHERE 
                        id =".$this->id."";
                        
            echo $sqlQuery;
            $stmt = $this->conn->prepare($sqlQuery);
        
            if($stmt->execute()){
               return true;
            }
            return false;
        }
		
	
    }
?>

