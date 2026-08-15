<?php
    class procointransaction{

        // Connection
        private $conn;

        // Table
        private $db_table = "procointransaction";

        // Columns
        	public $id;
        	public $txnId;
			public $des;
			public $amount;
			public $creditDebit;
			public $txnDate;
			public $clientId;
			

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

        // GET ALL 
        public function getAllProcointransaction(){
            $sqlQuery = "SELECT id , txnId , des , amount , creditDebit , txnDate , clientId FROM " . $this->db_table . "";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        // CREATE
        public function createProcointransactionFromApp(){
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        txnId = '".$this->txnId."',
						des = '".$this->des."',
						amount = '".$this->amount."',
						creditDebit = '".$this->creditDebit."',
						txnDate = '".$this->txnDate."',
						clientId = '".$this->clientId."'";
						

	    $stmt = $this->conn->prepare($sqlQuery);
        
           
            $stmt->execute();
            $lastInsertedId = $this->conn->lastInsertId();
            return  $lastInsertedId;
			
			//return $stmt->debugDumpParams();
			
        }
        
        // GET BY ID
        	function getProcointransactionByClientId(){
		    $sqlQuery = "SELECT  id , txnId , des , amount , creditDebit , txnDate , clientId FROM " . $this->db_table ." where clientId = ".$this->clientId." order by id desc";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}
       

        // UPDATE BY ID
        public function updateProcointransactionFromApp(){
            
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
                        txnId = '".$this->txnId."',
						des = '".$this->des."',
						amount = '".$this->amount."',
						creditDebit = '".$this->creditDebit."',
						txnDate = '".$this->txnDate."',
						clientId = '".$this->clientId."'
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

