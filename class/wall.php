<?php
    class wall{

        // Connection
        private $conn;

        // Table
        private $db_table = "wall";

        // Columns
        	public $id;
        	public $clientId;
        	public $clientName;
        	public $clientPhoto;
        	public $clientMobile;
        	public $clientEmail;
        	public $uploadDate;
        	public $postPhoto;
        	public $isApproved;
        	public $hashTag;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

        // GET ALL 
        public function getAll(){
            $sqlQuery = "select id , clientId , clientName , clientPhoto , clientMobile , clientEmail , uploadDate , postPhoto , isApproved , hashTag from wall where isApproved != 'deleted' order by id desc";    
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        // CREATE
        public function create(){
            
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        clientId = '".$this->clientId."',
						clientName = '".$this->clientName."',
						clientPhoto = '".$this->clientPhoto."',
						clientMobile = '".$this->clientMobile."',
						clientEmail = '".$this->clientEmail."',
						uploadDate = '".$this->uploadDate."',
						postPhoto = '".$this->postPhoto."',
						hashTag = '".$this->hashTag."',
						isApproved = '".$this->isApproved."'";
						
	        $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            $lastInsertedId = $this->conn->lastInsertId();
            return  $lastInsertedId;
			
        }
        
        // GET BY ID
        	function getByClientId(){
		    $sqlQuery = "select id , clientId , clientName , clientPhoto , clientMobile , clientEmail , uploadDate , postPhoto , isApproved , hashTag from wall where isApproved != 'deleted' and clientId = '".$this -> clientId."' order by id desc";    
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}
       

        // UPDATE BY ID
        public function update(){
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
                        isApproved = '".$this->isApproved."'
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

