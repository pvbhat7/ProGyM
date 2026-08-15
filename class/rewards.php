<?php
    class Rewards{

        // Connection
        private $conn;

        // Table
        private $db_table = "rewards";

        // Columns
        	public $id;
        	public $title;
			public $subTitle;
			public $img;
			public $amount;
			public $isRedeemed;
			public $creditDebit;
			public $clientId;
			public $redeemDate;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

        // GET ALL 
        public function getAllRewards(){
            $sqlQuery = "SELECT id , title , subTitle , img , amount , isRedeemed , creditDebit , clientId , redeemDate FROM " . $this->db_table . "";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        // CREATE
        public function createRewardsFromApp(){
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        title = '".$this->title."',
						subTitle = '".$this->subTitle."',
						img = '".$this->img."',
						amount = '".$this->amount."',
						isRedeemed = '".$this->isRedeemed."',
						creditDebit = '".$this->creditDebit."',
						redeemDate = '".$this->redeemDate."',
						clientId = '".$this->clientId."'";
						

	    $stmt = $this->conn->prepare($sqlQuery);
        
           
            $stmt->execute();
            $lastInsertedId = $this->conn->lastInsertId();
            return  $lastInsertedId;
			
			//return $stmt->debugDumpParams();
			
        }
        
        // GET BY ID
        	function getRewardByClientId(){
		    $sqlQuery = "SELECT  id , title , subTitle , img ,amount , isRedeemed , creditDebit , clientId , redeemDate FROM "
		    . $this->db_table ." where clientId = ".$this->clientId." order by id desc";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}
       

        // UPDATE BY ID
        public function updateRewardsFromApp(){
            
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
                        title = '".$this->title."',
						subTitle = '".$this->subTitle."',
						img = '".$this->img."',
						amount = '".$this->amount."',
						isRedeemed = '".$this->isRedeemed."',
						redeemDate = '".$this->redeemDate."',
						creditDebit = '".$this->creditDebit."',
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

