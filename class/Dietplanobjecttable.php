<?php
    class Dietplanobjecttable{

        // Connection
        private $conn;

        // Table
        private $db_table = "dietplanobjecttable";

        // Columns
	public $id;    
    public $adminDataSyncRequired;    
    public $clientDataSyncRequired;    
    public $dietDate;    
    public $discontinue;
	public $cid;
	public $dptid;
    public $clientCompletionStatus_timeActivity_1;    
    public $clientCompletionStatus_timeActivity_2;    
    public $clientCompletionStatus_timeActivity_3;    
    public $clientCompletionStatus_timeActivity_4;    
    public $clientCompletionStatus_timeActivity_5;    
    public $clientCompletionStatus_timeActivity_6;    
    public $clientCompletionStatus_timeActivity_7;    
    public $clientCompletionStatus_timeActivity_8;    
    public $clientCompletionStatus_timeActivity_9;    
    public $clientCompletionStatus_timeActivity_10;    
    public $clientCompletionStatus_timeActivity_11;    
    public $clientCompletionStatus_timeActivity_12;    
    public $clientCompletionStatus_timeActivity_13;    
    public $clientCompletionStatus_timeActivity_14;    
    public $clientCompletionStatus_timeActivity_15;    
    public $clientCompletionStatus_timeActivity_16;    
    public $clientCompletionStatus_timeActivity_17;    
    public $externalCode;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

        // GET ALL
        public function getClient(){
            $sqlQuery = "SELECT id, name, email, age, designation, created FROM " . $this->db_table . "";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        public function handleCreateObjectOperation()
        {  
            $count = $this -> checkIfExistByClientIdAndDate();
		    if($count == 0 )
		    {   
		        $cnt = $this -> checkIfClientHasAdp();
		        
		        if($cnt != 0)
		        {  
		             $mt_query = "SELECT * FROM client where awp is not null and id = ".$this -> cid;
                    $mt_query_st = $this->conn->prepare($mt_query);
                    $mt_query_st->execute();
                    $mt_query_row = $mt_query_st->fetch(PDO::FETCH_ASSOC);
                    $profileActiveStatus = $mt_query_row['profileActiveFlag'];
                    if($profileActiveStatus == 'enable')
                    {
                       // create new diet object for today
		            $createObjQuery = "INSERT INTO dietplanobjecttable
                    (adminDataSyncRequired, clientDataSyncRequired, dietDate, discontinue, cid, dptid, clientCompletionStatus_timeActivity_1, clientCompletionStatus_timeActivity_2, clientCompletionStatus_timeActivity_3, clientCompletionStatus_timeActivity_4, clientCompletionStatus_timeActivity_5, clientCompletionStatus_timeActivity_6, clientCompletionStatus_timeActivity_7, clientCompletionStatus_timeActivity_8, clientCompletionStatus_timeActivity_9, clientCompletionStatus_timeActivity_10, clientCompletionStatus_timeActivity_11, clientCompletionStatus_timeActivity_12, clientCompletionStatus_timeActivity_13, clientCompletionStatus_timeActivity_14, clientCompletionStatus_timeActivity_15, clientCompletionStatus_timeActivity_16, clientCompletionStatus_timeActivity_17, externalCode)
                    VALUES('false', 'false', '".$this -> dietDate."' , 'false', ".$this -> cid." , (select adp from client where id = ".$this -> cid." ), 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 0)";
                    

                    $st_ = $this->conn->prepare($createObjQuery);
                    $st_ ->execute(); 
                    }
		            
		        }
		    }
        }
        
        public function getAllByDietPlanTemplateId(){
            
            $this -> handleCreateObjectOperation();
              
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where dptid = ".$this -> dptid." ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        public function checkIfExistByClientIdAndDate(){
            

            $sqlQuery = "SELECT * FROM dietplanobjecttable where cid = ".$this -> cid." and dietDate = '".$this->dietDate."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            $itemCount = $stmt->rowCount();
            return $itemCount;
        }
        
        public function checkIfClientHasAdp(){
            $sqlQuery = "SELECT * FROM client where adp != '' and id = ".$this -> cid;
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            $itemCount = $stmt->rowCount();
            return $itemCount;
        }
        
        
        

        // CREATE
        public function createDietplanobjecttable(){
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                             adminDataSyncRequired= '".$this->adminDataSyncRequired."',    
							 clientDataSyncRequired= '".$this->clientDataSyncRequired."',    
							 dietDate= '".$this->dietDate."',    
							 discontinue= '".$this->discontinue."',    
							 cid= '".$this->cid."',    
							 dptid= '".$this->dptid."',    
							 clientCompletionStatus_timeActivity_1= '".$this->clientCompletionStatus_timeActivity_1."',    
							 clientCompletionStatus_timeActivity_2= '".$this->clientCompletionStatus_timeActivity_2."',    
							 clientCompletionStatus_timeActivity_3= '".$this->clientCompletionStatus_timeActivity_3."',    
							 clientCompletionStatus_timeActivity_4= '".$this->clientCompletionStatus_timeActivity_4."',    
							 clientCompletionStatus_timeActivity_5= '".$this->clientCompletionStatus_timeActivity_5."',    
							 clientCompletionStatus_timeActivity_6= '".$this->clientCompletionStatus_timeActivity_6."',    
							 clientCompletionStatus_timeActivity_7= '".$this->clientCompletionStatus_timeActivity_7."',    
							 clientCompletionStatus_timeActivity_8= '".$this->clientCompletionStatus_timeActivity_8."',    
							 clientCompletionStatus_timeActivity_9= '".$this->clientCompletionStatus_timeActivity_9."',    
							 clientCompletionStatus_timeActivity_10= '".$this->clientCompletionStatus_timeActivity_10."',    
							 clientCompletionStatus_timeActivity_11= '".$this->clientCompletionStatus_timeActivity_11."',    
							 clientCompletionStatus_timeActivity_12= '".$this->clientCompletionStatus_timeActivity_12."',    
							 clientCompletionStatus_timeActivity_13= '".$this->clientCompletionStatus_timeActivity_13."',    
							 clientCompletionStatus_timeActivity_14= '".$this->clientCompletionStatus_timeActivity_14."',    
							 clientCompletionStatus_timeActivity_15= '".$this->clientCompletionStatus_timeActivity_15."',    
							 clientCompletionStatus_timeActivity_16= '".$this->clientCompletionStatus_timeActivity_16."',    
							 clientCompletionStatus_timeActivity_17= '".$this->clientCompletionStatus_timeActivity_17."',    
							 externalCode = '".$this->externalCode."'";								 
						
	    $stmt = $this->conn->prepare($sqlQuery);
        
           
            if($stmt->execute()){
               return true;
            }
            return false;
			
			//return $stmt->debugDumpParams();
			
        }
        
        				
		public function getDietPlanObjectClientIdAndDate(){
		    
		    $this -> handleCreateObjectOperation();
		    
		    $sqlQuery = "SELECT
						id,
						adminDataSyncRequired,
						clientDataSyncRequired,    
						dietDate,    
						discontinue,    
						cid,    
						dptid,    
						clientCompletionStatus_timeActivity_1,    
						clientCompletionStatus_timeActivity_2,   
						clientCompletionStatus_timeActivity_3,   
						clientCompletionStatus_timeActivity_4,   
						clientCompletionStatus_timeActivity_5,   
						clientCompletionStatus_timeActivity_6,   
						clientCompletionStatus_timeActivity_7,   
						clientCompletionStatus_timeActivity_8,   
						clientCompletionStatus_timeActivity_9,   
						clientCompletionStatus_timeActivity_10,    
						clientCompletionStatus_timeActivity_11,   
						clientCompletionStatus_timeActivity_12,   
						clientCompletionStatus_timeActivity_13,   
						clientCompletionStatus_timeActivity_14,   
						clientCompletionStatus_timeActivity_15,   
						clientCompletionStatus_timeActivity_16,   
						clientCompletionStatus_timeActivity_17,   
						externalCode
		 
                      FROM
                        ". $this->db_table ."
                    WHERE 
                       dietDate = ? and cid = ?
                    LIMIT 0,1";

            $stmt = $this->conn->prepare($sqlQuery);

            $stmt->bindParam(1, $this->dietDate);
			$stmt->bindParam(2, $this->cid);

            $stmt->execute();

            $dataRow = $stmt->fetch(PDO::FETCH_ASSOC);
            
			$this->id= $dataRow['id'];    
			$this->adminDataSyncRequired= $dataRow['adminDataSyncRequired'];    
			$this->clientDataSyncRequired= $dataRow['clientDataSyncRequired'];    
			$this->dietDate= $dataRow['dietDate'];    
			$this->discontinue= $dataRow['discontinue'];    
			$this->cid= $dataRow['cid'];    
			$this->dptid= $dataRow['dptid'];    
			$this->clientCompletionStatus_timeActivity_1= $dataRow['clientCompletionStatus_timeActivity_1'];    
			$this->clientCompletionStatus_timeActivity_2= $dataRow['clientCompletionStatus_timeActivity_2'];    
			$this->clientCompletionStatus_timeActivity_3= $dataRow['clientCompletionStatus_timeActivity_3'];    
			$this->clientCompletionStatus_timeActivity_4= $dataRow['clientCompletionStatus_timeActivity_4'];    
			$this->clientCompletionStatus_timeActivity_5= $dataRow['clientCompletionStatus_timeActivity_5'];    
			$this->clientCompletionStatus_timeActivity_6= $dataRow['clientCompletionStatus_timeActivity_6'];    
			$this->clientCompletionStatus_timeActivity_7= $dataRow['clientCompletionStatus_timeActivity_7'];    
			$this->clientCompletionStatus_timeActivity_8= $dataRow['clientCompletionStatus_timeActivity_8'];    
			$this->clientCompletionStatus_timeActivity_9= $dataRow['clientCompletionStatus_timeActivity_9'];    
			$this->clientCompletionStatus_timeActivity_10= $dataRow['clientCompletionStatus_timeActivity_10'];    
			$this->clientCompletionStatus_timeActivity_11= $dataRow['clientCompletionStatus_timeActivity_11'];    
			$this->clientCompletionStatus_timeActivity_12= $dataRow['clientCompletionStatus_timeActivity_12'];    
			$this->clientCompletionStatus_timeActivity_13= $dataRow['clientCompletionStatus_timeActivity_13'];    
			$this->clientCompletionStatus_timeActivity_14= $dataRow['clientCompletionStatus_timeActivity_14'];    
			$this->clientCompletionStatus_timeActivity_15= $dataRow['clientCompletionStatus_timeActivity_15'];    
			$this->clientCompletionStatus_timeActivity_16= $dataRow['clientCompletionStatus_timeActivity_16'];    
			$this->clientCompletionStatus_timeActivity_17= $dataRow['clientCompletionStatus_timeActivity_17'];    
			$this->externalCode= $dataRow['externalCode'];
            
        }

        // UPDATE
        public function getDietplanobjecttableById(){
            $sqlQuery = "SELECT
						id,
						adminDataSyncRequired,
						clientDataSyncRequired,    
						dietDate,    
						discontinue,    
						cid,    
						dptid,    
						clientCompletionStatus_timeActivity_1,    
						clientCompletionStatus_timeActivity_2,   
						clientCompletionStatus_timeActivity_3,   
						clientCompletionStatus_timeActivity_4,   
						clientCompletionStatus_timeActivity_5,   
						clientCompletionStatus_timeActivity_6,   
						clientCompletionStatus_timeActivity_7,   
						clientCompletionStatus_timeActivity_8,   
						clientCompletionStatus_timeActivity_9,   
						clientCompletionStatus_timeActivity_10,    
						clientCompletionStatus_timeActivity_11,   
						clientCompletionStatus_timeActivity_12,   
						clientCompletionStatus_timeActivity_13,   
						clientCompletionStatus_timeActivity_14,   
						clientCompletionStatus_timeActivity_15,   
						clientCompletionStatus_timeActivity_16,   
						clientCompletionStatus_timeActivity_17,   
						externalCode
		 
                      FROM
                        ". $this->db_table ."
                    WHERE 
                       id = ?
                    LIMIT 0,1";

            $stmt = $this->conn->prepare($sqlQuery);

            $stmt->bindParam(1, $this->id);

            $stmt->execute();

            $dataRow = $stmt->fetch(PDO::FETCH_ASSOC);
			
            
			$this->id= $dataRow['id'];    
			$this->adminDataSyncRequired= $dataRow['adminDataSyncRequired'];    
			$this->clientDataSyncRequired= $dataRow['clientDataSyncRequired'];    
			$this->dietDate= $dataRow['dietDate'];    
			$this->discontinue= $dataRow['discontinue'];    
			$this->cid= $dataRow['cid'];    
			$this->dptid= $dataRow['dptid'];    
			$this->clientCompletionStatus_timeActivity_1= $dataRow['clientCompletionStatus_timeActivity_1'];    
			$this->clientCompletionStatus_timeActivity_2= $dataRow['clientCompletionStatus_timeActivity_2'];    
			$this->clientCompletionStatus_timeActivity_3= $dataRow['clientCompletionStatus_timeActivity_3'];    
			$this->clientCompletionStatus_timeActivity_4= $dataRow['clientCompletionStatus_timeActivity_4'];    
			$this->clientCompletionStatus_timeActivity_5= $dataRow['clientCompletionStatus_timeActivity_5'];    
			$this->clientCompletionStatus_timeActivity_6= $dataRow['clientCompletionStatus_timeActivity_6'];    
			$this->clientCompletionStatus_timeActivity_7= $dataRow['clientCompletionStatus_timeActivity_7'];    
			$this->clientCompletionStatus_timeActivity_8= $dataRow['clientCompletionStatus_timeActivity_8'];    
			$this->clientCompletionStatus_timeActivity_9= $dataRow['clientCompletionStatus_timeActivity_9'];    
			$this->clientCompletionStatus_timeActivity_10= $dataRow['clientCompletionStatus_timeActivity_10'];    
			$this->clientCompletionStatus_timeActivity_11= $dataRow['clientCompletionStatus_timeActivity_11'];    
			$this->clientCompletionStatus_timeActivity_12= $dataRow['clientCompletionStatus_timeActivity_12'];    
			$this->clientCompletionStatus_timeActivity_13= $dataRow['clientCompletionStatus_timeActivity_13'];    
			$this->clientCompletionStatus_timeActivity_14= $dataRow['clientCompletionStatus_timeActivity_14'];    
			$this->clientCompletionStatus_timeActivity_15= $dataRow['clientCompletionStatus_timeActivity_15'];    
			$this->clientCompletionStatus_timeActivity_16= $dataRow['clientCompletionStatus_timeActivity_16'];    
			$this->clientCompletionStatus_timeActivity_17= $dataRow['clientCompletionStatus_timeActivity_17'];    
			$this->externalCode= $dataRow['externalCode'];
        }        


        public function updateClientDietPlanStatus(){
            $colName = $this -> discontinue;
            
            $sqlQuery = "UPDATE ". $this->db_table ."
                    SET ".$colName." = 'yes' where id =".$this->id."";
                    echo $sqlQuery;
        
            $stmt = $this->conn->prepare($sqlQuery);
        
            if($stmt->execute()){
               return true;
            }
            return false;
        }

        // UPDATE
        public function updateDietplanobjecttable(){
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
							 adminDataSyncRequired= '".$this->adminDataSyncRequired."',    
							 clientDataSyncRequired= '".$this->clientDataSyncRequired."',    
							 dietDate= '".$this->dietDate."',    
							 discontinue= '".$this->discontinue."',    
							 cid= '".$this->cid."',    
							 dptid= '".$this->dptid."',    
							 clientCompletionStatus_timeActivity_1= '".$this->clientCompletionStatus_timeActivity_1."',    
							 clientCompletionStatus_timeActivity_2= '".$this->clientCompletionStatus_timeActivity_2."',    
							 clientCompletionStatus_timeActivity_3= '".$this->clientCompletionStatus_timeActivity_3."',    
							 clientCompletionStatus_timeActivity_4= '".$this->clientCompletionStatus_timeActivity_4."',    
							 clientCompletionStatus_timeActivity_5= '".$this->clientCompletionStatus_timeActivity_5."',    
							 clientCompletionStatus_timeActivity_6= '".$this->clientCompletionStatus_timeActivity_6."',    
							 clientCompletionStatus_timeActivity_7= '".$this->clientCompletionStatus_timeActivity_7."',    
							 clientCompletionStatus_timeActivity_8= '".$this->clientCompletionStatus_timeActivity_8."',    
							 clientCompletionStatus_timeActivity_9= '".$this->clientCompletionStatus_timeActivity_9."',    
							 clientCompletionStatus_timeActivity_10= '".$this->clientCompletionStatus_timeActivity_10."',    
							 clientCompletionStatus_timeActivity_11= '".$this->clientCompletionStatus_timeActivity_11."',    
							 clientCompletionStatus_timeActivity_12= '".$this->clientCompletionStatus_timeActivity_12."',    
							 clientCompletionStatus_timeActivity_13= '".$this->clientCompletionStatus_timeActivity_13."',    
							 clientCompletionStatus_timeActivity_14= '".$this->clientCompletionStatus_timeActivity_14."',    
							 clientCompletionStatus_timeActivity_15= '".$this->clientCompletionStatus_timeActivity_15."',    
							 clientCompletionStatus_timeActivity_16= '".$this->clientCompletionStatus_timeActivity_16."',    
							 clientCompletionStatus_timeActivity_17= '".$this->clientCompletionStatus_timeActivity_17."'
                    WHERE 
                        externalCode =".$this->externalCode."";
        
            $stmt = $this->conn->prepare($sqlQuery);
        
            if($stmt->execute()){
               return true;
            }
            return false;
        }

        // DELETE
        function deleteClient(){
            $sqlQuery = "DELETE FROM " . $this->db_table . " WHERE id = ?";
            $stmt = $this->conn->prepare($sqlQuery);
        
            $this->id=htmlspecialchars(strip_tags($this->id));
        
            $stmt->bindParam(1, $this->id);
        
            if($stmt->execute()){
                return true;
            }
            return false;
        }
		
		function getAllClientExternalCodes()
		{
			$sqlQuery = "SELECT externalCode FROM " . $this->db_table . "";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}

    }
?>

