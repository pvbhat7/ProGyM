<?php
    class Supplements{

        // Connection
        private $conn;

        // Table
        private $db_table = "supplements";

        // Columns
        	public $id;
        	public $productName;
        	public $oldPrice;
        	public $newPrice;
        	public $productPhoto;
        	public $productPhotoDesc;
        	public $productPhotoDesc1;
			public $discontinue;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

        // GET ALL
        public function getAllSupplements(){
            $sqlQuery = "SELECT id, productName , oldPrice , newPrice , productPhoto ,productPhotoDesc ,productPhotoDesc1 , discontinue FROM " . $this->db_table . " where discontinue = 'false' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        
        

        public function updateSupplements(){
            
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
						productName = '".$this->productName."',
						oldPrice = '".$this->oldPrice."',
						newPrice = '".$this->newPrice."',
						productPhoto = '".$this->productPhoto."',
						productPhotoDesc = '".$this->productPhotoDesc."',
						productPhotoDesc1 = '".$this->productPhotoDesc1."',
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
        
        public function updateSupplementsPhoto(){
            
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
        
        public function updateSupplementsPhotoDesc(){
            
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
						productPhotoDesc = '".$this->productPhotoDesc."'
                    WHERE 
                        id =".$this->id."";
                        
            echo $sqlQuery;
            $stmt = $this->conn->prepare($sqlQuery);
        
            if($stmt->execute()){
               return true;
            }
            return false;
        }
        
         public function updateSupplementsPhotoDesc1(){
            
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
						productPhotoDesc1 = '".$this->productPhotoDesc1."'
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

