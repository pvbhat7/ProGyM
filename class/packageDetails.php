<?php
    class packagedetails{

        // Connection
        private $conn;

        // Table
        private $db_table = "packagedetails";

        // Columns
        	public $id;
			public $description;
			public $fees;
			public $startDate;
			public $endDate;
			public $amountPaid;			
			public $paymentDate;			
			public $status;			
			public $packageId;			
			public $clientId;			
			public $discontinue;			
			

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

       
        // CREATE
        public function create(){
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        description = '".$this->description."',
						fees = '".$this->fees."',
						startDate = '".$this->startDate."',
						endDate = '".$this->endDate."',
						amountPaid = '".$this->amountPaid."',
						paymentDate = '".$this->paymentDate."',
						status = '".$this->status."',
						packageId = '".$this->packageId."',
						clientId = '".$this->clientId."',
						discontinue = '".$this->discontinue."'";

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
                        description = '".$this->description."',
						fees = '".$this->fees."',
						startDate = '".$this->startDate."',
						endDate = '".$this->endDate."',
						amountPaid = '".$this->amountPaid."',
						paymentDate = '".$this->paymentDate."',
						status = '".$this->status."',
						packageId = '".$this->packageId."',
						clientId = '".$this->clientId."',
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
			
			$sqlQuery = "DELETE FROM paymenttransaction where packageDetailsId = ".$this -> id." ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
			
			
            $sqlQuery = "DELETE FROM " . $this->db_table . " where id = ".$this -> id." ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
		

        // BY ID
        public function getById(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where id = ".$this -> id." ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }

		// BY CLIENT ID
        public function getByClientId(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where clientId = ".$this -> clientId." order by id desc";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 

		// BY CLIENT LATEST PACKAGE
        public function byClientLatestPackage(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where clientId = ".$this -> clientId." order by id desc limit 1";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 		

        // BY STATUS IN
        public function getByStatusIn(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where status = '".$this -> status."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }

		// BY STATUS NOT IN
        public function getByStatusNotIn(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where status != '".$this -> status."' and discontinue = 'false'  ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 

		// ALL
        public function getAll(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where discontinue = 'false'  ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 		
		
    }
?>

